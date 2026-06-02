import { Request, Response } from 'express';
import {
  getAllTransactions as dbGetAllTransactions,
  getTransactionById as dbGetTransactionById,
  createTransaction as dbCreateTransaction,
  updateTransaction as dbUpdateTransaction,
  deleteTransaction as dbDeleteTransaction,
  getCategoryById,
} from '../db/sqlite';
import type { Transaction } from '../../../../packages/shared/src/types';

export const getAllTransactions = (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const categoryId = req.query.categoryId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const transactions = dbGetAllTransactions({ type, categoryId, startDate, endDate });
    res.status(200).json({ success: true, data: transactions });
  } catch (error: any) {
    console.error('Error obteniendo transacciones:', error);
    res.status(500).json({ success: false, error: 'Error al obtener las transacciones', details: error.message });
  }
};

export const getTransactionById = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const transaction = dbGetTransactionById(id);
    if (!transaction) {
      res.status(404).json({ success: false, error: 'Transacción no encontrada' });
      return;
    }
    res.status(200).json({ success: true, data: transaction });
  } catch (error: any) {
    console.error('Error obteniendo transacción por ID:', error);
    res.status(500).json({ success: false, error: 'Error al obtener la transacción', details: error.message });
  }
};

export const createTransaction = (req: Request, res: Response) => {
  try {
    const { type, amount, description, date, categoryId, referenceId } = req.body;

    if (!type || amount === undefined || !description || !date) {
      res.status(400).json({ success: false, error: 'Los campos tipo, monto, descripción y fecha son requeridos.' });
      return;
    }

    const validTypes = ['income', 'expense', 'investment'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ success: false, error: `Tipo de transacción no válido. Debe ser uno de: ${validTypes.join(', ')}` });
      return;
    }

    if (typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ success: false, error: 'El monto de la transacción debe ser un número positivo.' });
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

    const id = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newTransaction: Transaction = {
      id,
      type: type as Transaction['type'],
      amount: Number(amount),
      description,
      date,
      categoryId,
      referenceId,
    };

    const created = dbCreateTransaction(newTransaction);
    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    console.error('Error creando transacción:', error);
    res.status(500).json({ success: false, error: 'Error al crear la transacción', details: error.message });
  }
};

export const updateTransaction = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, amount, description, date, categoryId, referenceId } = req.body;

    const existing = dbGetTransactionById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Transacción no encontrada' });
      return;
    }

    if (!type || amount === undefined || !description || !date) {
      res.status(400).json({ success: false, error: 'Los campos tipo, monto, descripción y fecha son requeridos.' });
      return;
    }

    const validTypes = ['income', 'expense', 'investment'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ success: false, error: `Tipo de transacción no válido. Debe ser uno de: ${validTypes.join(', ')}` });
      return;
    }

    if (typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ success: false, error: 'El monto de la transacción debe ser un número positivo.' });
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

    const updatedTransaction: Transaction = {
      id,
      type: type as Transaction['type'],
      amount: Number(amount),
      description,
      date,
      categoryId,
      referenceId,
    };

    const updated = dbUpdateTransaction(id, updatedTransaction);
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error actualizando transacción:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar la transacción', details: error.message });
  }
};

export const deleteTransaction = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = dbGetTransactionById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Transacción no encontrada' });
      return;
    }

    const deleted = dbDeleteTransaction(id);
    res.status(200).json({ success: true, data: deleted });
  } catch (error: any) {
    console.error('Error eliminando transacción:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar la transacción', details: error.message });
  }
};
