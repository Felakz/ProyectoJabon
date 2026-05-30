import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const INVOICE_FILE = path.join(DATA_DIR, 'invoice.json');
const CURRENT_INVOICE_FILE = path.join(DATA_DIR, 'current-invoice.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

ensureDataDir();

function readInvoiceFile() {
  try {
    if (fs.existsSync(INVOICE_FILE)) {
      return JSON.parse(fs.readFileSync(INVOICE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error leyendo invoice.json', e);
  }
  return { series: 'B001', lastNumber: 0 };
}

function writeInvoiceFile(data: any) {
  try {
    fs.writeFileSync(INVOICE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error escribiendo invoice.json', e);
  }
}

function readCurrentInvoiceFile() {
  try {
    if (fs.existsSync(CURRENT_INVOICE_FILE)) {
      return JSON.parse(fs.readFileSync(CURRENT_INVOICE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error leyendo current-invoice.json', e);
  }
  return null;
}

function writeCurrentInvoiceFile(data: any) {
  try {
    fs.writeFileSync(CURRENT_INVOICE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error escribiendo current-invoice.json', e);
  }
}

export const getInvoiceInfo = (req: Request, res: Response) => {
  const info = readInvoiceFile();
  res.status(200).json({ success: true, data: info });
};

export const nextInvoiceNumber = (req: Request, res: Response) => {
  try {
    const info = readInvoiceFile();
    info.lastNumber = (info.lastNumber || 0) + 1;
    writeInvoiceFile(info);

    const full = `${info.series}-${info.lastNumber.toString().padStart(3, '0')}`;
    res.status(200).json({ success: true, data: { series: info.series, number: info.lastNumber, fullNumber: full } });
  } catch (e) {
    console.error('Error generando next invoice number', e);
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

    writeCurrentInvoiceFile(payload);
    res.status(200).json({ success: true, data: payload });
  } catch (e) {
    console.error('Error guardando boleta actual', e);
    res.status(500).json({ success: false, error: 'No se pudo guardar la boleta actual' });
  }
};

export const getCurrentInvoice = (req: Request, res: Response) => {
  try {
    const payload = readCurrentInvoiceFile();
    if (!payload) {
      res.status(404).json({ success: false, error: 'No hay boleta actual' });
      return;
    }

    res.status(200).json({ success: true, data: payload });
  } catch (e) {
    console.error('Error obteniendo boleta actual', e);
    res.status(500).json({ success: false, error: 'No se pudo obtener la boleta actual' });
  }
};
