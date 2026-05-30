import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Package, TrendingDown, TrendingUp } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  currentStock: number;
  totalCost: number;
  costPerGram: number;
  sapValue: number;
}

interface InventoryProps {
  ingredients: Ingredient[];
  onAdd: (ingredient: Omit<Ingredient, 'id'>) => void;
  onUpdate: (id: string, ingredient: Partial<Ingredient>) => void;
  onDelete: (id: string) => void;
}

export function Inventory({ ingredients, onAdd, onUpdate, onDelete }: InventoryProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    currentStock: '',
    totalCost: '',
    costPerGram: '',
    sapValue: '',
  });

  const syncCostFields = (field: 'totalCost' | 'costPerGram', value: string) => {
    const currentStock = parseFloat(formData.currentStock) || 0;

    if (field === 'costPerGram') {
      const costPerGram = parseFloat(value) || 0;
      setFormData({
        ...formData,
        costPerGram: value,
        totalCost: currentStock > 0 ? (costPerGram * currentStock).toFixed(2) : '',
      });
      return;
    }

    const totalCost = parseFloat(value) || 0;
    setFormData({
      ...formData,
      totalCost: value,
      costPerGram: currentStock > 0 ? (totalCost / currentStock).toFixed(3) : '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const ingredient = {
      name: formData.name,
      currentStock: parseFloat(formData.currentStock),
      totalCost: parseFloat(formData.totalCost),
      costPerGram: parseFloat(formData.costPerGram),
      sapValue: parseFloat(formData.sapValue),
    };

    if (editingId) {
      await onUpdate(editingId, ingredient);
      setEditingId(null);
    } else {
      await onAdd(ingredient);
    }

    setFormData({ name: '', currentStock: '', totalCost: '', costPerGram: '', sapValue: '' });
    setShowForm(false);
  };

  const handleEdit = (ingredient: Ingredient) => {
    setFormData({
      name: ingredient.name,
      currentStock: ingredient.currentStock.toString(),
      totalCost: ingredient.totalCost.toString(),
      costPerGram: ingredient.costPerGram.toString(),
      sapValue: ingredient.sapValue.toString(),
    });
    setEditingId(ingredient.id);
    setShowForm(true);
  };

  const getLowStockStatus = (stock: number) => {
    if (stock < 500) return 'critical';
    if (stock < 1000) return 'warning';
    return 'good';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Inventario de Ingredientes</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar Ingrediente
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="font-semibold mb-4">
            {editingId ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Ej: Aceite de Lavanda"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stock (gramos)</label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Costo Total (S/)</label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.totalCost}
                onChange={(e) => syncCostFields('totalCost', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="500.00"
              />
              <p className="mt-1 text-xs text-gray-500">Puedes modificar el costo total o el costo por gramo; ambos quedan sincronizados.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Costo por gramo (S/)</label>
              <input
                type="number"
                required
                step="0.001"
                value={formData.costPerGram}
                onChange={(e) => syncCostFields('costPerGram', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="0.500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Valor SAP (KOH)</label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.sapValue}
                onChange={(e) => setFormData({ ...formData, sapValue: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="190"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ name: '', currentStock: '', totalCost: '', costPerGram: '', sapValue: '' });
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ingrediente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Costo Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Costo/g (S/)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SAP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ingredients.map((ingredient) => {
                const stockStatus = getLowStockStatus(ingredient.currentStock);
                return (
                  <tr key={ingredient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="font-medium">{ingredient.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{ingredient.currentStock.toFixed(0)}g</span>
                        {stockStatus === 'critical' && (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        {stockStatus === 'warning' && (
                          <TrendingDown className="w-4 h-4 text-amber-500" />
                        )}
                        {stockStatus === 'good' && (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      S/ {ingredient.totalCost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      S/ {ingredient.costPerGram.toFixed(3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ingredient.sapValue}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(ingredient)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(ingredient.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
