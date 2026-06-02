import fs from 'fs';
import path from 'path';
import type { Ingredient, Recipe, Category, Transaction, Product, ProductVariant } from '../../../../packages/shared/src/types';

type InvoiceState = {
  series: string;
  lastNumber: number;
};

type InventoryMovement = {
  id: string;
  ingredientId: string;
  type: 'ingreso' | 'egreso' | 'ajuste';
  quantity: number;
  reason: string;
  location: string;
  beforeStock: number;
  afterStock: number;
  createdAt: string;
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
const MOVEMENTS_JSON = path.join(DATA_DIR, 'movements.json');

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

const DEFAULT_LOCATION = 'Almacén Principal';

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

function normalizeIngredient(ingredient: any): any {
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
    categoryId: ingredient.categoryId ? String(ingredient.categoryId) : undefined,
    price: Number(ingredient.price ?? 0),
    weight: Number(ingredient.weight ?? 0),
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

  // 1. Crear tablas fundamentales independientes
  database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL
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

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      isDefault INTEGER NOT NULL DEFAULT 0
    );
  `);

  // 2. Crear tabla de ingredientes con soporte inicial para categoryId, price y weight
  database.exec(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      currentStock REAL NOT NULL DEFAULT 0,
      totalCost REAL NOT NULL DEFAULT 0,
      costPerGram REAL NOT NULL DEFAULT 0,
      sapValue REAL NOT NULL DEFAULT 0,
      categoryId TEXT,
      price REAL NOT NULL DEFAULT 0,
      weight REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  // 3. Crear tablas dependientes contables y catálogo
  database.exec(`
    CREATE TABLE IF NOT EXISTS movements (
      id TEXT PRIMARY KEY,
      ingredientId TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '${DEFAULT_LOCATION}',
      beforeStock REAL NOT NULL,
      afterStock REAL NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (ingredientId) REFERENCES ingredients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      categoryId TEXT,
      referenceId TEXT,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      categoryId TEXT,
      baseRecipeId TEXT,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (baseRecipeId) REFERENCES recipes(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      productId TEXT NOT NULL,
      weight REAL NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      price REAL NOT NULL,
      stock REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS product_packs (
      id TEXT PRIMARY KEY,
      variantId TEXT NOT NULL,
      unitCount INTEGER NOT NULL DEFAULT 1,
      price REAL NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      FOREIGN KEY (variantId) REFERENCES product_variants(id) ON DELETE CASCADE
    );
  `);

  // 4. Migración dinámica: Verificar si la columna categoryId, price y weight existen en ingredients por si la base de datos ya existía
  const columns = database.prepare("PRAGMA table_info(ingredients)").all() as any[];
  const hasCategoryId = columns.some(col => col.name === 'categoryId');
  if (!hasCategoryId) {
    try {
      database.exec("ALTER TABLE ingredients ADD COLUMN categoryId TEXT REFERENCES categories(id) ON DELETE SET NULL;");
      console.log("Migración exitosa: Columna categoryId añadida a la tabla ingredients.");
    } catch (e) {
      console.error("Error al añadir la columna categoryId a ingredients:", e);
    }
  }

  const hasPrice = columns.some(col => col.name === 'price');
  if (!hasPrice) {
    try {
      database.exec("ALTER TABLE ingredients ADD COLUMN price REAL NOT NULL DEFAULT 0;");
      console.log("Migración exitosa: Columna price añadida a la tabla ingredients.");
    } catch (e) {
      console.error("Error al añadir la columna price a ingredients:", e);
    }
  }

  const hasWeight = columns.some(col => col.name === 'weight');
  if (!hasWeight) {
    try {
      database.exec("ALTER TABLE ingredients ADD COLUMN weight REAL NOT NULL DEFAULT 0;");
      console.log("Migración exitosa: Columna weight añadida a la tabla ingredients.");
    } catch (e) {
      console.error("Error al añadir la columna weight a ingredients:", e);
    }
  }

  // 5. Sembrar Categorías Predeterminadas
  const categoryCount = database.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (categoryCount.count === 0) {
    const defaultCategories = [
      { id: 'cat-mat-prima', name: 'Materia Prima', description: 'Aceites, mantecas y componentes base', type: 'ingredient' },
      { id: 'cat-empaque', name: 'Empaques', description: 'Cajas, etiquetas y envolturas', type: 'ingredient' },
      { id: 'cat-esencias', name: 'Esencias y Aditivos', description: 'Fragancias, colorantes y exfoliantes', type: 'ingredient' },
      { id: 'cat-jabon-art', name: 'Jabones Artesanales', description: 'Jabones en barra terminados', type: 'product' },
      { id: 'cat-kits', name: 'Kits y Regalos', description: 'Packs de productos combinados', type: 'product' },
      { id: 'cat-venta', name: 'Ventas de Productos', description: 'Ingresos por venta al público', type: 'transaction' },
      { id: 'cat-compra-ins', name: 'Compra de Insumos', description: 'Egreso por adquisición de materia prima', type: 'transaction' },
      { id: 'cat-gasto-op', name: 'Gastos Operativos', description: 'Luz, agua, servicios y otros gastos', type: 'transaction' },
    ];

    const insertCategory = database.prepare(
      'INSERT INTO categories (id, name, description, type) VALUES (?, ?, ?, ?)'
    );
    const insertTransaction = database.transaction((items: any[]) => {
      for (const item of items) {
        insertCategory.run(item.id, item.name, item.description, item.type);
      }
    });
    insertTransaction(defaultCategories);
    console.log("Siembra de categorías completada con éxito.");

    // Relacionar ingredientes iniciales huérfanos con Materia Prima por defecto
    try {
      database.exec("UPDATE ingredients SET categoryId = 'cat-mat-prima' WHERE categoryId IS NULL;");
    } catch (e) {
      console.error("Error al asignar categoría predeterminada a ingredientes:", e);
    }
  }

  // 6. Sembrar Ingredientes
  const ingredientCount = database.prepare('SELECT COUNT(*) as count FROM ingredients').get() as { count: number };
  if (ingredientCount.count === 0) {
    const ingredients = readJsonFile<Ingredient[]>(INGREDIENTS_JSON, DEFAULT_INGREDIENTS).map(normalizeIngredient);
    const insertIngredients = database.prepare(
      'INSERT INTO ingredients (id, name, currentStock, totalCost, costPerGram, sapValue, categoryId) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const insertTransaction = database.transaction((items: Ingredient[]) => {
      for (const item of items) {
        insertIngredients.run(
          item.id,
          item.name,
          item.currentStock,
          item.totalCost,
          item.costPerGram,
          item.sapValue,
          item.categoryId || 'cat-mat-prima'
        );
      }
    });
    insertTransaction(ingredients);
  }

  // 7. Sembrar Recetas
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

  // 8. Sembrar Estado de Factura
  const invoiceStateCount = database.prepare('SELECT COUNT(*) as count FROM invoice_state').get() as { count: number };
  if (invoiceStateCount.count === 0) {
    const invoiceState = readJsonFile<InvoiceState>(INVOICE_JSON, DEFAULT_INVOICE_STATE);
    database.prepare('INSERT INTO invoice_state (series, lastNumber) VALUES (?, ?)').run(
      invoiceState.series || DEFAULT_INVOICE_STATE.series,
      Number(invoiceState.lastNumber ?? 0),
    );
  }

  // 9. Sembrar Factura Actual
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

  // 10. Sembrar Ubicaciones
  const locationCount = database.prepare('SELECT COUNT(*) as count FROM locations').get() as { count: number };
  if (locationCount.count === 0) {
    database.prepare('INSERT INTO locations (name, isDefault) VALUES (?, 1)').run(DEFAULT_LOCATION);
  }

  // 11. Sembrar Movimientos
  const movementCount = database.prepare('SELECT COUNT(*) as count FROM movements').get() as { count: number };
  if (movementCount.count === 0) {
    const movements = readJsonFile<InventoryMovement[]>(MOVEMENTS_JSON, []).map((movement) => ({
      ...movement,
      type: movement.type || 'ajuste',
      reason: movement.reason || '',
      location: movement.location || DEFAULT_LOCATION,
      createdAt: movement.createdAt || new Date().toISOString(),
    }));
    const insertMovement = database.prepare(
      'INSERT INTO movements (id, ingredientId, type, quantity, reason, location, beforeStock, afterStock, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertTransaction = database.transaction((items: InventoryMovement[]) => {
      for (const item of items) {
        insertMovement.run(item.id, item.ingredientId, item.type, item.quantity, item.reason, item.location, item.beforeStock, item.afterStock, item.createdAt);
      }
    });
    insertTransaction(movements);
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

export function createIngredient(ingredient: any) {
  init();
  getDb().prepare(
    'INSERT INTO ingredients (id, name, currentStock, totalCost, costPerGram, sapValue, categoryId, price, weight) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    ingredient.id,
    ingredient.name,
    ingredient.currentStock,
    ingredient.totalCost,
    ingredient.costPerGram,
    ingredient.sapValue,
    ingredient.categoryId || null,
    ingredient.price || 0,
    ingredient.weight || 0
  );
  return getIngredientById(ingredient.id);
}

export function updateIngredient(id: string, ingredient: any) {
  init();
  getDb().prepare(
    'UPDATE ingredients SET name = ?, currentStock = ?, totalCost = ?, costPerGram = ?, sapValue = ?, categoryId = ?, price = ?, weight = ? WHERE id = ?'
  ).run(
    ingredient.name,
    ingredient.currentStock,
    ingredient.totalCost,
    ingredient.costPerGram,
    ingredient.sapValue,
    ingredient.categoryId || null,
    ingredient.price || 0,
    ingredient.weight || 0,
    id
  );
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
  recordMovement({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ingredientId: id,
    type: adjustment >= 0 ? 'ingreso' : 'egreso',
    quantity: Math.abs(adjustment),
    reason: 'Ajuste de stock',
    location: DEFAULT_LOCATION,
    beforeStock: ingredient.currentStock,
    afterStock: newStock,
    createdAt: new Date().toISOString(),
  });
  getDb().prepare('UPDATE ingredients SET currentStock = ?, totalCost = ? WHERE id = ?').run(newStock, newTotalCost, id);
  return getIngredientById(id);
}

function recordMovement(movement: InventoryMovement) {
  init();
  getDb().prepare(
    'INSERT INTO movements (id, ingredientId, type, quantity, reason, location, beforeStock, afterStock, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    movement.id,
    movement.ingredientId,
    movement.type,
    movement.quantity,
    movement.reason,
    movement.location,
    movement.beforeStock,
    movement.afterStock,
    movement.createdAt,
  );
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

export function getAllMovements(filters?: { categoryId?: string; startDate?: string; endDate?: string }) {
  init();
  let sql = 'SELECT movements.*, ingredients.name as ingredientName FROM movements LEFT JOIN ingredients ON ingredients.id = movements.ingredientId';
  const params: any[] = [];
  const clauses: string[] = [];

  if (filters?.categoryId) {
    clauses.push('ingredients.categoryId = ?');
    params.push(filters.categoryId);
  }
  if (filters?.startDate) {
    clauses.push('movements.createdAt >= ?');
    params.push(filters.startDate);
  }
  if (filters?.endDate) {
    clauses.push('movements.createdAt <= ?');
    params.push(filters.endDate);
  }

  if (clauses.length > 0) {
    sql += ' WHERE ' + clauses.join(' AND ');
  }

  sql += ' ORDER BY createdAt DESC';
  return getDb().prepare(sql).all(...params);
}

export function createMovement(movement: InventoryMovement) {
  recordMovement(movement);
  return getDb().prepare('SELECT movements.*, ingredients.name as ingredientName FROM movements LEFT JOIN ingredients ON ingredients.id = movements.ingredientId WHERE movements.id = ?').get(movement.id);
}

export function getLocations() {
  init();
  return getDb().prepare('SELECT * FROM locations ORDER BY isDefault DESC, name ASC').all();
}

// Categories CRUD
export function getAllCategories(type?: string) {
  init();
  if (type) {
    return getDb().prepare('SELECT * FROM categories WHERE type = ? ORDER BY name ASC').all(type);
  }
  return getDb().prepare('SELECT * FROM categories ORDER BY name ASC').all();
}

export function getCategoryById(id: string) {
  init();
  return getDb().prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

export function createCategory(category: Category) {
  init();
  getDb().prepare(
    'INSERT INTO categories (id, name, description, type) VALUES (?, ?, ?, ?)'
  ).run(category.id, category.name, category.description, category.type);
  return getCategoryById(category.id);
}

export function updateCategory(id: string, category: Category) {
  init();
  getDb().prepare(
    'UPDATE categories SET name = ?, description = ?, type = ? WHERE id = ?'
  ).run(category.name, category.description, category.type, id);
  return getCategoryById(id);
}

export function deleteCategory(id: string) {
  init();
  const existing = getCategoryById(id);
  getDb().prepare('DELETE FROM categories WHERE id = ?').run(id);
  return existing;
}

// Transactions CRUD
export function getAllTransactions(filters?: { type?: string; categoryId?: string; startDate?: string; endDate?: string }) {
  init();
  let sql = 'SELECT transactions.*, categories.name as categoryName FROM transactions LEFT JOIN categories ON categories.id = transactions.categoryId';
  const params: any[] = [];
  const clauses: string[] = [];

  if (filters?.type) {
    clauses.push('transactions.type = ?');
    params.push(filters.type);
  }
  if (filters?.categoryId) {
    clauses.push('transactions.categoryId = ?');
    params.push(filters.categoryId);
  }
  if (filters?.startDate) {
    clauses.push('transactions.date >= ?');
    params.push(filters.startDate);
  }
  if (filters?.endDate) {
    clauses.push('transactions.date <= ?');
    params.push(filters.endDate);
  }

  if (clauses.length > 0) {
    sql += ' WHERE ' + clauses.join(' AND ');
  }

  sql += ' ORDER BY date DESC, id DESC';
  return getDb().prepare(sql).all(...params);
}

export function getTransactionById(id: string) {
  init();
  return getDb().prepare(
    'SELECT transactions.*, categories.name as categoryName FROM transactions LEFT JOIN categories ON categories.id = transactions.categoryId WHERE transactions.id = ?'
  ).get(id);
}

export function createTransaction(transaction: Transaction) {
  init();
  getDb().prepare(
    'INSERT INTO transactions (id, type, amount, description, date, categoryId, referenceId) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    transaction.id,
    transaction.type,
    transaction.amount,
    transaction.description,
    transaction.date,
    transaction.categoryId || null,
    transaction.referenceId || null
  );
  return getTransactionById(transaction.id);
}

export function updateTransaction(id: string, transaction: Transaction) {
  init();
  getDb().prepare(
    'UPDATE transactions SET type = ?, amount = ?, description = ?, date = ?, categoryId = ?, referenceId = ? WHERE id = ?'
  ).run(
    transaction.type,
    transaction.amount,
    transaction.description,
    transaction.date,
    transaction.categoryId || null,
    transaction.referenceId || null,
    id
  );
  return getTransactionById(id);
}

export function deleteTransaction(id: string) {
  init();
  const existing = getTransactionById(id);
  getDb().prepare('DELETE FROM transactions WHERE id = ?').run(id);
  return existing;
}

// Products & Variants CRUD
export function getAllProducts() {
  init();
  const dbInstance = getDb();
  const products = dbInstance.prepare(
    'SELECT products.*, categories.name as categoryName, recipes.name as recipeName FROM products LEFT JOIN categories ON categories.id = products.categoryId LEFT JOIN recipes ON recipes.id = products.baseRecipeId ORDER BY products.name ASC'
  ).all() as any[];

  for (const product of products) {
    product.variants = dbInstance.prepare('SELECT * FROM product_variants WHERE productId = ?').all(product.id);
  }
  return products;
}

export function getProductById(id: string) {
  init();
  const product = getDb().prepare(
    'SELECT products.*, categories.name as categoryName, recipes.name as recipeName FROM products LEFT JOIN categories ON categories.id = products.categoryId LEFT JOIN recipes ON recipes.id = products.baseRecipeId WHERE products.id = ?'
  ).get(id);

  if (!product) return null;

  const variants = getDb().prepare('SELECT * FROM product_variants WHERE productId = ?').all(id);
  return { ...product, variants };
}

export function createProduct(product: Product) {
  init();
  getDb().prepare(
    'INSERT INTO products (id, name, description, categoryId, baseRecipeId) VALUES (?, ?, ?, ?, ?)'
  ).run(product.id, product.name, product.description, product.categoryId || null, product.baseRecipeId);
  return getProductById(product.id);
}

export function updateProduct(id: string, product: Product) {
  init();
  getDb().prepare(
    'UPDATE products SET name = ?, description = ?, categoryId = ?, baseRecipeId = ? WHERE id = ?'
  ).run(product.name, product.description, product.categoryId || null, product.baseRecipeId, id);
  return getProductById(id);
}

export function deleteProduct(id: string) {
  init();
  const existing = getProductById(id);
  getDb().prepare('DELETE FROM products WHERE id = ?').run(id);
  return existing;
}

export function createVariant(variant: ProductVariant) {
  init();
  getDb().prepare(
    'INSERT INTO product_variants (id, productId, weight, sku, price, stock) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(variant.id, variant.productId, variant.weight, variant.sku, variant.price, variant.stock);
  return getDb().prepare('SELECT * FROM product_variants WHERE id = ?').get(variant.id);
}

export function updateVariant(id: string, variant: ProductVariant) {
  init();
  getDb().prepare(
    'UPDATE product_variants SET weight = ?, sku = ?, price = ?, stock = ? WHERE id = ?'
  ).run(variant.weight, variant.sku, variant.price, variant.stock, id);
  return getDb().prepare('SELECT * FROM product_variants WHERE id = ?').get(id);
}

export function deleteVariant(id: string) {
  init();
  const existing = getDb().prepare('SELECT * FROM product_variants WHERE id = ?').get(id);
  getDb().prepare('DELETE FROM product_variants WHERE id = ?').run(id);
  return existing;
}

export function confirmBatchInvoiceSale(
  items: Array<{ variantId: string; quantity: number }>,
  clientData: { name: string; address?: string; idType?: string; idNumber?: string }
) {
  init();
  const database = getDb();
  
  // Reservar el correlativo oficial
  const next = nextInvoiceNumber();
  const invoiceNumber = `${next.series}-${next.lastNumber.toString().padStart(3, '0')}`;
  
  const updatedIngredients: any[] = [];
  
  // Ejecutar dentro de una transacción atómica de SQLite
  const sellTx = database.transaction(() => {
    for (const item of items) {
      const { variantId, quantity } = item;
      
      // 1. Obtener el producto del inventario
      const ingredient = database.prepare('SELECT * FROM ingredients WHERE id = ?').get(variantId) as any;
      if (!ingredient) {
        throw new Error(`El producto con ID ${variantId} no existe en el inventario.`);
      }
      
      // 2. Descontar el stock
      const newStock = ingredient.currentStock - quantity;
      
      // Registrar el movimiento de egreso en el inventario de forma automática
      const movementId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      database.prepare(`
        INSERT INTO movements (id, ingredientId, type, quantity, reason, location, beforeStock, afterStock, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        movementId,
        variantId,
        'egreso',
        quantity,
        `Venta - Boleta ${invoiceNumber}`,
        DEFAULT_LOCATION,
        ingredient.currentStock,
        newStock,
        new Date().toISOString()
      );

      // Calcular nuevo costo total (costPerGram * newStock)
      const newTotalCost = Math.round((ingredient.costPerGram * newStock) * 100) / 100;

      // Actualizar stock e importes en ingredients
      database.prepare('UPDATE ingredients SET currentStock = ?, totalCost = ? WHERE id = ?').run(newStock, newTotalCost, variantId);
      
      updatedIngredients.push({ ...ingredient, currentStock: newStock });
      
      // 3. Crear el Asiento Contable (Ingreso)
      const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const itemPrice = ingredient.price || 0;
      const itemWeight = ingredient.weight || 0;
      
      let clientDetailsStr = '';
      if (clientData.idType && clientData.idNumber) {
        clientDetailsStr += ` | Client: ${clientData.idType}:${clientData.idNumber}`;
      }
      if (clientData.address) {
        clientDetailsStr += ` | Dir: ${clientData.address}`;
      }

      database.prepare(`
        INSERT INTO transactions (id, type, amount, description, date, categoryId, referenceId)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        transactionId,
        'income',
        itemPrice * quantity,
        `Venta POS ${clientData.name || 'Clientes Varios'} - Boleta ${invoiceNumber} | Detalle: ${quantity}x ${ingredient.name} (${itemWeight}g)${clientDetailsStr}`,
        new Date().toISOString().split('T')[0], // YYYY-MM-DD
        'cat-venta',
        invoiceNumber
      );
    }
  });
  
  sellTx(null);
  
  return {
    invoiceNumber,
    ingredients: updatedIngredients,
    success: true
  };
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
  getAllMovements,
  createMovement,
  getLocations,
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createVariant,
  updateVariant,
  deleteVariant,
  confirmBatchInvoiceSale,
};
