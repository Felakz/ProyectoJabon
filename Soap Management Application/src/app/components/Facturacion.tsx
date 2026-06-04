import { useEffect, useState } from 'react';
import logoSrc from '../../assets/logo.png';
import { api } from '../services/api';
import { toast } from 'sonner';

interface InvoiceData {
  calculation: any;
  recipe: any;
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
}

interface FacturacionProps {
  onSaleComplete?: () => void;
}

export function Facturacion({ onSaleComplete }: FacturacionProps = {}) {
  const [data, setData] = useState<InvoiceData | null>(null);
  const [isSold, setIsSold] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientIdType, setClientIdType] = useState<'RUC' | 'DNI' | ''>('');
  const [clientIdNumber, setClientIdNumber] = useState('');

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        const parsed = await api.getCurrentInvoice();
        if (!parsed) return;

        setData(parsed as InvoiceData);
        setClientName(parsed.client?.name || '');
        setClientAddress(parsed.client?.address || '');
        setClientIdType(parsed.client?.idType || '');
        setClientIdNumber(parsed.client?.idNumber || '');
      } catch (e) {
        console.error('Error leyendo boleta actual:', e);
      }
    };

    loadInvoice();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const createInvoicePdf = (payload: InvoiceData) => {
    const result = payload.calculation;
    const recipeName = payload.recipe?.name || '';
    const dateStr = new Date().toLocaleString('es-PE');

    const lines: string[] = [];
    lines.push('Boleta Virtual - Jabones Artesanales');
    lines.push(`Fecha: ${dateStr}`);
    lines.push('');
    lines.push('Datos del cliente:');
    lines.push(`Nombre: ${payload.client?.name || ''}`);
    lines.push(`Documento: ${payload.client?.idType || ''} ${payload.client?.idNumber || ''}`);
    lines.push('');

    if (payload.saleInfo?.items && payload.saleInfo.items.length > 0) {
      lines.push('Detalle de productos vendidos:');
      payload.saleInfo.items.forEach((item: any) => {
        lines.push(`${item.productName} - Cant: ${item.quantity} und - S/ ${(item.price || 0).toFixed(2)} - Total: S/ ${(item.totalAmount || 0).toFixed(2)}`);
      });
      lines.push('');
      lines.push(`Importe total: S/ ${(payload.saleInfo.totalAmount || 0).toFixed(2)}`);
    } else {
      lines.push('Resumen del lote');
      lines.push(`Receta: ${recipeName}`);
      lines.push(`Modo: ${result?.mode === 'soapCount' ? 'Por cantidad de jabones' : 'Por gramos'}`);
      lines.push(`Peso objetivo: ${result?.targetWeight || ''} g`);
      lines.push('');
      lines.push('Detalle de insumos:');
      (result?.oils || []).forEach((o: any) => lines.push(`${o.name} - ${o.gramsNeeded} g - S/ ${o.cost.toFixed(2)}`));
      lines.push(`Agua: ${result?.waterGrams || 0} g`);
      lines.push(`Sosa (NaOH): ${result?.lyeGrams || 0} g`);
      lines.push('');
      lines.push(`Costo total: S/ ${(result?.totalCost || 0).toFixed(2)}`);
    }

    // Very small, plain PDF generator (text only), reusing technique from Calculator
    const sanitize = (v: string) => v.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const ops: string[] = ['BT', '/F1 12 Tf'];
    let y = 800;
    lines.forEach(line => {
      ops.push(`1 0 0 1 50 ${y} Tm`);
      ops.push(`(${sanitize(line)}) Tj`);
      y -= 14;
    });
    ops.push('ET');

    const content = ops.join('\n');
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj`,
      `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
      '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];
    for (const obj of objects) { offsets.push(pdf.length); pdf += `${obj}\n`; }
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i < offsets.length; i++) pdf += `${offsets[i].toString().padStart(10,'0')} 00000 n \n`;
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    return pdf;
  };

  const handleDownloadPdf = () => {
    if (!data) return;
    try {
      const pdfContent = createInvoicePdf(data);
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.invoice?.fullNumber || 'boleta'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error generando PDF:', e);
      alert('No se pudo generar el PDF');
    }
  };

  const handleSaveClient = () => {
    if (!data) return;

    const updated: InvoiceData = {
      ...data,
      client: {
        name: clientName,
        address: clientAddress,
        idType: clientIdType,
        idNumber: clientIdNumber,
      },
    };

    setData(updated);
    try {
      api.saveCurrentInvoice(updated).catch(() => null);
    } catch (e) {
      console.error('Error guardando invoice_data:', e);
    }
  };

  const handleConfirmSale = async () => {
    if (!data || !data.saleInfo?.items) {
      toast.error('No hay datos de items de venta.');
      return;
    }

    try {
      const payload = {
        items: data.saleInfo.items.map((item: any) => ({
          variantId: item.productId,
          quantity: item.quantity
        })),
        clientName: clientName || 'Clientes Varios',
        clientIdType: clientIdType || '',
        clientIdNumber: clientIdNumber || '',
        clientAddress: clientAddress || ''
      };

      await api.sellBatch(payload);
      toast.success(`Venta registrada con éxito. Boleta ${data.invoice?.fullNumber || ''}`);
      setIsSold(true);
      if (onSaleComplete) {
        onSaleComplete();
      }
    } catch (e: any) {
      console.error('Error al registrar la venta:', e);
      toast.error(`Error al registrar la venta: ${e.message}`);
    }
  };

  if (!data) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-md ring-1 ring-gray-200">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Facturación</h3>
        <p className="text-sm text-slate-600">No hay datos de boleta. Genera una boleta desde la calculadora.</p>
      </div>
    );
  }

  const calculation = data.calculation || { mode: '', oils: [], waterGrams: 0, lyeGrams: 0, totalCost: 0, targetWeight: 0 };
  const recipe = data.recipe || { name: 'Sin Receta', description: '' };
  const invoiceNumber = data.invoice?.fullNumber ?? 'B001-000';
  const companyName = data.company?.name ?? 'Angely Natural';
  const dateStr = new Date().toLocaleString('es-PE');
  const clientDocumentLabel = clientIdType || 'DOC';
  const clientDocumentValue = clientIdNumber || '---';

  return (
    <div className="printable-invoice mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl border-2 border-rose-100 pb-8 relative ring-8 ring-rose-50/10">
      <div className="border-b-2 border-rose-100 bg-gradient-to-r from-rose-50/30 via-white to-rose-50/30 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            {/* Logo de la empresa redondo (3cm x 3cm) con doble anillo concéntrico */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full overflow-hidden shadow-md relative border-2 border-rose-300 p-1 bg-white ring-4 ring-rose-50">
              <div className="w-full h-full rounded-full overflow-hidden">
                <img src={logoSrc} alt="Angely Natural" className="h-full w-full object-cover" />
              </div>
            </div>
            <div className="pt-1">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-700">{companyName}</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Boleta Virtual - Jabones Artesanales</h2>
              <p className="mt-1 text-sm text-slate-600">Sistema de formulación y costeo para boleta electrónica</p>
              <p className="mt-2 text-sm font-medium text-slate-700">RUC: 20553840024</p>
            </div>
          </div>

          <div className="min-w-[280px] rounded-xl border-2 border-rose-200/80 bg-white p-4 shadow-sm">
            <div className="text-center text-sm font-black uppercase tracking-[0.2em] text-rose-700">Boleta de Venta Electrónica</div>
            <div className="mt-3 rounded-xl bg-gradient-to-r from-[#d35a72] to-[#c4405c] px-4 py-3 text-center text-xl font-black text-white shadow-md">{invoiceNumber}</div>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <div className="flex justify-between gap-4"><span className="text-slate-500">Fecha emisión</span><span className="font-medium">{dateStr}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Moneda</span><span className="font-medium">SOLES</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Condición</span><span className="font-medium">CONTADO</span></div>
            </div>
            <div className="mt-3 flex flex-col gap-2 justify-center">
              {!isSold ? (
                <button
                  onClick={handleConfirmSale}
                  className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-bold text-white hover:from-emerald-600 hover:to-teal-600 shadow transition-all cursor-pointer"
                >
                  ✅ Confirmar y Registrar Venta
                </button>
              ) : (
                <div className="w-full rounded-lg bg-emerald-50 border border-emerald-200 py-2 text-center text-xs font-bold text-emerald-800">
                  🎉 Venta Confimada y Registrada
                </div>
              )}
              <div className="flex gap-2 justify-center">
                <button onClick={handlePrint} className="flex-1 rounded-lg bg-rose-500 px-3 py-1 text-sm font-semibold text-white hover:bg-rose-600 cursor-pointer">Imprimir</button>
                <button onClick={handleDownloadPdf} className="flex-1 rounded-lg border border-pink-100 bg-white px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-rose-50 cursor-pointer">Descargar PDF</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[1.5rem] border-2 border-rose-100 bg-rose-50/20 p-5">
            <div className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[#c4405c]">Datos del cliente</div>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre o Razón Social" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              <input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Dirección" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              <div className="flex gap-2 md:col-span-2">
                <select value={clientIdType} onChange={(e) => setClientIdType(e.target.value as any)} className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
                  <option value="">ID</option>
                  <option value="DNI">DNI</option>
                  <option value="RUC">RUC</option>
                </select>
                <input value={clientIdNumber} onChange={(e) => setClientIdNumber(e.target.value)} placeholder="Número" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border-2 border-rose-100 bg-white p-5">
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex justify-between gap-4"><span className="text-slate-500">Cliente</span><span className="font-medium text-right">{clientName || 'Pendiente'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">{clientDocumentLabel}</span><span className="font-medium text-right">{clientDocumentValue}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Dirección</span><span className="font-medium text-right">{clientAddress || 'Pendiente'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Receta / Concepto</span><span className="font-medium text-right">{recipe?.name || 'Sin Receta'}</span></div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Modo</span>
                <span className="font-medium text-right">
                  {calculation?.mode === 'soapCount' 
                    ? 'Por cantidad de jabones' 
                    : calculation?.mode === 'batch-pos' 
                      ? 'Venta POS Express' 
                      : 'Por gramos'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.5rem] border-2 border-rose-100 shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gradient-to-r from-[#d35a72] to-[#c4405c] text-white">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Descripción</th>
                {data.saleInfo?.items && data.saleInfo.items.length > 0 ? (
                  <>
                    <th className="px-4 py-3 text-right font-semibold">Cantidad</th>
                    <th className="px-4 py-3 text-right font-semibold">Precio unit.</th>
                    <th className="px-4 py-3 text-right font-semibold">Importe</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-right font-semibold">Gramos</th>
                    <th className="px-4 py-3 text-right font-semibold">Precio unit.</th>
                    <th className="px-4 py-3 text-right font-semibold">Importe</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {data.saleInfo?.items && data.saleInfo.items.length > 0 ? (
                data.saleInfo.items.map((item: any) => (
                  <tr key={item.productId || item.variantId}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {item.productName}
                      {item.weight > 0 && <span className="text-xs text-slate-500 ml-2">({item.weight}g)</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{item.quantity} und</td>
                    <td className="px-4 py-3 text-right text-slate-700">S/ {(item.price || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">S/ {(item.totalAmount || 0).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <>
                  {(calculation.oils || []).map((o: any) => (
                    <tr key={o.ingredientId}>
                      <td className="px-4 py-3 font-medium text-slate-800">{o.name}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{o.gramsNeeded} g</td>
                      <td className="px-4 py-3 text-right text-slate-700">S/ {(o.gramsNeeded > 0 ? o.cost / o.gramsNeeded : 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">S/ {(o.cost || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-800">Agua</td>
                    <td className="px-4 py-3 text-right text-slate-700">{calculation.waterGrams || 0} g</td>
                    <td className="px-4 py-3 text-right text-slate-500">-</td>
                    <td className="px-4 py-3 text-right text-slate-700">S/ 0.00</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-800">Sosa (NaOH)</td>
                    <td className="px-4 py-3 text-right text-slate-700">{calculation.lyeGrams || 0} g</td>
                    <td className="px-4 py-3 text-right text-slate-500">-</td>
                    <td className="px-4 py-3 text-right text-slate-700">S/ 0.00</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px] items-start">
          <div className="rounded-[1.5rem] border-2 border-rose-100 bg-rose-50/20 p-5 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">Resumen del lote</div>
            <p className="mt-2">Receta / Concepto: {recipe?.name || 'Sin Receta'}</p>
            <p>Modo: {calculation?.mode === 'soapCount' ? 'Por cantidad de jabones' : calculation?.mode === 'batch-pos' ? 'Venta POS Express' : 'Por gramos'}</p>
            {calculation?.targetWeight > 0 && <p>Peso objetivo: {calculation.targetWeight} g</p>}
            {calculation?.soapCount ? <p>Cantidad de jabones: {calculation.soapCount}</p> : null}
            {calculation?.gramsPerSoap ? <p>Peso por jabón: {calculation.gramsPerSoap} g</p> : null}
          </div>

          <div className="w-full justify-self-end max-w-sm rounded-[1.5rem] border-2 border-rose-100 bg-white p-5 text-sm totals-box">
            <div className="flex justify-between text-slate-600">
              <span>Total</span>
              <span className="font-medium">S/ {(data.saleInfo?.totalAmount ?? calculation?.totalCost ?? 0).toFixed(2)}</span>
            </div>
            <div className="mt-3 border-t pt-3 text-xl font-black text-rose-600 flex justify-between">
              <span>TOTAL</span>
              <span>S/ {(data.saleInfo?.totalAmount ?? calculation?.totalCost ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Facturacion;
