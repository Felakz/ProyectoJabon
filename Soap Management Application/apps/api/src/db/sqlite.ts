import fs from 'fs';
import path from 'path';
import type { Ingredient, Recipe } from '../../../../packages/shared/src/types';

type InvoiceState = {
  series: string;
  lastNumber: number;
};

type DatabaseInstance = {
  prepare: (sql: string) => any;
  transaction: <T>(fn: (arg: T) => void) => (arg: T) => void;
  exec: (sql: string) => void;
};

let Database: any;
try {
  Database = require('better-sqlite3');
} catch (error) {
  Database = null;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'jabones.sqlite');
const INGREDIENTS_JSON = path.join(DATA_DIR, 'ingredients.json');
const RECIPES_JSON = path.join(DATA_DIR, 'recipes.json');
const INVOICE_JSON = path.join(DATA_DIR, 'invoice.json');
const CURRENT_INVOICE_JSON = path.join(DATA_DIR, 'current-invoice.json');

const DEFAULT_INGREDIENTS: Ingredient[] = [
  {
    id: '1',
    name: 'Aceite de Oliva Extra Virgen',
    currentStock: 5000,
    totalCost: 3500,
    costPerGram: 0.7,
    sapValue: 190,
  },
];

const DEFAULT_RECIPES: Recipe[] = [
  {
    id: '1',
    name: 'Receta Simple Suave',
    description: 'Receta demostrativa usando Aceite de Oliva',
    targetWeight: 1000,
    ingredients: [{ ingredientId: '1', percentage: 100 }],
    overfattingPercentage: 5,
    waterDiscountPercentage: 0,
  },
];

const DEFAULT_INVOICE_STATE: InvoiceState = {
  series: 'B001',
  lastNumber: 0,
};

let db: DatabaseInstance | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
    }
  } catch (error) {
    console.error(`Error leyendo ${path.basename(filePath)}`, error);
  }
  return fallback;
}

function normalizeIngredient(ingredient: Partial<Ingredient> & { id: string }): Ingredient {
  const currentStock = Number(ingredient.currentStock ?? 0);
  const totalCost = Number(ingredient.totalCost ?? 0);
  const costPerGram = currentStock > 0
    ? Number(((ingredient.costPerGram ?? totalCost / currentStock) || 0).toFixed(3))
    : Number((ingredient.costPerGram ?? 0).toFixed(3));

  return {
    id: String(ingredient.id),
    name: String(ingredient.name ?? ''),
    currentStock,
    totalCost: Number(totalCost.toFixed(2)),
    costPerGram,
    sapValue: Number(ingredient.sapValue ?? 0),
  };
}

function normalizeRecipe(recipe: Partial<Recipe> & { id: string }): Recipe {
  return {
    id: String(recipe.id),
    name: String(recipe.name ?? ''),
    description: String(recipe.description ?? ''),
    targetWeight: Number(recipe.targetWeight ?? 0),
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients as Recipe['ingredients'] : [],
    overfattingPercentage: Number(recipe.overfattingPercentage ?? 5),
    waterDiscountPercentage: Number(recipe.waterDiscountPercentage ?? 0),
  };
}

function getDb(): DatabaseInstance {
  if (!Database) {
    throw new Error('better-sqlite3 no está instalado. Ejecuta npm install en apps/api');
  }

  if (!db) {
    ensureDataDir();
    db = new Database(DB_FILE) as DatabaseInstance;
  }

  return db;
}

function seedIfEmpty() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      currentStock REAL NOT NULL DEFAULT 0,
      totalCost REAL NOT NULL DEFAULT 0,
      costPerGram REAL NOT NULL DEFAULT 0,
      sapValue REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      targetWeight REAL NOT NULL DEFAULT 0,
      ingredients TEXT NOT NULL DEFAULT '[]',
      overfattingPercentage REAL NOT NULL DEFAULT 5,
      waterDiscountPercentage REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS invoice_state (
      series TEXT PRIMARY KEY,
      lastNumber INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS current_invoice (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  const ingredientCount = database.prepare('SELECT COUNT(*) as count FROM ingredients').get() as { count: number };
  if (ingredientCount.count === 0) {
    const ingredients = readJsonFile<Ingredient[]>(INGREDIENTS_JSON, DEFAULT_INGREDIENTS).map(normalizeIngredient);
    const insertIngredients = database.prepare(
      'INSERT INTO ingredients (id, name, currentStock, totalCost, costPerGram, sapValue) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insertTransaction = database.transaction((items: Ingredient[]) => {
      for (const item of items) {
        insertIngredients.run(item.id, item.name, item.currentStock, item.totalCost, item.costPerGram, item.sapValue);
      }
    });
    insertTransaction(ingredients);
  }

  const recipeCount = database.prepare('SELECT COUNT(*) as count FROM recipes').get() as { count: number };
  if (recipeCount.count === 0) {
    const recipes = readJsonFile<Recipe[]>(RECIPES_JSON, DEFAULT_RECIPES).map(normalizeRecipe);
    const insertRecipe = database.prepare(
      'INSERT INTO recipes (id, name, description, targetWeight, ingredients, overfattingPercentage, waterDiscountPercentage) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const insertTransaction = database.transaction((items: Recipe[]) => {
      for (const item of items) {
        insertRecipe.run(
          item.id,
          item.name,
          item.description,
          item.targetWeight,
          JSON.stringify(item.ingredients ?? []),
          item.overfattingPercentage,
          item.waterDiscountPercentage,
        );
      }
    });
    insertTransaction(recipes);
  }

  const invoiceStateCount = database.prepare('SELECT COUNT(*) as count FROM invoice_state').get() as { count: number };
  if (invoiceStateCount.count === 0) {
    const invoiceState = readJsonFile<InvoiceState>(INVOICE_JSON, DEFAULT_INVOICE_STATE);
    database.prepare('INSERT INTO invoice_state (series, lastNumber) VALUES (?, ?)').run(
      invoiceState.series || DEFAULT_INVOICE_STATE.series,
      Number(invoiceState.lastNumber ?? 0),
    );
  }

  const currentInvoiceCount = database.prepare('SELECT COUNT(*) as count FROM current_invoice').get() as { count: number };
  if (currentInvoiceCount.count === 0) {
    const currentInvoice = readJsonFile<any | null>(CURRENT_INVOICE_JSON, null);
    if (currentInvoice) {
      database.prepare('INSERT INTO current_invoice (id, payload, updatedAt) VALUES (1, ?, ?)').run(
        JSON.stringify(currentInvoice),
        new Date().toISOString(),
      );
    }
  }
}

export function init() {
  const database = getDb();
  seedIfEmpty();
  return database;
}

export function isAvailable() {
  return !!Database;
}

// Ingredients
export function getAllIngredients() {
  init();
  return getDb().prepare('SELECT * FROM ingredients ORDER BY CAST(id AS INTEGER) ASC').all();
}

export function getIngredientById(id: string) {
  init();
  return getDb().prepare('SELECT * FROM ingredients WHERE id = ?').get(id);
}

export function createIngredient(ingredient: Ingredient) {
  init();
  getDb().prepare(
    'INSERT INTO ingredients (id, name, currentStock, totalCost, costPerGram, sapValue) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(ingredient.id, ingredient.name, ingredient.currentStock, ingredient.totalCost, ingredient.costPerGram, ingredient.sapValue);
  return getIngredientById(ingredient.id);
}

export function updateIngredient(id: string, ingredient: Ingredient) {
  init();
  getDb().prepare(
    'UPDATE ingredients SET name = ?, currentStock = ?, totalCost = ?, costPerGram = ?, sapValue = ? WHERE id = ?'
  ).run(ingredient.name, ingredient.currentStock, ingredient.totalCost, ingredient.costPerGram, ingredient.sapValue, id);
  return getIngredientById(id);
}

export function deleteIngredient(id: string) {
  init();
  const existing = getIngredientById(id);
  getDb().prepare('DELETE FROM ingredients WHERE id = ?').run(id);
  return existing;
}

export function adjustStock(id: string, adjustment: number) {
  init();
  const ingredient = getIngredientById(id) as Ingredient | undefined;
  if (!ingredient) return null;

  const newStock = ingredient.currentStock + adjustment;
  if (newStock < 0) return null;

  const newTotalCost = Math.round((ingredient.costPerGram * newStock) * 100) / 100;
  getDb().prepare('UPDATE ingredients SET currentStock = ?, totalCost = ? WHERE id = ?').run(newStock, newTotalCost, id);
  return getIngredientById(id);
}

// Recipes
export function getAllRecipes() {
  init();
  const rows = getDb().prepare('SELECT * FROM recipes ORDER BY CAST(id AS INTEGER) ASC').all() as any[];
  return rows.map(row => ({ ...row, ingredients: JSON.parse(row.ingredients || '[]') }));
}

export function getRecipeById(id: string) {
  init();
  const row = getDb().prepare('SELECT * FROM recipes WHERE id = ?').get(id) as any;
  if (!row) return null;
  return { ...row, ingredients: JSON.parse(row.ingredients || '[]') };
}

export function createRecipe(recipe: Recipe) {
  init();
  getDb().prepare(
    'INSERT INTO recipes (id, name, description, targetWeight, ingredients, overfattingPercentage, waterDiscountPercentage) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    recipe.id,
    recipe.name,
    recipe.description,
    recipe.targetWeight,
    JSON.stringify(recipe.ingredients || []),
    recipe.overfattingPercentage,
    recipe.waterDiscountPercentage,
  );
  return getRecipeById(recipe.id);
}

export function updateRecipe(id: string, recipe: Recipe) {
  init();
  getDb().prepare(
    'UPDATE recipes SET name = ?, description = ?, targetWeight = ?, ingredients = ?, overfattingPercentage = ?, waterDiscountPercentage = ? WHERE id = ?'
  ).run(
    recipe.name,
    recipe.description,
    recipe.targetWeight,
    JSON.stringify(recipe.ingredients || []),
    recipe.overfattingPercentage,
    recipe.waterDiscountPercentage,
    id,
  );
  return getRecipeById(id);
}

export function deleteRecipe(id: string) {
  init();
  const recipe = getRecipeById(id);
  getDb().prepare('DELETE FROM recipes WHERE id = ?').run(id);
  return recipe;
}

// Invoice state
export function getInvoiceState() {
  init();
  const row = getDb().prepare('SELECT series, lastNumber FROM invoice_state LIMIT 1').get() as InvoiceState | undefined;
  return row || DEFAULT_INVOICE_STATE;
}

export function nextInvoiceNumber() {
  init();
  const current = getInvoiceState();
  const next = {
    series: current.series || DEFAULT_INVOICE_STATE.series,
    lastNumber: Number(current.lastNumber || 0) + 1,
  };

  getDb().prepare('UPDATE invoice_state SET lastNumber = ? WHERE series = ?').run(next.lastNumber, next.series);
  return next;
}

export function saveCurrentInvoice(payload: any) {
  init();
  getDb().prepare(
    'INSERT INTO current_invoice (id, payload, updatedAt) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updatedAt = excluded.updatedAt'
  ).run(JSON.stringify(payload), new Date().toISOString());
  return payload;
}

export function getCurrentInvoice() {
  init();
  const row = getDb().prepare('SELECT payload FROM current_invoice WHERE id = 1').get() as { payload: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.payload);
  } catch (error) {
    console.error('Error parseando current_invoice payload', error);
    return null;
  }
}

export default {
  isAvailable,
  init,
  getAllIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  adjustStock,
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getInvoiceState,
  nextInvoiceNumber,
  saveCurrentInvoice,
  getCurrentInvoice,
};
