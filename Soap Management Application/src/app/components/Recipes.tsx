import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BookOpen, Droplet, Sparkles, Plus, Edit2, Trash2, X, Package, Tag, Layers, ShoppingBag } from 'lucide-react';
import type { Recipe, RecipeInput, Product, ProductVariant, Category } from '../services/api';

interface Ingredient {
  id: string;
  name: string;
}

interface RecipesProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  products: Product[];
  categories: Category[];
  onCreate: (recipe: RecipeInput) => Promise<void>;
  onUpdate: (id: string, recipe: Partial<RecipeInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateProduct: (product: any) => Promise<void>;
  onUpdateProduct: (id: string, product: any) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onCreateVariant: (productId: string, variant: any) => Promise<void>;
  onDeleteVariant: (id: string) => Promise<void>;
}

const emptyIngredientRow = () => ({ ingredientId: '', percentage: 100 });

export function Recipes({
  recipes,
  ingredients,
  products,
  categories,
  onCreate,
  onUpdate,
  onDelete,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onCreateVariant,
  onDeleteVariant,
}: RecipesProps) {
  // Pestaña interna: 'recipes' (Recetas) o 'catalog' (Catálogo Comercial)
  const [subTab, setSubTab] = useState<'catalog' | 'recipes'>('catalog');

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

  // Estados para Productos
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productFormData, setProductFormData] = useState({
    name: '',
    description: '',
    categoryId: 'cat-jabon-art',
    baseRecipeId: '',
    weight: '100',
    sku: '',
    price: '15.00',
    stock: '30',
  });

  // Estados para agregar Variante Inline
  const [variantFormProductId, setVariantFormProductId] = useState<string | null>(null);
  const [variantFormData, setVariantFormData] = useState({
    weight: '100',
    sku: '',
    price: '15.00',
    stock: '0',
  });

  const totalPercentage = useMemo(
    () => recipeFormData.ingredients.reduce((sum, ingredient) => sum + Number(ingredient.percentage || 0), 0),
    [recipeFormData.ingredients]
  );

  const getIngredientName = (id: string) => {
    const ingredient = ingredients.find(item => item.id === id);
    return ingredient ? ingredient.name : 'Desconocido';
  };

  const getRecipeName = (id: string) => {
    const rec = recipes.find(r => r.id === id);
    return rec ? rec.name : 'Sin receta';
  };

  const getCategoryName = (id?: string) => {
    const cat = categories.find(c => c.id === id);
    return cat ? cat.name : 'Sin categoría';
  };

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

    if (recipeFormData.ingredients.some(ingredient => !ingredient.ingredientId)) {
      alert('Selecciona un ingrediente del inventario en cada fila');
      return;
    }

    const payload: RecipeInput = {
      ...recipeFormData,
      ingredients: recipeFormData.ingredients.map(ingredient => ({
        ingredientId: ingredient.ingredientId,
        percentage: Number(ingredient.percentage),
      })),
    };

    if (editingRecipeId) {
      await onUpdate(editingRecipeId, payload);
    } else {
      await onCreate(payload);
    }

    resetRecipeForm();
  };

  const handleRecipeEdit = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setIsRecipeModalOpen(true);
    setRecipeFormData({
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

  // --- Handlers de Productos ---
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productFormData.baseRecipeId) {
      alert('Debes seleccionar una receta base para el producto');
      return;
    }

    const payload = {
      name: productFormData.name,
      description: productFormData.description,
      categoryId: productFormData.categoryId,
      baseRecipeId: productFormData.baseRecipeId,
      // Solo en creación enviamos variante inicial
      initialVariant: !editingProductId ? {
        weight: parseFloat(productFormData.weight),
        sku: productFormData.sku || `JAB-${productFormData.name.slice(0, 3).toUpperCase()}-${productFormData.weight}`,
        price: parseFloat(productFormData.price),
        stock: parseInt(productFormData.stock) || 0,
      } : undefined,
    };

    if (editingProductId) {
      await onUpdateProduct(editingProductId, payload);
    } else {
      await onCreateProduct(payload);
    }

    resetProductForm();
  };

  const handleProductEdit = (product: Product) => {
    setEditingProductId(product.id);
    setIsProductModalOpen(true);
    setProductFormData({
      name: product.name,
      description: product.description,
      categoryId: product.categoryId || 'cat-jabon-art',
      baseRecipeId: product.baseRecipeId,
      weight: '',
      sku: '',
      price: '',
      stock: '',
    });
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setIsProductModalOpen(false);
    setProductFormData({
      name: '',
      description: '',
      categoryId: 'cat-jabon-art',
      baseRecipeId: recipes[0]?.id || '',
      weight: '100',
      sku: '',
      price: '15.00',
      stock: '30',
    });
  };

  // Autogenerar SKU en creación de producto
  const handleProductNameChange = (val: string) => {
    const cleanName = val.slice(0, 3).replace(/\s/g, '').toUpperCase();
    setProductFormData({
      ...productFormData,
      name: val,
      sku: `JAB-${cleanName}-${productFormData.weight}`,
    });
  };

  const handleProductWeightChange = (val: string) => {
    const cleanName = productFormData.name.slice(0, 3).replace(/\s/g, '').toUpperCase();
    setProductFormData({
      ...productFormData,
      weight: val,
      sku: `JAB-${cleanName || 'PROD'}-${val}`,
    });
  };

  // --- Handlers de Variantes Inline ---
  const handleVariantSubmit = async (e: React.FormEvent, productId: string) => {
    e.preventDefault();
    const sku = variantFormData.sku || `VAR-${productId.slice(-4).toUpperCase()}-${variantFormData.weight}`;
    
    await onCreateVariant(productId, {
      weight: parseFloat(variantFormData.weight),
      sku,
      price: parseFloat(variantFormData.price),
      stock: parseInt(variantFormData.stock) || 0,
    });

    setVariantFormProductId(null);
    setVariantFormData({ weight: '100', sku: '', price: '15.00', stock: '0' });
  };

  const triggerVariantForm = (product: Product) => {
    if (variantFormProductId === product.id) {
      setVariantFormProductId(null);
    } else {
      const cleanName = product.name.slice(0, 3).replace(/\s/g, '').toUpperCase();
      setVariantFormProductId(product.id);
      setVariantFormData({
        weight: '100',
        sku: `JAB-${cleanName}-${Date.now().toString().slice(-4)}`,
        price: '15.00',
        stock: '10',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-pestañas visuales al estilo Shadcn/Premium */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 backdrop-blur border border-pink-100 p-3 rounded-2xl shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setSubTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              subTab === 'catalog'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-rose-500" />
            Catálogo Comercial
          </button>
          <button
            onClick={() => setSubTab('recipes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              subTab === 'recipes'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-500" />
            Recetas / Fórmulas
          </button>
        </div>

        {subTab === 'catalog' ? (
          <button
            onClick={() => {
              resetProductForm();
              setIsProductModalOpen(true);
            }}
            className="w-full sm:w-auto bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-semibold shadow-sm text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>
        ) : (
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
        )}
      </div>

      {/* --- SECCIÓN 1: CATÁLOGO COMERCIAL --- */}
      {subTab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
              {/* Encabezado del producto */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 text-white flex justify-between items-center">
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-500 text-white tracking-wider">
                    {getCategoryName(product.categoryId)}
                  </span>
                  <h3 className="font-bold text-lg mt-1">{product.name}</h3>
                  <p className="text-xs text-slate-300 font-medium">Fórmula: {getRecipeName(product.baseRecipeId)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleProductEdit(product)}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
                    title="Editar producto"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteProduct(product.id)}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white hover:text-red-300 rounded-xl transition-all cursor-pointer"
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Cuerpo del producto (Variantes de Venta) */}
              <div className="p-5 space-y-4">
                <p className="text-sm text-slate-600 font-medium">{product.description || 'Sin descripción comercial.'}</p>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-rose-400" />
                      Variantes de venta
                    </h4>
                    <button
                      onClick={() => triggerVariantForm(product)}
                      className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {variantFormProductId === product.id ? 'Cerrar' : 'Añadir peso'}
                    </button>
                  </div>

                  {/* Formulario de Variante Inline */}
                  {variantFormProductId === product.id && (
                    <form onSubmit={(e) => handleVariantSubmit(e, product.id)} className="bg-rose-50/50 p-4 rounded-xl border border-rose-100/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold mb-1">Peso (g)</label>
                        <input
                          type="number"
                          required
                          value={variantFormData.weight}
                          onChange={(e) => setVariantFormData({ ...variantFormData, weight: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-1.5 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Precio (S/)</label>
                        <input
                          type="number"
                          required
                          step="0.01"
                          value={variantFormData.price}
                          onChange={(e) => setVariantFormData({ ...variantFormData, price: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-1.5 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Stock inicial</label>
                        <input
                          type="number"
                          value={variantFormData.stock}
                          onChange={(e) => setVariantFormData({ ...variantFormData, stock: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-1.5 bg-white"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="w-full bg-rose-500 text-white p-2 rounded-lg font-bold hover:bg-rose-600 transition-all cursor-pointer"
                        >
                          Guardar
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Lista de variantes */}
                  <div className="space-y-2">
                    {product.variants && product.variants.length > 0 ? (
                      product.variants.map((v) => (
                        <div key={v.id} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm hover:bg-slate-100/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500">
                              <Package className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{v.weight}g - S/ {v.price.toFixed(2)}</p>
                              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">SKU: {v.sku}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Stock</p>
                              <span className={`px-2 py-0.5 rounded text-xs font-extrabold ${
                                v.stock <= 5 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {v.stock} uds
                              </span>
                            </div>
                            <button
                              onClick={() => onDeleteVariant(v.id)}
                              className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                              title="Eliminar variante"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 font-medium text-center py-2">
                        No hay variantes de peso registradas para este producto comercial.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {products.length === 0 && (
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-12 text-center border border-rose-200 md:col-span-2">
              <ShoppingBag className="w-16 h-16 text-rose-300 mx-auto mb-4" />
              <p className="text-slate-600 font-semibold">No hay productos en el catálogo comercial</p>
              <p className="text-xs text-slate-500 mt-1">Crea tu primer producto asociándolo a una receta de saponificación.</p>
            </div>
          )}
        </div>
      )}

      {/* --- SECCIÓN 2: BIBLIOTECA DE RECETAS BASE --- */}
      {subTab === 'recipes' && (
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
                    {recipe.ingredients.map((ingredient, index) => (
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
      )}

      {/* --- MODAL 1: FORMULARIO DE PRODUCTO COMERCIAL --- */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl border border-pink-100 p-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <h3 className="font-bold text-lg text-slate-800">
                {editingProductId ? 'Editar Producto Comercial' : 'Nuevo Producto Comercial'}
              </h3>
              <button type="button" onClick={resetProductForm} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  required
                  value={productFormData.name}
                  onChange={(e) => handleProductNameChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                  placeholder="Ej: Jabón Exfoliante de Avena"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea
                  value={productFormData.description}
                  onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                  placeholder="Descripción comercial atractiva"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={productFormData.categoryId}
                    onChange={(e) => setProductFormData({ ...productFormData, categoryId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm bg-white"
                  >
                    {categories.filter(c => c.type === 'product').map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Fórmula Química Base</label>
                  <select
                    value={productFormData.baseRecipeId}
                    onChange={(e) => setProductFormData({ ...productFormData, baseRecipeId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm bg-white"
                    required
                  >
                    <option value="">Selecciona una receta</option>
                    {recipes.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Si es creación, exigimos variante inicial */}
              {!editingProductId && (
                <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Variante Comercial Inicial</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold mb-1">Peso (g)</label>
                      <input
                        type="number"
                        required
                        value={productFormData.weight}
                        onChange={(e) => handleProductWeightChange(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Precio Unitario (S/)</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={productFormData.price}
                        onChange={(e) => setProductFormData({ ...productFormData, price: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Stock Inicial (Uds)</label>
                      <input
                        type="number"
                        value={productFormData.stock}
                        onChange={(e) => setProductFormData({ ...productFormData, stock: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">SKU Comercial</label>
                      <input
                        type="text"
                        required
                        value={productFormData.sku}
                        onChange={(e) => setProductFormData({ ...productFormData, sku: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2 bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer"
                >
                  {editingProductId ? 'Actualizar Producto' : 'Crear Producto'}
                </button>
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: FORMULARIO DE RECETAS BASE --- */}
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
                      >
                        <option value="">Selecciona un aceite</option>
                        {ingredients.map(item => (
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
