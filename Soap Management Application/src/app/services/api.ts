const API_BASE_URL = 'http://localhost:3000/api';

export interface Ingredient {
  id: string;
  name: string;
  currentStock: number;
  totalCost: number;
  costPerGram: number;
  sapValue: number;
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
}

export const api = new ApiService();
