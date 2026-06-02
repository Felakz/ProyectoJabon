import { Request, Response } from 'express';
import {
  getAllCategories as dbGetAllCategories,
  getCategoryById as dbGetCategoryById,
  createCategory as dbCreateCategory,
  updateCategory as dbUpdateCategory,
  deleteCategory as dbDeleteCategory,
} from '../db/sqlite';
import type { Category } from '../../../../packages/shared/src/types';

export const getAllCategories = (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const categories = dbGetAllCategories(type);
    res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({ success: false, error: 'Error al obtener las categorías', details: error.message });
  }
};

export const getCategoryById = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const category = dbGetCategoryById(id);
    if (!category) {
      res.status(404).json({ success: false, error: 'Categoría no encontrada' });
      return;
    }
    res.status(200).json({ success: true, data: category });
  } catch (error: any) {
    console.error('Error obteniendo categoría por ID:', error);
    res.status(500).json({ success: false, error: 'Error al obtener la categoría', details: error.message });
  }
};

export const createCategory = (req: Request, res: Response) => {
  try {
    const { name, description, type } = req.body;

    if (!name || !type) {
      res.status(400).json({ success: false, error: 'El nombre y el tipo de categoría son campos requeridos.' });
      return;
    }

    const validTypes = ['ingredient', 'product', 'transaction'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ success: false, error: `Tipo de categoría no válido. Debe ser uno de: ${validTypes.join(', ')}` });
      return;
    }

    const id = `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newCategory: Category = {
      id,
      name,
      description: description || '',
      type: type as Category['type'],
    };

    const created = dbCreateCategory(newCategory);
    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    console.error('Error creando categoría:', error);
    res.status(500).json({ success: false, error: 'Error al crear la categoría', details: error.message });
  }
};

export const updateCategory = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, type } = req.body;

    const existing = dbGetCategoryById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Categoría no encontrada' });
      return;
    }

    if (!name || !type) {
      res.status(400).json({ success: false, error: 'El nombre y el tipo de categoría son campos requeridos.' });
      return;
    }

    const validTypes = ['ingredient', 'product', 'transaction'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ success: false, error: `Tipo de categoría no válido. Debe ser uno de: ${validTypes.join(', ')}` });
      return;
    }

    const updatedCategory: Category = {
      id,
      name,
      description: description || '',
      type: type as Category['type'],
    };

    const updated = dbUpdateCategory(id, updatedCategory);
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error actualizando categoría:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar la categoría', details: error.message });
  }
};

export const deleteCategory = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = dbGetCategoryById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Categoría no encontrada' });
      return;
    }

    const deleted = dbDeleteCategory(id);
    res.status(200).json({ success: true, data: deleted });
  } catch (error: any) {
    console.error('Error eliminando categoría:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar la categoría', details: error.message });
  }
};
