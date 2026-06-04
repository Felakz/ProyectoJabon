import { logoBase64 } from '../services/logoBase64';

export interface PrintableInvoiceItem {
  productName: string;
  quantity: number;
  weight: number;
  price: number;
  totalAmount: number;
}

export interface PrintableInvoiceProps {
  invoiceNumber: string;
  date: string;
  clientName: string;
  clientAddress: string;
  clientIdType: string;
  clientIdNumber: string;
  items: PrintableInvoiceItem[];
  totalAmount: number;
  isBorrador?: boolean;
}

export function PrintableInvoice({
  invoiceNumber,
  date,
  clientName,
  clientAddress,
  clientIdType,
  clientIdNumber,
  items,
  totalAmount,
  isBorrador = false,
}: PrintableInvoiceProps) {
  const displayInvoiceNumber = invoiceNumber || 'B001-000';
  const displayClientName = clientName || 'Clientes Varios';
  const displayClientAddress = clientAddress || '---';
  const displayDocType = clientIdType || 'DOC';
  const displayDocNumber = clientIdNumber || '---';
  const displayDate = date || new Date().toLocaleString('es-PE');

  const formatMoney = (val: number) => `S/ ${val.toFixed(2)}`;

  return (
    <div className="printable-invoice mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl border-2 border-rose-100 pb-8 relative text-left ring-8 ring-rose-50/10">
      
      {/* Cabecera de Factura */}
      <div className="border-b-2 border-rose-100 bg-gradient-to-r from-rose-50/30 via-white to-rose-50/30 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-5">
            {/* Logo de la empresa redondo (3cm x 3cm) con doble anillo concéntrico */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full overflow-hidden shadow-md relative border-2 border-rose-300 p-1 bg-white ring-4 ring-rose-50">
              <div className="w-full h-full rounded-full overflow-hidden">
                <img src={logoBase64} alt="Logo" className="h-full w-full object-cover" />
              </div>
            </div>
            <div className="pt-1 text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#c4405c]">ANGELY NATURAL</p>
              <h2 className="mt-0.5 text-xl font-black text-slate-800 tracking-tight leading-none">Boleta Virtual - Jabones Artesanales</h2>
              <p className="mt-1 text-xs text-slate-500 font-medium">Sistema de formulación y costeo para boleta electrónica</p>
              <p className="mt-1.5 text-xs font-black text-slate-700">RUC: 20553840024</p>
            </div>
          </div>

          {/* Caja Boleta Electrónica Oficial */}
          <div className="min-w-[280px] rounded-2xl border-2 border-rose-200/80 bg-white p-4 shadow-sm relative text-left">
            <div className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-[#c4405c]">Boleta de Venta Electrónica</div>
            {/* Badge degradado de color berry */}
            <div className="mt-2.5 rounded-xl bg-gradient-to-r from-[#d35a72] to-[#c4405c] px-4 py-2 text-center text-lg font-black text-white shadow-md tracking-wider">
              {displayInvoiceNumber}
            </div>
            <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 border-t border-rose-100 pt-2.5">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400 font-medium">Fecha emisión</span>
                <span className="font-bold text-slate-700">{displayDate}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400 font-medium">Moneda</span>
                <span className="font-bold text-slate-700">SOLES</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400 font-medium">Condición</span>
                <span className="font-bold text-slate-700">CONTADO</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* Aviso de Pre-Boleta Borrador */}
        {isBorrador && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl flex gap-3 text-xs font-medium no-print text-left">
            <div>
              <p className="font-bold text-sm">Estado: Pedido en Caja (Borrador)</p>
              <p className="text-slate-600 mt-0.5">
                El stock comercial de cada artículo y el total de la caja aún **no se han descontado**. Completa los datos del cliente y presiona <strong>Cerrar Venta</strong> para finalizar el cobro.
              </p>
            </div>
          </div>
        )}

        {/* Panel Datos de Cliente */}
        <div className="grid gap-5 grid-cols-1 print:grid-cols-12 md:grid-cols-12">
          {/* Tarjeta Izquierda Estática para Impresión */}
          <div className="col-span-12 print:col-span-7 md:col-span-7 rounded-[1.5rem] border-2 border-rose-100 bg-rose-50/20 p-5 space-y-3.5 shadow-sm text-left">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-[#c4405c] flex items-center gap-1.5">
              Datos del Cliente
            </div>
            <div className="space-y-2.5 text-xs border-t border-rose-100 pt-3">
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-slate-400 font-medium">Cliente</span>
                <span className="font-bold text-slate-800">{displayClientName}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-slate-400 font-medium">Dirección</span>
                <span className="font-bold text-slate-800">{displayClientAddress}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-slate-400 font-medium">Documento</span>
                <span className="font-bold text-slate-800">{displayDocType} {displayDocNumber}</span>
              </div>
            </div>
          </div>

          {/* Tarjeta Derecha - Resumen Oficial Estático */}
          <div className="col-span-12 print:col-span-5 md:col-span-5 rounded-[1.5rem] border-2 border-rose-100 bg-white p-5 space-y-3.5 shadow-sm text-left">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-1.5">
              Resumen Datos del Cliente
            </div>
            <div className="space-y-2 text-xs border-t border-rose-100 pt-3">
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-slate-400 font-medium">Cliente</span>
                <span className="font-bold text-slate-800 truncate">{displayClientName}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-slate-400 font-medium">DOC</span>
                <span className="font-bold text-slate-800">{displayDocType} {displayDocNumber}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-slate-400 font-medium">Dirección</span>
                <span className="font-bold text-slate-800 truncate">{displayClientAddress}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-slate-400 font-medium">Receta</span>
                <span className="font-bold text-slate-800 text-rose-600">Venta Directa POS</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-slate-400 font-medium">Modo</span>
                <span className="font-bold text-slate-800">Por unidades / POS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla Oficial de Boleta */}
        <div className="overflow-hidden rounded-[1.5rem] border-2 border-rose-100 shadow-sm">
          <table className="w-full border-collapse text-xs">
            {/* Cabecera con degradado berry */}
            <thead className="bg-gradient-to-r from-[#d35a72] to-[#c4405c] text-white">
              <tr>
                <th className="px-5 py-3.5 text-left font-bold uppercase tracking-wider">Descripción</th>
                <th className="px-5 py-3.5 text-center font-bold uppercase tracking-wider">Cantidad / Peso</th>
                <th className="px-5 py-3.5 text-right font-bold uppercase tracking-wider">Precio unit.</th>
                <th className="px-5 py-3.5 text-right font-bold uppercase tracking-wider">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items && items.length > 0 ? (
                items.map((item, index) => {
                  const weightTotal = (item.weight || 0) * item.quantity;
                  const weightText = weightTotal > 0 ? `(${weightTotal} g)` : '';
                  return (
                    <tr key={index} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-5 py-3.5 text-left">
                        <p className="font-bold text-slate-800 text-sm leading-snug">{item.productName}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5 font-medium">Barra Comercial de jabón de tocador / Champú / Crema {item.weight || 95}g.</p>
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold text-slate-700 text-sm">{item.quantity} un {weightText}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-600 text-sm">{formatMoney(item.price)}</td>
                      <td className="px-5 py-3.5 text-right font-black text-slate-900 text-sm">{formatMoney(item.totalAmount)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400 font-bold">
                    No hay productos agregados en esta boleta.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totales y Notas de Cierre */}
        <div className="grid gap-5 grid-cols-1 print:grid-cols-12 md:grid-cols-12 items-start">
          {/* Tarjeta Resumen del Lote / Notas Administrativas */}
          <div className="col-span-12 print:col-span-7 md:col-span-7 rounded-[1.5rem] border-2 border-rose-100 bg-white p-5 text-xs text-slate-500 leading-relaxed font-medium text-left">
            <div className="font-black text-[#c4405c] uppercase tracking-wider mb-2">Notas Administrativas</div>
            <p className="text-slate-600 leading-relaxed">
              Esta boleta de venta en lote constituye un comprobante formal que acredita el consumo de materias primas y la facturación de producto terminado en el módulo central de Angely Natural ERP.
            </p>
          </div>

          {/* Tarjeta de Costo Total */}
          <div className="col-span-12 print:col-span-5 md:col-span-5 w-full rounded-[1.5rem] border-2 border-rose-100 bg-rose-50/20 p-5 space-y-3.5 shadow-sm text-left">
            <div className="space-y-2 text-xs font-semibold text-slate-500 border-b border-rose-200 pb-2.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Sub total</span>
                <span className="font-bold text-slate-700">{formatMoney(totalAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">IGV (18%)</span>
                <span className="font-bold text-slate-700">S/ 0.00</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-[#c4405c] uppercase tracking-wider">TOTAL</span>
              {/* Costo total gigante en berry/rojo llamativo */}
              <span className="text-3xl font-black text-rose-600 tracking-tight">
                {formatMoney(totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Pie de página oficial centrado con flor */}
      <div className="mt-8 border-t border-slate-50 pt-5 text-center">
        <p className="text-xs font-black text-[#c4405c] tracking-wide flex items-center justify-center gap-1.5">
          <span>🌸</span>
          Sistema de Gestión de Jabones Artesanales v1.0
        </p>
      </div>
    </div>
  );
}

export default PrintableInvoice;
