import { Request, Response } from 'express';
import {
  getInvoiceState,
  nextInvoiceNumber as dbNextInvoiceNumber,
  saveCurrentInvoice as dbSaveCurrentInvoice,
  getCurrentInvoice as dbGetCurrentInvoice,
} from '../db/sqlite';

export const getInvoiceInfo = (req: Request, res: Response) => {
  const info = getInvoiceState();
  res.status(200).json({ success: true, data: info });
};

export const nextInvoiceNumber = (req: Request, res: Response) => {
  try {
    const next = dbNextInvoiceNumber();
    const fullNumber = `${next.series}-${next.lastNumber.toString().padStart(3, '0')}`;

    res.status(200).json({
      success: true,
      data: {
        series: next.series,
        number: next.lastNumber,
        fullNumber,
      },
    });
  } catch (error) {
    console.error('Error generando next invoice number', error);
    res.status(500).json({ success: false, error: 'No se pudo generar número de boleta' });
  }
};

export const saveCurrentInvoice = (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload) {
      res.status(400).json({ success: false, error: 'Falta el payload de la boleta' });
      return;
    }

    dbSaveCurrentInvoice(payload);
    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    console.error('Error guardando boleta actual', error);
    res.status(500).json({ success: false, error: 'No se pudo guardar la boleta actual' });
  }
};

export const getCurrentInvoice = (req: Request, res: Response) => {
  try {
    const payload = dbGetCurrentInvoice();
    if (!payload) {
      res.status(404).json({ success: false, error: 'No hay boleta actual' });
      return;
    }

    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    console.error('Error obteniendo boleta actual', error);
    res.status(500).json({ success: false, error: 'No se pudo obtener la boleta actual' });
  }
};
