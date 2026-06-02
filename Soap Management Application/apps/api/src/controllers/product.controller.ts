import { Request, Response } from 'express';
import {
  getAllProducts as dbGetAllProducts,
  getProductById as dbGetProductById,
  createProduct as dbCreateProduct,
  updateProduct as dbUpdateProduct,
  deleteProduct as dbDeleteProduct,
  createVariant as dbCreateVariant,
  updateVariant as dbUpdateVariant,
  deleteVariant as dbDeleteVariant,
  getCategoryById,
  getRecipeById,
  confirmBatchInvoiceSale,
} from '../db/sqlite';
import type { Product, ProductVariant } from '../../../../packages/shared/src/types';

export const getAllProducts = (req: Request, res: Response) => {
  try {
    const products = dbGetAllProducts();
    res.status(200).json({ success: true, data: products });
  } catch (error: any) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener los productos', details: error.message });
  }
};

export const getProductById = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = dbGetProductById(id);
    if (!product) {
      res.status(404).json({ success: false, error: 'Producto no encontrado' });
      return;
    }
    res.status(200).json({ success: true, data: product });
  } catch (error: any) {
    console.error('Error obteniendo producto por ID:', error);
    res.status(500).json({ success: false, error: 'Error al obtener el producto', details: error.message });
  }
};

export const createProduct = (req: Request, res: Response) => {
  try {
    const { name, description, categoryId, baseRecipeId, initialVariant } = req.body;

    if (!name || !baseRecipeId) {
      res.status(400).json({ success: false, error: 'El nombre del producto y la receta base son obligatorios.' });
      return;
    }

    // Validar categoría si se proporciona
    if (categoryId) {
      const category = getCategoryById(categoryId);
      if (!category) {
        res.status(400).json({ success: false, error: 'La categoría especificada no existe.' });
        return;
      }
    }

    // Validar receta
    const recipe = getRecipeById(baseRecipeId);
    if (!recipe) {
      res.status(400).json({ success: false, error: 'La receta base especificada no existe.' });
      return;
    }

    const productId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newProduct: Product = {
      id: productId,
      name,
      description: description || '',
      categoryId: categoryId || undefined,
      baseRecipeId,
    };

    const createdProduct = dbCreateProduct(newProduct);

    // Crear variante inicial si se proporciona
    if (initialVariant) {
      const { weight, sku, price, stock } = initialVariant;
      if (weight === undefined || price === undefined || !sku) {
        res.status(400).json({
          success: false,
          error: 'El producto fue creado, pero la variante inicial es inválida. Se requieren Peso, Precio y SKU.',
          data: createdProduct,
        });
        return;
      }

      const variantId = `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newVariant: ProductVariant = {
        id: variantId,
        productId,
        weight: Number(weight),
        sku,
        price: Number(price),
        stock: Number(stock ?? 0),
      };

      dbCreateVariant(newVariant);
    }

    const finalProduct = dbGetProductById(productId);
    res.status(201).json({ success: true, data: finalProduct });
  } catch (error: any) {
    console.error('Error creando producto:', error);
    res.status(500).json({ success: false, error: 'Error al crear el producto', details: error.message });
  }
};

export const updateProduct = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, categoryId, baseRecipeId } = req.body;

    const existing = dbGetProductById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Producto no encontrado' });
      return;
    }

    if (!name || !baseRecipeId) {
      res.status(400).json({ success: false, error: 'El nombre del producto y la receta base son obligatorios.' });
      return;
    }

    // Validar categoría si se proporciona
    if (categoryId) {
      const category = getCategoryById(categoryId);
      if (!category) {
        res.status(400).json({ success: false, error: 'La categoría especificada no existe.' });
        return;
      }
    }

    // Validar receta
    const recipe = getRecipeById(baseRecipeId);
    if (!recipe) {
      res.status(400).json({ success: false, error: 'La receta base especificada no existe.' });
      return;
    }

    const updatedProduct: Product = {
      id,
      name,
      description: description || '',
      categoryId: categoryId || undefined,
      baseRecipeId,
    };

    const updated = dbUpdateProduct(id, updatedProduct);
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error actualizando producto:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar el producto', details: error.message });
  }
};

export const deleteProduct = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = dbGetProductById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Producto no encontrado' });
      return;
    }

    const deleted = dbDeleteProduct(id);
    res.status(200).json({ success: true, data: deleted });
  } catch (error: any) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar el producto', details: error.message });
  }
};

export const createVariant = (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { weight, sku, price, stock } = req.body;

    const product = dbGetProductById(productId);
    if (!product) {
      res.status(404).json({ success: false, error: 'El producto base no existe.' });
      return;
    }

    if (weight === undefined || price === undefined || !sku) {
      res.status(400).json({ success: false, error: 'Se requieren los campos Peso, SKU y Precio para crear la variante.' });
      return;
    }

    const variantId = `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newVariant: ProductVariant = {
      id: variantId,
      productId,
      weight: Number(weight),
      sku,
      price: Number(price),
      stock: Number(stock ?? 0),
    };

    const created = dbCreateVariant(newVariant);
    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    console.error('Error creando variante:', error);
    res.status(500).json({ success: false, error: 'Error al crear la variante', details: error.message });
  }
};

export const updateVariant = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { weight, sku, price, stock } = req.body;

    if (weight === undefined || price === undefined || !sku) {
      res.status(400).json({ success: false, error: 'Se requieren los campos Peso, SKU y Precio para actualizar la variante.' });
      return;
    }

    const newVariant: any = {
      weight: Number(weight),
      sku,
      price: Number(price),
      stock: Number(stock ?? 0),
    };

    const updated = dbUpdateVariant(id, newVariant);
    if (!updated) {
      res.status(404).json({ success: false, error: 'Variante no encontrada.' });
      return;
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error actualizando variante:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar la variante', details: error.message });
  }
};

export const deleteVariant = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = dbDeleteVariant(id);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Variante no encontrada.' });
      return;
    }

    res.status(200).json({ success: true, data: deleted });
  } catch (error: any) {
    console.error('Error eliminando variante:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar la variante', details: error.message });
  }
};

export const sellBatchVariants = (req: Request, res: Response) => {
  try {
    const { items, clientName, clientIdType, clientIdNumber, clientAddress } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'El carrito de ventas no puede estar vacío.' });
      return;
    }
    
    const clientData = {
      name: clientName || 'Clientes Varios',
      address: clientAddress || '',
      idType: clientIdType || '',
      idNumber: clientIdNumber || '',
    };
    
    const result = confirmBatchInvoiceSale(items, clientData);
    
    res.status(200).json({
      success: true,
      message: 'Venta del lote registrada con éxito',
      data: result
    });
  } catch (error: any) {
    console.error('Error registrando venta en lote:', error);
    res.status(500).json({ success: false, error: 'Error al registrar la venta en lote', details: error.message });
  }
};
