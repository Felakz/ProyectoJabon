import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BookOpen, Droplet, Sparkles, Plus, Edit2, Trash2, X } from 'lucide-react';
import type { Recipe, RecipeInput } from '../services/api';

interface Ingredient {
  id: string;
  name: string;
}

interface RecipesProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  onCreate: (recipe: RecipeInput) => Promise<void>;
  onUpdate: (id: string, recipe: Partial<RecipeInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const emptyIngredientRow = () => ({ ingredientId: '', percentage: '0' });

export function Recipes({ recipes, ingredients, onCreate, onUpdate, onDelete }: RecipesProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<RecipeInput>({
    name: '',
    description: '',
    targetWeight: 1000,
    ingredients: [
      { ingredientId: '', percentage: 100 },
    ],
    overfattingPercentage: 5,
    waterDiscountPercentage: 10,
  });

  const totalPercentage = useMemo(
    () => formData.ingredients.reduce((sum, ingredient) => sum + Number(ingredient.percentage || 0), 0),
    [formData.ingredients]
  );

  const getIngredientName = (id: string) => {
    const ingredient = ingredients.find(item => item.id === id);
    return ingredient ? ingredient.name : 'Desconocido';
  };

  const updateIngredientRow = (index: number, field: 'ingredientId' | 'percentage', value: string) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.map((ingredient, currentIndex) => (
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
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, emptyIngredientRow()],
    });
  };

  const removeIngredientRow = (index: number) => {
    if (formData.ingredients.length === 1) return;

    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, currentIndex) => currentIndex !== index),
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setIsModalOpen(false);
    setFormData({
      name: '',
      description: '',
      targetWeight: 1000,
      ingredients: [{ ingredientId: '', percentage: 100 }],
      overfattingPercentage: 5,
      waterDiscountPercentage: 10,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (Math.abs(totalPercentage - 100) > 0.01) {
      alert('Los porcentajes de la receta deben sumar 100%');
      return;
    }

    if (formData.ingredients.some(ingredient => !ingredient.ingredientId)) {
      alert('Selecciona un ingrediente del inventario en cada fila');
      return;
    }

    const payload: RecipeInput = {
      ...formData,
      ingredients: formData.ingredients.map(ingredient => ({
        ingredientId: ingredient.ingredientId,
        percentage: Number(ingredient.percentage),
      })),
    };

    if (editingId) {
      await onUpdate(editingId, payload);
    } else {
      await onCreate(payload);
    }

    resetForm();
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setIsModalOpen(true);
    setFormData({
      name: recipe.name,
      description: recipe.description,
      targetWeight: recipe.targetWeight,
      ingredients: recipe.ingredients.map(ingredient => ({
        ingredientId: ingredient.ingredientId,
        percentage: ingredient.percentage,
      })),
      overfattingPercentage: recipe.overfattingPercentage,
      waterDiscountPercentage: recipe.waterDiscountPercentage,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-rose-600" />
          <h2 className="text-2xl font-bold">Recetas y Fórmulas</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-white transition-colors hover:bg-rose-600"
        >
          <Plus className="w-4 h-4" />
          Nueva receta
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-6 py-4 backdrop-blur">
              <h3 className="font-semibold text-lg">{editingId ? 'Editar receta' : 'Crear receta'}</h3>
              <button type="button" onClick={resetForm} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-[420px,1fr] gap-6 p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ej: Fórmula hidratante"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                    placeholder="Breve descripción de la receta"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Peso objetivo (g)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.targetWeight}
                    onChange={(event) => setFormData({ ...formData, targetWeight: Number(event.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium">Ingredientes del inventario</label>
                    <button
                      type="button"
                      onClick={addIngredientRow}
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      + Agregar fila
                    </button>
                  </div>

                  {formData.ingredients.map((ingredient, index) => (
                    <div key={index} className="grid grid-cols-[1fr,110px,32px] gap-2">
                      <select
                        value={ingredient.ingredientId}
                        onChange={(event) => updateIngredientRow(index, 'ingredientId', event.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Selecciona un producto</option>
                        {ingredients.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={ingredient.percentage}
                        onChange={(event) => updateIngredientRow(index, 'percentage', event.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeIngredientRow(index)}
                        className="rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        title="Eliminar fila"
                      >
                        <Trash2 className="mx-auto w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <div className={`rounded-lg px-3 py-2 text-sm ${Math.abs(totalPercentage - 100) < 0.01 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    Total de porcentajes: {totalPercentage.toFixed(2)}%
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-500 px-4 py-3 font-medium text-white transition-colors hover:bg-emerald-600"
                  >
                    {editingId ? 'Actualizar receta' : 'Guardar receta'}
                  </button>
                </div>
              </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-rose-600" />
                  <h4 className="font-semibold">Vista previa</h4>
                </div>
                <div className="space-y-3">
                  {formData.ingredients.map((ingredient, index) => (
                    <div key={index} className="rounded-xl bg-gray-50 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">{getIngredientName(ingredient.ingredientId) || 'Sin seleccionar'}</span>
                        <span className="text-sm font-semibold">{ingredient.percentage}%</span>
                      </div>
                          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                            <div className="h-full bg-gradient-to-r from-rose-400 to-sky-400" style={{ width: `${ingredient.percentage}%` }} />
                          </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {recipes.map(recipe => (
          <div key={recipe.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="bg-gradient-to-r from-rose-400 to-sky-400 p-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-lg">{recipe.name}</h3>
                  <p className="text-sm text-rose-50">{recipe.description}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(recipe)} className="rounded-lg bg-white/15 p-2 hover:bg-white/25" title="Editar receta">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete(recipe.id)} className="rounded-lg bg-white/15 p-2 hover:bg-white/25" title="Eliminar receta">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-600" />
                  <div>
                    <p className="text-xs text-gray-500">Sobreengrasado</p>
                    <p className="font-semibold">{recipe.overfattingPercentage}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-sky-600" />
                  <div>
                    <p className="text-xs text-gray-500">Desc. agua</p>
                    <p className="font-semibold">{recipe.waterDiscountPercentage}%</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Composición:</p>
                <div className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <div key={index} className="relative">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-700">{getIngredientName(ingredient.ingredientId)}</span>
                        <span className="text-sm font-semibold">{ingredient.percentage}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                          style={{ width: `${ingredient.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500">
                  Peso por defecto: <span className="font-medium">{recipe.targetWeight}g</span>
                </p>
              </div>
            </div>
          </div>
        ))}

        {recipes.length === 0 && (
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-12 text-center border border-emerald-200 lg:col-span-2">
            <BookOpen className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
            <p className="text-gray-600">No hay recetas disponibles</p>
          </div>
        )}
      </div>
    </div>
  );
}
