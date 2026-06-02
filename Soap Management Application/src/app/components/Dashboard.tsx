import { Package, DollarSign, TrendingUp, Beaker, ArrowRight, Flame, BadgeDollarSign, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { DashboardMetricsResponse } from '../services/api';

interface DashboardProps {
  ingredients: any[];
  recipes: any[];
  metrics: DashboardMetricsResponse | null;
  onNavigate?: (tab: 'dashboard' | 'inventory' | 'calculator' | 'recipes' | 'facturacion') => void;
}

export function Dashboard({ ingredients, recipes, metrics, onNavigate }: DashboardProps) {
  const totalIngredients = ingredients.length;
  const totalStock = ingredients.reduce((sum, ing) => sum + ing.currentStock, 0);
  const totalValue = ingredients.reduce((sum, ing) => sum + ing.totalCost, 0);
  const totalRecipes = recipes.length;
  const formatCurrency = (value: number) => `S/ ${value.toFixed(2)}`;

  const stockData = ingredients.slice(0, 5).map(ing => ({
    name: ing.name.split(' ').slice(-1)[0],
    stock: ing.currentStock,
    value: ing.totalCost,
  }));

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
  const dashboardCards = metrics?.metrics ?? [
    { label: 'Ingredientes', value: totalIngredients.toString(), hint: 'tipos en inventario', tone: 'sky' as const },
    { label: 'Stock total', value: `${Math.round(totalStock)}g`, hint: 'material disponible', tone: 'emerald' as const },
    { label: 'Valor inventario', value: formatCurrency(totalValue), hint: 'inversión total', tone: 'rose' as const },
    { label: 'Recetas', value: totalRecipes.toString(), hint: 'fórmulas guardadas', tone: 'amber' as const },
  ];

  const toneClasses: Record<string, string> = {
    rose: 'from-rose-400 to-pink-500',
    sky: 'from-sky-400 to-blue-500',
    emerald: 'from-emerald-400 to-green-500',
    amber: 'from-amber-400 to-orange-500',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {dashboardCards.map((card) => (
          <div key={card.label} className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-1 text-3xl font-black text-slate-900">{card.value}</p>
                <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
              </div>
              <div className={`rounded-2xl bg-gradient-to-br ${toneClasses[card.tone]} p-3 text-white shadow-lg`}>
                {card.tone === 'rose' && <DollarSign className="h-5 w-5" />}
                {card.tone === 'sky' && <Package className="h-5 w-5" />}
                {card.tone === 'emerald' && <Beaker className="h-5 w-5" />}
                {card.tone === 'amber' && <TrendingUp className="h-5 w-5" />}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Stock por ingrediente</h3>
                <p className="text-sm text-slate-500">Vista rápida del inventario disponible</p>
              </div>
              <button onClick={() => onNavigate?.('inventory')} className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100">
                Ir a inventario <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stockData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
                <YAxis tick={{ fill: '#64748b' }} />
                <Tooltip />
                <Bar dataKey="stock" fill="#fb7185" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Distribución de valor</h3>
                <p className="text-sm text-slate-500">Concentración del costo del inventario</p>
              </div>
              <Sparkles className="h-5 w-5 text-sky-500" />
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stockData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => entry.name}
                  outerRadius={96}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stockData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Alertas de stock</h3>
                <p className="text-sm text-slate-500">Umbral configurado: {metrics ? `${metrics.lowStockThreshold}g` : '1000g'}</p>
              </div>
              <Flame className="h-5 w-5 text-amber-500" />
            </div>
            <div className="space-y-3">
              {(metrics?.lowStockIngredients ?? ingredients.filter((item) => item.currentStock <= 1000).slice(0, 6)).length === 0 ? (
                <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">No hay alertas activas. El stock está saludable.</div>
              ) : (
                (metrics?.lowStockIngredients ?? ingredients.filter((item) => item.currentStock <= 1000).slice(0, 6)).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">Costo actual S/ {Number(item.totalCost).toFixed(2)}</p>
                      </div>
                      <div className="rounded-full bg-white px-3 py-1 text-sm font-bold text-amber-700 shadow-sm">{Number(item.currentStock).toFixed(0)}g</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-100">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Acciones rápidas</h3>
                <p className="text-sm text-slate-500">Accesos directos a las áreas de trabajo</p>
              </div>
              <BadgeDollarSign className="h-5 w-5 text-rose-500" />
            </div>
            <div className="grid grid-cols-1 gap-3">
              {(
                metrics?.quickLinks?.length ? metrics.quickLinks : [
                  { label: 'Ir a Inventario', target: 'inventory' as const },
                  { label: 'Ver Recetas', target: 'recipes' as const },
                  { label: 'Abrir Facturación', target: 'facturacion' as const },
                ]
              ).map((link) => (
                <button
                  key={link.target}
                  onClick={() => onNavigate?.(link.target)}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                >
                  <span>{link.label}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-r from-rose-50 via-white to-sky-50 p-6 ring-1 ring-rose-100">
            <h3 className="font-bold text-slate-900">Bienvenido a tu sistema</h3>
            <p className="mt-2 text-sm text-slate-600">
              Controla inventario, fórmulas, cálculo de producción y facturación desde un solo panel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: string;
}

function StatCard({ icon, title, value, subtitle, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`${color} text-white p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
