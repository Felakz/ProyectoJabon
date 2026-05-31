/**
 * @fileoverview Controlador para cálculos de formulación de jabones
 * @module controllers/calculator
 */

import { Request, Response } from 'express';
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
import {
  getAllRecipes as dbGetAllRecipes,
  getRecipeById as dbGetRecipeById,
  createRecipe as dbCreateRecipe,
  updateRecipe as dbUpdateRecipe,
  deleteRecipe as dbDeleteRecipe,
  getAllIngredients as dbGetAllIngredients,
} from '../db/sqlite';

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
  const allRecipes = dbGetAllRecipes() as Recipe[];
  return {
    id: existingId || (Math.max(...allRecipes.map(recipe => parseInt(recipe.id, 10) || 0), 0) + 1).toString(),
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

export const processSoapCalculation = (req: Request, res: Response): void => {
  try {
    const { recipeId, targetWeight, soapCount, gramsPerSoap }: CalculationRequest = req.body;

    if (!recipeId) {
      res.status(400).json({ success: false, error: 'El ID de la receta es obligatorio' } as CalculationResponse);
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

    const recipe = dbGetRecipeById(recipeId) as Recipe | null;
    if (!recipe) {
      res.status(404).json({ success: false, error: `Receta con ID ${recipeId} no encontrada` } as CalculationResponse);
      return;
    }

    const ingredientsData = dbGetAllIngredients();
    const { oils: oilsGrams, lyeGrams, waterGrams } = calculateGramsFromWeight(effectiveTargetWeight, recipe, ingredientsData);
    const oilsBreakdown = checkStockAvailability(oilsGrams, ingredientsData);
    const { totalCost } = calculateBatchCost(oilsGrams, ingredientsData);

    const lyeCostPerGram = 0.01;
    const waterCostPerGram = 0.001;
    const totalCostWithAllIngredients = totalCost + (lyeGrams * lyeCostPerGram) + (waterGrams * waterCostPerGram);
    const canMakeBatch = oilsBreakdown.every(oil => oil.hasEnoughStock);

    const alerts: string[] = [];
    if (!canMakeBatch) {
      alerts.push('⚠️ No hay suficiente stock para completar este batch:');
      oilsBreakdown.filter(oil => !oil.hasEnoughStock).forEach(oil => {
        alerts.push(`   • Te faltan ${oil.gramsMissing}g de ${oil.name} (disponible: ${oil.gramsAvailable}g, necesario: ${oil.gramsNeeded}g)`);
      });
    } else {
      alerts.push('✅ Tienes suficiente stock para crear este batch');
    }

    if (effectiveTargetWeight < 100) {
      alerts.push('ℹ️ El peso objetivo es muy bajo. Se recomienda un mínimo de 100g para un batch práctico.');
    }

    if (effectiveTargetWeight > 50000) {
      alerts.push('⚠️ El peso objetivo es muy alto. Verifica que sea correcto.');
    }

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

    res.status(200).json({ success: true, calculation } as CalculationResponse);
  } catch (error) {
    console.error('Error en processSoapCalculation:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar el cálculo',
      details: error instanceof Error ? error.message : 'Error desconocido',
    } as CalculationResponse);
  }
};

export const getAllRecipes = (req: Request, res: Response): void => {
  try {
    const recipes = dbGetAllRecipes();
    res.status(200).json({ success: true, data: recipes, count: recipes.length });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener las recetas',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

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
    const saved = dbCreateRecipe(newRecipe);
    res.status(201).json({ success: true, message: 'Receta creada exitosamente', data: saved });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear la receta',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const updateRecipe = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const currentRecipe = dbGetRecipeById(id) as Recipe | null;

    if (!currentRecipe) {
      res.status(404).json({ success: false, error: `Receta con ID ${id} no encontrada` });
      return;
    }

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
    const saved = dbUpdateRecipe(id, updatedRecipe);
    res.status(200).json({ success: true, message: 'Receta actualizada exitosamente', data: saved });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la receta',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteRecipe = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const deletedRecipe = dbDeleteRecipe(id);

    if (!deletedRecipe) {
      res.status(404).json({ success: false, error: `Receta con ID ${id} no encontrada` });
      return;
    }

    res.status(200).json({ success: true, message: 'Receta eliminada exitosamente', data: deletedRecipe });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la receta',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getRecipeById = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const recipe = dbGetRecipeById(id);

    if (!recipe) {
      res.status(404).json({ success: false, error: `Receta con ID ${id} no encontrada` });
      return;
    }

    res.status(200).json({ success: true, data: recipe });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener la receta',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getFinancialSummary = (req: Request, res: Response): void => {
  try {
    const { totalCost, soapsPerBatch, desiredProfitMargin } = req.body;

    if (!totalCost || totalCost <= 0) {
      res.status(400).json({ success: false, error: 'El costo total debe ser mayor a 0' });
      return;
    }

    if (!soapsPerBatch || soapsPerBatch <= 0) {
      res.status(400).json({ success: false, error: 'La cantidad de jabones por batch debe ser mayor a 0' });
      return;
    }

    const profitMargin = desiredProfitMargin || 40;
    const summary = calculateFinancialSummary(totalCost, soapsPerBatch, profitMargin);

    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al calcular el resumen financiero',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const validateRecipe = (req: Request, res: Response): void => {
  try {
    const recipe: Recipe = req.body;
    const errors: string[] = [];
    const totalPercentage = recipe.ingredients.reduce((sum, ing) => sum + ing.percentage, 0);

    if (Math.abs(totalPercentage - 100) > 0.01) {
      errors.push(`Los porcentajes deben sumar 100%. Suma actual: ${totalPercentage.toFixed(2)}%`);
    }

    const ingredientsData = dbGetAllIngredients();
    const ingredientIds = new Set(ingredientsData.map((ing: any) => ing.id));

    recipe.ingredients.forEach(recipeIng => {
      if (!ingredientIds.has(recipeIng.ingredientId)) {
        errors.push(`El ingrediente con ID ${recipeIng.ingredientId} no existe en el inventario`);
      }
    });

    if (recipe.overfattingPercentage < 0 || recipe.overfattingPercentage > 20) {
      errors.push('El porcentaje de sobreengrasado debe estar entre 0% y 20%');
    }

    if (recipe.waterDiscountPercentage < 0 || recipe.waterDiscountPercentage > 50) {
      errors.push('El descuento de agua debe estar entre 0% y 50%');
    }

    if (errors.length > 0) {
      res.status(400).json({ success: false, error: 'La receta no es válida', details: errors });
      return;
    }

    res.status(200).json({ success: true, message: 'La receta es válida' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al validar la receta',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};
