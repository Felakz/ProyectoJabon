/**
 * @fileoverview Funciones matemáticas puras para cálculos de jabonería artesanal
 * @module calculations/soapMath
 */

import type { Recipe, Ingredient, RecipeIngredient, IngredientBreakdown } from '../types';

/**
 * Constantes para cálculos de jabonería
 */
const SOAP_CONSTANTS = {
  /** Ratio típico de agua a sosa (2.33:1 es el estándar) */
  DEFAULT_WATER_TO_LYE_RATIO: 2.33,

  /** Factor de conversión de KOH a NaOH (0.713) */
  KOH_TO_NAOH_FACTOR: 0.713,
} as const;

/**
 * Calcula los gramos exactos de cada ingrediente necesarios para un batch
 *
 * @param targetWeight - Peso final deseado del batch en gramos
 * @param recipe - Receta con los porcentajes de cada aceite
 * @param ingredientsData - Datos completos de los ingredientes desde el inventario
 * @returns Objeto con los gramos necesarios de cada aceite, agua y sosa
 */
export function calculateGramsFromWeight(
  targetWeight: number,
  recipe: Recipe,
  ingredientsData: Ingredient[]
): {
  oils: Record<string, number>;
  lyeGrams: number;
  waterGrams: number;
  totalOilsWeight: number;
} {
  // Validar que los porcentajes suman 100%
  const totalPercentage = recipe.ingredients.reduce(
    (sum, ing) => sum + ing.percentage,
    0
  );

  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error(
      `Los porcentajes de la receta deben sumar 100%. Suma actual: ${totalPercentage}%`
    );
  }

  // Crear un mapa para acceso rápido a los datos de ingredientes
  const ingredientsMap = new Map<string, Ingredient>(
    ingredientsData.map(ing => [ing.id, ing])
  );

  // Calcular peso total de aceites (aproximadamente 60-70% del peso final)
  // Ajustamos iterativamente para llegar al peso objetivo
  const estimatedOilsPercentage = 0.65; // Estimación inicial: 65% del peso final son aceites
  let totalOilsWeight = targetWeight * estimatedOilsPercentage;

  // Calcular gramos de cada aceite según su porcentaje
  const oilsGrams: Record<string, number> = {};

  for (const recipeIng of recipe.ingredients) {
    const ingredient = ingredientsMap.get(recipeIng.ingredientId);

    if (!ingredient) {
      throw new Error(
        `Ingrediente con ID ${recipeIng.ingredientId} no encontrado en el inventario`
      );
    }

    if (ingredient.sapValue <= 0) {
      throw new Error(
        `El ingrediente "${ingredient.name}" debe tener un valor SAP válido (mayor a 0)`
      );
    }

    oilsGrams[recipeIng.ingredientId] = (totalOilsWeight * recipeIng.percentage) / 100;
  }

  // Calcular sosa cáustica (NaOH) necesaria usando el índice de saponificación
  let lyeGrams = 0;

  for (const recipeIng of recipe.ingredients) {
    const ingredient = ingredientsMap.get(recipeIng.ingredientId)!;
    const oilWeight = oilsGrams[recipeIng.ingredientId];

    // Convertir SAP de KOH a NaOH y calcular sosa necesaria
    const naohSapValue = ingredient.sapValue * SOAP_CONSTANTS.KOH_TO_NAOH_FACTOR;
    const lyeForThisOil = (oilWeight * naohSapValue) / 1000; // SAP está en mg/g, convertir a g

    lyeGrams += lyeForThisOil;
  }

  // Aplicar descuento por sobreengrasado
  const overfattingFactor = 1 - (recipe.overfattingPercentage / 100);
  lyeGrams *= overfattingFactor;

  // Calcular agua necesaria
  const defaultWaterGrams = lyeGrams * SOAP_CONSTANTS.DEFAULT_WATER_TO_LYE_RATIO;

  // Aplicar descuento de agua si está especificado
  const waterDiscountFactor = 1 - (recipe.waterDiscountPercentage / 100);
  const waterGrams = defaultWaterGrams * waterDiscountFactor;

  // Ajustar el peso total de aceites para que el batch completo alcance el targetWeight
  const currentTotalWeight = totalOilsWeight + lyeGrams + waterGrams;
  const adjustmentFactor = targetWeight / currentTotalWeight;

  // Re-calcular con el factor de ajuste
  totalOilsWeight *= adjustmentFactor;

  for (const ingredientId in oilsGrams) {
    oilsGrams[ingredientId] *= adjustmentFactor;
  }

  lyeGrams *= adjustmentFactor;
  const finalWaterGrams = waterGrams * adjustmentFactor;

  return {
    oils: oilsGrams,
    lyeGrams: Math.round(lyeGrams * 100) / 100, // Redondear a 2 decimales
    waterGrams: Math.round(finalWaterGrams * 100) / 100,
    totalOilsWeight: Math.round(totalOilsWeight * 100) / 100,
  };
}

/**
 * Calcula el costo total de un batch basándose en los gramos necesarios
 * y el costo por gramo de cada ingrediente en el inventario
 *
 * @param gramsNeeded - Objeto con ingredientId como key y gramos como value
 * @param ingredientsData - Datos de ingredientes con información de costos
 * @returns Costo total del batch y desglose por ingrediente
 */
export function calculateBatchCost(
  gramsNeeded: Record<string, number>,
  ingredientsData: Ingredient[]
): {
  totalCost: number;
  breakdown: Array<{
    ingredientId: string;
    name: string;
    grams: number;
    costPerGram: number;
    subtotal: number;
  }>;
} {
  const ingredientsMap = new Map<string, Ingredient>(
    ingredientsData.map(ing => [ing.id, ing])
  );

  let totalCost = 0;
  const breakdown: Array<{
    ingredientId: string;
    name: string;
    grams: number;
    costPerGram: number;
    subtotal: number;
  }> = [];

  for (const [ingredientId, grams] of Object.entries(gramsNeeded)) {
    const ingredient = ingredientsMap.get(ingredientId);

    if (!ingredient) {
      throw new Error(
        `Ingrediente con ID ${ingredientId} no encontrado en el inventario`
      );
    }

    const subtotal = grams * ingredient.costPerGram;
    totalCost += subtotal;

    breakdown.push({
      ingredientId,
      name: ingredient.name,
      grams: Math.round(grams * 100) / 100,
      costPerGram: ingredient.costPerGram,
      subtotal: Math.round(subtotal * 100) / 100,
    });
  }

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    breakdown,
  };
}

/**
 * Verifica si hay suficiente stock para crear un batch y genera alertas
 *
 * @param gramsNeeded - Gramos necesarios de cada ingrediente
 * @param ingredientsData - Datos de inventario
 * @returns Array de desgloses con información de stock
 */
export function checkStockAvailability(
  gramsNeeded: Record<string, number>,
  ingredientsData: Ingredient[]
): IngredientBreakdown[] {
  const ingredientsMap = new Map<string, Ingredient>(
    ingredientsData.map(ing => [ing.id, ing])
  );

  const breakdowns: IngredientBreakdown[] = [];

  for (const [ingredientId, gramsRequired] of Object.entries(gramsNeeded)) {
    const ingredient = ingredientsMap.get(ingredientId);

    if (!ingredient) {
      throw new Error(
        `Ingrediente con ID ${ingredientId} no encontrado en el inventario`
      );
    }

    const hasEnoughStock = ingredient.currentStock >= gramsRequired;
    const gramsMissing = hasEnoughStock ? 0 : gramsRequired - ingredient.currentStock;

    breakdowns.push({
      ingredientId,
      name: ingredient.name,
      gramsNeeded: Math.round(gramsRequired * 100) / 100,
      gramsAvailable: ingredient.currentStock,
      hasEnoughStock,
      gramsMissing: Math.round(gramsMissing * 100) / 100,
      cost: Math.round(gramsRequired * ingredient.costPerGram * 100) / 100,
    });
  }

  return breakdowns;
}

/**
 * Calcula el resumen financiero de un batch
 *
 * @param totalCost - Costo total del batch
 * @param soapsPerBatch - Cantidad de jabones que se producirán
 * @param desiredProfitMargin - Margen de ganancia deseado (0-100)
 * @returns Resumen financiero completo
 */
export function calculateFinancialSummary(
  totalCost: number,
  soapsPerBatch: number,
  desiredProfitMargin: number
): {
  costPerSoap: number;
  suggestedPrice: number;
  profitMargin: number;
  breakEvenQuantity: number;
} {
  if (soapsPerBatch <= 0) {
    throw new Error('La cantidad de jabones por batch debe ser mayor a 0');
  }

  const costPerSoap = totalCost / soapsPerBatch;

  // Precio sugerido basado en el margen deseado
  const suggestedPrice = costPerSoap / (1 - (desiredProfitMargin / 100));

  // Punto de equilibrio (break-even)
  const breakEvenQuantity = Math.ceil(totalCost / (suggestedPrice - costPerSoap));

  return {
    costPerSoap: Math.round(costPerSoap * 100) / 100,
    suggestedPrice: Math.round(suggestedPrice * 100) / 100,
    profitMargin: desiredProfitMargin,
    breakEvenQuantity,
  };
}
