import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, Calculator as CalcIcon, BookOpen, Sparkles, BadgeDollarSign, Menu } from 'lucide-react';
import logoSrc from '../assets/logo.png';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Calculator } from './components/Calculator';
import { Recipes } from './components/Recipes';
import { Facturacion } from './components/Facturacion';
import { api, type Ingredient, type Recipe, type RecipeInput, type CalculationRequest } from './services/api';
import { toast } from 'sonner';

type Tab = 'dashboard' | 'inventory' | 'calculator' | 'recipes' | 'facturacion';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // If app opened at /facturacion, show that tab (useful when opening new tab)
    try {
      const path = window.location.pathname || '';
      if (path.startsWith('/facturacion')) setActiveTab('facturacion');
    } catch (e) {
      // ignore (SSR or test env)
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ingredientsData, recipesData] = await Promise.all([
        api.fetchIngredients(),
        api.fetchRecipes(),
      ]);
      setIngredients(ingredientsData);
      setRecipes(recipesData);
    } catch (err) {
      setError('Error al cargar los datos. Asegúrate de que el servidor API esté ejecutándose en http://localhost:3000');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddIngredient = async (ingredient: Omit<Ingredient, 'id'>) => {
    try {
      const newIngredient = await api.createIngredient(ingredient);
      setIngredients([...ingredients, newIngredient]);
      toast.success('Ingrediente guardado. Copia de seguridad creada.');
    } catch (err) {
      console.error('Error adding ingredient:', err);
      alert('Error al agregar el ingrediente');
    }
  };

  const handleUpdateIngredient = async (id: string, ingredient: Partial<Ingredient>) => {
    try {
      const updated = await api.updateIngredient(id, ingredient);
      setIngredients(ingredients.map(i => i.id === id ? updated : i));
      toast.success('Ingrediente actualizado. Copia de seguridad creada.');
    } catch (err) {
      console.error('Error updating ingredient:', err);
      alert('Error al actualizar el ingrediente');
    }
  };

  const handleDeleteIngredient = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este ingrediente?')) return;

    try {
      await api.deleteIngredient(id);
      setIngredients(ingredients.filter(i => i.id !== id));
      toast.success('Ingrediente eliminado. Copia de seguridad creada.');
    } catch (err) {
      console.error('Error deleting ingredient:', err);
      alert('Error al eliminar el ingrediente');
    }
  };

  const handleAddRecipe = async (recipe: RecipeInput) => {
    try {
      const newRecipe = await api.createRecipe(recipe);
      setRecipes([...recipes, newRecipe]);
      toast.success('Receta guardada. Copia de seguridad creada.');
    } catch (err) {
      console.error('Error adding recipe:', err);
      alert('Error al agregar la receta');
    }
  };

  const handleUpdateRecipe = async (id: string, recipe: Partial<RecipeInput>) => {
    try {
      const updated = await api.updateRecipe(id, recipe);
      setRecipes(recipes.map(r => r.id === id ? updated : r));
      toast.success('Receta actualizada. Copia de seguridad creada.');
    } catch (err) {
      console.error('Error updating recipe:', err);
      alert('Error al actualizar la receta');
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta receta?')) return;

    try {
      await api.deleteRecipe(id);
      setRecipes(recipes.filter(r => r.id !== id));
      toast.success('Receta eliminada. Copia de seguridad creada.');
    } catch (err) {
      console.error('Error deleting recipe:', err);
      alert('Error al eliminar la receta');
    }
  };

  const handleCalculate = async (request: CalculationRequest) => {
    return await api.calculateBatch(request);
  };

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory' as Tab, label: 'Inventario', icon: Package },
    { id: 'calculator' as Tab, label: 'Calculadora', icon: CalcIcon },
    { id: 'recipes' as Tab, label: 'Recetas', icon: BookOpen },
    { id: 'facturacion' as Tab, label: 'Facturación', icon: BadgeDollarSign },
  ];

  if (loading) {
    return (
      <div className="size-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="size-full flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <h2 className="font-bold text-xl mb-2">Error de Conexión</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="size-full bg-gradient-to-br from-rose-50 via-white to-sky-50 overflow-hidden">
      <div className="flex size-full flex-col md:flex-row">
        <aside className={`border-b md:border-b-0 md:border-r border-pink-100 bg-white/90 backdrop-blur shadow-sm transition-all duration-200 ${sidebarOpen ? 'md:w-72' : 'md:w-20'}`}>
          <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-pink-100">
            <div className="flex items-center gap-3 min-w-0">
                <div className={`p-1 rounded-xl shrink-0 ${sidebarOpen ? 'bg-gradient-to-r from-rose-400 to-sky-400' : 'bg-white'} ${sidebarOpen ? '' : 'flex items-center justify-center shadow-sm'}`}>
                  <img src={logoSrc} alt="Angely Natural" className={`${sidebarOpen ? 'h-8 w-8 object-contain' : 'h-10 w-10 object-contain'}`} />
                </div>
                {sidebarOpen && (
                  <div className="min-w-0">
                    <h1 className="font-bold text-base truncate text-slate-800">Angely Natural</h1>
                    <p className="text-xs text-slate-500 truncate">Formulación y facturación</p>
                  </div>
                )}
              </div>
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-pink-100 bg-white text-slate-700 hover:bg-rose-50"
              aria-label="Alternar sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>

          <div className="px-3 py-4">
            {sidebarOpen ? (
              <div className="rounded-2xl bg-gradient-to-br from-pink-300 via-rose-300 to-sky-300 p-4 text-white shadow-lg">
                <div className="text-xs uppercase tracking-[0.25em] text-white/80">Angely Natural</div>
                <div className="mt-2 text-sm font-medium leading-6">Sistema profesional de formulación y boleta electrónica</div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-2">{/* placeholder when collapsed to avoid overflow */}</div>
            )}
          </div>

          <nav className="px-3 pb-4">
            <div className="space-y-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                      isActive
                        ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                        : 'text-slate-600 hover:bg-sky-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {sidebarOpen && <span className="font-medium">{tab.label}</span>}
                  </button>
                );
              })}
            </div>
          </nav>

          {sidebarOpen && (
            <div className="px-4 pb-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
                Conectado al servidor
              </div>
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 py-6">
              {activeTab === 'dashboard' && (
                <Dashboard ingredients={ingredients} recipes={recipes} />
              )}
              {activeTab === 'inventory' && (
                <Inventory
                  ingredients={ingredients}
                  onAdd={handleAddIngredient}
                  onUpdate={handleUpdateIngredient}
                  onDelete={handleDeleteIngredient}
                />
              )}
              {activeTab === 'calculator' && (
                <Calculator recipes={recipes} onCalculate={handleCalculate} />
              )}
              {activeTab === 'recipes' && (
                <Recipes
                  recipes={recipes}
                  ingredients={ingredients}
                  onCreate={handleAddRecipe}
                  onUpdate={handleUpdateRecipe}
                  onDelete={handleDeleteRecipe}
                />
              )}
              {activeTab === 'facturacion' && (
                <Facturacion />
              )}
            </div>
          </main>

          <footer className="border-t border-pink-100 bg-white/80 py-4 backdrop-blur">
            <div className="container mx-auto px-4 text-center text-sm text-slate-500">
              <p>🧼 Sistema de Gestión de Jabones Artesanales v1.0</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
