import path from 'path';
import fs from 'fs';

let Database: any;
try {
  // require at runtime so project can still run without the package installed
  Database = require('better-sqlite3');
} catch (e) {
  Database = null;
}

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'jabones.sqlite');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

ensureDataDir();

let db: any = null;

export function isAvailable() {
  return !!Database;
}

export function init() {
  if (!Database) {
    throw new Error('better-sqlite3 no está instalado. Ejecuta `npm install better-sqlite3` en apps/api');
  }
  if (db) return db;
  db = new Database(DB_FILE);

  // Crear tablas si no existen
  db.prepare(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      currentStock REAL DEFAULT 0,
      totalCost REAL DEFAULT 0,
      costPerGram REAL DEFAULT 0,
      sapValue REAL DEFAULT 0
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      targetWeight REAL DEFAULT 0,
      ingredients TEXT,
      overfattingPercentage REAL DEFAULT 5,
      waterDiscountPercentage REAL DEFAULT 0
    )
  `).run();

  return db;
}

// Ingredients
export function getAllIngredients() {
  init();
  return db.prepare('SELECT * FROM ingredients').all();
}

export function getIngredientById(id: string) {
  init();
  return db.prepare('SELECT * FROM ingredients WHERE id = ?').get(id);
}

export function createIngredient(ing: any) {
  init();
  const stmt = db.prepare('INSERT INTO ingredients (id, name, currentStock, totalCost, costPerGram, sapValue) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.run(ing.id, ing.name, ing.currentStock, ing.totalCost, ing.costPerGram, ing.sapValue);
  return getIngredientById(ing.id);
}

export function updateIngredient(id: string, ing: any) {
  init();
  const stmt = db.prepare('UPDATE ingredients SET name = ?, currentStock = ?, totalCost = ?, costPerGram = ?, sapValue = ? WHERE id = ?');
  stmt.run(ing.name, ing.currentStock, ing.totalCost, ing.costPerGram, ing.sapValue, id);
  return getIngredientById(id);
}

export function deleteIngredient(id: string) {
  init();
  const existing = getIngredientById(id);
  db.prepare('DELETE FROM ingredients WHERE id = ?').run(id);
  return existing;
}

export function adjustStock(id: string, adjustment: number) {
  init();
  const ing = getIngredientById(id);
  if (!ing) return null;
  const newStock = ing.currentStock + adjustment;
  if (newStock < 0) return null;
  const newTotalCost = Math.round((ing.costPerGram * newStock) * 100) / 100;
  db.prepare('UPDATE ingredients SET currentStock = ?, totalCost = ? WHERE id = ?').run(newStock, newTotalCost, id);
  return getIngredientById(id);
}

// Recipes
export function getAllRecipes() {
  init();
  const rows = db.prepare('SELECT * FROM recipes').all();
  return rows.map((r: any) => ({ ...r, ingredients: JSON.parse(r.ingredients || '[]') }));
}

export function getRecipeById(id: string) {
  init();
  const r = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
  if (!r) return null;
  return { ...r, ingredients: JSON.parse(r.ingredients || '[]') };
}

export function createRecipe(recipe: any) {
  init();
  const stmt = db.prepare('INSERT INTO recipes (id, name, description, targetWeight, ingredients, overfattingPercentage, waterDiscountPercentage) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const ingredientsJson = JSON.stringify(recipe.ingredients || []);
  stmt.run(recipe.id, recipe.name, recipe.description, recipe.targetWeight, ingredientsJson, recipe.overfattingPercentage, recipe.waterDiscountPercentage);
  return getRecipeById(recipe.id);
}

export function updateRecipe(id: string, recipe: any) {
  init();
  const ingredientsJson = JSON.stringify(recipe.ingredients || []);
  db.prepare('UPDATE recipes SET name = ?, description = ?, targetWeight = ?, ingredients = ?, overfattingPercentage = ?, waterDiscountPercentage = ? WHERE id = ?')
    .run(recipe.name, recipe.description, recipe.targetWeight, ingredientsJson, recipe.overfattingPercentage, recipe.waterDiscountPercentage, id);
  return getRecipeById(id);
}

export function deleteRecipe(id: string) {
  init();
  const r = getRecipeById(id);
  db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
  return r;
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
};
