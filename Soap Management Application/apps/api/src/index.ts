/**
 * @fileoverview Punto de entrada principal del servidor Express
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import {
  getAllIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  adjustStock,
  getAllMovements,
  createMovement,
  getLocations,
  bulkImportIngredients,
} from './controllers/inventory.controller';
import {
  processSoapCalculation,
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getFinancialSummary,
  validateRecipe,
} from './controllers/calculator.controller';
import { getInvoiceInfo, nextInvoiceNumber, saveCurrentInvoice, getCurrentInvoice } from './controllers/invoice.controller';
import { getDashboardMetrics } from './controllers/metrics.controller';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from './controllers/category.controller';
import {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from './controllers/transaction.controller';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createVariant,
  updateVariant,
  deleteVariant,
  sellBatchVariants,
} from './controllers/product.controller';
import { init as initDatabase } from './db/sqlite';

const app: Application = express();
const PORT = Number(process.env.PORT || 803);
const HOST = process.env.HOST || '0.0.0.0';

initDatabase();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'API de Gestión de Jabones funcionando correctamente',
    timestamp: new Date().toISOString(),
  });
});

// Rutas de Inventario
app.get('/api/inventory', getAllIngredients);
app.get('/api/inventory/movements', getAllMovements);
app.post('/api/inventory/movements', createMovement);
app.get('/api/inventory/locations', getLocations);
app.get('/api/inventory/:id', getIngredientById);
app.post('/api/inventory', createIngredient);
app.put('/api/inventory/:id', updateIngredient);
app.delete('/api/inventory/:id', deleteIngredient);
app.patch('/api/inventory/:id/adjust-stock', adjustStock);
app.post('/api/inventory/bulk', bulkImportIngredients);

// Rutas de Recetas
app.get('/api/calculator/recipes', getAllRecipes);
app.get('/api/calculator/recipes/:id', getRecipeById);
app.post('/api/calculator/recipes', createRecipe);
app.put('/api/calculator/recipes/:id', updateRecipe);
app.delete('/api/calculator/recipes/:id', deleteRecipe);

// Rutas de Cálculos
app.post('/api/calculator/calculate', processSoapCalculation);
app.post('/api/calculator/financial-summary', getFinancialSummary);
app.post('/api/calculator/validate-recipe', validateRecipe);

// Rutas del dashboard
app.get('/api/metrics', getDashboardMetrics);

// Rutas de facturación (numeración)
app.get('/api/invoice', getInvoiceInfo);
app.post('/api/invoice/next', nextInvoiceNumber);
app.post('/api/invoice/current', saveCurrentInvoice);
app.get('/api/invoice/current', getCurrentInvoice);

// Rutas de Categorías
app.get('/api/categories', getAllCategories);
app.get('/api/categories/:id', getCategoryById);
app.post('/api/categories', createCategory);
app.put('/api/categories/:id', updateCategory);
app.delete('/api/categories/:id', deleteCategory);

// Rutas de Transacciones
app.get('/api/transactions', getAllTransactions);
app.get('/api/transactions/:id', getTransactionById);
app.post('/api/transactions', createTransaction);
app.put('/api/transactions/:id', updateTransaction);
app.delete('/api/transactions/:id', deleteTransaction);

// Rutas de Productos y Variantes
app.get('/api/products', getAllProducts);
app.get('/api/products/:id', getProductById);
app.post('/api/products', createProduct);
app.put('/api/products/:id', updateProduct);
app.delete('/api/products/:id', deleteProduct);
app.post('/api/products/:productId/variants', createVariant);
app.put('/api/variants/:id', updateVariant);
app.delete('/api/variants/:id', deleteVariant);
app.post('/api/products/sell-batch', sellBatchVariants);

// Manejo de rutas no encontradas
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.path,
  });
});

// Manejo global de errores
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    details: err.message,
  });
});

// Iniciar servidor
app.listen(PORT, HOST, () => {
  console.log(`🧼 Servidor API de Jabones ejecutándose en http://${HOST}:${PORT}`);
  console.log(`📊 Health check disponible en http://${HOST}:${PORT}/health`);
});

export default app;
