import { useEffect, useState } from 'react';
import { 
  Search, 
  Printer, 
  Download, 
  FileText, 
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { logoBase64 } from '../services/logoBase64';
import { PrintableInvoice, type PrintableInvoiceItem } from './PrintableInvoice';

interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'investment';
  amount: number;
  description: string;
  date: string;
  categoryId: string;
  categoryName?: string;
  referenceId?: string;
}

export interface GroupedSale {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientIdType: string;
  clientIdNumber: string;
  clientAddress: string;
  date: string;
  totalAmount: number;
  description: string;
  items: Array<{
    productName: string;
    quantity: number;
    weight: number;
    price: number;
    totalAmount: number;
  }>;
  originalTransactions: Transaction[];
}

export function HistorialVentas() {
  const [sales, setSales] = useState<Transaction[]>([]);
  const [groupedSales, setGroupedSales] = useState<GroupedSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Selected sale for detail modal
  const [selectedSale, setSelectedSale] = useState<GroupedSale | null>(null);

  useEffect(() => {
    loadSales();
  }, []);

  const parseDetailedSaleDescription = (desc: string) => {
    let clientName = 'Clientes Varios';
    let invoiceNumber = 'B001-000';
    let clientIdType = 'DOC';
    let clientIdNumber = '---';
    let clientAddress = 'Dirección registrada / POS';

    // Extract invoiceNumber
    if (desc.includes('Boleta ')) {
      const parts = desc.split('Boleta ');
      const afterBoleta = parts[parts.length - 1].trim();
      invoiceNumber = afterBoleta.split(' ')[0].split('|')[0].trim();
    }

    // Extract client details if they are in the structured metadata format
    if (desc.includes(' | Client: ')) {
      const clientPart = desc.split(' | Client: ')[1].split(' | ')[0].trim();
      if (clientPart.includes(':')) {
        clientIdType = clientPart.split(':')[0].trim();
        clientIdNumber = clientPart.split(':').slice(1).join(':').trim();
      }
    }
    if (desc.includes(' | Dir: ')) {
      clientAddress = desc.split(' | Dir: ')[1].trim();
    }

    // Extract client name
    if (desc.includes('Venta POS ')) {
      const temp = desc.split('Venta POS ')[1];
      if (temp.includes(' - Boleta')) {
        clientName = temp.split(' - Boleta')[0].trim();
      } else {
        clientName = temp.trim();
      }
    } else if (desc.includes('Venta en lote de productos POS - Boleta')) {
      clientName = 'Clientes Varios';
    }

    return { clientName, invoiceNumber, clientIdType, clientIdNumber, clientAddress };
  };

  const parseTransactionItem = (desc: string, amount: number) => {
    let productName = 'Lote de Productos Comerciales';
    let quantity = 1;
    let weight = 95;

    if (desc.includes('Venta POS ') && desc.includes(' | Detalle: ')) {
      const detailPart = desc.split(' | Detalle: ')[1].split(' | ')[0].trim();
      if (detailPart.includes('x ')) {
        const qPart = detailPart.split('x ')[0].trim();
        quantity = parseInt(qPart) || 1;
        const rest = detailPart.substring(detailPart.indexOf('x ') + 2);
        if (rest.includes(' (')) {
          productName = rest.split(' (')[0].trim();
          const wPart = rest.split(' (')[1].replace(')', '').trim();
          weight = parseFloat(wPart) || 95;
        } else {
          productName = rest.trim();
        }
      }
    } else if (desc.includes('Venta de ') && desc.includes(' - Boleta')) {
      const itemPart = desc.split(' - Boleta')[0].replace('Venta de ', '').trim();
      if (itemPart.includes('x ')) {
        const qPart = itemPart.split('x ')[0].trim();
        quantity = parseInt(qPart) || 1;
        const rest = itemPart.substring(itemPart.indexOf('x ') + 2);
        if (rest.includes(' (')) {
          productName = rest.split(' (')[0].trim();
          const wPart = rest.split(' (')[1].replace(')', '').trim();
          weight = parseFloat(wPart) || 95;
        } else {
          productName = rest.trim();
        }
      }
    }

    const price = quantity > 0 ? amount / quantity : amount;

    return { productName, quantity, weight, price, totalAmount: amount };
  };

  const groupTransactions = (transactions: Transaction[]): GroupedSale[] => {
    const groups: { [invoiceNumber: string]: GroupedSale } = {};

    for (const tx of transactions) {
      const { clientName, invoiceNumber, clientIdType, clientIdNumber, clientAddress } = parseDetailedSaleDescription(tx.description);
      const parsedItem = parseTransactionItem(tx.description, tx.amount);

      if (!groups[invoiceNumber]) {
        groups[invoiceNumber] = {
          id: invoiceNumber,
          invoiceNumber,
          clientName,
          clientIdType,
          clientIdNumber,
          clientAddress,
          date: tx.date,
          totalAmount: 0,
          description: '',
          items: [],
          originalTransactions: []
        };
      }

      const group = groups[invoiceNumber];
      group.totalAmount += tx.amount;
      group.items.push(parsedItem);
      group.originalTransactions.push(tx);

      if (tx.date < group.date) {
        group.date = tx.date;
      }

      if (clientName !== 'Clientes Varios' && group.clientName === 'Clientes Varios') {
        group.clientName = clientName;
      }
      if (clientIdType !== 'DOC' && group.clientIdType === 'DOC') {
        group.clientIdType = clientIdType;
      }
      if (clientIdNumber !== '---' && group.clientIdNumber === '---') {
        group.clientIdNumber = clientIdNumber;
      }
      if (clientAddress !== 'Dirección registrada / POS' && group.clientAddress === 'Dirección registrada / POS') {
        group.clientAddress = clientAddress;
      }
    }

    return Object.values(groups).map(group => {
      const itemSummaries = group.items.map(item => `${item.quantity}x ${item.productName}`);
      group.description = `Venta de ${itemSummaries.join(', ')} - Boleta ${group.invoiceNumber}`;
      return group;
    });
  };

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await api.fetchTransactions({ categoryId: 'cat-venta' });
      setSales(data);
      setGroupedSales(groupTransactions(data));
    } catch (e) {
      console.error('Error cargando historial de ventas:', e);
      toast.error('No se pudo cargar el historial de ventas.');
    } finally {
      setLoading(false);
    }
  };

  const buildSalePdf = (sale: GroupedSale) => {
    const { invoiceNumber, clientName, clientIdType, clientIdNumber, clientAddress, items, totalAmount, date } = sale;
    const dateStr = new Date(date).toLocaleString('es-PE');

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
    doc.text(invoiceNumber, 163.5, 28.5, { align: 'center' });
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
    const tName = clientName.length > 38 ? clientName.substring(0, 35) + '...' : clientName;
    const tAddr = clientAddress.length > 38 ? clientAddress.substring(0, 35) + '...' : clientAddress;
    doc.text(`Cliente:  ${tName}`, 19, 64);
    doc.text(`Dirección:  ${tAddr}`, 19, 70);
    doc.text(`Documento:  ${clientIdType} ${clientIdNumber}`, 19, 76);

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
    const tNameR = clientName.length > 30 ? clientName.substring(0, 27) + '...' : clientName;
    const tAddrR = clientAddress.length > 30 ? clientAddress.substring(0, 27) + '...' : clientAddress;
    doc.text(tNameR, 130, 59);
    doc.text(`${clientIdType} ${clientIdNumber}`, 130, 64);
    doc.text(tAddrR, 130, 69);
    doc.text('Venta Histórica POS', 130, 74);
    doc.text('Por unidades / POS', 130, 79);

    // Tabla de productos
    doc.setFillColor(211, 90, 114);
    doc.rect(15, 88, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Descripción del Artículo', 18, 93.5);
    doc.text('Cantidad', 115, 93.5, { align: 'center' });
    doc.text('Precio unit.', 155, 93.5, { align: 'right' });
    doc.text('Importe', 190, 93.5, { align: 'right' });

    let yRow = 96;
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
      doc.text(`Peso: ${item.weight || 95}g - Venta individual POS`, 18, yRow + 8.5);
      doc.setTextColor(74, 62, 64);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`${item.quantity} und`, 115, yRow + 6.5, { align: 'center' });
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
    doc.text('Esta boleta de venta fue confirmada y archivada con éxito en la base de datos contable local de Angely Natural ERP.', 18, yTotal + 9.5, { maxWidth: 104 });

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

    doc.setTextColor(224, 90, 118);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('🌸  Sistema de Gestión de Jabones Artesanales v1.0', 105, 282, { align: 'center' });

    return { doc, invoiceNumber };
  };

  const handleDownloadPdf = (sale: GroupedSale) => {
    try {
      const { doc, invoiceNumber } = buildSalePdf(sale);
      doc.save(`${invoiceNumber}.pdf`);
      toast.success(`Boleta ${invoiceNumber} descargada en PDF.`);
    } catch (e) {
      console.error(e);
      toast.error('No se pudo re-generar el PDF.');
    }
  };

  const handlePrint = (sale: GroupedSale) => {
    try {
      const { doc } = buildSalePdf(sale);
      window.open(doc.output('bloburl') as unknown as string);
    } catch (e) {
      console.error('Error generando PDF para impresión:', e);
      toast.error('No se pudo preparar la boleta para imprimir.');
    }
  };

  // Filter sales based on search term and date range
  const filteredSales = groupedSales.filter(sale => {
    const matchesSearch = 
      sale.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && sale.date >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && sale.date <= `${endDate}T23:59:59`;
    }

    return matchesSearch && matchesDate;
  });

  const totalSalesAmount = filteredSales.reduce((acc, c) => acc + c.totalAmount, 0);

  return (
    <div className="space-y-6">
      
      {/* Barra de KPIs superiores del Historial */}
      <div className="grid gap-4 md:grid-cols-3 no-print">
        <div className="rounded-3xl border border-sky-100 bg-gradient-to-tr from-sky-50/50 to-white p-5 shadow-sm text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600">Transacciones de Venta</p>
          <h4 className="text-3xl font-black text-slate-800 tracking-tight mt-1">{filteredSales.length} boletas</h4>
          <p className="text-xs text-slate-500 mt-0.5">Ventas cerradas registradas en caja</p>
        </div>
        <div className="rounded-3xl border border-rose-100 bg-gradient-to-tr from-rose-50/30 to-white p-5 shadow-sm text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600">Ingresos Totales (POS)</p>
          <h4 className="text-3xl font-black text-rose-600 tracking-tight mt-1">S/ {totalSalesAmount.toFixed(2)}</h4>
          <p className="text-xs text-slate-500 mt-0.5">Suma neta facturada en boletas</p>
        </div>
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-tr from-emerald-50/30 to-white p-5 shadow-sm text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Moneda Contable</p>
          <h4 className="text-3xl font-black text-slate-800 tracking-tight mt-1">SOLES (S/)</h4>
          <p className="text-xs text-slate-500 mt-0.5">Tipo de cambio fijo local</p>
        </div>
      </div>

      {/* Controles de Búsqueda y Filtros */}
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, boleta, serie..." 
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-rose-500 focus:outline-none transition-all shadow-inner"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Desde</span>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold focus:border-rose-500 focus:outline-none transition-all shadow-inner"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Hasta</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold focus:border-rose-500 focus:outline-none transition-all shadow-inner"
            />
          </div>
          <button 
            onClick={loadSales}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
            title="Recargar historial"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Listado de Ventas (Tabla Elegante) */}
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm no-print">
        {loading ? (
          <div className="p-16 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-rose-500 border-t-transparent mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Cargando ventas confirmadas...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-16 text-center">
            <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-black text-slate-700">No se encontraron ventas</p>
            <p className="text-xs text-slate-400 mt-1">Realiza transacciones en la Calculadora o ajusta tus filtros de búsqueda.</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-xs text-left">
            <thead className="bg-gradient-to-r from-rose-500 to-sky-400 text-white">
              <tr>
                <th className="px-5 py-3.5 font-bold uppercase tracking-wider">Serie de Boleta</th>
                <th className="px-5 py-3.5 font-bold uppercase tracking-wider">Cliente</th>
                <th className="px-5 py-3.5 font-bold uppercase tracking-wider">Fecha y Hora</th>
                <th className="px-5 py-3.5 font-bold uppercase tracking-wider">Concepto Contable</th>
                <th className="px-5 py-3.5 text-right font-bold uppercase tracking-wider">Monto Cobrado</th>
                <th className="px-5 py-3.5 text-center font-bold uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredSales.map((sale) => {
                return (
                  <tr key={sale.id} className="hover:bg-slate-50/20 transition-colors">
                    <td className="px-5 py-4 font-black text-slate-900 tracking-wider">
                      <span className="bg-sky-50 text-sky-800 text-[10px] px-2.5 py-1 rounded-lg font-bold border border-sky-100">
                        {sale.invoiceNumber}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-800">{sale.clientName}</td>
                    <td className="px-5 py-4 font-medium text-slate-500">
                      {new Date(sale.date).toLocaleString('es-PE')}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-500 truncate max-w-xs">{sale.description}</td>
                    <td className="px-5 py-4 text-right font-black text-rose-600 text-sm">
                      S/ {sale.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="inline-flex gap-2">
                        <button 
                          onClick={() => handlePrint(sale)}
                          className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                          title="Imprimir Boleta"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDownloadPdf(sale)}
                          className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                          title="Descargar PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Boleta global reutilizable — oculta en pantalla, visible solo al imprimir */}
      {selectedSale && (
        <div className="invoice-print-wrapper">
          <PrintableInvoice
            invoiceNumber={selectedSale.invoiceNumber}
            date={new Date(selectedSale.date).toLocaleString('es-PE')}
            clientName={selectedSale.clientName}
            clientAddress={selectedSale.clientAddress}
            clientIdType={selectedSale.clientIdType}
            clientIdNumber={selectedSale.clientIdNumber}
            items={selectedSale.items.map((item): PrintableInvoiceItem => ({
              productName: item.productName,
              quantity: item.quantity,
              weight: item.weight,
              price: item.price,
              totalAmount: item.totalAmount,
            }))}
            totalAmount={selectedSale.totalAmount}
          />
        </div>
      )}

      <style>{`
        /* En pantalla: ocultar el wrapper de impresión */
        .invoice-print-wrapper {
          display: none;
        }
        /* Al imprimir: mostrar */
        @media print {
          .invoice-print-wrapper {
            display: block !important;
          }
          .no-print, nav, aside, footer {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default HistorialVentas;
