import { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  Printer, 
  Download, 
  CreditCard, 
  ArrowLeft,
  ShoppingBag,
  Users,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { logoBase64 } from '../services/logoBase64';
import { PrintableInvoice, type PrintableInvoiceItem } from './PrintableInvoice';

interface InvoiceData {
  calculation: any;
  recipe: any;
  isConfirmed?: boolean;
  invoice?: {
    series: string;
    number: number;
    fullNumber: string;
  };
  company?: {
    name: string;
  };
  client?: {
    name: string;
    address: string;
    idType: 'RUC' | 'DNI' | '';
    idNumber: string;
  };
  saleInfo?: {
    items: Array<{
      productId: string;
      variantId: string;
      productName: string;
      weight: number;
      price: number;
      quantity: number;
      totalAmount: number;
    }>;
    totalAmount: number;
  };
}

interface FacturacionProps {
  onSaleComplete?: () => void;
}

export function Facturacion({ onSaleComplete }: FacturacionProps) {
  const [data, setData] = useState<InvoiceData | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientIdType, setClientIdType] = useState<'RUC' | 'DNI' | ''>('');
  const [clientIdNumber, setClientIdNumber] = useState('');
  
  // Sale lifecycle state
  const [isSelling, setIsSelling] = useState(false);
  const [isSaleClosed, setIsSaleClosed] = useState(false);
  const [closedInvoiceNumber, setClosedInvoiceNumber] = useState('');

  useEffect(() => {
    loadInvoice();
  }, []);

  const loadInvoice = async () => {
    try {
      const parsed = await api.getCurrentInvoice();
      if (!parsed) return;

      setData(parsed as InvoiceData);
      setClientName(parsed.client?.name || '');
      setClientAddress(parsed.client?.address || '');
      setClientIdType(parsed.client?.idType || '');
      setClientIdNumber(parsed.client?.idNumber || '');
      
      if (parsed.invoice?.fullNumber && parsed.isConfirmed) {
        setIsSaleClosed(true);
        setClosedInvoiceNumber(parsed.invoice.fullNumber);
      } else {
        setIsSaleClosed(false);
        setClosedInvoiceNumber('');
      }
    } catch (e) {
      console.error('Error leyendo boleta actual:', e);
    }
  };

  // ─── Construye el documento PDF (usado tanto para imprimir como para descargar) ───
  const buildPdf = () => {
    if (!data) return null;
    const invoiceNum = closedInvoiceNumber || data.invoice?.fullNumber || 'B001-000';
    const clientNameVal = clientName || data.client?.name || 'Clientes Varios';
    const clientAddressVal = clientAddress || data.client?.address || '---';
    const clientDocType = clientIdType || data.client?.idType || 'DOC';
    const clientDocNum = clientIdNumber || data.client?.idNumber || '---';
    const dateStr = new Date().toLocaleString('es-PE');
    const totalAmount = data.saleInfo?.totalAmount ?? (data.calculation?.totalCost ?? 0);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Logo
    try {
      doc.addImage(logoBase64, 'PNG', 15, 15, 30, 30);
    } catch {
      doc.setFillColor(224, 90, 118);
      doc.circle(30, 30, 15, 'F');
    }
    doc.setDrawColor(224, 90, 118);
    doc.setLineWidth(0.3);
    doc.circle(30, 30, 15.1, 'D');

    // Cabecera empresa
    doc.setTextColor(196, 64, 92);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('ANGELY NATURAL', 50, 22, { charSpace: 0.3 });
    doc.setTextColor(45, 29, 32);
    doc.setFontSize(13);
    doc.text('Boleta Virtual - Jabones Artesanales', 50, 27.5);
    doc.setTextColor(125, 107, 110);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Sistema de formulación y costeo para boleta electrónica', 50, 32.5);
    doc.setFont('helvetica', 'bold');
    doc.text('RUC: 20553840024', 50, 37.5);

    // Caja boleta electrónica
    doc.setDrawColor(224, 90, 118);
    doc.setLineWidth(0.3);
    doc.setFillColor(255, 252, 253);
    doc.roundedRect(132, 15, 63, 32, 3, 3, 'FD');
    doc.setTextColor(196, 64, 92);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('BOLETA DE VENTA ELECTRÓNICA', 163.5, 20.5, { align: 'center', charSpace: 0.1 });
    doc.setFillColor(211, 90, 114);
    doc.roundedRect(137.5, 23, 52, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(invoiceNum, 163.5, 28.5, { align: 'center' });
    doc.setTextColor(125, 107, 110);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Fecha emisión:  ${dateStr}`, 135.5, 35);
    doc.text('Moneda:              SOLES', 135.5, 38.5);
    doc.text('Condición:          CONTADO', 135.5, 42);

    // Caja datos cliente izquierda
    doc.setFillColor(255, 245, 246);
    doc.setDrawColor(255, 214, 220);
    doc.roundedRect(15, 52, 88, 30, 3, 3, 'FD');
    doc.setTextColor(163, 45, 70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('DATOS DEL CLIENTE', 19, 58, { charSpace: 0.2 });
    doc.setTextColor(45, 29, 32);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const truncName = clientNameVal.length > 38 ? clientNameVal.substring(0, 35) + '...' : clientNameVal;
    const truncAddr = clientAddressVal.length > 38 ? clientAddressVal.substring(0, 35) + '...' : clientAddressVal;
    doc.text(`Cliente:  ${truncName}`, 19, 64);
    doc.text(`Dirección:  ${truncAddr}`, 19, 70);
    doc.text(`Documento:  ${clientDocType} ${clientDocNum}`, 19, 76);

    // Caja resumen derecha
    doc.setFillColor(255, 252, 253);
    doc.setDrawColor(255, 214, 220);
    doc.roundedRect(107, 52, 88, 30, 3, 3, 'FD');
    doc.setTextColor(125, 107, 110);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Cliente:', 111, 59);
    doc.text('DOC:', 111, 64);
    doc.text('Dirección:', 111, 69);
    doc.text('Receta:', 111, 74);
    doc.text('Modo:', 111, 79);
    doc.setTextColor(45, 29, 32);
    doc.setFont('helvetica', 'bold');
    const truncNameR = clientNameVal.length > 30 ? clientNameVal.substring(0, 27) + '...' : clientNameVal;
    const truncAddrR = clientAddressVal.length > 30 ? clientAddressVal.substring(0, 27) + '...' : clientAddressVal;
    doc.text(truncNameR, 130, 59);
    doc.text(`${clientDocType} ${clientDocNum}`, 130, 64);
    doc.text(truncAddrR, 130, 69);
    doc.text('Venta Directa POS', 130, 74);
    doc.text('Por unidades / POS', 130, 79);

    // Tabla de productos
    doc.setFillColor(211, 90, 114);
    doc.rect(15, 88, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Descripción', 18, 93.5);
    doc.text('Cantidad / Peso', 115, 93.5, { align: 'center' });
    doc.text('Precio unit.', 155, 93.5, { align: 'right' });
    doc.text('Importe', 190, 93.5, { align: 'right' });

    let yRow = 96;
    const items = data.saleInfo?.items || [];
    items.forEach((item) => {
      doc.setFillColor(255, 255, 255);
      doc.rect(15, yRow, 180, 11, 'F');
      doc.setTextColor(45, 29, 32);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(item.productName, 18, yRow + 4.5);
      doc.setTextColor(163, 142, 145);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(`Barra Comercial de jabón de tocador / Champú / Crema ${item.weight || 95}g.`, 18, yRow + 8.5);
      doc.setTextColor(74, 62, 64);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      const wTotal = (item.weight || 0) * item.quantity;
      const wText = wTotal > 0 ? `(${wTotal} g)` : '';
      doc.text(`${item.quantity} un ${wText}`, 115, yRow + 6.5, { align: 'center' });
      doc.text(`S/ ${(item.price || 0).toFixed(2)}`, 155, yRow + 6.5, { align: 'right' });
      doc.setTextColor(45, 29, 32);
      doc.text(`S/ ${(item.totalAmount || 0).toFixed(2)}`, 190, yRow + 6.5, { align: 'right' });
      doc.setDrawColor(255, 245, 246);
      doc.line(15, yRow + 11, 195, yRow + 11);
      yRow += 11;
    });

    // Totales
    const yTotal = yRow + 6;
    doc.setFillColor(255, 252, 253);
    doc.setDrawColor(255, 214, 220);
    doc.roundedRect(15, yTotal, 110, 26, 2, 2, 'FD');
    doc.setTextColor(163, 45, 70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('NOTAS ADMINISTRATIVAS', 18, yTotal + 5.5, { charSpace: 0.1 });
    doc.setTextColor(125, 107, 110);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('Esta boleta de venta en lote constituye un comprobante formal que acredita el consumo de materias primas y la facturación de producto terminado en el módulo central de Angely Natural ERP.', 18, yTotal + 9.5, { maxWidth: 104 });
    doc.setFillColor(255, 245, 246);
    doc.setDrawColor(255, 214, 220);
    doc.roundedRect(130, yTotal, 65, 30, 2, 2, 'FD');
    doc.setTextColor(125, 107, 110);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Sub total', 134, yTotal + 6.5);
    doc.setTextColor(74, 62, 64);
    doc.setFont('helvetica', 'bold');
    doc.text(`S/ ${totalAmount.toFixed(2)}`, 190, yTotal + 6.5, { align: 'right' });
    doc.setTextColor(125, 107, 110);
    doc.setFont('helvetica', 'normal');
    doc.text('IGV (18%)', 134, yTotal + 11.5);
    doc.setTextColor(74, 62, 64);
    doc.setFont('helvetica', 'bold');
    doc.text('S/ 0.00', 190, yTotal + 11.5, { align: 'right' });
    doc.setDrawColor(255, 214, 220);
    doc.line(134, yTotal + 15, 190, yTotal + 15);
    doc.setTextColor(196, 64, 92);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('TOTAL', 134, yTotal + 21);
    doc.setFontSize(13);
    doc.text(`S/ ${totalAmount.toFixed(2)}`, 190, yTotal + 26.5, { align: 'right' });

    // Pie
    doc.setTextColor(224, 90, 118);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('🌸  Sistema de Gestión de Jabones Artesanales v1.0', 105, 282, { align: 'center' });

    return { doc, invoiceNum };
  };

  // Imprime usando jsPDF → abre en el visor PDF del navegador (idéntico al descargado)
  const handlePrint = () => {
    if (!data) return;
    try {
      const result = buildPdf();
      if (!result) return;
      const blobUrl = result.doc.output('bloburl');
      window.open(blobUrl as unknown as string);
    } catch (e) {
      console.error('Error generando PDF para impresión:', e);
      toast.error('No se pudo preparar la boleta para imprimir.');
    }
  };

  // Descarga el PDF a disco
  const handleDownloadPdf = () => {
    if (!data) return;
    try {
      const result = buildPdf();
      if (!result) return;
      result.doc.save(`${result.invoiceNum}.pdf`);
      toast.success('Boleta de venta descargada exitosamente en PDF.');
    } catch (e) {
      console.error('Error generando PDF:', e);
      toast.error('No se pudo generar el PDF');
    }
  };


  const handleSaveClientOffline = () => {
    if (!data) return;
    const updated: InvoiceData = {
      ...data,
      client: { name: clientName, address: clientAddress, idType: clientIdType, idNumber: clientIdNumber },
    };
    setData(updated);
    api.saveCurrentInvoice(updated).catch(() => null);
    toast.success('Borrador de cliente actualizado.');
  };

  const handleConfirmSale = async () => {
    if (!data || !data.saleInfo || !data.saleInfo.items || isSaleClosed) return;

    setIsSelling(true);
    try {
      const sellItems = data.saleInfo.items.map(item => ({
        variantId: item.variantId,
        quantity: item.quantity
      }));

      const response = await api.sellBatch({
        items: sellItems,
        clientName: clientName || 'Clientes Varios',
        clientIdType: clientIdType || '',
        clientIdNumber: clientIdNumber || '',
        clientAddress: clientAddress || '',
      });

      if (!response.success) {
        throw new Error(response.error || 'La venta en lote no se pudo procesar');
      }

      const { invoiceNumber: reservedNum } = response.data;

      const confirmedInvoicePayload: any = {
        ...data,
        isConfirmed: true,
        invoice: { ...data.invoice, fullNumber: reservedNum },
        client: {
          name: clientName || 'Clientes Varios',
          address: clientAddress || '',
          idType: clientIdType || '',
          idNumber: clientIdNumber || '',
        },
      };

      await api.saveCurrentInvoice(confirmedInvoicePayload);
      
      setClosedInvoiceNumber(reservedNum);
      setIsSaleClosed(true);
      
      toast.success(`¡Venta cerrada con éxito! Boleta ${reservedNum} generada.`);
      
      if (onSaleComplete) onSaleComplete();

      setTimeout(() => {
        const result = buildPdf();
        if (result) window.open(result.doc.output('bloburl') as unknown as string);
      }, 500);

    } catch (err: any) {
      console.error('Error cerrando venta en lote:', err);
      toast.error(`Error al procesar la venta: ${err.message}`);
    } finally {
      setIsSelling(false);
    }
  };

  if (!data) {
    return (
      <div className="mx-auto max-w-lg mt-12 bg-white rounded-2xl p-8 text-center shadow-md border border-pink-100 flex flex-col items-center justify-center">
        <div className="h-16 w-16 bg-rose-50 flex items-center justify-center rounded-2xl text-rose-500 mb-4 animate-pulse">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h3 className="mb-2 text-xl font-black text-slate-800">Módulo de Facturación</h3>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
          No hay borradores de boleta pendientes en caja. Selecciona productos en la pestaña de <strong>Calculadora</strong>, agrégalos al carrito y presiona <strong>Generar Pre-Boleta</strong> para facturar.
        </p>
      </div>
    );
  }

  const invoiceDisplayNumber = closedInvoiceNumber || data.invoice?.fullNumber || 'B001-000';
  const totalAmount = data.saleInfo?.totalAmount ?? (data.calculation?.totalCost ?? 0);
  const dateStr = new Date().toLocaleString('es-PE');

  // Convertir items al formato del componente global
  const invoiceItems: PrintableInvoiceItem[] = (data.saleInfo?.items || []).map(item => ({
    productName: item.productName,
    quantity: item.quantity,
    weight: item.weight,
    price: item.price,
    totalAmount: item.totalAmount,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-5">

      {/* ── BANNER DE ÉXITO: solo en pantalla, oculto al imprimir ── */}
      {isSaleClosed && (
        <div className="border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn no-print">
          <div className="flex items-center gap-4 text-left">
            <div className="h-14 w-14 shrink-0 bg-emerald-100/70 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                ¡Venta Cerrada con Éxito!
                <span className="bg-emerald-500/10 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold">Cobrado</span>
              </h3>
              <p className="text-slate-500 text-xs mt-0.5 max-w-xl">
                Se han deducido las cantidades del stock en el inventario y registrado los ingresos contables en caja de manera atómica.
              </p>
              <div className="mt-2 text-xs font-black text-emerald-800">
                Serie de Boleta: <span className="underline font-extrabold tracking-wider">{closedInvoiceNumber}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={handlePrint} 
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black px-4 py-2.5 transition-all text-xs shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir Boleta
            </button>
            <button 
              onClick={handleDownloadPdf} 
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-black px-4 py-2.5 transition-all text-xs shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Descargar PDF
            </button>
            <button
              onClick={() => {
                api.saveCurrentInvoice(null).then(() => {
                  setData(null);
                  setIsSaleClosed(false);
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-pink-200/50 bg-rose-50 text-rose-700 hover:bg-rose-100/80 font-black px-4 py-2.5 transition-all text-xs shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Nueva Venta
            </button>
          </div>
        </div>
      )}

      {/* ── PANEL DE FORMULARIO (solo en pantalla, nunca se imprime) ── */}
      <div className="no-print rounded-3xl border border-rose-100/40 bg-rose-50/20 p-5 shadow-sm space-y-4">
        {/* Aviso borrador */}
        {!isSaleClosed && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl flex gap-3 text-xs font-medium text-left">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Estado: Pedido en Caja (Borrador)</p>
              <p className="text-slate-600 mt-0.5">
                El stock y el total de caja <strong>aún no se han descontado</strong>. Completa los datos del cliente y presiona <strong>Cerrar Venta</strong> para finalizar el cobro.
              </p>
            </div>
          </div>
        )}

        {/* Inputs del cliente */}
        <div className="text-xs font-black uppercase tracking-[0.2em] text-rose-800 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-rose-500" />
          Datos del cliente
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Nombre o Razón Social</label>
            <input 
              value={clientName} 
              onChange={(e) => setClientName(e.target.value)} 
              placeholder="Nombre o Razón Social" 
              className="w-full rounded-xl border border-rose-200/50 bg-white px-3.5 py-2 text-xs font-medium focus:border-rose-500 focus:outline-none transition-all shadow-inner" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Dirección del Cliente</label>
            <input 
              value={clientAddress} 
              onChange={(e) => setClientAddress(e.target.value)} 
              placeholder="Dirección del Cliente" 
              className="w-full rounded-xl border border-rose-200/50 bg-white px-3.5 py-2 text-xs font-medium focus:border-rose-500 focus:outline-none transition-all shadow-inner" 
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Documento de Identificación</label>
            <div className="flex gap-2">
              <select 
                value={clientIdType} 
                onChange={(e) => setClientIdType(e.target.value as any)} 
                className="w-24 rounded-xl border border-rose-200/50 bg-white px-2 py-2 text-xs font-bold focus:border-rose-500 focus:outline-none transition-all shadow-inner"
              >
                <option value="">ID</option>
                <option value="DNI">DNI</option>
                <option value="RUC">RUC</option>
              </select>
              <input 
                value={clientIdNumber} 
                onChange={(e) => setClientIdNumber(e.target.value)} 
                placeholder="Número de Documento" 
                className="min-w-0 flex-1 rounded-xl border border-rose-200/50 bg-white px-3.5 py-2 text-xs font-medium focus:border-rose-500 focus:outline-none transition-all shadow-inner" 
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 pt-1 flex-wrap">
          <button 
            type="button"
            onClick={handleSaveClientOffline}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 shadow-md shadow-rose-100 transition-all cursor-pointer"
          >
            Guardar cliente
          </button>
          <button 
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs px-4 py-2 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir
          </button>
          <button 
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs px-4 py-2 shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar PDF
          </button>

          {/* Botón Cerrar Venta */}
          {!isSaleClosed && (
            <button
              type="button"
              onClick={handleConfirmSale}
              disabled={isSelling}
              className="ml-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 disabled:bg-slate-200 text-white py-2.5 px-5 font-black transition-all shadow-md shadow-emerald-200 text-xs ring-2 ring-emerald-300/30 cursor-pointer"
            >
              {isSelling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Facturando en lote...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Cerrar Venta (Cobrar Pedido)
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── BOLETA GLOBAL REUTILIZABLE (visible en pantalla e impresión) ── */}
      <PrintableInvoice
        invoiceNumber={invoiceDisplayNumber}
        date={dateStr}
        clientName={clientName || data.client?.name || ''}
        clientAddress={clientAddress || data.client?.address || ''}
        clientIdType={clientIdType || data.client?.idType || ''}
        clientIdNumber={clientIdNumber || data.client?.idNumber || ''}
        items={invoiceItems}
        totalAmount={totalAmount}
        isBorrador={!isSaleClosed}
      />

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Facturacion;
