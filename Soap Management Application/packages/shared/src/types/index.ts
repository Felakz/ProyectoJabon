/**
 * @fileoverview Definiciones de tipos compartidos para la aplicación de gestión de jabones artesanales
 * @module types
 */

/**
 * Representa un ingrediente en el inventario/despensa
 */
export interface Ingredient {
  /** Identificador único del ingrediente */
  id: string;

  /** Nombre del ingrediente (ej. "Aceite de Coco", "Aceite de Oliva") */
  name: string;

  /** Stock actual disponible en gramos */
  currentStock: number;

  /** Costo total de la cantidad actual en stock */
  totalCost: number;

  /** Costo calculado por gramo (totalCost / currentStock) */
  costPerGram: number;

  /** Índice de saponificación (SAP value) - mg de KOH por gramo de aceite */
  sapValue: number;

  /** ID de la categoría a la que pertenece el ingrediente */
  categoryId?: string;
}

/**
 * Representa un ingrediente dentro de una receta con su porcentaje
 */
export interface RecipeIngredient {
  /** ID del ingrediente referenciado desde el inventario */
  ingredientId: string;

  /** Porcentaje del ingrediente basado en el total de aceites (0-100) */
  percentage: number;
}

/**
 * Representa una receta completa de jabón
 */
export interface Recipe {
  /** Identificador único de la receta */
  id: string;

  /** Nombre de la receta */
  name: string;

  /** Descripción opcional de la receta */
  description: string;

  /** Peso objetivo final del batch en gramos */
  targetWeight: number;

  /** Lista de ingredientes con sus porcentajes */
  ingredients: RecipeIngredient[];

  /** Porcentaje de sobreengrasado (0-100, típicamente 5-8) */
  overfattingPercentage: number;

  /** Porcentaje de descuento de agua (0-100, típicamente 0-38) */
  waterDiscountPercentage: number;
}

/**
 * Datos para crear o actualizar una receta.
 */
export interface RecipeInput {
  name: string;
  description: string;
  targetWeight: number;
  ingredients: RecipeIngredient[];
  overfattingPercentage: number;
  waterDiscountPercentage: number;
}

/**
 * Resumen financiero de un batch de jabón
 */
export interface FinancialSummary {
  /** Costo total de materiales del batch */
  totalCost: number;

  /** Costo por unidad de jabón */
  costPerSoap: number;

  /** Precio de venta sugerido por unidad */
  suggestedPrice: number;

  /** Margen de ganancia en porcentaje */
  profitMargin: number;

  /** Cantidad de jabones a vender para alcanzar punto de equilibrio */
  breakEvenQuantity: number;
}

/**
 * Desglose detallado de ingredientes necesarios para un batch
 */
export interface IngredientBreakdown {
  /** ID del ingrediente */
  ingredientId: string;

  /** Nombre del ingrediente */
  name: string;

  /** Gramos necesarios para la receta */
  gramsNeeded: number;

  /** Gramos disponibles en stock */
  gramsAvailable: number;

  /** Indica si hay suficiente stock */
  hasEnoughStock: boolean;

  /** Gramos faltantes (si aplica) */
  gramsMissing: number;

  /** Costo de la cantidad necesaria */
  cost: number;
}

/**
 * Cálculo completo de un batch de jabón
 */
export interface SoapCalculation {
  /** Receta utilizada */
  recipe: Recipe;

  /** Peso objetivo del batch */
  targetWeight: number;

  /** Cantidad de jabones si el cálculo se hizo por unidades */
  soapCount?: number;

  /** Peso estimado de cada jabón si el cálculo se hizo por unidades */
  gramsPerSoap?: number;

  /** Modo de cálculo utilizado */
  mode?: 'grams' | 'soapCount';

  /** Desglose de aceites necesarios */
  oils: IngredientBreakdown[];

  /** Gramos de sosa cáustica (NaOH) necesarios */
  lyeGrams: number;

  /** Gramos de agua necesarios */
  waterGrams: number;

  /** Costo total del batch */
  totalCost: number;

  /** Indica si hay suficiente stock de todos los ingredientes */
  canMakeBatch: boolean;

  /** Alertas de ingredientes faltantes */
  alerts: string[];
}

/**
 * Datos de solicitud para calcular un batch
 */
export interface CalculationRequest {
  /** ID de la receta a calcular */
  recipeId: string;

  /** Peso objetivo del batch en gramos */
  targetWeight?: number;

  /** Cantidad de jabones a producir */
  soapCount?: number;

  /** Peso objetivo por jabón en gramos */
  gramsPerSoap?: number;
}

/**
 * Respuesta del cálculo de un batch
 */
export interface CalculationResponse {
  /** Indica si el cálculo fue exitoso */
  success: boolean;

  /** Cálculo completo del batch */
  calculation?: SoapCalculation;

  /** Mensaje de error (si aplica) */
  error?: string;
}

/**
 * Representa una categoría general (para ingredientes, productos, o transacciones)
 */
export interface Category {
  id: string;
  name: string;
  description: string;
  type: 'ingredient' | 'product' | 'transaction';
}

/**
 * Representa una transacción financiera (ingresos, egresos, inversiones)
 */
export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'investment';
  amount: number;
  description: string;
  date: string;
  categoryId?: string;
  referenceId?: string; // ID relacionado (ej. factura, movimiento, producto)
}

/**
 * Representa un Producto Final derivado de una receta
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  categoryId?: string;
  baseRecipeId: string;
}

/**
 * Representa una Variante de un Producto (ej. Jabón de 100g)
 */
export interface ProductVariant {
  id: string;
  productId: string;
  weight: number;
  sku: string;
  price: number;
  stock: number;
}

/**
 * Representa un Paquete (Pack) de variantes (ej. Pack de 3 jabones)
 */
export interface ProductPack {
  id: string;
  variantId: string;
  unitCount: number;
  price: number;
  sku: string;
}

