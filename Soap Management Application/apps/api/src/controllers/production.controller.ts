import { Request, Response } from 'express';
import {
  getRecipeById,
  getRecipeIngredientsRelational,
  getIngredientById,
  updateIngredient,
  upsertFinishedProduct,
  saveProductionBatch,
  createMovement,
  createTransaction,
  init as getDb
} from '../db/sqlite';
import type { ProductionCalculationResponse, MakeBatchRequest, ProductionBatch } from '../../../../packages/shared/src/types';

/**
 * Calcula los costos de producción y desglose de insumos de un lote
 */
export const calculateBatchCostWithLabor = (req: Request, res: Response): void => {
  try {
    const { recipeId, totalGrams, laborCost, gainFactor } = req.body;

    if (!recipeId || !totalGrams || totalGrams <= 0) {
      res.status(400).json({ success: false, error: 'El ID de la receta y los gramos totales del lote son obligatorios.' });
      return;
    }

    const recipe = getRecipeById(recipeId);
    if (!recipe) {
      res.status(404).json({ success: false, error: `Receta con ID ${recipeId} no encontrada.` });
      return;
    }

    const recipeIngredients = getRecipeIngredientsRelational(recipeId);
    if (recipeIngredients.length === 0) {
      res.status(400).json({ success: false, error: 'La receta seleccionada no tiene ingredientes asignados.' });
      return;
    }

    const effectiveLaborCost = laborCost !== undefined ? Number(laborCost) : (recipe.defaultLaborCost || 0);
    const effectiveGainFactor = Number(gainFactor || 3.5);

    let rawMaterialCost = 0;
    let canProduce = true;

    const ingredientsBreakdown = recipeIngredients.map(ing => {
      const gramsNeeded = Number(((totalGrams * ing.percentage) / 100).toFixed(2));
      const subtotalCost = Number((gramsNeeded * ing.costPerGram).toFixed(2));
      const hasEnoughStock = ing.currentStock >= gramsNeeded;

      if (!hasEnoughStock) {
        canProduce = false;
      }

      rawMaterialCost += subtotalCost;

      return {
        id: ing.ingredientId,
        name: ing.name,
        percentage: ing.percentage,
        gramsNeeded,
        costPerGram: ing.costPerGram,
        subtotalCost,
        availableStock: ing.currentStock,
        hasEnoughStock
      };
    });

    const totalProductionCost = Number((rawMaterialCost + effectiveLaborCost).toFixed(2));
    
    // PVP sugerido del lote completo
    const suggestedPvpBatch = totalProductionCost * effectiveGainFactor;
    // PVP sugerido por gramo
    const suggestedPvpPerGram = Number((suggestedPvpBatch / totalGrams).toFixed(4));

    const response: ProductionCalculationResponse = {
      recipeId,
      recipeName: recipe.name,
      totalGrams,
      ingredients: ingredientsBreakdown,
      rawMaterialCost: Number(rawMaterialCost.toFixed(2)),
      laborCost: effectiveLaborCost,
      totalProductionCost,
      suggestedPvpPerGram,
      canProduce
    };

    res.status(200).json({ success: true, data: response });
  } catch (error: any) {
    console.error('Error calculando costo de lote:', error);
    res.status(500).json({ success: false, error: 'Error al calcular el costo del lote', details: error.message });
  }
};

/**
 * Procesa la fabricación de un lote deduciendo materia prima e incrementando producto terminado
 */
export const fabricarLote = (req: Request, res: Response): void => {
  const database = getDb();

  // Ejecutar todo el flujo en una transacción atómica de SQLite
  const executeProduction = database.transaction((body: MakeBatchRequest) => {
    const { recipeId, totalGrams, laborCost, outputs } = body;

    // 1. Validar receta
    const recipe = getRecipeById(recipeId);
    if (!recipe) {
      throw new Error(`La receta con ID ${recipeId} no existe.`);
    }

    // 2. Obtener ingredientes y calcular gramos necesarios
    const recipeIngredients = getRecipeIngredientsRelational(recipeId);
    if (recipeIngredients.length === 0) {
      throw new Error('La receta no tiene ingredientes configurados.');
    }

    const ingredientsToDeduct = recipeIngredients.map(ing => {
      const gramsNeeded = Number(((totalGrams * ing.percentage) / 100).toFixed(2));
      const dbIng = getIngredientById(ing.ingredientId);
      if (!dbIng) {
        throw new Error(`El ingrediente "${ing.name}" ya no existe en el inventario.`);
      }
      if (dbIng.currentStock < gramsNeeded) {
        throw new Error(`Stock insuficiente para "${ing.name}". Necesario: ${gramsNeeded}g, Disponible: ${dbIng.currentStock}g.`);
      }
      return {
        id: ing.ingredientId,
        name: ing.name,
        gramsNeeded,
        beforeStock: dbIng.currentStock,
        costPerGram: dbIng.costPerGram
      };
    });

    // 3. Descontar stock del Almacén Principal y crear movimientos de inventario
    let rawMaterialCost = 0;
    const nowStr = new Date().toISOString();

    for (const item of ingredientsToDeduct) {
      const afterStock = item.beforeStock - item.gramsNeeded;
      const subtotalCost = item.gramsNeeded * item.costPerGram;
      rawMaterialCost += subtotalCost;

      // Calcular nuevo totalCost (costPerGram * newStock)
      const newTotalCost = Math.round((item.costPerGram * afterStock) * 100) / 100;

      // Actualizar ingredientes
      database.prepare(
        'UPDATE ingredients SET currentStock = ?, totalCost = ? WHERE id = ?'
      ).run(afterStock, newTotalCost, item.id);

      // Registrar movimiento de egreso
      const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      database.prepare(`
        INSERT INTO movements (id, ingredientId, type, quantity, reason, location, beforeStock, afterStock, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        movementId,
        item.id,
        'egreso',
        item.gramsNeeded,
        `Producción Lote - Receta: ${recipe.name}`,
        'Almacén Principal',
        item.beforeStock,
        afterStock,
        nowStr
      );
    }

    // 4. Agregar stock al Almacén Final (finished_products) mediante Upsert por nombre descriptivo
    const outputDetails: Array<{ finishedProductId: string; quantity: number }> = [];

    for (const output of outputs) {
      if (!output.name || output.quantity <= 0 || output.price < 0) {
        throw new Error('Cada producto de salida debe incluir un Nombre descriptivo, una Cantidad mayor a 0 y un PVP.');
      }

      // El upsert devuelve el objeto FinishedProduct (con ID generado o existente)
      const result = upsertFinishedProduct(output.name, output.quantity, output.price) as any;
      outputDetails.push({
        finishedProductId: result.id,
        quantity: output.quantity
      });
    }

    // 5. Registrar el lote de producción en el historial
    const batchId = `bat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const totalProductionCost = Number((rawMaterialCost + laborCost).toFixed(2));

    const batchObj: Omit<ProductionBatch, 'createdAt'> = {
      id: batchId,
      recipeId,
      totalGramsProduced: totalGrams,
      rawMaterialCost: Number(rawMaterialCost.toFixed(2)),
      laborCost,
      totalProductionCost
    };

    saveProductionBatch(batchObj, outputDetails);

    // 6. Registrar gasto contable por mano de obra (si aplica)
    if (laborCost > 0) {
      const transactionId = `tx-prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      database.prepare(`
        INSERT INTO transactions (id, type, amount, description, date, categoryId, referenceId)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        transactionId,
        'expense',
        laborCost,
        `Mano de Obra - Producción Lote ${batchId} | Receta: ${recipe.name}`,
        nowStr.split('T')[0],
        'cat-gasto-op',
        batchId
      );
    }

    return {
      batchId,
      totalProductionCost,
      rawMaterialCost: Number(rawMaterialCost.toFixed(2))
    };
  });

  try {
    const result = executeProduction(req.body);
    res.status(200).json({
      success: true,
      message: 'Lote fabricado exitosamente. Se descontaron los insumos de materia prima e incrementó el stock en el Almacén Final.',
      data: result
    });
  } catch (error: any) {
    console.error('Error procesando fabricación de lote (Rollback ejecutado):', error);
    res.status(500).json({ success: false, error: error.message || 'Error interno del servidor al fabricar el lote.' });
  }
};

/**
 * Procesa la fabricación interactiva de un lote dinámico (sin receta pre-creada)
 */
export const fabricarLoteInteractivo = (req: Request, res: Response): void => {
  const database = getDb();

  const executeProduction = database.transaction((body: any) => {
    const { productName, unitWeight, unitsProduced, laborCost, approvedPvp, ingredients } = body;

    if (!productName || !unitWeight || !unitsProduced || unitsProduced <= 0 || !ingredients || !Array.isArray(ingredients)) {
      throw new Error('Datos del lote interactivo incompletos o inválidos.');
    }

    const totalGramsProduced = Number(unitWeight) * Number(unitsProduced);
    let rawMaterialCost = 0;
    const nowStr = new Date().toISOString();

    // 1. Validar ingredientes y calcular deducciones
    const ingredientsToDeduct = ingredients.map((ing: any) => {
      const dbIng = getIngredientById(ing.id);
      if (!dbIng) {
        throw new Error(`El ingrediente con ID "${ing.id}" no existe.`);
      }
      
      const gramsNeeded = Number(ing.gramsUsed);
      if (dbIng.currentStock < gramsNeeded) {
        throw new Error(`Stock insuficiente para "${dbIng.name}". Requerido: ${gramsNeeded}g, Disponible: ${dbIng.currentStock}g.`);
      }

      return {
        id: ing.id,
        name: dbIng.name,
        gramsNeeded,
        beforeStock: dbIng.currentStock,
        costPerGram: dbIng.costPerGram
      };
    });

    // 2. Descontar stock del Almacén Principal (ingredients) y registrar movimientos
    for (const item of ingredientsToDeduct) {
      const afterStock = item.beforeStock - item.gramsNeeded;
      const subtotalCost = item.gramsNeeded * item.costPerGram;
      rawMaterialCost += subtotalCost;

      const newTotalCost = Math.round((item.costPerGram * afterStock) * 100) / 100;

      database.prepare(
        'UPDATE ingredients SET currentStock = ?, totalCost = ? WHERE id = ?'
      ).run(afterStock, newTotalCost, item.id);

      // Registrar movimiento de egreso
      const movementId = `mov-int-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      database.prepare(`
        INSERT INTO movements (id, ingredientId, type, quantity, reason, location, beforeStock, afterStock, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        movementId,
        item.id,
        'egreso',
        item.gramsNeeded,
        `Producción Lote Interactivo - Producto: ${productName}`,
        'Almacén Principal',
        item.beforeStock,
        afterStock,
        nowStr
      );
    }

    // 3. Upsert en el Almacén Final (finished_products)
    const formattedProductName = `${productName} - ${unitWeight}g`;
    const finishedProductResult = upsertFinishedProduct(formattedProductName, Number(unitsProduced), Number(approvedPvp)) as any;

    if (!finishedProductResult || !finishedProductResult.id) {
      throw new Error('Error al registrar o actualizar el producto en el Almacén Final.');
    }

    // 4. Registrar en historial de producción
    const batchId = `bat-int-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const totalProductionCost = Number((rawMaterialCost + Number(laborCost || 0)).toFixed(2));

    database.prepare(`
      INSERT INTO production_batches (id, recipeId, totalGramsProduced, rawMaterialCost, laborCost, totalProductionCost, createdAt)
      VALUES (?, NULL, ?, ?, ?, ?, ?)
    `).run(
      batchId,
      totalGramsProduced,
      Number(rawMaterialCost.toFixed(2)),
      Number(laborCost || 0),
      totalProductionCost,
      nowStr
    );

    // Registrar la salida del producto terminado
    const outputId = `out-int-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    database.prepare(`
      INSERT INTO production_batch_outputs (id, batchId, finishedProductId, quantity)
      VALUES (?, ?, ?, ?)
    `).run(outputId, batchId, finishedProductResult.id, Number(unitsProduced));

    // 5. Registrar el egreso contable de la Mano de Obra si aplica
    if (Number(laborCost) > 0) {
      const transactionId = `tx-prod-int-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      database.prepare(`
        INSERT INTO transactions (id, type, amount, description, date, categoryId, referenceId)
        VALUES (?, 'expense', ?, ?, ?, 'cat-gasto-op', ?)
      `).run(
        transactionId,
        Number(laborCost),
        `Mano de Obra - Lote Interactivo ${productName} (${unitsProduced} und)`,
        nowStr.split('T')[0],
        batchId
      );
    }

    return {
      batchId,
      productName: formattedProductName,
      unitsProduced,
      totalProductionCost,
      rawMaterialCost: Number(rawMaterialCost.toFixed(2))
    };
  });

  try {
    const result = executeProduction(req.body);
    res.status(200).json({
      success: true,
      message: '¡Lote producido con éxito! Materia prima deducida y producto terminado agregado al Almacén Final.',
      data: result
    });
  } catch (error: any) {
    console.error('Error en producción interactiva:', error);
    res.status(500).json({ success: false, error: error.message || 'Error al procesar el lote interactivo.' });
  }
};

