/**
 * @fileoverview Controlador para gestión del inventario de ingredientes
 * @module controllers/inventory
 */

import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import type { Ingredient } from '../../../../packages/shared/src/types';
import {
  getAllIngredients as dbGetAllIngredients,
  getIngredientById as dbGetIngredientById,
  createIngredient as dbCreateIngredient,
  updateIngredient as dbUpdateIngredient,
  deleteIngredient as dbDeleteIngredient,
  adjustStock as dbAdjustStock,
  getAllMovements as dbGetAllMovements,
  createMovement as dbCreateMovement,
  getLocations as dbGetLocations,
} from '../db/sqlite';

function calculateCostPerGram(totalCost: number, currentStock: number): number {
  if (currentStock === 0) return 0;
  return Math.round((totalCost / currentStock) * 1000) / 1000;
}

function resolveIngredientCosts(ingredient: Partial<Ingredient>): { totalCost: number; costPerGram: number } {
  const currentStock = ingredient.currentStock ?? 0;

  if (ingredient.costPerGram !== undefined && currentStock > 0) {
    const costPerGram = Math.round(ingredient.costPerGram * 1000) / 1000;
    return {
      costPerGram,
      totalCost: Math.round(costPerGram * currentStock * 100) / 100,
    };
  }

  const totalCost = ingredient.totalCost ?? 0;
  return {
    totalCost: Math.round(totalCost * 100) / 100,
    costPerGram: calculateCostPerGram(totalCost, currentStock),
  };
}

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

  if (ingredient.sapValue !== undefined && ingredient.sapValue < 0) {
    errors.push('El valor SAP no puede ser negativo');
  }

  return errors;
}

function generateIngredientId(): string {
  try {
    return randomUUID();
  } catch (e) {
    return String(Date.now()) + Math.random().toString(36).slice(2, 8);
  }
}

export const getAllIngredients = (req: Request, res: Response): void => {
  try {
    const ingredients = dbGetAllIngredients();
    res.status(200).json({
      success: true,
      data: ingredients,
      count: ingredients.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el inventario',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getIngredientById = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const ingredient = dbGetIngredientById(id);

    if (!ingredient) {
      res.status(404).json({
        success: false,
        error: `Ingrediente con ID ${id} no encontrado`,
      });
      return;
    }

    res.status(200).json({ success: true, data: ingredient });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener el ingrediente',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createIngredient = (req: Request, res: Response): void => {
  try {
    const { name, currentStock, totalCost, costPerGram, sapValue, categoryId, price, weight } = req.body;
 
    const errors = validateIngredient({ name, currentStock, totalCost, costPerGram, sapValue });
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Datos de ingrediente inválidos',
        details: errors,
      });
      return;
    }
 
    const resolvedCosts = resolveIngredientCosts({ currentStock, totalCost, costPerGram });
    const newIngredient: any = {
      id: generateIngredientId(),
      name: name.trim(),
      currentStock,
      totalCost: resolvedCosts.totalCost,
      costPerGram: resolvedCosts.costPerGram,
      sapValue,
      categoryId: categoryId ? String(categoryId) : undefined,
      price: price !== undefined ? Number(price) : 0,
      weight: weight !== undefined ? Number(weight) : 0,
    };

    const saved = dbCreateIngredient(newIngredient);

    res.status(201).json({
      success: true,
      message: 'Ingrediente creado exitosamente',
      data: saved,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear el ingrediente',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const updateIngredient = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const currentIngredient = dbGetIngredientById(id) as Ingredient | undefined;

    if (!currentIngredient) {
      res.status(404).json({
        success: false,
        error: `Ingrediente con ID ${id} no encontrado`,
      });
      return;
    }

    const { name, currentStock, totalCost, costPerGram, sapValue, categoryId, price, weight } = req.body;
    const nextStock = currentStock !== undefined ? currentStock : currentIngredient.currentStock;
    const errors = validateIngredient({ name, currentStock: nextStock, totalCost, costPerGram, sapValue });
 
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Datos de ingrediente inválidos',
        details: errors,
      });
      return;
    }
 
    const resolvedCosts = resolveIngredientCosts({
      currentStock: nextStock,
      totalCost: totalCost !== undefined ? totalCost : currentIngredient.totalCost,
      costPerGram: costPerGram !== undefined ? costPerGram : currentIngredient.costPerGram,
    });
 
    const updatedIngredient: any = {
      ...currentIngredient,
      name: name !== undefined ? name.trim() : currentIngredient.name,
      currentStock: nextStock,
      totalCost: resolvedCosts.totalCost,
      costPerGram: resolvedCosts.costPerGram,
      sapValue: sapValue !== undefined ? sapValue : currentIngredient.sapValue,
      categoryId: categoryId !== undefined ? (categoryId ? String(categoryId) : undefined) : currentIngredient.categoryId,
      price: price !== undefined ? Number(price) : (currentIngredient as any).price,
      weight: weight !== undefined ? Number(weight) : (currentIngredient as any).weight,
    };

    const saved = dbUpdateIngredient(id, updatedIngredient);
    res.status(200).json({
      success: true,
      message: 'Ingrediente actualizado exitosamente',
      data: saved,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el ingrediente',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const deleteIngredient = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const deletedIngredient = dbDeleteIngredient(id);

    if (!deletedIngredient) {
      res.status(404).json({
        success: false,
        error: `Ingrediente con ID ${id} no encontrado`,
      });
      return;
    }

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

    const ingredient = dbGetIngredientById(id) as Ingredient | undefined;
    if (!ingredient) {
      res.status(404).json({
        success: false,
        error: `Ingrediente con ID ${id} no encontrado`,
      });
      return;
    }

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

    const updatedIngredient: Ingredient = {
      ...ingredient,
      currentStock: Math.round(newStock * 100) / 100,
      totalCost: Math.round(ingredient.costPerGram * Math.round(newStock * 100) / 100 * 100) / 100,
    };

    const saved = dbUpdateIngredient(id, updatedIngredient);

    res.status(200).json({
      success: true,
      message: `Stock ajustado exitosamente${reason ? `: ${reason}` : ''}`,
      data: saved,
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

export const getAllMovements = (req: Request, res: Response): void => {
  try {
    const categoryId = req.query.categoryId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
 
    const movements = dbGetAllMovements({ categoryId, startDate, endDate });
    res.status(200).json({ success: true, data: movements, count: movements.length });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener los movimientos',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const createMovement = (req: Request, res: Response): void => {
  try {
    const { ingredientId, type, quantity, reason, location, beforeStock, afterStock } = req.body;

    if (!ingredientId || !type || quantity === undefined) {
      res.status(400).json({ success: false, error: 'Faltan datos del movimiento' });
      return;
    }

    const created = dbCreateMovement({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ingredientId: String(ingredientId),
      type,
      quantity: Number(quantity),
      reason: String(reason ?? ''),
      location: String(location ?? 'Almacén Principal'),
      beforeStock: Number(beforeStock ?? 0),
      afterStock: Number(afterStock ?? 0),
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear el movimiento',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getLocations = (_req: Request, res: Response): void => {
  try {
    const locations = dbGetLocations();
    res.status(200).json({ success: true, data: locations, count: locations.length });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener las ubicaciones',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

export const getIngredientsDB = (): Ingredient[] => {
  return dbGetAllIngredients() as Ingredient[];
};

export const bulkImportIngredients = (req: Request, res: Response): void => {
  try {
    const { ingredients } = req.body;
    if (!Array.isArray(ingredients)) {
      res.status(400).json({ success: false, error: 'Se requiere una lista de ingredientes en formato de arreglo' });
      return;
    }

    const imported: Ingredient[] = [];
    const errors: string[] = [];

    for (const item of ingredients) {
      const validationErrors = validateIngredient(item);
      if (validationErrors.length > 0) {
        errors.push(`Ingrediente "${item.name || 'Sin Nombre'}": ${validationErrors.join(', ')}`);
        continue;
      }

      const resolvedCosts = resolveIngredientCosts(item);
      const newIngredient: Ingredient = {
        id: item.id || generateIngredientId(),
        name: String(item.name).trim(),
        currentStock: Number(item.currentStock ?? 0),
        totalCost: resolvedCosts.totalCost,
        costPerGram: resolvedCosts.costPerGram,
        sapValue: Number(item.sapValue ?? 190),
        categoryId: item.categoryId ? String(item.categoryId) : undefined,
      };

      try {
        const saved = dbCreateIngredient(newIngredient);
        if (saved) {
          imported.push(saved);
        }
      } catch (err: any) {
        errors.push(`Error al insertar "${item.name}": ${err.message}`);
      }
    }

    res.status(200).json({
      success: true,
      data: imported,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error en importación masiva:', error);
    res.status(500).json({ success: false, error: 'Error al importar ingredientes', details: error.message });
  }
};
