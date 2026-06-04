import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BookOpen, Droplet, Sparkles, Plus, Edit2, Trash2, X, Layers } from 'lucide-react';
import type { Recipe, RecipeInput, Category } from '../services/api';

interface Ingredient {
  id: string;
  name: string;
  categoryId?: string;
}

interface RecipesProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  categories: Category[];
  onCreate: (recipe: RecipeInput) => Promise<void>;
  onUpdate: (id: string, recipe: Partial<RecipeInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const emptyIngredientRow = () => ({ ingredientId: '', percentage: 100 });

export function Recipes({
  recipes,
  ingredients,
  categories,
  onCreate,
  onUpdate,
  onDelete,
}: RecipesProps) {
  // Estados para Recetas
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeFormData, setRecipeFormData] = useState<RecipeInput>({
    name: '',
    description: '',
    targetWeight: 1000,
    ingredients: [{ ingredientId: '', percentage: 100 }],
    overfattingPercentage: 5,
    waterDiscountPercentage: 10,
  });

  const totalPercentage = useMemo(
    () => recipeFormData.ingredients.reduce((sum, ingredient) => sum + Number(ingredient.percentage || 0), 0),
    [recipeFormData.ingredients]
  );

  const getIngredientName = (id: string) => {
    const ingredient = ingredients.find(item => item.id === id);
    return ingredient ? ingredient.name : 'Desconocido';
  };

  // Filtrar insumos del Almacén Principal (Materia Prima y Esencias) para el dropdown de fórmulas
  const recipeIngredientsOptions = useMemo(() => {
    return ingredients.filter(ing => 
      ['cat-mat-prima', 'cat-esencias'].includes(ing.categoryId || '')
    );
  }, [ingredients]);

  // --- Handlers de Recetas ---
  const updateIngredientRow = (index: number, field: 'ingredientId' | 'percentage', value: string) => {
    setRecipeFormData({
      ...recipeFormData,
      ingredients: recipeFormData.ingredients.map((ingredient, currentIndex) => (
        currentIndex === index
          ? {
              ...ingredient,
              [field]: field === 'percentage' ? Number(value) : value,
            }
          : ingredient
      )),
    });
  };

  const addIngredientRow = () => {
    setRecipeFormData({
      ...recipeFormData,
      ingredients: [...recipeFormData.ingredients, emptyIngredientRow()],
    });
  };

  const removeIngredientRow = (index: number) => {
    if (recipeFormData.ingredients.length === 1) return;
    setRecipeFormData({
      ...recipeFormData,
      ingredients: recipeFormData.ingredients.filter((_, currentIndex) => currentIndex !== index),
    });
  };

  const resetRecipeForm = () => {
    setEditingRecipeId(null);
    setIsRecipeModalOpen(false);
    setRecipeFormData({
      name: '',
      description: '',
      targetWeight: 1000,
      ingredients: [{ ingredientId: '', percentage: 100 }],
      overfattingPercentage: 5,
      waterDiscountPercentage: 10,
    });
  };

  const handleRecipeSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (Math.abs(totalPercentage - 100) > 0.01) {
      alert('Los porcentajes de la receta deben sumar 100%');
      return;
    }

    // Validar que todos los ingredientes seleccionados sean válidos
    const hasEmptyIngredient = recipeFormData.ingredients.some(ing => !ing.ingredientId);
    if (hasEmptyIngredient) {
      alert('Por favor selecciona un insumo en cada fila.');
      return;
    }

    try {
      if (editingRecipeId) {
        await onUpdate(editingRecipeId, recipeFormData);
        toast.success('Fórmula base actualizada correctamente.');
      } else {
        await onCreate(recipeFormData);
        toast.success('Nueva fórmula base creada correctamente.');
      }
      resetRecipeForm();
    } catch (error: any) {
      console.error('Error al guardar receta:', error);
      toast.error('Error al guardar la fórmula base: ' + error.message);
    }
  };

  const handleRecipeEdit = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setRecipeFormData({
      name: recipe.name,
      description: recipe.description,
      targetWeight: recipe.targetWeight,
      ingredients: recipe.ingredients && recipe.ingredients.length > 0
        ? recipe.ingredients.map(ing => ({ ingredientId: ing.ingredientId, percentage: ing.percentage }))
        : [{ ingredientId: '', percentage: 100 }],
      overfattingPercentage: recipe.overfattingPercentage,
      waterDiscountPercentage: recipe.waterDiscountPercentage,
    });
    setIsRecipeModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado de Fórmulas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 backdrop-blur border border-pink-100 p-4 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-900 bg-clip-text text-transparent">
            Formulación y Recetas
          </h2>
          <p className="text-sm text-slate-500 font-medium">Crea, edita y administra las recetas de tus jabones artesanales</p>
        </div>
        <button
          onClick={() => {
            resetRecipeForm();
            setIsRecipeModalOpen(true);
          }}
          className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-semibold shadow-sm text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva Fórmula
        </button>
      </div>

      {/* --- BIBLIOTECA DE RECETAS BASE --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {recipes.map(recipe => (
          <div key={recipe.id} className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="bg-gradient-to-r from-emerald-400 to-teal-500 p-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-lg">{recipe.name}</h3>
                  <p className="text-sm text-emerald-50">{recipe.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRecipeEdit(recipe)}
                    className="rounded-xl bg-white/15 p-2 hover:bg-white/25 transition-all cursor-pointer"
                    title="Editar fórmula"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(recipe.id)}
                    className="rounded-xl bg-white/15 p-2 hover:bg-white/25 transition-all cursor-pointer"
                    title="Eliminar fórmula"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="text-xs text-gray-500">Sobreengrasado</p>
                    <p className="font-bold">{recipe.overfattingPercentage}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-teal-500" />
                  <div>
                    <p className="text-xs text-gray-500">Desc. agua</p>
                    <p className="font-bold">{recipe.waterDiscountPercentage}%</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-700 mb-2">Composición porcentual:</p>
                <div className="space-y-2">
                  {recipe.ingredients && recipe.ingredients.map((ingredient, index) => (
                    <div key={index} className="relative">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-semibold text-gray-700">{getIngredientName(ingredient.ingredientId)}</span>
                        <span className="text-sm font-bold text-emerald-600">{ingredient.percentage}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden border border-slate-100">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-teal-400"
                          style={{ width: `${ingredient.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-gray-500 font-medium">
                  Peso por defecto: <span className="font-bold text-slate-700">{recipe.targetWeight}g</span>
                </p>
              </div>
            </div>
          </div>
        ))}

        {recipes.length === 0 && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-12 text-center border border-emerald-200 lg:col-span-2">
            <BookOpen className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold">No hay fórmulas químicas disponibles</p>
          </div>
        )}
      </div>

      {/* --- MODAL DE FORMULARIO DE RECETAS BASE --- */}
      {isRecipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl border border-emerald-100">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-6 py-4 backdrop-blur">
              <h3 className="font-bold text-lg text-slate-800">
                {editingRecipeId ? 'Editar Fórmula Base' : 'Nueva Fórmula de Saponificación'}
              </h3>
              <button type="button" onClick={resetRecipeForm} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecipeSubmit} className="grid grid-cols-1 md:grid-cols-[1fr,360px] gap-6 p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre de la Fórmula</label>
                  <input
                    type="text"
                    value={recipeFormData.name}
                    onChange={(event) => setRecipeFormData({ ...recipeFormData, name: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    placeholder="Ej: Receta Balanceada Premium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción técnica</label>
                  <textarea
                    value={recipeFormData.description}
                    onChange={(event) => setRecipeFormData({ ...recipeFormData, description: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    placeholder="Escribe el propósito de la fórmula o el tipo de jabón"
                    rows={2}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Peso Batch (g)</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={recipeFormData.targetWeight}
                      onChange={(event) => setRecipeFormData({ ...recipeFormData, targetWeight: Number(event.target.value) })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Sobreengrasado (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      step="1"
                      value={recipeFormData.overfattingPercentage}
                      onChange={(event) => setRecipeFormData({ ...recipeFormData, overfattingPercentage: Number(event.target.value) })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Desc. Agua (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="1"
                      value={recipeFormData.waterDiscountPercentage}
                      onChange={(event) => setRecipeFormData({ ...recipeFormData, waterDiscountPercentage: Number(event.target.value) })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                {/* Composición de aceites */}
                <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-slate-700">Composición de Aceites (Grasas)</label>
                    <button
                      type="button"
                      onClick={addIngredientRow}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Aceite
                    </button>
                  </div>

                  {recipeFormData.ingredients.map((ingredient, index) => (
                    <div key={index} className="grid grid-cols-[1fr,110px,32px] gap-2 items-center">
                      <select
                        value={ingredient.ingredientId}
                        onChange={(event) => updateIngredientRow(index, 'ingredientId', event.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        required
                      >
                        <option value="">Selecciona un aceite</option>
                        {recipeIngredientsOptions.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={ingredient.percentage}
                        onChange={(event) => updateIngredientRow(index, 'percentage', event.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 text-center font-bold"
                        placeholder="%"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeIngredientRow(index)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                        title="Eliminar fila"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-xs font-bold px-1 pt-2">
                    <span className="text-slate-500">Porcentaje Total:</span>
                    <span className={Math.abs(totalPercentage - 100) < 0.01 ? 'text-emerald-600' : 'text-red-500'}>
                      {totalPercentage}% / 100%
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer"
                  >
                    {editingRecipeId ? 'Actualizar Fórmula' : 'Crear Fórmula'}
                  </button>
                  <button
                    type="button"
                    onClick={resetRecipeForm}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

              {/* Vista previa porcentual lateral */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/20 p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                  <BookOpen className="w-5 h-5 text-emerald-500" />
                  <h4 className="font-bold text-sm text-slate-800 font-medium">Composición Química</h4>
                </div>
                <div className="space-y-3">
                  {recipeFormData.ingredients.map((ingredient, index) => (
                    <div key={index} className="rounded-xl bg-white border border-slate-100 p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-1.5 text-xs font-semibold text-slate-600">
                        <span>{getIngredientName(ingredient.ingredientId) || 'Sin insumo'}</span>
                        <span className="font-bold text-slate-900">{ingredient.percentage}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400" style={{ width: `${ingredient.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
