import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Package, TrendingDown, TrendingUp, Upload, Filter, Calendar } from 'lucide-react';
import { api, type Category, type Ingredient, type InventoryMovement, type FinishedProduct } from '../services/api';

interface InventoryProps {
  ingredients: Ingredient[];
  products: FinishedProduct[];
  movements: InventoryMovement[];
  locations: Array<{ id: number; name: string; isDefault: number }>;
  categories: Category[];
  onAdd: (ingredient: Omit<Ingredient, 'id'>) => void;
  onUpdate: (id: string, ingredient: Partial<Ingredient>) => void;
  onDelete: (id: string) => void;
  onBulkImport: (ingredients: Array<Omit<Ingredient, 'id' | 'costPerGram'>>) => void;
  onAddProduct?: (product: any) => Promise<void>;
  onUpdateProduct?: (id: string, product: any) => Promise<void>;
  onDeleteProduct?: (id: string) => Promise<void>;
}

export function Inventory({
  ingredients,
  products,
  movements,
  locations,
  categories,
  onAdd,
  onUpdate,
  onDelete,
  onBulkImport,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}: InventoryProps) {
  const [warehouseType, setWarehouseType] = useState<'principal' | 'final'>('principal');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stockUnit, setStockUnit] = useState<'g_ml' | 'kg_l'>('g_ml');

  const getStockInGrams = (stockVal: string, unit: 'g_ml' | 'kg_l') => {
    const num = parseFloat(stockVal) || 0;
    return unit === 'kg_l' ? num * 1000 : num;
  };

  const formatStock = (stock: number, categoryId?: string) => {
    const isEsencia = categoryId === 'cat-esencias';
    if (stock >= 1000) {
      const val = stock / 1000;
      const formatted = val.toFixed(2).replace(/\.?0+$/, '');
      return `${formatted} ${isEsencia ? 'L' : 'kg'}`;
    }
    return `${stock.toFixed(0)} ${isEsencia ? 'ml' : 'g'}`;
  };

  // Filtros de tabla
  const [ingredientCategoryFilter, setIngredientCategoryFilter] = useState('all');
  const [productSearchTerm, setProductSearchTerm] = useState('');

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
    categoryId: 'cat-mat-prima',
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

  // Categorías de insumos (Almacén Principal)
  const principalCategories = categories.filter(c => ['cat-mat-prima', 'cat-empaque', 'cat-esencias'].includes(c.id));

  // Sincronizar campos de costo (solo para insumos)
  const syncCostFields = (field: 'totalCost' | 'costPerGram', value: string) => {
    const stockInGrams = getStockInGrams(formData.currentStock, stockUnit);
    const priceNum = parseFloat(formData.price) || 0;

    if (field === 'costPerGram') {
      const costPerGram = parseFloat(value) || 0;
      const pctVal = priceNum > 0 && costPerGram > 0 ? ((costPerGram / priceNum) * 100).toFixed(1) : '';
      setFormData({
        ...formData,
        costPerGram: value,
        totalCost: stockInGrams > 0 ? (costPerGram * stockInGrams).toFixed(2) : '',
        costPercentage: pctVal,
      });
      return;
    }

    const totalCost = parseFloat(value) || 0;
    const calculatedCostPerGram = stockInGrams > 0 ? (totalCost / stockInGrams) : 0;
    const pctVal = priceNum > 0 && calculatedCostPerGram > 0 ? ((calculatedCostPerGram / priceNum) * 100).toFixed(1) : '';
    setFormData({
      ...formData,
      totalCost: value,
      costPerGram: stockInGrams > 0 ? calculatedCostPerGram.toFixed(3) : '',
      costPercentage: pctVal,
    });
  };

  const handlePriceChange = (priceVal: string) => {
    const priceNum = parseFloat(priceVal) || 0;
    const pctNum = parseFloat(formData.costPercentage) || 0;
    const stockInGrams = getStockInGrams(formData.currentStock, stockUnit);
    
    let newCostPerGram = formData.costPerGram;
    let newTotalCost = formData.totalCost;
    
    if (pctNum > 0 && priceNum > 0) {
      const costVal = (priceNum * (pctNum / 100)).toFixed(3);
      newCostPerGram = costVal;
      newTotalCost = stockInGrams > 0 ? (parseFloat(costVal) * stockInGrams).toFixed(2) : '';
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
    const stockInGrams = getStockInGrams(formData.currentStock, stockUnit);
    
    let newCostPerGram = formData.costPerGram;
    let newTotalCost = formData.totalCost;
    
    if (priceNum > 0) {
      if (pctVal === '') {
        newCostPerGram = '';
        newTotalCost = '';
      } else {
        const costVal = (priceNum * (pctNum / 100)).toFixed(3);
        newCostPerGram = costVal;
        newTotalCost = stockInGrams > 0 ? (parseFloat(costVal) * stockInGrams).toFixed(2) : '';
      }
    }
    
    setFormData({
      ...formData,
      costPercentage: pctVal,
      costPerGram: newCostPerGram,
      totalCost: newTotalCost,
    });
  };

  const handleStockChange = (stockVal: string, unit: 'g_ml' | 'kg_l' = stockUnit) => {
    const stockInGrams = getStockInGrams(stockVal, unit);
    const costPerGramNum = parseFloat(formData.costPerGram) || 0;
    
    setFormData({
      ...formData,
      currentStock: stockVal,
      totalCost: stockInGrams > 0 && costPerGramNum > 0 ? (costPerGramNum * stockInGrams).toFixed(2) : formData.totalCost,
    });
  };

  const handleUnitChange = (newUnit: 'g_ml' | 'kg_l') => {
    if (newUnit === stockUnit) return;
    
    const currentValStr = formData.currentStock;
    if (!currentValStr) {
      setStockUnit(newUnit);
      return;
    }
    
    const currentVal = parseFloat(currentValStr) || 0;
    let convertedVal = currentVal;
    
    if (newUnit === 'kg_l') {
      convertedVal = currentVal / 1000;
    } else {
      convertedVal = currentVal * 1000;
    }
    
    setStockUnit(newUnit);
    
    const formattedVal = convertedVal % 1 === 0 
      ? convertedVal.toString() 
      : convertedVal.toFixed(3).replace(/\.?0+$/, '');
      
    setFormData(prev => ({
      ...prev,
      currentStock: formattedVal
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (warehouseType === 'final') {
      const productPayload = {
        name: formData.name,
        stock: parseInt(formData.currentStock) || 0,
        price: parseFloat(formData.price) || 0
      };

      try {
        if (editingId) {
          if (onUpdateProduct) {
            await onUpdateProduct(editingId, productPayload);
          }
          setEditingId(null);
        } else {
          if (onAddProduct) {
            await onAddProduct(productPayload);
          }
        }
        toast.success(editingId ? 'Producto actualizado en Almacén Final' : 'Producto creado en Almacén Final');
      } catch (err: any) {
        toast.error('Error al guardar el producto terminado: ' + err.message);
        return;
      }
      
      setFormData({ name: '', currentStock: '', totalCost: '', costPerGram: '', sapValue: '0', categoryId: 'cat-mat-prima', price: '', weight: '', costPercentage: '' });
      setShowForm(false);
      return;
    }

    // Almacén Principal (Insumos)
    const stockInGrams = getStockInGrams(formData.currentStock, stockUnit);
    const ingredient = {
      name: formData.name,
      currentStock: stockInGrams,
      totalCost: parseFloat(formData.totalCost),
      costPerGram: parseFloat(formData.costPerGram),
      sapValue: parseFloat(formData.sapValue || '0'),
      categoryId: formData.categoryId,
      price: parseFloat(formData.price || '0'),
      weight: parseFloat(formData.weight || '0'),
    };

    try {
      if (editingId) {
        await onUpdate(editingId, ingredient);
        setEditingId(null);
      } else {
        await onAdd(ingredient);
      }
    } catch (err: any) {
      toast.error('Error al guardar el insumo: ' + err.message);
      return;
    }

    setFormData({ name: '', currentStock: '', totalCost: '', costPerGram: '', sapValue: '0', categoryId: 'cat-mat-prima', price: '', weight: '', costPercentage: '' });
    setShowForm(false);
  };

  const handleEdit = (item: any) => {
    if (warehouseType === 'final') {
      setFormData({
        name: item.name,
        currentStock: item.stock.toString(),
        totalCost: '',
        costPerGram: '',
        sapValue: '0',
        categoryId: '',
        price: item.price.toString(),
        weight: '',
        costPercentage: '',
      });
      setEditingId(item.id);
      setShowForm(true);
      return;
    }

    // Insumos
    const cost = item.costPerGram || 0;
    const price = item.price || 0;
    const percentage = price > 0 ? ((cost / price) * 100).toFixed(1) : '';
    
    const isKg = item.currentStock >= 1000;
    setStockUnit(isKg ? 'kg_l' : 'g_ml');
    
    const displayStock = isKg ? item.currentStock / 1000 : item.currentStock;
    const formattedStock = displayStock % 1 === 0 ? displayStock.toString() : displayStock.toFixed(3).replace(/\.?0+$/, '');

    setFormData({
      name: item.name,
      currentStock: formattedStock,
      totalCost: item.totalCost.toString(),
      costPerGram: item.costPerGram.toString(),
      sapValue: (item.sapValue || 0).toString(),
      categoryId: item.categoryId || 'cat-mat-prima',
      price: (item.price || 0).toString(),
      weight: (item.weight || 0).toString(),
      costPercentage: percentage,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const getLowStockStatus = (stock: number) => {
    if (stock < 500) return 'critical';
    if (stock < 1000) return 'warning';
    return 'good';
  };

  // Filtrado de insumos local por categoría
  const filteredIngredients = ingredients.filter((ing) => {
    const isRawMaterial = ['cat-mat-prima', 'cat-empaque', 'cat-esencias'].includes(ing.categoryId || '');
    if (!isRawMaterial) return false;

    if (ingredientCategoryFilter !== 'all' && ing.categoryId !== ingredientCategoryFilter) {
      return false;
    }
    return true;
  });

  // Filtrado de productos terminados local por nombre
  const filteredProducts = products.filter(prod => 
    prod.name.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

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

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

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

          let categoryId = 'cat-mat-prima';
          if (catIdx !== -1 && cols[catIdx]) {
            const rawCatName = cols[catIdx].toLowerCase();
            const matchedCat = principalCategories.find(
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-900 bg-clip-text text-transparent">
              Inventario de Jabones
            </h2>
            <p className="text-sm text-slate-500">
              {warehouseType === 'principal' 
                ? 'Materia prima, empaques y aditivos del Almacén Principal' 
                : 'Catálogo de jabones artesanales terminados del Almacén Final'}
            </p>
          </div>
          
          {/* Dropdown Selector de Almacén */}
          <div className="flex flex-col gap-1 min-w-[240px]">
            <select
              value={warehouseType}
              onChange={(e) => {
                const val = e.target.value as 'principal' | 'final';
                setWarehouseType(val);
                setShowForm(false);
                setEditingId(null);
                setStockUnit('g_ml');
                setFormData({
                  name: '',
                  currentStock: '',
                  totalCost: '',
                  costPerGram: '',
                  sapValue: '0',
                  categoryId: val === 'principal' ? 'cat-mat-prima' : '',
                  price: '',
                  weight: '',
                  costPercentage: ''
                });
              }}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm font-semibold text-slate-700 bg-white shadow-sm cursor-pointer"
            >
              <option value="principal">📦 Almacén Principal (Insumos - g/ml)</option>
              <option value="final">🧼 Almacén Final (Productos - Unidades)</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {/* Importar CSV - Solo para Insumos */}
          {warehouseType === 'principal' && (
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
          )}

          {/* Agregar Producto / Insumo */}
          <button
            onClick={() => {
              setEditingId(null);
              setStockUnit('g_ml');
              setFormData({
                name: '',
                currentStock: '',
                totalCost: '',
                costPerGram: '',
                sapValue: '0',
                categoryId: warehouseType === 'principal' ? 'cat-mat-prima' : '',
                price: '',
                weight: '',
                costPercentage: ''
              });
              setShowForm(!showForm);
            }}
            className="flex-1 sm:flex-initial bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-medium shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{warehouseType === 'principal' ? 'Agregar Insumo' : 'Agregar Producto'}</span>
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white/90 backdrop-blur rounded-2xl border border-pink-100 shadow-md p-6 transition-all duration-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-500" />
            {editingId 
              ? (warehouseType === 'principal' ? 'Editar Insumo' : 'Editar Producto Terminado') 
              : (warehouseType === 'principal' ? 'Nuevo Insumo' : 'Nuevo Producto Terminado')}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouseType === 'principal' ? (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Insumo / Artículo</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                    placeholder="Ej: Aceite de Oliva"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm bg-white"
                  >
                    {principalCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Stock</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      step="any"
                      value={formData.currentStock}
                      onChange={(e) => handleStockChange(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder={stockUnit === 'g_ml' ? '1000' : '1.0'}
                    />
                    <select
                      value={stockUnit}
                      onChange={(e) => handleUnitChange(e.target.value as 'g_ml' | 'kg_l')}
                      className="w-28 px-2 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm bg-white font-semibold text-slate-600 cursor-pointer"
                    >
                      <option value="g_ml">g / ml</option>
                      <option value="kg_l">kg / L</option>
                    </select>
                  </div>
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
                    placeholder="50.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Costo por Gramo/ml (S/)</label>
                  <input
                    type="number"
                    required
                    step="0.001"
                    value={formData.costPerGram}
                    onChange={(e) => syncCostFields('costPerGram', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                    placeholder="0.050"
                  />
                </div>
                {formData.categoryId === 'cat-mat-prima' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Valor SAP (Saponificación)</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.sapValue}
                      onChange={(e) => setFormData({ ...formData, sapValue: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="190"
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Producto Terminado</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                    placeholder="Ej: Jabón de Carbón Activado - 50g"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Stock (Unidades)</label>
                  <input
                    type="number"
                    required
                    step="1"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Precio de Venta al Público - PVP (S/)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                    placeholder="15.00"
                  />
                </div>
              </>
            )}
            
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
                  setStockUnit('g_ml');
                  setFormData({ name: '', currentStock: '', totalCost: '', costPerGram: '', sapValue: '0', categoryId: warehouseType === 'principal' ? 'cat-mat-prima' : '', price: '', weight: '', costPercentage: '' });
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl transition-all font-semibold text-sm cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Selector de filtros y Tabla */}
      {warehouseType === 'principal' ? (
        <>
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
              <option value="all">Todas las categorías de Insumos</option>
              {principalCategories.map(cat => (
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
                    <th className="px-6 py-4 text-left">Insumo / Artículo</th>
                    <th className="px-6 py-4 text-left">Categoría</th>
                    <th className="px-6 py-4 text-left">Stock</th>
                    <th className="px-6 py-4 text-left">Costo Unit. (g/ml)</th>
                    <th className="px-6 py-4 text-left">Costo Total</th>
                    <th className="px-6 py-4 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIngredients.length === 0 ? (
                    <tr>
                      <td className="px-6 py-8 text-center text-slate-400 font-medium" colSpan={6}>
                        No hay insumos registrados en esta vista.
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
                                {ingredient.categoryId === 'cat-mat-prima' && (ingredient.sapValue || 0) > 0 && (
                                  <span className="text-[10px] text-slate-400 font-bold">SAP: {ingredient.sapValue}</span>
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
                            <div className="flex items-center gap-2 font-medium text-slate-700">
                              <span>{formatStock(ingredient.currentStock, ingredient.categoryId)}</span>
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
                            S/ {ingredient.costPerGram.toFixed(3)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-600">
                            S/ {ingredient.totalCost.toFixed(2)}
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
        </>
      ) : (
        <>
          {/* Buscador de Productos del Almacén Final */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/70 backdrop-blur border border-pink-100 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">Buscar por Nombre:</span>
            </div>
            <input
              type="text"
              placeholder="Buscar producto en Almacén Final..."
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              className="w-full sm:w-72 px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm bg-white"
            />
          </div>

          {/* Tabla de Almacén Final */}
          <div className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4 text-left">Producto Terminado</th>
                    <th className="px-6 py-4 text-left">Stock Físico</th>
                    <th className="px-6 py-4 text-left">Precio Venta (PVP)</th>
                    <th className="px-6 py-4 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td className="px-6 py-8 text-center text-slate-400 font-medium" colSpan={4}>
                        No hay productos registrados en el Almacén Final.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      return (
                        <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-500">
                                <Package className="w-4 h-4" />
                              </div>
                              <span className="font-semibold text-slate-900 block">{product.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                              product.stock <= 0
                                ? 'bg-rose-50 border border-rose-200 text-rose-700'
                                : product.stock <= 5
                                ? 'bg-amber-50 border border-amber-200 text-amber-700'
                                : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                            }`}>
                              {product.stock} uds.
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-emerald-600 font-bold text-base">
                            S/ {product.price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(product)}
                                className="p-1 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('¿Estás seguro de eliminar este producto terminado?')) {
                                    if (onDeleteProduct) onDeleteProduct(product.id);
                                  }
                                }}
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
        </>
      )}

      {/* Historial de Movimientos de Insumos */}
      {warehouseType === 'principal' && (
        <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Movimientos de Stock</h3>
              <p className="text-sm text-slate-500 font-medium">Historial detallado de flujos de insumos en el Almacén Principal</p>
            </div>

            {/* Controles de Filtro Reactivo de Movimientos */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Tipo */}
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Tipo</label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as typeof movementType)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
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
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
                >
                  <option value="all">Todas</option>
                  {principalCategories.map(cat => (
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
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
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
                      <td className="px-4 py-3 font-bold text-slate-700">
                        {movement.quantity >= 1000 
                          ? `${(movement.quantity / 1000).toFixed(2).replace(/\.?0+$/, '')} kg/L` 
                          : `${movement.quantity.toFixed(0)} g/ml`}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{movement.location}</td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{movement.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
