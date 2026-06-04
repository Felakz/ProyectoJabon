import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  Factory, 
  Plus, 
  Trash2, 
  TrendingUp, 
  AlertTriangle, 
  Info, 
  Sparkles, 
  ArrowRight, 
  DollarSign, 
  Scale, 
  FileText,
  Search,
  Check
} from 'lucide-react';
import { api, type Ingredient } from '../services/api';

interface ProductionProps {
  ingredients: Ingredient[];
  onProductionComplete: () => void;
}

interface SelectedIngredient {
  id: string;
  name: string;
  currentStock: number;
  costPerGram: number;
  mode: 'percentage' | 'grams';
  value: number; // Porcentaje (%) o gramos base
}

const formatMoney = (value: number) => `S/ ${value.toFixed(2)}`;

export function Production({ ingredients, onProductionComplete }: ProductionProps) {
  // 1. Datos del Producto Final
  const [productName, setProductName] = useState('');
  const [unitWeight, setUnitWeight] = useState<number>(100); // Peso por unidad (g)
  const [unitsProduced, setUnitsProduced] = useState<number>(10); // Unidades a fabricar
  const [laborCost, setLaborCost] = useState<number>(10); // Costo de mano de obra total

  // 2. Selección de Insumos y Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);

  // Filtra los insumos del inventario para el buscador (solo materias primas y esencias del Almacén Principal)
  const availableIngredients = useMemo(() => {
    const rawAndEssences = ingredients.filter(ing => 
      ['cat-mat-prima', 'cat-esencias'].includes(ing.categoryId || '')
    );
    return rawAndEssences.filter(ing => 
      ing.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedIngredients.some(sel => sel.id === ing.id)
    );
  }, [ingredients, searchTerm, selectedIngredients]);

  // 3. Factores Económicos
  const [gainFactor, setGainFactor] = useState<number>(3.5); // Factor de ganancia (3.5x a 4x)
  const [pvp, setPvp] = useState<string>('0.00'); // PVP Unitario aprobado final

  // Peso total del lote calculado
  const totalWeight = useMemo(() => {
    return unitWeight * unitsProduced;
  }, [unitWeight, unitsProduced]);

  // Agregar ingrediente
  const handleAddIngredient = (ing: Ingredient) => {
    const newSelected: SelectedIngredient = {
      id: ing.id,
      name: ing.name,
      currentStock: ing.currentStock,
      costPerGram: ing.costPerGram,
      mode: 'grams',
      value: 0 // Por defecto inicia en 0 gramos
    };
    setSelectedIngredients([...selectedIngredients, newSelected]);
    setSearchTerm('');
  };

  // Remover ingrediente
  const handleRemoveIngredient = (id: string) => {
    setSelectedIngredients(selectedIngredients.filter(ing => ing.id !== id));
  };

  // Modificar valores de insumos seleccionados
  const handleUpdateIngredient = (id: string, updates: Partial<SelectedIngredient>) => {
    setSelectedIngredients(selectedIngredients.map(ing => 
      ing.id === id ? { ...ing, ...updates } : ing
    ));
  };

  // Cálculo en tiempo real de Gramos Utilizados y Costos
  const processedIngredients = useMemo(() => {
    let totalPct = 0;
    let totalGramsMode = 0;

    // Calcular cuánto peso está asignado explícitamente en gramos
    selectedIngredients.forEach(ing => {
      if (ing.mode === 'grams') {
        totalGramsMode += ing.value;
      } else {
        totalPct += ing.value;
      }
    });

    const remainingWeight = Math.max(0, totalWeight - totalGramsMode);

    return selectedIngredients.map(ing => {
      let gramsUsed = 0;
      let percentage = 0;

      if (ing.mode === 'grams') {
        gramsUsed = ing.value;
        percentage = totalWeight > 0 ? (gramsUsed / totalWeight) * 100 : 0;
      } else {
        // Asignación por porcentaje sobre el peso restante
        percentage = ing.value;
        gramsUsed = totalPct > 0 ? (percentage / 100) * remainingWeight : 0;
      }

      const cost = gramsUsed * ing.costPerGram;
      const hasEnoughStock = ing.currentStock >= gramsUsed;

      return {
        ...ing,
        gramsUsed,
        percentage,
        cost,
        hasEnoughStock
      };
    });
  }, [selectedIngredients, totalWeight]);

  // Costo Total de Materia Prima
  const totalRawMaterialCost = useMemo(() => {
    return processedIngredients.reduce((sum, ing) => sum + ing.cost, 0);
  }, [processedIngredients]);

  // Costo Total de Producción (Materia Prima + Mano de Obra)
  const totalProductionCost = useMemo(() => {
    return totalRawMaterialCost + laborCost;
  }, [totalRawMaterialCost, laborCost]);

  // Costo Unitario de Producción
  const unitProductionCost = useMemo(() => {
    return unitsProduced > 0 ? totalProductionCost / unitsProduced : 0;
  }, [totalProductionCost, unitsProduced]);

  // ALERTA DE STOCK INSUFICIENTE
  const hasStockIssues = useMemo(() => {
    return processedIngredients.some(ing => !ing.hasEnoughStock);
  }, [processedIngredients]);

  // 4. useEffect para amarrar la ganancia y sugerir PVP en tiempo real
  useEffect(() => {
    if (unitsProduced > 0 && unitProductionCost > 0) {
      const suggested = unitProductionCost * gainFactor;
      // Redondear a un decimal o dos para que sea limpio
      setPvp(suggested.toFixed(2));
    } else {
      setPvp('0.00');
    }
  }, [unitProductionCost, gainFactor, unitsProduced, unitWeight, selectedIngredients]);

  // Suma de porcentajes para control visual
  const sumPercentages = useMemo(() => {
    return processedIngredients.reduce((sum, ing) => sum + ing.percentage, 0);
  }, [processedIngredients]);

  // Suma de gramos para control visual
  const sumGrams = useMemo(() => {
    return processedIngredients.reduce((sum, ing) => sum + ing.gramsUsed, 0);
  }, [processedIngredients]);

  // Handler de Envío al Backend
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFabricate = async () => {
    if (!productName.trim()) {
      toast.error('Por favor ingresa un nombre para el producto final.');
      return;
    }
    if (unitWeight <= 0 || unitsProduced <= 0) {
      toast.error('El peso unitario y las unidades a fabricar deben ser mayores a cero.');
      return;
    }
    if (selectedIngredients.length === 0) {
      toast.error('Debes seleccionar al menos un insumo del Almacén Principal.');
      return;
    }
    if (hasStockIssues) {
      toast.error('No hay suficiente stock en el Almacén Principal para algunos insumos.');
      return;
    }
    
    // Alerta opcional de peso total formulado
    const currentSumGrams = processedIngredients.reduce((sum, ing) => sum + ing.gramsUsed, 0);
    if (Math.abs(currentSumGrams - totalWeight) > 1) {
      if (!confirm(`La composición formulada actual suma ${currentSumGrams.toFixed(1)}g, pero el peso deseado del lote es ${totalWeight.toFixed(0)}g. ¿Deseas fabricar de todas formas?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        productName,
        unitWeight,
        unitsProduced,
        laborCost,
        approvedPvp: parseFloat(pvp) || 0,
        ingredients: processedIngredients.map(ing => ({
          id: ing.id,
          gramsUsed: ing.gramsUsed
        }))
      };

      const res = await api.makeInteractiveBatch(payload);
      toast.success(res.message || 'Lote interactivo fabricado con éxito.');
      
      // Limpiar Formulario
      setProductName('');
      setUnitWeight(100);
      setUnitsProduced(10);
      setLaborCost(10);
      setSelectedIngredients([]);
      setSearchTerm('');
      
      // Notificar al componente principal para recargar inventarios
      onProductionComplete();
    } catch (err: any) {
      console.error(err);
      toast.error('Error al fabricar lote: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Encabezado */}
      <div className="relative rounded-3xl bg-white p-6 shadow-md border border-pink-100/50 overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-br from-emerald-100/20 to-rose-200/20 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-100">
              <Factory className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Producción Interactiva</h2>
              <p className="text-sm text-slate-500">Diseña la fórmula, calcula costos unitarios en tiempo real y fabrica directo al Almacén Final.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-700">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            Formulación y Costeo Integrado
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PANEL IZQUIERDO: Formulación e Insumos (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Datos del Producto Final */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
              <Scale className="w-5 h-5 text-emerald-500" />
              1. Datos del Producto Final
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Nombre del Producto Final</label>
                <input
                  type="text"
                  placeholder="Ej: Cúrcuma y Avena"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Peso Deseado Unitario (g)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={unitWeight || ''}
                    onChange={(e) => setUnitWeight(e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-extrabold focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none"
                    min="1"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">gramos</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Cantidad de Unidades</label>
                <div className="relative">
                  <input
                    type="number"
                    value={unitsProduced || ''}
                    onChange={(e) => setUnitsProduced(e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-extrabold focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none"
                    min="1"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">piezas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Selección e Insumos */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-500" />
                2. Composición del Lote (Materia Prima)
              </h3>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                Peso Lote: <strong className="text-slate-800 font-extrabold">{totalWeight.toLocaleString()} g</strong>
              </span>
            </div>

            {/* Buscador de Insumos */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-5.5 w-5.5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar insumos en el Almacén Principal (Ej: Oliva, Esencia)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
              />

              {/* Resultados del Buscador */}
              {searchTerm.trim() && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {availableIngredients.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No se encontraron insumos disponibles.</div>
                  ) : (
                    availableIngredients.map(ing => (
                      <button
                        key={ing.id}
                        onClick={() => handleAddIngredient(ing)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex justify-between items-center text-sm"
                      >
                        <div>
                          <span className="font-semibold text-slate-800">{ing.name}</span>
                          <span className="text-xs text-slate-400 block">Stock: {ing.currentStock.toFixed(0)}g | Costo: S/ {ing.costPerGram.toFixed(3)}/g</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5" /> Agregar
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Lista de Insumos Seleccionados */}
            {selectedIngredients.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                🌱 Selecciona aceites o aditivos del Almacén Principal para formular.
              </div>
            ) : (
              <div className="space-y-3">
                {processedIngredients.map((ing) => (
                  <div 
                    key={ing.id} 
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      ing.hasEnoughStock 
                        ? 'border-slate-100 bg-slate-50/30' 
                        : 'border-rose-200 bg-rose-50/10'
                    }`}
                  >
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm truncate">{ing.name}</span>
                        {!ing.hasEnoughStock && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wide text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 animate-bounce" /> Sin stock
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        Disp: <strong>{ing.currentStock.toFixed(0)}g</strong> | Costo unit: <strong>S/ {ing.costPerGram.toFixed(3)}</strong>
                      </span>
                    </div>

                    {/* Inputs de Proporción - Solo gramos */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative w-28">
                        <input
                          type="number"
                          value={ing.value || ''}
                          onChange={(e) => handleUpdateIngredient(ing.id, { value: parseFloat(e.target.value) || 0 })}
                          className="w-full text-center py-2 pr-6 pl-3 bg-white border border-slate-200 rounded-xl text-xs font-black focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none"
                          min="0"
                          step="0.1"
                        />
                        <span className="absolute right-3 top-2 text-[10px] font-black text-slate-400">
                          g
                        </span>
                      </div>
                    </div>

                    {/* Dinamics calculations */}
                    <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-bold">Consumo Calc.</span>
                        <span className="font-extrabold text-slate-700 text-xs">{ing.gramsUsed.toFixed(1)} g</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-bold">Costo Insumo</span>
                        <span className="font-black text-slate-800 text-xs">{formatMoney(ing.cost)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(ing.id)}
                        className="text-slate-400 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Composición total en gramos y porcentaje */}
                <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-2xl text-xs font-bold border border-slate-100 mt-4">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Info className="w-4 h-4 text-sky-500" />
                    Suma total formulada (Composición):
                  </span>
                  <span className={Math.abs(sumGrams - totalWeight) < 1 ? 'text-emerald-600 font-extrabold' : 'text-amber-600 font-extrabold'}>
                    {sumGrams.toFixed(1)} g de {totalWeight.toFixed(0)} g ({sumPercentages.toFixed(1)}%) {Math.abs(sumGrams - totalWeight) >= 1 && `(Idealmente ${totalWeight.toFixed(0)} g)`}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* PANEL DERECHO: Análisis de Costos y Cierre (Col 5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card 3: Estructura Financiera en Tiempo Real */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-6">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              3. Estructura de Costo y PVP
            </h3>

            {/* Desglose de Gastos */}
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                <span>Costo Materia Prima Lote</span>
                <span className="font-bold text-slate-800">{formatMoney(totalRawMaterialCost)}</span>
              </div>

              {/* Mano de Obra Input */}
              <div className="flex justify-between items-center gap-4 text-sm font-medium text-slate-600">
                <label htmlFor="laborCostInput" className="shrink-0 font-bold text-slate-700">Costo Mano de Obra Lote</label>
                <div className="relative w-32 shrink-0">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">S/</span>
                  <input
                    id="laborCostInput"
                    type="number"
                    value={laborCost || ''}
                    onChange={(e) => setLaborCost(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full text-right pr-3.5 pl-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none"
                    min="0"
                    step="1"
                  />
                </div>
              </div>

              <div className="border-t border-dashed border-slate-100 pt-4 flex justify-between items-center text-sm font-bold text-slate-700">
                <span>Costo Total Lote</span>
                <span className="text-base text-slate-900 font-extrabold">{formatMoney(totalProductionCost)}</span>
              </div>

              <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                <span>Costo Unitario de Producción</span>
                <span className="font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">{formatMoney(unitProductionCost)} / pieza</span>
              </div>
            </div>

            {/* Selector de Multiplicador de Ganancia */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Multiplicador de Ganancia
                </span>
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-md font-black">
                  {gainFactor}x
                </span>
              </div>

              {/* Botones rápidos de ganancia (3.5x a 4.0x) */}
              <div className="grid grid-cols-4 gap-2">
                {[3.5, 3.6, 3.8, 4.0].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setGainFactor(val)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      gainFactor === val 
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-100' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {val}x
                  </button>
                ))}
              </div>

              {/* Custom Factor Slider */}
              <input
                type="range"
                min="3.5"
                max="4.0"
                step="0.1"
                value={gainFactor}
                onChange={(e) => setGainFactor(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Input del PVP Final Aprobado */}
            <div className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 p-4 rounded-2xl border border-emerald-500/20 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>Precio de Venta al Público (PVP) Sugerido</span>
                <span className="text-emerald-600 font-extrabold">{formatMoney(unitProductionCost * gainFactor)}</span>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pvpInput" className="block text-xs font-bold text-slate-600">PVP Unitario Final Aprobado (Editable)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-sm text-slate-400 font-bold">S/</span>
                  <input
                    id="pvpInput"
                    type="number"
                    value={pvp}
                    onChange={(e) => setPvp(e.target.value)}
                    className="w-full text-right pr-4 pl-9 py-2.5 bg-white border border-slate-200 rounded-xl text-base font-black focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-emerald-700"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block font-semibold leading-relaxed">
                  * El PVP es cargado automáticamente basándose en el multiplicador de ganancia, pero puedes redondearlo o cambiarlo manualmente.
                </span>
              </div>
            </div>

            {/* Alerta de Stock Crítico */}
            {hasStockIssues && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 text-xs text-rose-800 animate-pulse">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <strong className="font-bold block">¡Materia Prima Insuficiente!</strong>
                  <p className="mt-0.5 leading-relaxed text-[11px] text-rose-700">
                    Uno o más insumos formulados superan las existencias en el Almacén Principal. Por favor ajusta las cantidades o carga más materia prima.
                  </p>
                </div>
              </div>
            )}

            {/* Resumen del producto en Almacén Final */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-2">
              <span className="font-bold text-slate-700 block">Vista Previa de Entrada en Almacén Final:</span>
              <div className="space-y-1">
                <p>• Producto: <strong className="text-slate-800">{productName || 'Pendiente...'} - {unitWeight}g</strong></p>
                <p>• Cantidad de entrada: <strong className="text-slate-800">+{unitsProduced} unidades</strong></p>
                <p>• Valor de venta (PVP): <strong className="text-slate-800">{formatMoney(parseFloat(pvp) || 0)}</strong></p>
              </div>
            </div>

            {/* Botón Fabricar */}
            <button
              onClick={handleFabricate}
              disabled={isSubmitting || hasStockIssues || selectedIngredients.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:pointer-events-none text-white py-3.5 text-sm font-black transition-all shadow-md shadow-emerald-100 ring-2 ring-emerald-300/30 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Fabricando Lote...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Fabricar y Enviar al Almacén Final
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Production;
