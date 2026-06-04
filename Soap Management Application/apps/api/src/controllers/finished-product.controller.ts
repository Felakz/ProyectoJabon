import { Request, Response } from 'express';
import {
  getAllFinishedProducts as dbGetAllFinishedProducts,
  getFinishedProductById as dbGetFinishedProductById,
  createFinishedProduct as dbCreateFinishedProduct,
  updateFinishedProduct as dbUpdateFinishedProduct,
  deleteFinishedProduct as dbDeleteFinishedProduct,
} from '../db/sqlite';

export const getAllFinishedProducts = (req: Request, res: Response) => {
  try {
    const products = dbGetAllFinishedProducts();
    res.status(200).json({ success: true, data: products });
  } catch (error: any) {
    console.error('Error obteniendo productos terminados:', error);
    res.status(500).json({ success: false, error: 'Error al obtener los productos terminados', details: error.message });
  }
};

export const getFinishedProductById = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = dbGetFinishedProductById(id);
    if (!product) {
      res.status(404).json({ success: false, error: 'Producto terminado no encontrado' });
      return;
    }
    res.status(200).json({ success: true, data: product });
  } catch (error: any) {
    console.error('Error obteniendo producto terminado por ID:', error);
    res.status(500).json({ success: false, error: 'Error al obtener el producto terminado', details: error.message });
  }
};

export const createFinishedProduct = (req: Request, res: Response) => {
  try {
    const { name, stock, price } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: 'El nombre del producto terminado es obligatorio.' });
      return;
    }

    const newProduct = {
      name,
      stock: Number(stock ?? 0),
      price: Number(price ?? 0),
    };

    const created = dbCreateFinishedProduct(newProduct);
    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    console.error('Error creando producto terminado:', error);
    res.status(500).json({ success: false, error: 'Error al crear el producto terminado', details: error.message });
  }
};

export const updateFinishedProduct = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, stock, price } = req.body;

    const existing = dbGetFinishedProductById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Producto terminado no encontrado' });
      return;
    }

    if (!name) {
      res.status(400).json({ success: false, error: 'El nombre del producto terminado es obligatorio.' });
      return;
    }

    const updatedProduct = {
      name,
      stock: Number(stock ?? 0),
      price: Number(price ?? 0),
    };

    const updated = dbUpdateFinishedProduct(id, updatedProduct);
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error actualizando producto terminado:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar el producto terminado', details: error.message });
  }
};

export const deleteFinishedProduct = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = dbGetFinishedProductById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Producto terminado no encontrado' });
      return;
    }

    const deleted = dbDeleteFinishedProduct(id);
    res.status(200).json({ success: true, data: deleted });
  } catch (error: any) {
    console.error('Error eliminando producto terminado:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar el producto terminado', details: error.message });
  }
};
