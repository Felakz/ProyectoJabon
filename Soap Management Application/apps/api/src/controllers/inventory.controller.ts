/**
 * @fileoverview Controlador para gestión del inventario de ingredientes
 * @module controllers/inventory
 */

import { Request, Response } from 'express';
import type { Ingredient } from '../../../../packages/shared/src/types';
import fs from 'fs';
import path from 'path';

/**
 * Base de datos en memoria para ingredientes (temporal)
 * En producción, esto se reemplazará con una base de datos real
 */
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const INGREDIENTS_FILE = path.join(DATA_DIR, 'ingredients.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

const initialIngredients: Ingredient[] = [
  {
    id: '1',
    name: 'Aceite de Oliva Extra Virgen',
    currentStock: 5000,
    totalCost: 3500,
    costPerGram: 0.7,
    sapValue: 190,
  },
];

ensureDataDir();

let ingredientsDB: Ingredient[] = (() => {
  try {
    if (fs.existsSync(INGREDIENTS_FILE)) {
      const raw = fs.readFileSync(INGREDIENTS_FILE, 'utf8');
      return JSON.parse(raw) as Ingredient[];
    }
  } catch (e) {
    console.error('Error leyendo ingredients.json, usando semilla:', e);
  }
  // si no existe archivo, inicializar con un ingrediente real
  try {
    fs.writeFileSync(INGREDIENTS_FILE, JSON.stringify(initialIngredients, null, 2), 'utf8');
  } catch (e) {
    console.error('Error escribiendo ingredients.json:', e);
  }
  return initialIngredients.slice();
})();

function saveIngredients() {
  try {
    fs.writeFileSync(INGREDIENTS_FILE, JSON.stringify(ingredientsDB, null, 2), 'utf8');
  } catch (e) {
    console.error('Error guardando ingredients.json:', e);
  }
}

/**
 * Calcula el costo por gramo basándose en el costo total y stock actual
 */
function calculateCostPerGram(totalCost: number, currentStock: number): number {
  if (currentStock === 0) {
    return 0;
  }
  return Math.round((totalCost / currentStock) * 1000) / 1000; // 3 decimales
}

function resolveIngredientCosts(
  ingredient: Partial<Ingredient>
): { totalCost: number; costPerGram: number } {
  const currentStock = ingredient.currentStock ?? 0;

  if (ingredient.costPerGram !== undefined && currentStock > 0) {
    const costPerGram = Math.round(ingredient.costPerGram * 1000) / 1000;
    return {
      costPerGram,
      totalCost: Math.round(costPerGram * currentStock * 100) / 100,
    };
  }

  const totalCost = ingredient.totalCost ?? 0;
  const costPerGram = calculateCostPerGram(totalCost, currentStock);

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    costPerGram,
  };
}

/**
 * Valida los datos de un ingrediente
 */
function validateIngredient(ingredient: Partial<Ingredient>): string[] {
  const errors: string[] = [];

  if (!ingredient.name || ingredient.name.trim().length === 0) {
    errors.push('El nombre del ingrediente es obligatorio');
  }

  if (ingredient.currentStock !== undefined && ingredient.currentStock < 0) {
    errors.push('El stock no puede ser negativo');
  }

  if (ingredient.totalCost !== undefined && ingredient.totalCost < 0) {
    errors.push('El costo total no puede ser negativo');
  }

  if (ingredient.costPerGram !== undefined && ingredient.costPerGram < 0) {
    errors.push('El costo por gramo no puede ser negativo');
  }

  if (ingredient.sapValue !== undefined && ingredient.sapValue <= 0) {
    errors.push('El valor SAP debe ser mayor a 0');
  }

  return errors;
}

/**
 * GET /api/inventory
 * Obtiene todos los ingredientes del inventario
 */
export const getAllIngredients = (req: Request, res: Response): void => {
  try {
    res.status(200).json({
      success: true,
      data: ingredientsDB,
      count: ingredientsDB.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el inventario',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

/**
 * GET /api/inventory/:id
 * Obtiene un ingrediente específico por su ID
 */
export const getIngredientById = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const ingredient = ingredientsDB.find(ing => ing.id === id);

    if (!ingredient) {
      res.status(404).json({
        success: false,
        error: `Ingrediente con ID ${id} no encontrado`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: ingredient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el ingrediente',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

/**
 * POST /api/inventory
 * Crea un nuevo ingrediente en el inventario
 */
export const createIngredient = (req: Request, res: Response): void => {
  try {
    const { name, currentStock, totalCost, costPerGram, sapValue } = req.body;

    // Validar datos de entrada
    const errors = validateIngredient({ name, currentStock, totalCost, costPerGram, sapValue });

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Datos de ingrediente inválidos',
        details: errors,
      });
      return;
    }

    const resolvedCosts = resolveIngredientCosts({
      currentStock,
      totalCost,
      costPerGram,
    });

    // Generar ID único (en producción usar UUID o ID de base de datos)
    const newId = (Math.max(...ingredientsDB.map(i => parseInt(i.id)), 0) + 1).toString();

    const newIngredient: Ingredient = {
      id: newId,
      name: name.trim(),
      currentStock,
      totalCost: resolvedCosts.totalCost,
      costPerGram: resolvedCosts.costPerGram,
      sapValue,
    };

    ingredientsDB.push(newIngredient);
    saveIngredients();

    res.status(201).json({
      success: true,
      message: 'Ingrediente creado exitosamente',
      data: newIngredient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear el ingrediente',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

/**
 * PUT /api/inventory/:id
 * Actualiza un ingrediente existente
 */
export const updateIngredient = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { name, currentStock, totalCost, costPerGram, sapValue } = req.body;

    const ingredientIndex = ingredientsDB.findIndex(ing => ing.id === id);

    if (ingredientIndex === -1) {
      res.status(404).json({
        success: false,
        error: `Ingrediente con ID ${id} no encontrado`,
      });
      return;
    }

    // Validar datos de entrada
    const errors = validateIngredient({ name, currentStock, totalCost, costPerGram, sapValue });

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Datos de ingrediente inválidos',
        details: errors,
      });
      return;
    }

    const currentIngredient = ingredientsDB[ingredientIndex];
    const nextStock = currentStock !== undefined ? currentStock : currentIngredient.currentStock;
    const resolvedCosts = resolveIngredientCosts({
      currentStock: nextStock,
      totalCost: totalCost !== undefined ? totalCost : currentIngredient.totalCost,
      costPerGram: costPerGram !== undefined ? costPerGram : currentIngredient.costPerGram,
    });

    // Actualizar solo los campos proporcionados
    const updatedIngredient: Ingredient = {
      ...currentIngredient,
      name: name !== undefined ? name.trim() : currentIngredient.name,
      currentStock: nextStock,
      totalCost: resolvedCosts.totalCost,
      costPerGram: resolvedCosts.costPerGram,
      sapValue: sapValue !== undefined ? sapValue : currentIngredient.sapValue,
    };

    ingredientsDB[ingredientIndex] = updatedIngredient;
    saveIngredients();
    res.status(200).json({
      success: true,
      message: 'Ingrediente actualizado exitosamente',
      data: updatedIngredient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el ingrediente',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

/**
 * DELETE /api/inventory/:id
 * Elimina un ingrediente del inventario
 */
export const deleteIngredient = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const ingredientIndex = ingredientsDB.findIndex(ing => ing.id === id);

    if (ingredientIndex === -1) {
      res.status(404).json({
        success: false,
        error: `Ingrediente con ID ${id} no encontrado`,
      });
      return;
    }

    const deletedIngredient = ingredientsDB[ingredientIndex];
    ingredientsDB = ingredientsDB.filter(ing => ing.id !== id);
    saveIngredients();
    res.status(200).json({
      success: true,
      message: 'Ingrediente eliminado exitosamente',
      data: deletedIngredient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el ingrediente',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

/**
 * PATCH /api/inventory/:id/adjust-stock
 * Ajusta el stock de un ingrediente (suma o resta)
 */
export const adjustStock = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { adjustment, reason } = req.body;

    if (adjustment === undefined || typeof adjustment !== 'number') {
      res.status(400).json({
        success: false,
        error: 'Se requiere un valor numérico de ajuste',
      });
      return;
    }

    const ingredientIndex = ingredientsDB.findIndex(ing => ing.id === id);

    if (ingredientIndex === -1) {
      res.status(404).json({
        success: false,
        error: `Ingrediente con ID ${id} no encontrado`,
      });
      return;
    }

    const ingredient = ingredientsDB[ingredientIndex];
    const newStock = ingredient.currentStock + adjustment;

    if (newStock < 0) {
      res.status(400).json({
        success: false,
        error: 'El ajuste resultaría en stock negativo',
        currentStock: ingredient.currentStock,
        attemptedAdjustment: adjustment,
      });
      return;
    }

    ingredient.currentStock = Math.round(newStock * 100) / 100;
    ingredient.totalCost = Math.round(ingredient.costPerGram * ingredient.currentStock * 100) / 100;

    res.status(200).json({
      success: true,
      message: `Stock ajustado exitosamente${reason ? `: ${reason}` : ''}`,
      data: ingredient,
      adjustment: Math.round(adjustment * 100) / 100,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al ajustar el stock',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

/**
 * Exporta la base de datos en memoria (útil para otros controladores)
 */
export const getIngredientsDB = (): Ingredient[] => {
  return ingredientsDB;
};
