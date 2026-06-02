import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Package, TrendingDown, TrendingUp, Upload, Filter, Calendar } from 'lucide-react';
import { api, type Category, type Ingredient, type InventoryMovement } from '../services/api';

interface InventoryProps {
  ingredients: Ingredient[];
  movements: InventoryMovement[];
  locations: Array<{ id: number; name: string; isDefault: number }>;
  categories: Category[];
  onAdd: (ingredient: Omit<Ingredient, 'id'>) => void;
  onUpdate: (id: string, ingredient: Partial<Ingredient>) => void;
  onDelete: (id: string) => void;
  onBulkImport: (ingredients: Array<Omit<Ingredient, 'id' | 'costPerGram'>>) => void;
}

export function Inventory({
  ingredients,
  movements,
  locations,
  categories,
  onAdd,
  onUpdate,
  onDelete,
  onBulkImport,
}: InventoryProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filtros de tabla de ingredientes
  const [ingredientCategoryFilter, setIngredientCategoryFilter] = useState('all');

  // Filtros reactivos de movimientos (API-driven)
  const [movementType, setMovementType] = useState<'all' | 'ingreso' | 'egreso' | 'ajuste'>('all');
  const [movementLocation, setMovementLocation] = useState('all');
  const [movementCategory, setMovementCategory] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredMovements, setFilteredMovements] = useState<InventoryMovement[]>(movements);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    currentStock: '',
    totalCost: '',
    costPerGram: '',
    sapValue: '0',
    categoryId: 'cat-jabon-art',
    price: '',
    weight: '',
    costPercentage: '',
  });

  // Cargar movimientos reactivamente del backend según filtros
  useEffect(() => {
    const fetchFilteredMovements = async () => {
      setLoadingMovements(true);
      try {
        const filters = {
          categoryId: movementCategory !== 'all' ? movementCategory : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        };
        const data = await api.fetchMovements(filters);
        setFilteredMovements(data);
      } catch (err: any) {
        console.error('Error al cargar movimientos filtrados:', err);
      } finally {
        setLoadingMovements(false);
      }
    };

    fetchFilteredMovements();
  }, [movementCategory, startDate, endDate]);

  // Si los movimientos generales cambian en App.tsx, sincronizar
  useEffect(() => {
    if (!startDate && !endDate && movementCategory === 'all') {
      setFilteredMovements(movements);
    }
  }, [movements]);

  // Sincronizar campos de costo
  const syncCostFields = (field: 'totalCost' | 'costPerGram', value: string) => {
    const currentStock = parseFloat(formData.currentStock) || 0;
    const priceNum = parseFloat(formData.price) || 0;

    if (field === 'costPerGram') {
      const costPerGram = parseFloat(value) || 0;
      const pctVal = priceNum > 0 && costPerGram > 0 ? ((costPerGram / priceNum) * 100).toFixed(1) : '';
      setFormData({
        ...formData,
        costPerGram: value,
        totalCost: currentStock > 0 ? (costPerGram * currentStock).toFixed(2) : '',
        costPercentage: pctVal,
      });
      return;
    }

    const totalCost = parseFloat(value) || 0;
    const calculatedCostPerGram = currentStock > 0 ? (totalCost / currentStock) : 0;
    const pctVal = priceNum > 0 && calculatedCostPerGram > 0 ? ((calculatedCostPerGram / priceNum) * 100).toFixed(1) : '';
    setFormData({
      ...formData,
      totalCost: value,
      costPerGram: currentStock > 0 ? calculatedCostPerGram.toFixed(3) : '',
      costPercentage: pctVal,
    });
  };

  const handlePriceChange = (priceVal: string) => {
    const priceNum = parseFloat(priceVal) || 0;
    const pctNum = parseFloat(formData.costPercentage) || 0;
    const currentStock = parseFloat(formData.currentStock) || 0;
    
    let newCostPerGram = formData.costPerGram;
    let newTotalCost = formData.totalCost;
    
    if (pctNum > 0 && priceNum > 0) {
      const costVal = (priceNum * (pctNum / 100)).toFixed(3);
      newCostPerGram = costVal;
      newTotalCost = currentStock > 0 ? (parseFloat(costVal) * currentStock).toFixed(2) : '';
    } else if (priceNum > 0 && parseFloat(formData.costPerGram) > 0) {
      const costNum = parseFloat(formData.costPerGram) || 0;
      const calculatedPct = ((costNum / priceNum) * 100).toFixed(1);
      setFormData({
        ...formData,
        price: priceVal,
        costPercentage: calculatedPct,
      });
      return;
    }
    
    setFormData({
      ...formData,
      price: priceVal,
      costPerGram: newCostPerGram,
      totalCost: newTotalCost,
    });
  };

  const handlePercentageChange = (pctVal: string) => {
    const pctNum = parseFloat(pctVal) || 0;
    const priceNum = parseFloat(formData.price) || 0;
    const currentStock = parseFloat(formData.currentStock) || 0;
    
    let newCostPerGram = formData.costPerGram;
    let newTotalCost = formData.totalCost;
    
    if (priceNum > 0) {
      if (pctVal === '') {
        newCostPerGram = '';
        newTotalCost = '';
      } else {
        const costVal = (priceNum * (pctNum / 100)).toFixed(3);
        newCostPerGram = costVal;
        newTotalCost = currentStock > 0 ? (parseFloat(costVal) * currentStock).toFixed(2) : '';
      }
    }
    
    setFormData({
      ...formData,
      costPercentage: pctVal,
      costPerGram: newCostPerGram,
      totalCost: newTotalCost,
    });
  };

  const handleStockChange = (stockVal: string) => {
    const stockNum = parseFloat(stockVal) || 0;
    const costPerGramNum = parseFloat(formData.costPerGram) || 0;
    
    setFormData({
      ...formData,
      currentStock: stockVal,
      totalCost: stockNum > 0 && costPerGramNum > 0 ? (costPerGramNum * stockNum).toFixed(2) : formData.totalCost,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const ingredient = {
      name: formData.name,
      currentStock: parseFloat(formData.currentStock),
      totalCost: parseFloat(formData.totalCost),
      costPerGram: parseFloat(formData.costPerGram),
      sapValue: parseFloat(formData.sapValue || '0'),
      categoryId: formData.categoryId,
      price: parseFloat(formData.price || '0'),
      weight: parseFloat(formData.weight || '0'),
    };

    if (editingId) {
      await onUpdate(editingId, ingredient);
      setEditingId(null);
    } else {
      await onAdd(ingredient);
    }

    setFormData({ name: '', currentStock: '', totalCost: '', costPerGram: '', sapValue: '0', categoryId: 'cat-jabon-art', price: '', weight: '', costPercentage: '' });
    setShowForm(false);
  };

  const handleEdit = (ingredient: Ingredient) => {
    const cost = ingredient.costPerGram || 0;
    const price = ingredient.price || 0;
    const percentage = price > 0 ? ((cost / price) * 100).toFixed(1) : '';
    setFormData({
      name: ingredient.name,
      currentStock: ingredient.currentStock.toString(),
      totalCost: ingredient.totalCost.toString(),
      costPerGram: ingredient.costPerGram.toString(),
      sapValue: (ingredient.sapValue || 0).toString(),
      categoryId: ingredient.categoryId || 'cat-jabon-art',
      price: (ingredient.price || 0).toString(),
      weight: (ingredient.weight || 0).toString(),
      costPercentage: percentage,
    });
    setEditingId(ingredient.id);
    setShowForm(true);
  };

  const getLowStockStatus = (stock: number) => {
    if (stock < 500) return 'critical';
    if (stock < 1000) return 'warning';
    return 'good';
  };

  // Filtrado de ingredientes local por categoría y barra de búsqueda
  const filteredIngredients = ingredients.filter((ing) => {
    if (ingredientCategoryFilter !== 'all' && ing.categoryId !== ingredientCategoryFilter) {
      return false;
    }
    return true;
  });

  // Filtrado final de movimientos local (tipo y ubicación)
  const displayMovements = filteredMovements.filter((movement) => {
    const matchesType = movementType === 'all' || movement.type === movementType;
    const matchesLocation = movementLocation === 'all' || movement.location === movementLocation;
    return matchesType && matchesLocation;
  });

  // Obtener nombre de categoría para mostrar
  const getCategoryName = (catId?: string) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.name : 'Sin categoría';
  };

  // Obtener estilo visual del badge de la categoría
  const getCategoryBadgeClass = (catId?: string) => {
    switch (catId) {
      case 'cat-mat-prima':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'cat-empaque':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'cat-esencias':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
  };

  // Filtrar categorías del formulario (solo mostrar Jabones Artesanales, Kits y Regalos, y Esencias y Aditivos)
  const ingredientCategories = categories.filter(c => ['cat-jabon-art', 'cat-kits', 'cat-esencias'].includes(c.id));

  // Procesar archivo CSV
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) {
          toast.error('El archivo CSV está vacío o no contiene filas de datos.');
          return;
        }

        // Leer cabecera y normalizar columnas
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        // Mapear posiciones
        const nameIdx = headers.findIndex(h => h.includes('nombre') || h.includes('name'));
        const stockIdx = headers.findIndex(h => h.includes('stock') || h.includes('cantidad'));
        const costIdx = headers.findIndex(h => h.includes('costo') || h.includes('precio'));
        const sapIdx = headers.findIndex(h => h.includes('sap'));
        const catIdx = headers.findIndex(h => h.includes('categoria') || h.includes('category'));

        if (nameIdx === -1 || stockIdx === -1 || costIdx === -1) {
          toast.error('Cabecera CSV inválida. Debe contener columnas de Nombre, Stock y Costo.');
          return;
        }

        const parsedIngredients: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length < 3) continue;

          const name = cols[nameIdx];
          const stock = parseFloat(cols[stockIdx]) || 0;
          const cost = parseFloat(cols[costIdx]) || 0;
          const sap = sapIdx !== -1 ? parseFloat(cols[sapIdx]) || 190 : 190;

          // Mapear categoría por texto
          let categoryId = 'cat-jabon-art';
          if (catIdx !== -1 && cols[catIdx]) {
            const rawCatName = cols[catIdx].toLowerCase();
            const matchedCat = ingredientCategories.find(
              c => c.name.toLowerCase().includes(rawCatName) || c.id.toLowerCase().includes(rawCatName)
            );
            if (matchedCat) {
              categoryId = matchedCat.id;
            }
          }

          parsedIngredients.push({
            name,
            currentStock: stock,
            totalCost: cost,
            sapValue: sap,
            categoryId
          });
        }

        if (parsedIngredients.length === 0) {
          toast.error('No se encontraron ingredientes válidos en las filas del CSV.');
          return;
        }

        onBulkImport(parsedIngredients);
        // Limpiar input
        e.target.value = '';
      } catch (err: any) {
        console.error('Error parseando CSV:', err);
        toast.error('Error al procesar el archivo CSV: ' + err.message);
      }
    };

    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="space-y-6">
      {/* Encabezado con Botones de Acción */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 backdrop-blur border border-pink-100 p-4 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-900 bg-clip-text text-transparent">
            Inventario de Insumos
          </h2>
          <p className="text-sm text-slate-500">Administra y clasifica la materia prima y empaques</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Importar CSV */}
          <label className="flex-1 sm:flex-initial bg-white border border-pink-200 hover:bg-rose-50 text-slate-700 px-4 py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all font-medium shadow-sm hover:shadow">
            <Upload className="w-4 h-4 text-rose-500" />
            <span>Importar CSV</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />
          </label>

          {/* Agregar Ingrediente */}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex-1 sm:flex-initial bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-medium shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-4 h-4" />
            Agregar Producto
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white/90 backdrop-blur rounded-2xl border border-pink-100 shadow-md p-6 transition-all duration-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-500" />
            {editingId ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Producto / Artículo</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="Ej: Jabón de Avena"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Categoría</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm bg-white"
              >
                {ingredientCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Stock (Unidades)</label>
              <input
                type="number"
                required
                step="1"
                value={formData.currentStock}
                onChange={(e) => handleStockChange(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Peso por barra / envase (g)</label>
              <input
                type="number"
                required
                step="1"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Precio de Venta al Público - PVP (S/)</label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.price}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="15.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Porcentaje de Costo (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.costPercentage}
                onChange={(e) => handlePercentageChange(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm bg-rose-50/20 text-rose-800 font-semibold"
                placeholder="Ej: 20"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Costo Unitario de Producción (S/)</label>
              <input
                type="number"
                required
                step="0.001"
                value={formData.costPerGram}
                onChange={(e) => syncCostFields('costPerGram', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="2.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Costo Total Lote (S/)</label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.totalCost}
                onChange={(e) => syncCostFields('totalCost', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="100.00"
              />
            </div>
            <input type="hidden" value={formData.sapValue || '0'} />
            <div className="md:col-span-2 lg:col-span-3 flex gap-2 pt-2">
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl transition-all font-semibold shadow-sm text-sm cursor-pointer"
              >
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ name: '', currentStock: '', totalCost: '', costPerGram: '', sapValue: '0', categoryId: 'cat-jabon-art', price: '', weight: '', costPercentage: '' });
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl transition-all font-semibold text-sm cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros de Tabla de Insumos */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/70 backdrop-blur border border-pink-100 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-600">Filtrar por Categoría:</span>
        </div>
        <select
          value={ingredientCategoryFilter}
          onChange={(e) => setIngredientCategoryFilter(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm bg-white"
        >
          <option value="all">Todas las categorías</option>
          {ingredientCategories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Tabla de Insumos */}
      <div className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4 text-left">Producto / Artículo</th>
                <th className="px-6 py-4 text-left">Categoría</th>
                <th className="px-6 py-4 text-left">Stock</th>
                <th className="px-6 py-4 text-left">Costo Unit.</th>
                <th className="px-6 py-4 text-left">Costo Total</th>
                <th className="px-6 py-4 text-left">Precio Venta (PVP)</th>
                <th className="px-6 py-4 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIngredients.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-center text-slate-400 font-medium" colSpan={7}>
                    No hay productos registrados en esta categoría.
                  </td>
                </tr>
              ) : (
                filteredIngredients.map((ingredient) => {
                  const stockStatus = getLowStockStatus(ingredient.currentStock);
                  return (
                    <tr key={ingredient.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-500">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">{ingredient.name}</span>
                            {(ingredient.weight || 0) > 0 && (
                              <span className="text-[10px] text-slate-400 font-bold uppercase">{ingredient.weight}g</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getCategoryBadgeClass(ingredient.categoryId)}`}>
                          {getCategoryName(ingredient.categoryId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 font-medium">
                          <span>{ingredient.currentStock.toFixed(0)} U.</span>
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
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">
                        S/ {ingredient.costPerGram.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-600">
                        S/ {ingredient.totalCost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-emerald-600 font-bold">
                        S/ {(ingredient.price || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(ingredient)}
                            className="p-1 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(ingredient.id)}
                            className="p-1 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial de Movimientos */}
      <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Movimientos de Stock</h3>
            <p className="text-sm text-slate-500 font-medium">Historial detallado de flujos de inventario</p>
          </div>

          {/* Controles de Filtro Reactivo de Movimientos */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Tipo */}
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Tipo</label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as typeof movementType)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              >
                <option value="all">Todos</option>
                <option value="ingreso">Ingresos</option>
                <option value="egreso">Egresos</option>
                <option value="ajuste">Ajustes</option>
              </select>
            </div>

            {/* Categoría */}
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Categoría</label>
              <select
                value={movementCategory}
                onChange={(e) => setMovementCategory(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              >
                <option value="all">Todas</option>
                {ingredientCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Ubicación */}
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Ubicación</label>
              <select
                value={movementLocation}
                onChange={(e) => setMovementLocation(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              >
                <option value="all">Todas</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.name}>{loc.name}</option>
                ))}
              </select>
            </div>

            {/* Fecha Inicio */}
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Fecha Fin */}
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Listado de Movimientos */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-xs font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Ingrediente</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Cantidad</th>
                <th className="px-4 py-3 text-left">Ubicación</th>
                <th className="px-4 py-3 text-left">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {loadingMovements ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-400 font-medium" colSpan={6}>
                    Cargando movimientos...
                  </td>
                </tr>
              ) : displayMovements.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400 text-center font-medium" colSpan={6}>
                    No hay movimientos registrados para estos filtros.
                  </td>
                </tr>
              ) : (
                displayMovements.map((movement) => (
                  <tr key={movement.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-500">{new Date(movement.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{movement.ingredientName ?? movement.ingredientId}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${movement.type === 'ingreso' ? 'bg-emerald-50 text-emerald-700' :
                        movement.type === 'egreso' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                        {movement.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">{movement.quantity.toFixed(0)}g</td>
                    <td className="px-4 py-3 text-slate-500">{movement.location}</td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{movement.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
