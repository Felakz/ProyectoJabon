import { Package, DollarSign, TrendingUp, Beaker } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardProps {
  ingredients: any[];
  recipes: any[];
}

export function Dashboard({ ingredients, recipes }: DashboardProps) {
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Package className="w-6 h-6" />}
          title="Ingredientes"
          value={totalIngredients.toString()}
          subtitle="tipos en inventario"
          color="bg-emerald-500"
        />
        <StatCard
          icon={<Beaker className="w-6 h-6" />}
          title="Stock Total"
          value={`${Math.round(totalStock)}g`}
          subtitle="material disponible"
          color="bg-blue-500"
        />
        <StatCard
          icon={<DollarSign className="w-6 h-6" />}
          title="Valor Inventario"
          value={formatCurrency(totalValue)}
          subtitle="inversión total"
          color="bg-purple-500"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="Recetas"
          value={totalRecipes.toString()}
          subtitle="fórmulas guardadas"
          color="bg-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="font-semibold mb-4">Stock por Ingrediente</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stockData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="stock" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="font-semibold mb-4">Distribución de Valor</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={stockData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => entry.name}
                outerRadius={80}
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

      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-6 border border-emerald-200">
        <h3 className="font-semibold mb-2">🧼 Bienvenido a tu Sistema de Gestión de Jabones</h3>
        <p className="text-sm text-gray-600">
          Administra tu inventario, calcula recetas con precisión química y controla tus costos de producción.
        </p>
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
