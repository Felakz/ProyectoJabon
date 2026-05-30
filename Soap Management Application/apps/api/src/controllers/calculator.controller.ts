/**
 * @fileoverview Controlador para cálculos de formulación de jabones
 * @module controllers/calculator
 */

import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import type {
  Recipe,
  RecipeInput,
  SoapCalculation,
  CalculationRequest,
  CalculationResponse,
} from '../../../../packages/shared/src/types';
import {
  calculateGramsFromWeight,
  calculateBatchCost,
  checkStockAvailability,
  calculateFinancialSummary,
} from '../../../../packages/shared/src/calculations/soapMath';
import { getIngredientsDB } from './inventory.controller';

/**
 * Base de datos en memoria para recetas (temporal)
 * En producción, esto se reemplazará con una base de datos real
 */
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const RECIPES_FILE = path.join(DATA_DIR, 'recipes.json');

function ensureDataDirCalc() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

const initialRecipes: Recipe[] = [
  {
    id: '1',
    name: 'Receta Simple Suave',
    description: 'Receta demostrativa usando Aceite de Oliva',
    targetWeight: 1000,
    ingredients: [
      { ingredientId: '1', percentage: 100 },
    ],
    overfattingPercentage: 5,
    waterDiscountPercentage: 0,
  },
];

ensureDataDirCalc();

let recipesDB: Recipe[] = (() => {
  try {
    if (fs.existsSync(RECIPES_FILE)) {
      const raw = fs.readFileSync(RECIPES_FILE, 'utf8');
      return JSON.parse(raw) as Recipe[];
    }
  } catch (e) {
    console.error('Error leyendo recipes.json, usando semilla:', e);
  }
  try {
    fs.writeFileSync(RECIPES_FILE, JSON.stringify(initialRecipes, null, 2), 'utf8');
  } catch (e) {
    console.error('Error escribiendo recipes.json:', e);
  }
  return initialRecipes.slice();
})();

function saveRecipes() {
  try {
    fs.writeFileSync(RECIPES_FILE, JSON.stringify(recipesDB, null, 2), 'utf8');
  } catch (e) {
    console.error('Error guardando recipes.json:', e);
  }
}

function validateRecipeInput(recipe: RecipeInput): string[] {
  const errors: string[] = [];

  if (!recipe.name || recipe.name.trim().length === 0) {
    errors.push('El nombre de la receta es obligatorio');
  }

  if (!recipe.description || recipe.description.trim().length === 0) {
    errors.push('La descripción de la receta es obligatoria');
  }

  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    errors.push('La receta debe incluir al menos un ingrediente');
  }

  const totalPercentage = recipe.ingredients.reduce((sum, ing) => sum + Number(ing.percentage || 0), 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    errors.push(`Los porcentajes deben sumar 100%. Suma actual: ${totalPercentage.toFixed(2)}%`);
  }

  // Estos campos son opcionales en la UI ahora; si vienen, los validamos, si no, se usan valores por defecto
  const overfat = recipe.overfattingPercentage ?? 5;
  const waterDiscount = recipe.waterDiscountPercentage ?? 0;

  if (overfat < 0 || overfat > 20) {
    errors.push('El porcentaje de sobreengrasado debe estar entre 0% y 20%');
  }

  if (waterDiscount < 0 || waterDiscount > 50) {
    errors.push('El descuento de agua debe estar entre 0% y 50%');
  }

  return errors;
}

function buildRecipeFromInput(input: RecipeInput, existingId?: string): Recipe {
  return {
    id: existingId || (Math.max(...recipesDB.map(recipe => parseInt(recipe.id, 10)), 0) + 1).toString(),
    name: input.name.trim(),
    description: input.description.trim(),
    targetWeight: input.targetWeight,
    ingredients: input.ingredients.map(ingredient => ({
      ingredientId: ingredient.ingredientId,
      percentage: Number(ingredient.percentage),
    })),
    overfattingPercentage: Number(input.overfattingPercentage ?? 5),
    waterDiscountPercentage: Number(input.waterDiscountPercentage ?? 0),
  };
}

/**
 * POST /api/calculator/calculate
 * Procesa el cálculo completo de una receta de jabón
 */
export const processSoapCalculation = (req: Request, res: Response): void => {
  try {
    console.log('DEBUG processSoapCalculation body:', req.body);
    console.log('DEBUG recipesDB ids:', recipesDB.map(r => r.id));
    const { recipeId, targetWeight, soapCount, gramsPerSoap }: CalculationRequest = req.body;
    if (!recipeId) {
      res.status(400).json({
        success: false,
        error: 'El ID de la receta es obligatorio',
      } as CalculationResponse);
      return;
    }

    const effectiveTargetWeight =
      targetWeight && targetWeight > 0
        ? targetWeight
        : soapCount && gramsPerSoap && soapCount > 0 && gramsPerSoap > 0
          ? soapCount * gramsPerSoap
          : 0;

    if (!effectiveTargetWeight || effectiveTargetWeight <= 0) {
      res.status(400).json({
        success: false,
        error: 'Debes indicar un peso objetivo o una cantidad de jabones válida',
      } as CalculationResponse);
      return;
    }

    // Buscar la receta en la base de datos
    const recipe = recipesDB.find(r => r.id === recipeId);

    if (!recipe) {
      res.status(404).json({
        success: false,
        error: `Receta con ID ${recipeId} no encontrada`,
      } as CalculationResponse);
      return;
    }

    // Obtener datos actuales del inventario
    const ingredientsData = getIngredientsDB();

    // 1. Calcular gramos necesarios de cada ingrediente
    const {
      oils: oilsGrams,
      lyeGrams,
      waterGrams,
      totalOilsWeight,
    } = calculateGramsFromWeight(effectiveTargetWeight, recipe, ingredientsData);

    // 2. Verificar disponibilidad de stock y generar desglose
    const oilsBreakdown = checkStockAvailability(oilsGrams, ingredientsData);

    // 3. Calcular costos del batch
    const { totalCost } = calculateBatchCost(
      oilsGrams,
      ingredientsData
    );

    // Agregar costo de sosa y agua (estimado)
    const lyeCostPerGram = 0.01; // S/ 0.01 por gramo (ajustar según mercado)
    const waterCostPerGram = 0.001; // S/ 0.001 por gramo (muy bajo)
    const lyeCost = lyeGrams * lyeCostPerGram;
    const waterCost = waterGrams * waterCostPerGram;
    const totalCostWithAllIngredients = totalCost + lyeCost + waterCost;

    // 4. Verificar si se puede hacer el batch
    const canMakeBatch = oilsBreakdown.every(oil => oil.hasEnoughStock);

    // 5. Generar alertas amigables de ingredientes faltantes
    const alerts: string[] = [];

    if (!canMakeBatch) {
      alerts.push('⚠️ No hay suficiente stock para completar este batch:');

      oilsBreakdown
        .filter(oil => !oil.hasEnoughStock)
        .forEach(oil => {
          alerts.push(
            `   • Te faltan ${oil.gramsMissing}g de ${oil.name} (disponible: ${oil.gramsAvailable}g, necesario: ${oil.gramsNeeded}g)`
          );
        });
    } else {
      alerts.push('✅ Tienes suficiente stock para crear este batch');
    }

    // Validar que el batch tenga sentido
    if (effectiveTargetWeight < 100) {
      alerts.push('ℹ️ El peso objetivo es muy bajo. Se recomienda un mínimo de 100g para un batch práctico.');
    }

    if (effectiveTargetWeight > 50000) {
      alerts.push('⚠️ El peso objetivo es muy alto. Verifica que sea correcto.');
    }

    // 6. Construir la respuesta completa
    const calculation: SoapCalculation = {
      recipe,
      targetWeight: effectiveTargetWeight,
      soapCount: soapCount && soapCount > 0 ? soapCount : undefined,
      gramsPerSoap: gramsPerSoap && gramsPerSoap > 0 ? gramsPerSoap : undefined,
      mode: soapCount && gramsPerSoap ? 'soapCount' : 'grams',
      oils: oilsBreakdown,
      lyeGrams: Math.round(lyeGrams * 100) / 100,
      waterGrams: Math.round(waterGrams * 100) / 100,
      totalCost: Math.round(totalCostWithAllIngredients * 100) / 100,
      canMakeBatch,
      alerts,
    };

    res.status(200).json({
      success: true,
      calculation,
    } as CalculationResponse);

  } catch (error) {
    console.error('Error en processSoapCalculation:', error);

    res.status(500).json({
      success: false,
      error: 'Error al procesar el cálculo',
      details: error instanceof Error ? error.message : 'Error desconocido',
    } as CalculationResponse);
  }
};

/**
 * GET /api/calculator/recipes
 * Obtiene todas las recetas disponibles
 */
export const getAllRecipes = (req: Request, res: Response): void => {
  try {
    res.status(200).json({
      success: true,
      data: recipesDB,
      count: recipesDB.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener las recetas',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

/**
 * POST /api/calculator/recipes
 * Crea una nueva receta
 */
export const createRecipe = (req: Request, res: Response): void => {
  try {
    const recipeInput: RecipeInput = req.body;
    const errors = validateRecipeInput(recipeInput);

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Datos de receta inválidos',
        details: errors,
      });
      return;
    }

    const newRecipe = buildRecipeFromInput(recipeInput);
    recipesDB.push(newRecipe);
    saveRecipes();

    res.status(201).json({
      success: true,
      message: 'Receta creada exitosamente',
      data: newRecipe,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear la receta',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

/**
 * PUT /api/calculator/recipes/:id
 * Actualiza una receta existente
 */
export const updateRecipe = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const recipeIndex = recipesDB.findIndex(recipe => recipe.id === id);

    if (recipeIndex === -1) {
      res.status(404).json({
        success: false,
        error: `Receta con ID ${id} no encontrada`,
      });
      return;
    }

    const currentRecipe = recipesDB[recipeIndex];
    const recipeInput: RecipeInput = {
      name: req.body.name ?? currentRecipe.name,
      description: req.body.description ?? currentRecipe.description,
      targetWeight: req.body.targetWeight ?? currentRecipe.targetWeight,
      ingredients: req.body.ingredients ?? currentRecipe.ingredients,
      overfattingPercentage: req.body.overfattingPercentage ?? currentRecipe.overfattingPercentage,
      waterDiscountPercentage: req.body.waterDiscountPercentage ?? currentRecipe.waterDiscountPercentage,
    };

    const errors = validateRecipeInput(recipeInput);

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Datos de receta inválidos',
        details: errors,
      });
      return;
    }

    const updatedRecipe = buildRecipeFromInput(recipeInput, currentRecipe.id);
    recipesDB[recipeIndex] = updatedRecipe;
    saveRecipes();

    res.status(200).json({
      success: true,
      message: 'Receta actualizada exitosamente',
      data: updatedRecipe,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la receta',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

/**
 * DELETE /api/calculator/recipes/:id
 * Elimina una receta
 */
export const deleteRecipe = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const recipeIndex = recipesDB.findIndex(recipe => recipe.id === id);

    if (recipeIndex === -1) {
      res.status(404).json({
        success: false,
        error: `Receta con ID ${id} no encontrada`,
      });
      return;
    }

    const deletedRecipe = recipesDB[recipeIndex];
    recipesDB = recipesDB.filter(recipe => recipe.id !== id);
    saveRecipes();

    res.status(200).json({
      success: true,
      message: 'Receta eliminada exitosamente',
      data: deletedRecipe,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la receta',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

/**
 * GET /api/calculator/recipes/:id
 * Obtiene una receta específica por ID
 */
export const getRecipeById = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const recipe = recipesDB.find(r => r.id === id);

    if (!recipe) {
      res.status(404).json({
        success: false,
        error: `Receta con ID ${id} no encontrada`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: recipe,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la receta',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

/**
 * POST /api/calculator/financial-summary
 * Calcula el resumen financiero de un batch
 */
export const getFinancialSummary = (req: Request, res: Response): void => {
  try {
    const { totalCost, soapsPerBatch, desiredProfitMargin } = req.body;

    if (!totalCost || totalCost <= 0) {
      res.status(400).json({
        success: false,
        error: 'El costo total debe ser mayor a 0',
      });
      return;
    }

    if (!soapsPerBatch || soapsPerBatch <= 0) {
      res.status(400).json({
        success: false,
        error: 'La cantidad de jabones por batch debe ser mayor a 0',
      });
      return;
    }

    const profitMargin = desiredProfitMargin || 40; // Default 40% margen

    const summary = calculateFinancialSummary(totalCost, soapsPerBatch, profitMargin);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al calcular el resumen financiero',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

/**
 * POST /api/calculator/validate-recipe
 * Valida que una receta tenga porcentajes correctos
 */
export const validateRecipe = (req: Request, res: Response): void => {
  try {
    const recipe: Recipe = req.body;
    const errors: string[] = [];

    // Validar que los porcentajes sumen 100%
    const totalPercentage = recipe.ingredients.reduce(
      (sum, ing) => sum + ing.percentage,
      0
    );

    if (Math.abs(totalPercentage - 100) > 0.01) {
      errors.push(
        `Los porcentajes deben sumar 100%. Suma actual: ${totalPercentage.toFixed(2)}%`
      );
    }

    // Validar que todos los ingredientes existan en el inventario
    const ingredientsData = getIngredientsDB();
    const ingredientIds = new Set(ingredientsData.map(ing => ing.id));

    recipe.ingredients.forEach(recipeIng => {
      if (!ingredientIds.has(recipeIng.ingredientId)) {
        errors.push(
          `El ingrediente con ID ${recipeIng.ingredientId} no existe en el inventario`
        );
      }
    });

    // Validar rangos razonables
    if (recipe.overfattingPercentage < 0 || recipe.overfattingPercentage > 20) {
      errors.push('El porcentaje de sobreengrasado debe estar entre 0% y 20%');
    }

    if (recipe.waterDiscountPercentage < 0 || recipe.waterDiscountPercentage > 50) {
      errors.push('El descuento de agua debe estar entre 0% y 50%');
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        valid: false,
        errors,
      });
      return;
    }

    res.status(200).json({
      success: true,
      valid: true,
      message: 'La receta es válida',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al validar la receta',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
