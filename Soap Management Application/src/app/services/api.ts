const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export interface Category {
  id: string;
  name: string;
  description: string;
  type: 'ingredient' | 'product' | 'transaction';
}

export interface Ingredient {
  id: string;
  name: string;
  currentStock: number;
  totalCost: number;
  costPerGram: number;
  sapValue: number;
  categoryId?: string;
  price?: number;
  weight?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  categoryId?: string;
  categoryName?: string;
  baseRecipeId: string;
  recipeName?: string;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  weight: number;
  sku: string;
  price: number;
  stock: number;
}

export interface FinishedProduct {
  id: string;
  name: string;
  stock: number;
  price: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  targetWeight: number;
  ingredients: Array<{
    ingredientId: string;
    percentage: number;
  }>;
  overfattingPercentage: number;
  waterDiscountPercentage: number;
}

export interface RecipeInput {
  name: string;
  description: string;
  targetWeight: number;
  ingredients: Array<{
    ingredientId: string;
    percentage: number;
  }>;
  overfattingPercentage: number;
  waterDiscountPercentage: number;
}

export interface CalculationRequest {
  recipeId: string;
  targetWeight?: number;
  soapCount?: number;
  gramsPerSoap?: number;
}

export interface DashboardMetric {
  label: string;
  value: string;
  hint: string;
  tone: 'rose' | 'sky' | 'emerald' | 'amber';
}

export interface DashboardMetricsResponse {
  metrics: DashboardMetric[];
  lowStockThreshold: number;
  lowStockIngredients: Ingredient[];
  recentProductions: Array<{ id: string; name: string; description: string; targetWeight: number }>;
  recentSales: Array<{ invoice: string; customer: string; total: number }>;
  quickLinks: Array<{ label: string; target: 'inventory' | 'recipes' | 'facturacion' }>;
}

export interface InventoryMovement {
  id: string;
  ingredientId: string;
  ingredientName?: string;
  type: 'ingreso' | 'egreso' | 'ajuste';
  quantity: number;
  reason: string;
  location: string;
  beforeStock: number;
  afterStock: number;
  createdAt: string;
}

export interface InventoryLocation {
  id: number;
  name: string;
  isDefault: number;
}

class ApiService {
  private async requestJson<T>(response: Response): Promise<T> {
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data?.error || data?.details || `HTTP ${response.status}`;
      throw new Error(Array.isArray(message) ? message.join(', ') : String(message));
    }

    return data as T;
  }

  async fetchIngredients(): Promise<Ingredient[]> {
    const response = await fetch(`${API_BASE_URL}/inventory`);
    const data = await this.requestJson<{ data: Ingredient[] }>(response);
    return data.data ?? [];
  }

  async createIngredient(ingredient: Omit<Ingredient, 'id' | 'costPerGram'>): Promise<Ingredient> {
    const response = await fetch(`${API_BASE_URL}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ingredient),
    });
    const data = await this.requestJson<{ data: Ingredient }>(response);

    if (!data.data) {
      throw new Error('La API no devolvió el ingrediente creado');
    }

    return data.data;
  }

  async updateIngredient(id: string, ingredient: Partial<Ingredient>): Promise<Ingredient> {
    const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ingredient),
    });
    const data = await this.requestJson<{ data: Ingredient }>(response);

    if (!data.data) {
      throw new Error('La API no devolvió el ingrediente actualizado');
    }

    return data.data;
  }

  async deleteIngredient(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/inventory/${id}`, {
      method: 'DELETE',
    });
  }

  async fetchMovements(filters?: { categoryId?: string; startDate?: string; endDate?: string }): Promise<InventoryMovement[]> {
    let url = `${API_BASE_URL}/inventory/movements`;
    const params = new URLSearchParams();
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const response = await fetch(url);
    const data = await this.requestJson<{ data: InventoryMovement[] }>(response);
    return data.data ?? [];
  }

  async fetchCategories(type?: string): Promise<Category[]> {
    let url = `${API_BASE_URL}/categories`;
    if (type) url += `?type=${encodeURIComponent(type)}`;
    const response = await fetch(url);
    const data = await this.requestJson<{ data: Category[] }>(response);
    return data.data ?? [];
  }

  async bulkImportIngredients(ingredients: Array<Omit<Ingredient, 'id' | 'costPerGram'>>): Promise<{ data: Ingredient[], errors?: string[] }> {
    const response = await fetch(`${API_BASE_URL}/inventory/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients }),
    });
    return this.requestJson<{ data: Ingredient[], errors?: string[] }>(response);
  }

  async fetchLocations(): Promise<InventoryLocation[]> {
    const response = await fetch(`${API_BASE_URL}/inventory/locations`);
    const data = await this.requestJson<{ data: InventoryLocation[] }>(response);
    return data.data ?? [];
  }

  async fetchRecipes(): Promise<Recipe[]> {
    const response = await fetch(`${API_BASE_URL}/calculator/recipes`);
    const data = await this.requestJson<{ data: Recipe[] }>(response);
    return data.data ?? [];
  }

  async createRecipe(recipe: RecipeInput): Promise<Recipe> {
    const response = await fetch(`${API_BASE_URL}/calculator/recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    });
    const data = await this.requestJson<{ data: Recipe }>(response);

    if (!data.data) {
      throw new Error('La API no devolvió la receta creada');
    }

    return data.data;
  }

  async updateRecipe(id: string, recipe: Partial<RecipeInput>): Promise<Recipe> {
    const response = await fetch(`${API_BASE_URL}/calculator/recipes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    });
    const data = await this.requestJson<{ data: Recipe }>(response);

    if (!data.data) {
      throw new Error('La API no devolvió la receta actualizada');
    }

    return data.data;
  }

  async deleteRecipe(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/calculator/recipes/${id}`, {
      method: 'DELETE',
    });
  }

  async listBackups(): Promise<string[]> {
    return [];
  }

  async restoreBackup(filename: string): Promise<boolean> {
    return false;
  }

  async restoreLatest(): Promise<boolean> {
    return false;
  }

  async openBackupDir(): Promise<boolean> {
    return false;
  }

  async calculateBatch(request: CalculationRequest): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/calculator/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const data = await this.requestJson<{ calculation: any }>(response);
    return data.calculation;
  }

  async fetchDashboardMetrics(lowStockThreshold = 1000): Promise<DashboardMetricsResponse> {
    const response = await fetch(`${API_BASE_URL}/metrics?lowStockThreshold=${encodeURIComponent(String(lowStockThreshold))}`);
    const data = await this.requestJson<{ data: DashboardMetricsResponse }>(response);
    return data.data;
  }

  async getInvoiceInfo(): Promise<{ series: string; lastNumber: number }> {
    const response = await fetch(`${API_BASE_URL}/invoice`);
    const data = await this.requestJson<{ data: { series: string; lastNumber: number } }>(response);
    return data.data;
  }

  async nextInvoiceNumber(): Promise<{ series: string; number: number; fullNumber: string }> {
    const response = await fetch(`${API_BASE_URL}/invoice/next`, { method: 'POST' });
    const data = await this.requestJson<{ data: { series: string; number: number; fullNumber: string } }>(response);
    return data.data;
  }

  async saveCurrentInvoice(payload: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/invoice/current`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await this.requestJson<{ data: any }>(response);
    return data.data;
  }

  async getCurrentInvoice(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/invoice/current`);
    const data = await this.requestJson<{ data: any }>(response);
    return data.data;
  }

  async fetchProducts(): Promise<FinishedProduct[]> {
    const response = await fetch(`${API_BASE_URL}/finished-products`);
    const data = await this.requestJson<{ data: FinishedProduct[] }>(response);
    return data.data ?? [];
  }

  async fetchProductById(id: string): Promise<FinishedProduct> {
    const response = await fetch(`${API_BASE_URL}/finished-products/${id}`);
    const data = await this.requestJson<{ data: FinishedProduct }>(response);
    return data.data;
  }

  async createProduct(product: Omit<FinishedProduct, 'id'>): Promise<FinishedProduct> {
    const response = await fetch(`${API_BASE_URL}/finished-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    const data = await this.requestJson<{ data: FinishedProduct }>(response);
    return data.data;
  }

  async updateProduct(id: string, product: Partial<FinishedProduct>): Promise<FinishedProduct> {
    const response = await fetch(`${API_BASE_URL}/finished-products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    const data = await this.requestJson<{ data: FinishedProduct }>(response);
    return data.data;
  }

  async deleteProduct(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/finished-products/${id}`, {
      method: 'DELETE',
    });
  }

  async createVariant(productId: string, variant: Omit<ProductVariant, 'id' | 'productId'>): Promise<ProductVariant> {
    const response = await fetch(`${API_BASE_URL}/products/${productId}/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(variant),
    });
    const data = await this.requestJson<{ data: ProductVariant }>(response);
    return data.data;
  }

  async updateVariant(id: string, variant: Partial<ProductVariant>): Promise<ProductVariant> {
    const response = await fetch(`${API_BASE_URL}/variants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(variant),
    });
    const data = await this.requestJson<{ data: ProductVariant }>(response);
    return data.data;
  }

  async deleteVariant(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}/variants/${id}`, {
      method: 'DELETE',
    });
  }

  async sellBatch(payload: { 
    items: Array<{ variantId: string; quantity: number }>; 
    clientName: string; 
    clientIdType: string; 
    clientIdNumber: string; 
    clientAddress: string; 
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/products/sell-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return this.requestJson<any>(response);
  }

  async makeInteractiveBatch(payload: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/production/make-batch-interactive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return this.requestJson<any>(response);
  }

  async fetchTransactions(filters?: { type?: string; categoryId?: string; startDate?: string; endDate?: string }): Promise<any[]> {
    let url = `${API_BASE_URL}/transactions`;
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const response = await fetch(url);
    const data = await this.requestJson<{ data: any[] }>(response);
    return data.data ?? [];
  }
}

export const api = new ApiService();
