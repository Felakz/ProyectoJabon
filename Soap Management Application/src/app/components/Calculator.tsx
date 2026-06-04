import { useState, useEffect } from 'react';
import { 
  Calculator as CalcIcon, 
  Trash2, 
  Plus, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  ArrowRight,
  Sparkles,
  FileText,
  Layers,
  Package2,
  AlertTriangle,
  X
} from 'lucide-react';
import { api } from '../services/api';
import type { CalculationRequest, Recipe, Category, Ingredient, FinishedProduct } from '../services/api';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { logoBase64 } from '../services/logoBase64';

interface CalculatorProps {
  recipes: Recipe[];
  products: FinishedProduct[];
  ingredients: Ingredient[];
  categories: Category[];
  onCalculate: (request: CalculationRequest) => Promise<any>;
  onNavigate: (tab: 'dashboard' | 'inventory' | 'calculator' | 'recipes' | 'facturacion') => void;
}

interface CartItem {
  id: string; // ID del ingrediente/producto en inventario
  name: string; // Nombre del producto
  price: number; // PVP
  weight: number; // Peso unitario (g)
  cost: number; // Costo de producción unitario
  quantity: number;
  categoryId?: string;
}

const formatMoney = (value: number) => `S/ ${value.toFixed(2)}`;

// PREMIUM jsPDF High-Fidelity PDF Generator for Quotes (Fidelity copy of Image 2 style)
const createMultiQuotePdf = (
  cart: CartItem[],
  clientName: string,
  totalPrice: number,
  totalOrderWeight: number
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const quoteNum = `COT-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toLocaleString('es-PE');
  const clientNameVal = clientName || 'Clientes Varios';

  // 1. DIBUJAR CABECERA DE LOGO DEGRADADO (Imagen de 3cm x 3cm)
  try {
    doc.addImage(logoBase64, 'PNG', 15, 15, 30, 30);
  } catch (err) {
    console.error("Error drawing logo image, fallback to solid circle:", err);
    // Fallback
    doc.setFillColor(224, 90, 118); // Rosa pastel/coral premium (#e05a76)
    doc.circle(30, 30, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('LOGO', 30, 31.5, { align: 'center' });
  }

  // Dibuja un borde exterior fino y elegante alrededor del logo
  doc.setDrawColor(224, 90, 118); // Rosa pastel/coral premium
  doc.setLineWidth(0.3);
  doc.circle(30, 30, 15.1, 'D');

  // Título de la empresa a la izquierda
  doc.setTextColor(196, 64, 92); // Rosa oscuro elegante (#c4405c)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ANGELY NATURAL', 50, 22, { charSpace: 0.3 });

  doc.setTextColor(45, 29, 32); // Café-morado muy profundo para no cansar los ojos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Cotización de Pedido - Jabones Artesanales', 50, 27.5);

  doc.setTextColor(125, 107, 110); // Slate-rose suave
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Presupuesto estimativo de productos comerciales', 50, 32.5);

  doc.setTextColor(125, 107, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('RUC: 20553840024', 50, 37.5);

  // 2. DIBUJAR TARJETA DE COTIZACIÓN ELECTRÓNICA A LA DERECHA
  doc.setDrawColor(224, 90, 118); // Rosa pastel/coral
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 252, 253); // Suave fondo blanco-blush
  doc.roundedRect(132, 15, 63, 32, 3, 3, 'FD');

  doc.setTextColor(196, 64, 92); // Rosa oscuro elegante
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('COTIZACIÓN DE PEDIDO', 163.5, 20.5, { align: 'center', charSpace: 0.1 });

  // Badge de numeración (Rectángulo rosa)
  doc.setFillColor(224, 90, 118); // Rosa pastel/coral
  doc.roundedRect(137.5, 23, 52, 8, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(quoteNum, 163.5, 28.5, { align: 'center' });

  doc.setTextColor(125, 107, 110);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Fecha emisión:  ${dateStr}`, 135.5, 35);
  doc.text('Moneda:              SOLES', 135.5, 38.5);
  doc.text('Validez:             15 DÍAS CAL.', 135.5, 42);

  // 3. SECCIÓN DATOS DEL CLIENTE
  doc.setFillColor(255, 245, 246); // Suave blush pastel (rose-50)
  doc.setDrawColor(255, 214, 220); // Rosa pastel suave (rose-200)
  doc.roundedRect(15, 52, 180, 20, 3, 3, 'FD');

  doc.setTextColor(163, 45, 70); // Deep rose
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DATOS DEL CLIENTE Y PRESUPUESTO', 19, 58, { charSpace: 0.2 });

  doc.setTextColor(45, 29, 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const truncatedName = clientNameVal.length > 80 ? clientNameVal.substring(0, 77) + '...' : clientNameVal;
  doc.text(`Cliente:  ${truncatedName}`, 19, 64);

  // 4. TABLA DE PRODUCTOS
  doc.setFillColor(224, 90, 118); // Rosa pastel
  doc.rect(15, 78, 180, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Descripción', 18, 83.5);
  doc.text('Cantidad / Peso', 115, 83.5, { align: 'center' });
  doc.text('Precio unit.', 155, 83.5, { align: 'right' });
  doc.text('Importe', 190, 83.5, { align: 'right' });

  let yRow = 86;

  cart.forEach((item) => {
    // Fondo blanco para la fila
    doc.setFillColor(255, 255, 255);
    doc.rect(15, yRow, 180, 11, 'F');

    // Nombre de producto
    doc.setTextColor(45, 29, 32);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(item.name, 18, yRow + 4.5);

    // Subtítulo descriptivo de barra comercial
    doc.setTextColor(163, 142, 145); // Soft mauve
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`Producto comercial en barra / envase terminado de ${item.weight || 95}g.`, 18, yRow + 8.5);

    // Cantidad y Peso total
    doc.setTextColor(74, 62, 64);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const weightTotal = (item.weight || 0) * item.quantity;
    const weightText = weightTotal > 0 ? `(${weightTotal} g)` : '';
    doc.text(`${item.quantity} un ${weightText}`, 115, yRow + 6.5, { align: 'center' });

    // Precio unitario
    doc.text(`S/ ${(item.price || 0).toFixed(2)}`, 155, yRow + 6.5, { align: 'right' });

    // Importe
    doc.setTextColor(45, 29, 32);
    doc.setFont('helvetica', 'bold');
    doc.text(`S/ ${(item.price * item.quantity).toFixed(2)}`, 190, yRow + 6.5, { align: 'right' });

    // Línea divisoria fina
    doc.setDrawColor(255, 245, 246);
    doc.line(15, yRow + 11, 195, yRow + 11);

    yRow += 11;
  });

  // 5. TOTALES Y PIE DE PÁGINA (Y = yRow + 6)
  const yTotal = yRow + 6;

  // Notas Administrativas (Caja gris a la izquierda)
  doc.setFillColor(255, 252, 253);
  doc.setDrawColor(255, 214, 220);
  doc.roundedRect(15, yTotal, 110, 26, 2, 2, 'FD');

  doc.setTextColor(163, 45, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CONDICIONES DE COTIZACIÓN', 18, yTotal + 5.5, { charSpace: 0.1 });

  doc.setTextColor(125, 107, 110);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const notesText = 'Los precios cotizados corresponden a productos terminados de inventario. La validez de esta cotización es de 15 días calendario. Al confirmarse el pedido, se procederá al descuento automático en caja.';
  doc.text(notesText, 18, yTotal + 9.5, { maxWidth: 104 });

  // Costo Total (Caja celeste a la derecha)
  doc.setFillColor(255, 245, 246); // Suave blush pastel
  doc.setDrawColor(255, 214, 220); // Rosa pastel suave
  doc.roundedRect(130, yTotal, 65, 30, 2, 2, 'FD');

  doc.setTextColor(125, 107, 110);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Peso total estimado', 134, yTotal + 6.5);
  doc.setTextColor(74, 62, 64);
  doc.setFont('helvetica', 'bold');
  doc.text(`${totalOrderWeight.toLocaleString()} g`, 190, yTotal + 6.5, { align: 'right' });

  doc.setTextColor(125, 107, 110);
  doc.setFont('helvetica', 'normal');
  doc.text('Validez', 134, yTotal + 11.5);
  doc.setTextColor(74, 62, 64);
  doc.setFont('helvetica', 'bold');
  doc.text('15 Días', 190, yTotal + 11.5, { align: 'right' });

  doc.setDrawColor(255, 214, 220);
  doc.line(134, yTotal + 15, 190, yTotal + 15);

  // Valor Total Gigante en Rojo
  doc.setTextColor(196, 64, 92); // Rosa elegante
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TOTAL COTIZADO', 134, yTotal + 21);
  
  doc.setFontSize(13);
  doc.text(`S/ ${totalPrice.toFixed(2)}`, 190, yTotal + 26.5, { align: 'right' });

  // 6. PIE DE PÁGINA OFICIAL AL FINAL DE LA PÁGINA
  doc.setTextColor(224, 90, 118); // Rosa pastel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('🌸  Presupuesto de Jabones Naturales - Angely Natural', 105, 282, { align: 'center' });

  return doc;
};

export function Calculator({ recipes, products, ingredients, categories, onCalculate, onNavigate }: CalculatorProps) {
  // Form State
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // Shopping Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Warning Modal State
  const [showStockWarningModal, setShowStockWarningModal] = useState(false);
  const [warningItems, setWarningItems] = useState<Array<{
    name: string;
    requested: number;
    available: number;
  }>>([]);

  // Client Info
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientIdType, setClientIdType] = useState<'DNI' | 'RUC' | ''>('');
  const [clientIdNumber, setClientIdNumber] = useState('');

  // Dropdown Filtering (Jalar productos terminados del Almacén Final)
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearchTerm.toLowerCase())
  );
  
  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Helper para extraer el peso del nombre descriptivo (ej: "Jabón de Avena - 50g" -> 50)
  const parseWeightFromName = (name: string): number => {
    const match = name.match(/(\d+)\s*g/i);
    return match ? parseInt(match[1]) : 0;
  };

  // Handlers for Cart
  const handleAddToCart = () => {
    if (!selectedProduct) return;

    // Check if item already in cart
    const existingIndex = cart.findIndex(item => item.id === selectedProduct.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += quantity;
      setCart(updated);
    } else {
      // Add new item
      const newItem: CartItem = {
        id: selectedProduct.id,
        name: selectedProduct.name,
        price: selectedProduct.price || 0,
        weight: parseWeightFromName(selectedProduct.name),
        cost: 0,
        quantity,
      };
      setCart([...cart, newItem]);
    }

    // Reset selectors
    setSelectedProductId('');
    setQuantity(1);
    toast.success('Producto agregado al pedido.');
  };

  const handleRemoveFromCart = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
    toast.info('Producto removido.');
  };

  // COMBINED FINANCIAL METRICS
  let totalOrderRevenue = 0;
  let totalOrderCost = 0;
  let totalOrderWeight = 0;

  cart.forEach(item => {
    totalOrderRevenue += item.price * item.quantity;
    totalOrderCost += item.cost * item.quantity;
    totalOrderWeight += item.weight * item.quantity;
  });

  const totalNetProfit = totalOrderRevenue - totalOrderCost;
  const averageProfitMargin = totalOrderRevenue > 0 ? (totalNetProfit / totalOrderRevenue) * 100 : 0;

  // Stock status styling helper
  const getStockBadgeClass = (stock: number) => {
    if (stock <= 0) return 'bg-rose-50 border border-rose-200 text-rose-700';
    if (stock <= 10) return 'bg-amber-50 border border-amber-200 text-amber-700';
    return 'bg-emerald-50 border border-emerald-200 text-emerald-700';
  };

  const handleDownloadMultiQuote = () => {
    if (cart.length === 0) return;
    try {
      const doc = createMultiQuotePdf(
        cart,
        clientName,
        totalOrderRevenue,
        totalOrderWeight
      );
      const quoteNum = `COT-${Date.now().toString().slice(-6)}`;
      doc.save(`cotizacion-pedido-${quoteNum}.pdf`);
      toast.success('Cotización descargada exitosamente en PDF.');
    } catch (e) {
      console.error('Error generando cotización:', e);
      toast.error('No se pudo descargar la cotización en PDF.');
    }
  };

  const handleGeneratePreBoleta = async () => {
    if (cart.length === 0) return;

    // Validar stock disponible para todos los productos en el carrito
    const insufficientStockItems = cart.filter(item => {
      const invItem = products.find(p => p.id === item.id);
      const availableStock = invItem ? invItem.stock : 0;
      return item.quantity > availableStock;
    });

    if (insufficientStockItems.length > 0) {
      const modalItems = insufficientStockItems.map(item => {
        const invItem = products.find(p => p.id === item.id);
        const availableStock = invItem ? invItem.stock : 0;
        return {
          name: item.name,
          requested: item.quantity,
          available: availableStock
        };
      });

      setWarningItems(modalItems);
      setShowStockWarningModal(true);
      return;
    }

    try {
      const inv = await api.getInvoiceInfo().catch(() => ({ series: 'B001', lastNumber: 0 }));
      const currentNumber = Number(inv.lastNumber) + 1;
      const fullNumber = `${inv.series}-${currentNumber.toString().padStart(3, '0')}`;

      // Assemble pre-boleta payload including the cart items
      const payload = {
        calculation: {
          mode: 'batch-pos',
          targetWeight: totalOrderWeight,
          totalCost: totalOrderCost,
          oils: [],
          waterGrams: 0,
          lyeGrams: 0
        },
        recipe: {
          id: 'batch-sale',
          name: 'Pedido POS Multi-Producto',
          description: `Venta consolidada de ${cart.length} productos diferentes.`
        },
        invoice: {
          series: inv.series,
          number: currentNumber,
          fullNumber
        },
        company: { name: 'Angely Natural' },
        client: {
          name: clientName,
          address: clientAddress,
          idType: clientIdType,
          idNumber: clientIdNumber
        },
        saleInfo: {
          items: cart.map(item => ({
            productId: item.id,
            variantId: item.id, // En POS unificado, variantId es el id del inventario
            productName: item.name,
            weight: item.weight,
            price: item.price,
            quantity: item.quantity,
            totalAmount: item.price * item.quantity
          })),
          totalAmount: totalOrderRevenue
        }
      };

      await api.saveCurrentInvoice(payload);
      onNavigate('facturacion');
    } catch (e) {
      console.error('Error al generar pre-boleta en lote:', e);
      alert('Error al inicializar borrador de venta múltiple.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Encabezado Principal */}
      <div className="relative rounded-2xl bg-white p-6 shadow-md border border-pink-100/50 overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-br from-rose-200/20 to-sky-200/20 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-400 to-pink-500 text-white shadow-md shadow-rose-200">
              <CalcIcon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Punto de Venta POS & Caja</h2>
              <p className="text-sm text-slate-500">Registra ventas de múltiples champús, jabones y empaques en lote, analiza tu rentabilidad y factura.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto rounded-full bg-rose-50 px-4 py-1.5 text-xs font-bold text-rose-700">
            <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            POS Express Conectado al Inventario
          </div>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LADO IZQUIERDO: Selector de Productos (Col 4) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 space-y-4">
            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
              <Layers className="w-4.5 h-4.5 text-rose-500" />
              Selección de Productos
            </h3>

            {/* Buscador de Productos */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Buscar Producto</label>
              <input
                type="text"
                placeholder="Filtrar por nombre..."
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 focus:outline-none transition-all text-xs font-semibold bg-white"
              />
            </div>

            {/* Producto Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Seleccionar Producto</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 focus:outline-none transition-all text-xs font-semibold bg-white"
              >
                <option value="">-- Seleccionar Artículo --</option>
                {filteredProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {formatMoney(p.price || 0)} (Stock: {p.stock})
                  </option>
                ))}
              </select>
            </div>

            {/* Detalles del Producto Seleccionado */}
            {selectedProductId && selectedProduct && (
              <div className="space-y-3 animate-fadeIn">
                <div className={`rounded-xl p-2.5 flex items-center justify-between text-[11px] font-bold ${getStockBadgeClass(selectedProduct.stock)}`}>
                  <span>Stock Disponible:</span>
                  <span>{selectedProduct.stock} unidades</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] font-medium text-slate-600 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold">Precio Unitario (PVP):</span>
                    <span className="font-extrabold text-slate-800">{formatMoney(selectedProduct.price || 0)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold">Peso Barra/Envase:</span>
                    <span className="font-extrabold text-slate-800">{parseWeightFromName(selectedProduct.name)}g</span>
                  </div>
                </div>

                {/* Cantidad y Botón Añadir */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-1">
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Cantidad</label>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 focus:outline-none transition-all text-xs font-black"
                        min="1"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-rose-100 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir al Pedido
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* LADO DERECHO: Detalle del Carrito, Fórmulas y Cierre (Col 8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* El Carrito POS */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 space-y-4">
            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
              <ShoppingCart className="w-5 h-5 text-sky-500 animate-pulse" />
              Detalle del Pedido Activo
            </h3>

            {cart.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                🛒 El carrito está vacío. Agrega tus productos a la venta desde el panel izquierdo.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2">Producto Comercial</th>
                      <th className="px-4 py-2 text-center">Peso</th>
                      <th className="px-4 py-2 text-center">Cantidad</th>
                      <th className="px-4 py-2 text-right">Unitario</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((item, index) => {
                      const invItem = products.find(p => p.id === item.id);
                      const availableStock = invItem ? invItem.stock : 0;
                      const isInsufficientStock = item.quantity > availableStock;

                      return (
                        <tr key={item.id + '-' + index} className={`hover:bg-slate-50/50 transition-colors ${isInsufficientStock ? 'bg-rose-50/10' : ''}`}>
                          <td className="px-4 py-3 font-bold text-slate-800">
                            <div>{item.name}</div>
                            {isInsufficientStock && (
                              <div className="text-[10px] text-rose-500 font-black mt-1 flex items-center gap-1 animate-pulse">
                                <span>⚠️</span> Stock insuficiente (Disponible: {availableStock.toFixed(0)} un)
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">{item.weight}g</td>
                          <td className={`px-4 py-3 text-center font-extrabold ${isInsufficientStock ? 'text-rose-500' : 'text-slate-800'}`}>{item.quantity} un</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-600">{formatMoney(item.price)}</td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">{formatMoney(item.price * item.quantity)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(index)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="space-y-6">
              {/* Resumen de Pedido Físico y Comercial Consolidado (Ocultando costos y rentabilidades) */}
              <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 space-y-4 animate-fadeIn">
                <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Package2 className="w-5 h-5 text-sky-500" />
                  Resumen de Pedido Comercial
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Artículos Totales</span>
                    <p className="text-2xl font-black text-slate-800 mt-1">
                      {cart.reduce((acc, c) => acc + c.quantity, 0)} unidades
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Peso Total del Lote</span>
                    <p className="text-2xl font-black text-slate-800 mt-1">
                      {totalOrderWeight.toLocaleString()} g
                    </p>
                  </div>
                  <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Total a Pagar</span>
                    <p className="text-2xl font-black text-rose-600 mt-1">
                      {formatMoney(totalOrderRevenue)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Botones POS */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadMultiQuote}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm cursor-pointer"
                >
                  <FileText className="w-4.5 h-4.5 text-slate-500" />
                  Descargar Cotización (PDF)
                </button>
                <button
                  type="button"
                  onClick={handleGeneratePreBoleta}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-sky-500 hover:opacity-95 text-white px-4 py-3 text-sm font-black transition-all shadow-md shadow-pink-200 ring-2 ring-pink-300/30 cursor-pointer"
                >
                  Generar Pre-Boleta
                  <ArrowRight className="w-4.5 h-4.5 text-white" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Advertencia de Stock Insuficiente */}
      {showStockWarningModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg mt-12 bg-white rounded-3xl border border-rose-100 shadow-2xl overflow-hidden animate-slideDown max-h-[85vh] flex flex-col">
            
            {/* Cabecera del Modal */}
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-6 flex items-start gap-4 border-b border-rose-100/30">
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-inner animate-bounce">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">¡Stock Insuficiente en Almacén!</h3>
                <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                  No se puede procesar la venta en caja porque algunos productos agregados al pedido superan el stock físico actual.
                </p>
              </div>
              <button 
                onClick={() => setShowStockWarningModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 p-1.5 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Listado de Productos con Insuficiencia */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-left">
              <div className="overflow-hidden rounded-2xl border border-rose-100/50 bg-rose-50/5">
                <table className="w-full border-collapse text-xs text-left">
                  <thead className="bg-rose-500/10 text-rose-900 font-extrabold uppercase border-b border-rose-100/30">
                    <tr>
                      <th className="px-4 py-2.5">Producto</th>
                      <th className="px-4 py-2.5 text-center">Solicitado</th>
                      <th className="px-4 py-2.5 text-center">Disponible</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100/20">
                    {warningItems.map((item, index) => (
                      <tr key={index} className="hover:bg-rose-50/20 transition-all font-medium text-slate-700">
                        <td className="px-4 py-3 font-bold text-slate-800">{item.name}</td>
                        <td className="px-4 py-3 text-center text-rose-600 font-extrabold">{item.requested} un</td>
                        <td className="px-4 py-3 text-center text-slate-500 font-bold">{item.available} un</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-xs text-amber-800">
                <span className="text-base">💡</span>
                <p className="leading-relaxed">
                  <strong>Recomendación:</strong> Puedes ajustar las cantidades de estos productos en tu carrito o cotizar el pedido en PDF (las cotizaciones no restringen stock).
                </p>
              </div>
            </div>

            {/* Botón de Cierre */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button 
                onClick={() => setShowStockWarningModal(false)}
                className="w-full sm:w-auto px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-rose-200 cursor-pointer"
              >
                Entendido
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
