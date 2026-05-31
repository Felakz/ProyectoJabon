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
import { init as initDatabase } from './db/sqlite';

const app: Application = express();
const PORT = process.env.PORT || 3000;

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
app.get('/api/inventory/:id', getIngredientById);
app.post('/api/inventory', createIngredient);
app.put('/api/inventory/:id', updateIngredient);
app.delete('/api/inventory/:id', deleteIngredient);
app.patch('/api/inventory/:id/adjust-stock', adjustStock);

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

// Rutas de facturación (numeración)
app.get('/api/invoice', getInvoiceInfo);
app.post('/api/invoice/next', nextInvoiceNumber);
app.post('/api/invoice/current', saveCurrentInvoice);
app.get('/api/invoice/current', getCurrentInvoice);

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
app.listen(PORT, () => {
  console.log(`🧼 Servidor API de Jabones ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Health check disponible en http://localhost:${PORT}/health`);
});

export default app;
