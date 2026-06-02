import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, Calculator as CalcIcon, BookOpen, Sparkles, BadgeDollarSign, Menu } from 'lucide-react';
import logoSrc from '../assets/logo.png';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Calculator } from './components/Calculator';
import { Recipes } from './components/Recipes';
import { Facturacion } from './components/Facturacion';
import { HistorialVentas } from './components/HistorialVentas';
import { Ganancias } from './components/Ganancias';
import { api, type Ingredient, type Recipe, type RecipeInput, type CalculationRequest, type DashboardMetricsResponse, type InventoryMovement, type InventoryLocation, type Category, type Product } from './services/api';
import { toast } from 'sonner';

type Tab = 'dashboard' | 'inventory' | 'calculator' | 'recipes' | 'facturacion' | 'facturacion-historial' | 'facturacion-ganancias';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [facturacionMenuOpen, setFacturacionMenuOpen] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab.startsWith('facturacion')) {
      setFacturacionMenuOpen(true);
    }
  }, [activeTab]);

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
      const [ingredientsData, recipesData, categoriesData, productsData] = await Promise.all([
        api.fetchIngredients(),
        api.fetchRecipes(),
        api.fetchCategories(),
        api.fetchProducts(),
      ]);
      setIngredients(ingredientsData);
      setRecipes(recipesData);
      setCategories(categoriesData);
      setProducts(productsData);
      const [metricsData, movementsData, locationsData] = await Promise.all([
        api.fetchDashboardMetrics(),
        api.fetchMovements(),
        api.fetchLocations(),
      ]);
      setDashboardMetrics(metricsData);
      setMovements(movementsData);
      setLocations(locationsData);
    } catch (err) {
      setError('Error al cargar los datos. Asegúrate de que el servidor API esté ejecutándose y accesible (proxy /api).');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddIngredient = async (ingredient: Omit<Ingredient, 'id'>) => {
    try {
      const newIngredient = await api.createIngredient(ingredient);
      setIngredients(current => [...current, newIngredient]);
      const metricsData = await api.fetchDashboardMetrics();
      setDashboardMetrics(metricsData);
      setMovements(await api.fetchMovements());
      toast.success('Ingrediente guardado. Copia de seguridad creada.');
    } catch (err) {
      console.error('Error adding ingredient:', err);
      alert('Error al agregar el ingrediente');
    }
  };

  const handleUpdateIngredient = async (id: string, ingredient: Partial<Ingredient>) => {
    try {
      const updated = await api.updateIngredient(id, ingredient);
      setIngredients(current => current.map(i => i.id === id ? updated : i));
      const metricsData = await api.fetchDashboardMetrics();
      setDashboardMetrics(metricsData);
      setMovements(await api.fetchMovements());
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
      setIngredients(current => current.filter(i => i.id !== id));
      const metricsData = await api.fetchDashboardMetrics();
      setDashboardMetrics(metricsData);
      setMovements(await api.fetchMovements());
      toast.success('Ingrediente eliminado. Copia de seguridad creada.');
    } catch (err) {
      console.error('Error deleting ingredient:', err);
      alert('Error al eliminar el ingrediente');
    }
  };

  const handleBulkImport = async (importedList: any[]) => {
    try {
      const response = await api.bulkImportIngredients(importedList);
      if (response.errors && response.errors.length > 0) {
        toast.warning(`Importación con advertencias: ${response.errors.join(', ')}`);
      } else {
        toast.success(`Se importaron ${response.data.length} ingredientes con éxito.`);
      }
      await loadData();
    } catch (err: any) {
      console.error('Error importing ingredients:', err);
      toast.error(`Error al importar ingredientes: ${err.message}`);
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

  const handleAddProduct = async (product: any) => {
    try {
      await api.createProduct(product);
      await loadData();
      toast.success('Producto comercial guardado con éxito.');
    } catch (err: any) {
      console.error('Error adding product:', err);
      toast.error(`Error al agregar el producto: ${err.message}`);
    }
  };

  const handleUpdateProduct = async (id: string, product: any) => {
    try {
      await api.updateProduct(id, product);
      await loadData();
      toast.success('Producto comercial actualizado con éxito.');
    } catch (err: any) {
      console.error('Error updating product:', err);
      toast.error(`Error al actualizar el producto: ${err.message}`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto y todas sus variantes comerciales?')) return;
    try {
      await api.deleteProduct(id);
      await loadData();
      toast.success('Producto comercial eliminado.');
    } catch (err: any) {
      console.error('Error deleting product:', err);
      toast.error(`Error al eliminar el producto: ${err.message}`);
    }
  };

  const handleCreateVariant = async (productId: string, variant: any) => {
    try {
      await api.createVariant(productId, variant);
      await loadData();
      toast.success('Variante comercial creada con éxito.');
    } catch (err: any) {
      console.error('Error creating variant:', err);
      toast.error(`Error al crear la variante: ${err.message}`);
    }
  };

  const handleDeleteVariant = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta variante comercial?')) return;
    try {
      await api.deleteVariant(id);
      await loadData();
      toast.success('Variante comercial eliminada.');
    } catch (err: any) {
      console.error('Error deleting variant:', err);
      toast.error(`Error al eliminar la variante: ${err.message}`);
    }
  };

  const handleCalculate = async (request: CalculationRequest) => {
    return await api.calculateBatch(request);
  };

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory' as Tab, label: 'Inventario', icon: Package },
    { id: 'calculator' as Tab, label: 'Calculadora', icon: CalcIcon },
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
                const isFacturacionTab = tab.id === 'facturacion';
                const isPartOfFacturacion = activeTab.startsWith('facturacion');
                const isActive = isFacturacionTab ? isPartOfFacturacion : activeTab === tab.id;

                if (isFacturacionTab) {
                  return (
                    <div key={tab.id} className="space-y-1">
                      <button
                        onClick={() => {
                          setFacturacionMenuOpen(!facturacionMenuOpen);
                          if (!isPartOfFacturacion) {
                            setActiveTab('facturacion');
                          }
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-all cursor-pointer ${
                          isActive
                            ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 font-bold'
                            : 'text-slate-600 hover:bg-sky-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 shrink-0" />
                          {sidebarOpen && <span className="font-medium">{tab.label}</span>}
                        </div>
                        {sidebarOpen && (
                          <svg
                            className={`h-4 w-4 shrink-0 transition-transform duration-200 text-slate-400 ${facturacionMenuOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>

                      {/* Dropdown Items */}
                      {facturacionMenuOpen && sidebarOpen && (
                        <div className="pl-6 pr-2 py-1 space-y-1 bg-slate-50/50 rounded-2xl border border-slate-100/50 animate-fadeIn">
                          <button
                            onClick={() => setActiveTab('facturacion')}
                            className={`flex w-full items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                              activeTab === 'facturacion'
                                ? 'text-rose-600 bg-rose-50/40 font-bold'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
                            Caja POS / Boleta
                          </button>
                          
                          <button
                            onClick={() => setActiveTab('facturacion-historial')}
                            className={`flex w-full items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                              activeTab === 'facturacion-historial'
                                ? 'text-rose-600 bg-rose-50/40 font-bold'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" />
                            Historial de Ventas
                          </button>


                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all cursor-pointer ${
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
                <Dashboard ingredients={ingredients} recipes={recipes} metrics={dashboardMetrics} onNavigate={setActiveTab} />
              )}
              {activeTab === 'inventory' && (
                <Inventory
                  ingredients={ingredients}
                  movements={movements}
                  locations={locations}
                  categories={categories}
                  onAdd={handleAddIngredient}
                  onUpdate={handleUpdateIngredient}
                  onDelete={handleDeleteIngredient}
                  onBulkImport={handleBulkImport}
                />
              )}
              {activeTab === 'calculator' && (
                <Calculator
                  recipes={recipes}
                  products={products}
                  ingredients={ingredients}
                  categories={categories}
                  onCalculate={handleCalculate}
                  onNavigate={setActiveTab}
                />
              )}
              {activeTab === 'recipes' && (
                <Recipes
                  recipes={recipes}
                  ingredients={ingredients}
                  products={products}
                  categories={categories}
                  onCreate={handleAddRecipe}
                  onUpdate={handleUpdateRecipe}
                  onDelete={handleDeleteRecipe}
                  onCreateProduct={handleAddProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onCreateVariant={handleCreateVariant}
                  onDeleteVariant={handleDeleteVariant}
                />
              )}
              {activeTab === 'facturacion' && (
                <Facturacion onSaleComplete={loadData} />
              )}
              {activeTab === 'facturacion-historial' && (
                <HistorialVentas />
              )}
              {activeTab === 'facturacion-ganancias' && (
                <Ganancias />
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
