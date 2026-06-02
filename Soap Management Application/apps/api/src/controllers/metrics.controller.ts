import { Request, Response } from 'express';
import { getAllIngredients, getAllRecipes, getCurrentInvoice } from '../db/sqlite';

type DashboardMetric = {
  label: string;
  value: string;
  hint: string;
  tone: 'rose' | 'sky' | 'emerald' | 'amber';
};

export const getDashboardMetrics = (req: Request, res: Response): void => {
  try {
    const lowStockThreshold = Number(req.query.lowStockThreshold ?? 1000);
    const ingredients = getAllIngredients();
    const recipes = getAllRecipes();
    const currentInvoice = getCurrentInvoice();

    const totalStock = ingredients.reduce((sum: number, ingredient: any) => sum + Number(ingredient.currentStock || 0), 0);
    const totalValue = ingredients.reduce((sum: number, ingredient: any) => sum + Number(ingredient.totalCost || 0), 0);
    const lowStockIngredients = ingredients
      .filter((ingredient: any) => Number(ingredient.currentStock || 0) <= lowStockThreshold)
      .sort((a: any, b: any) => Number(a.currentStock || 0) - Number(b.currentStock || 0));

    const metrics: DashboardMetric[] = [
      {
        label: 'Ingredientes',
        value: String(ingredients.length),
        hint: 'tipos registrados',
        tone: 'sky',
      },
      {
        label: 'Stock total',
        value: `${Math.round(totalStock)} g`,
        hint: 'material disponible',
        tone: 'emerald',
      },
      {
        label: 'Valor inventario',
        value: `S/ ${totalValue.toFixed(2)}`,
        hint: 'inversión acumulada',
        tone: 'rose',
      },
      {
        label: 'Recetas',
        value: String(recipes.length),
        hint: 'fórmulas guardadas',
        tone: 'amber',
      },
    ];

    res.status(200).json({
      success: true,
      data: {
        metrics,
        lowStockThreshold,
        lowStockIngredients: lowStockIngredients.slice(0, 6),
        recentProductions: recipes.slice(0, 5).map((recipe: any) => ({
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          targetWeight: recipe.targetWeight,
        })),
        recentSales: currentInvoice
          ? [
              {
                invoice: currentInvoice.invoice?.fullNumber ?? 'B001-000',
                customer: currentInvoice.customer?.name ?? 'Cliente pendiente',
                total: Number(currentInvoice.calculation?.totalCost ?? 0),
              },
            ]
          : [],
        quickLinks: [
          { label: 'Ir a Inventario', target: 'inventory' },
          { label: 'Ver Recetas', target: 'recipes' },
          { label: 'Abrir Facturación', target: 'facturacion' },
        ],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener métricas del dashboard',
      details: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};