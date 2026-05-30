import { useState } from 'react';
import { Calculator as CalcIcon, AlertCircle, CheckCircle, Droplet, Beaker, Package2 } from 'lucide-react';
import { api } from '../services/api';
import type { CalculationRequest, Recipe } from '../services/api';

const formatMoney = (value: number) => `S/ ${value.toFixed(2)}`;

const sanitizePdfText = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\x20-\x7E\n\r]/g, '?');

const escapePdfText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const createInvoicePdf = (result: any, recipeName: string) => {
  const dateStr = new Date().toLocaleString('es-PE');

  const headerLeft = 'Boleta Virtual - Jabones Artesanales';
  const headerRight = `Fecha: ${dateStr}`;

  const lines: string[] = [];

  // Header and summary lines
  lines.push(headerLeft);
  lines.push(headerRight);
  lines.push('');
  lines.push('Resumen del lote');
  lines.push(`Receta: ${recipeName}`);
  lines.push(`Modo: ${result.mode === 'soapCount' ? 'Por cantidad de jabones' : 'Por gramos'}`);
  lines.push(`Peso objetivo: ${result.targetWeight} g`);
  if (result.soapCount) lines.push(`Cantidad de jabones: ${result.soapCount}`);
  if (result.gramsPerSoap) lines.push(`Peso por jabon: ${result.gramsPerSoap} g`);

  // Table header
  const tableHeader = ['Ingrediente', 'Gramos', 'Costo (S/)'];

  // Build table rows
  const tableRows = result.oils.map((oil: any) => [
    oil.name,
    `${oil.gramsNeeded} g`,
    formatMoney(oil.cost),
  ]);

  // Footer
  const footer = [
    ['Agua', `${result.waterGrams} g`, ''],
    ['Sosa (NaOH)', `${result.lyeGrams} g`, ''],
  ];

  // Compose PDF content using fixed positions and simple table-like columns
  const Fsize = 11;
  const lineHeight = 14;
  const pageWidth = 595;
  const pageHeight = 842;

  const startX = 50;
  let cursorY = 780;

  const ops: string[] = [];
  ops.push('BT');
  ops.push(`/F1 ${Fsize} Tf`);

  // Header left
  ops.push(`1 0 0 1 ${startX} ${cursorY} Tm`);
  ops.push(`(${escapePdfText(sanitizePdfText(headerLeft))}) Tj`);
  // Header right
  ops.push(`1 0 0 1 ${pageWidth - 200} ${cursorY} Tm`);
  ops.push(`(${escapePdfText(sanitizePdfText(headerRight))}) Tj`);

  cursorY -= lineHeight * 2;

  // Summary block
  ops.push(`1 0 0 1 ${startX} ${cursorY} Tm`);
  ops.push(`(${escapePdfText(sanitizePdfText('Resumen del lote'))}) Tj`);
  cursorY -= lineHeight;

  const summaryLines = [
    `Receta: ${recipeName}`,
    `Modo: ${result.mode === 'soapCount' ? 'Por cantidad de jabones' : 'Por gramos'}`,
    `Peso objetivo: ${result.targetWeight} g`,
  ];
  if (result.soapCount) summaryLines.push(`Cantidad de jabones: ${result.soapCount}`);
  if (result.gramsPerSoap) summaryLines.push(`Peso por jabon: ${result.gramsPerSoap} g`);

  summaryLines.forEach(line => {
    ops.push(`1 0 0 1 ${startX} ${cursorY} Tm`);
    ops.push(`(${escapePdfText(sanitizePdfText(line))}) Tj`);
    cursorY -= lineHeight;
  });

  cursorY -= lineHeight / 2;

  // Table header
  ops.push(`1 0 0 1 ${startX} ${cursorY} Tm`);
  ops.push(`(${escapePdfText(sanitizePdfText(tableHeader.join('   ')))}) Tj`);
  cursorY -= lineHeight;

  // Table rows
  tableRows.forEach((row: string[]) => {
    const text = `${row[0]}   ${row[1]}   ${row[2]}`;
    ops.push(`1 0 0 1 ${startX} ${cursorY} Tm`);
    ops.push(`(${escapePdfText(sanitizePdfText(text))}) Tj`);
    cursorY -= lineHeight;
  });

  cursorY -= lineHeight / 2;
  footer.forEach((row: string[]) => {
    const text = `${row[0]}   ${row[1]}   ${row[2]}`;
    ops.push(`1 0 0 1 ${startX} ${cursorY} Tm`);
    ops.push(`(${escapePdfText(sanitizePdfText(text))}) Tj`);
    cursorY -= lineHeight;
  });

  cursorY -= lineHeight / 2;
  ops.push(`1 0 0 1 ${startX} ${cursorY} Tm`);
  ops.push(`(${escapePdfText(sanitizePdfText(`Costo total: ${formatMoney(result.totalCost)}`))}) Tj`);
  cursorY -= lineHeight;

  ops.push(`1 0 0 1 ${startX} ${cursorY} Tm`);
  ops.push(`(${escapePdfText(sanitizePdfText(result.canMakeBatch ? 'Estado: stock suficiente' : 'Estado: revisar stock'))}) Tj`);

  ops.push('ET');

  const contentStream = ops.join('\n');

  const objects: string[] = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${contentStream.length} >> stream\n${contentStream}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return pdf;
};

export function Calculator({ recipes, onCalculate }: CalculatorProps) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [batchMode, setBatchMode] = useState<'grams' | 'soapCount'>('grams');
  const [targetWeight, setTargetWeight] = useState<string>('1000');
  const [soapCount, setSoapCount] = useState<string>('10');
  const [gramsPerSoap, setGramsPerSoap] = useState<string>('100');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);

  const handleCalculate = async () => {
    if (!selectedRecipeId) return;

    const request: CalculationRequest = batchMode === 'grams'
      ? { recipeId: selectedRecipeId, targetWeight: parseFloat(targetWeight) }
      : { recipeId: selectedRecipeId, soapCount: parseFloat(soapCount), gramsPerSoap: parseFloat(gramsPerSoap) };

    setLoading(true);
    try {
      const calculation = await onCalculate(request);
      setResult(calculation);
    } catch (error) {
      console.error('Error calculating:', error);
      alert('No se pudo calcular la receta');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = () => {
    if (!result || !selectedRecipe) return;

    const lines = [
      'Boleta Virtual - Jabones Artesanales',
      `Fecha: ${new Date().toLocaleString('es-PE')}`,
      '',
      'Resumen del lote',
      `Receta: ${selectedRecipe.name}`,
      `Modo: ${result.mode === 'soapCount' ? 'Por cantidad de jabones' : 'Por gramos'}`,
      `Peso objetivo: ${result.targetWeight} g`,
      result.soapCount ? `Cantidad de jabones: ${result.soapCount}` : '',
      result.gramsPerSoap ? `Peso por jabon: ${result.gramsPerSoap} g` : '',
      '',
      'Desglose de insumos',
      ...result.oils.map((oil: any) => `${oil.name}: ${oil.gramsNeeded} g - ${formatMoney(oil.cost)}`),
      `Agua: ${result.waterGrams} g`,
      `Sosa (NaOH): ${result.lyeGrams} g`,
      '',
      `Costo total: ${formatMoney(result.totalCost)}`,
      result.canMakeBatch ? 'Estado: stock suficiente' : 'Estado: revisar stock',
    ].filter(Boolean);

    const pdfContent = createInvoicePdf(result, selectedRecipe.name);
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `boleta-jabon-${selectedRecipe.name.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalcIcon className="w-8 h-8 text-rose-600" />
        <h2 className="text-2xl font-bold">Calculadora de Recetas</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
          <h3 className="font-semibold">Configuración del Batch</h3>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setBatchMode('grams')}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${batchMode === 'grams' ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-gray-300 text-gray-600'}`}
            >
              Por gramos
            </button>
            <button
              type="button"
              onClick={() => setBatchMode('soapCount')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${batchMode === 'soapCount' ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-gray-300 text-gray-600'}`}
            >
              Por cantidad de jabones
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Selecciona una receta</label>
            <select
              value={selectedRecipeId}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            >
              <option value="">-- Seleccionar --</option>
              {recipes.map(recipe => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name}
                </option>
              ))}
            </select>
          </div>

          {selectedRecipe && (
            <div className="bg-rose-50 p-4 rounded-lg border border-rose-200 space-y-2">
              <p className="font-medium text-sm">{selectedRecipe.name}</p>
              <p className="text-sm text-gray-600">{selectedRecipe.description}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Sobreengrasado:</span>
                  <span className="ml-1 font-medium">{selectedRecipe.overfattingPercentage}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Descuento agua:</span>
                  <span className="ml-1 font-medium">{selectedRecipe.waterDiscountPercentage}%</span>
                </div>
              </div>
            </div>
          )}

          {batchMode === 'grams' ? (
            <div>
              <label className="block text-sm font-medium mb-2">Peso objetivo del lote (gramos)</label>
              <input
                type="number"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                placeholder="1000"
                min="100"
                step="50"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Cantidad de jabones</label>
                <input
                  type="number"
                  value={soapCount}
                  onChange={(e) => setSoapCount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  placeholder="10"
                  min="1"
                  step="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Peso por jabón (g)</label>
                <input
                  type="number"
                  value={gramsPerSoap}
                  onChange={(e) => setGramsPerSoap(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  placeholder="100"
                  min="10"
                  step="5"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleCalculate}
            disabled={!selectedRecipeId || loading}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Calculando...
              </>
            ) : (
              <>
                <CalcIcon className="w-4 h-4" />
                Calcular lote
              </>
            )}
          </button>
        </div>

        {result && (
          <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Resultados del cálculo</h3>
              <button
                type="button"
                onClick={async () => {
                  if (!result || !selectedRecipe) return;
                  try {
                    const inv = await api.nextInvoiceNumber();
                    const payload = { calculation: result, recipe: selectedRecipe, invoice: inv, company: { name: 'Angely Natural' }, client: { name: '', address: '', idType: '', idNumber: '' } };
                    await api.saveCurrentInvoice(payload);
                    window.open('/facturacion', '_blank');
                  } catch (e) {
                    console.error('Error abriendo boleta:', e);
                    alert('No se pudo abrir la boleta');
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
              >
                Ver boleta
              </button>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!result || !selectedRecipe) return;
                  try {
                    // Request next invoice number from backend
                    const inv = await api.nextInvoiceNumber();
                    const payload = { calculation: result, recipe: selectedRecipe, invoice: inv, company: { name: 'Angely Natural' }, client: { name: '', address: '', idType: '', idNumber: '' } };
                    await api.saveCurrentInvoice(payload);
                    window.open('/facturacion', '_blank');
                  } catch (e) {
                    console.error('Error generando boleta:', e);
                    alert('No se pudo generar la boleta (error al obtener número)');
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Generar Boleta
              </button>
            </div>

            <div className="space-y-2">
              {result.alerts.map((alert: string, index: number) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 p-3 rounded-lg ${
                    result.canMakeBatch
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {result.canMakeBatch ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  )}
                  <span className="text-sm">{alert}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-sky-50 p-4 rounded-lg border border-sky-200">
                <div className="flex items-center gap-2 mb-1">
                  <Droplet className="w-4 h-4 text-sky-600" />
                  <span className="text-sm font-medium text-sky-900">Agua</span>
                </div>
                <p className="text-2xl font-bold text-sky-600">{result.waterGrams}g</p>
              </div>
              <div className="bg-rose-50 p-4 rounded-lg border border-rose-200">
                <div className="flex items-center gap-2 mb-1">
                  <Beaker className="w-4 h-4 text-rose-600" />
                  <span className="text-sm font-medium text-rose-900">Sosa (NaOH)</span>
                </div>
                <p className="text-2xl font-bold text-rose-600">{result.lyeGrams}g</p>
              </div>
            </div>

            {result.mode === 'soapCount' && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="flex items-center gap-2 font-medium">
                  <Package2 className="w-4 h-4 text-slate-600" />
                  Resumen por unidades
                </div>
                <p className="mt-1">{result.soapCount} jabones de {result.gramsPerSoap}g cada uno.</p>
              </div>
            )}

            <div>
              <h4 className="font-medium text-sm mb-2">Productos del inventario requeridos:</h4>
              <div className="space-y-2">
                {result.oils.map((oil: any) => (
                  <div
                    key={oil.ingredientId}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm">{oil.name}</span>
                    <div className="text-right">
                      <span className="font-medium">{oil.gramsNeeded}g</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({formatMoney(oil.cost)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Costo total del lote:</span>
                <span className="text-2xl font-bold text-rose-600">{formatMoney(result.totalCost)}</span>
              </div>
              {result.mode === 'soapCount' && result.soapCount ? (
                <p className="mt-2 text-sm text-gray-600">
                  Costo estimado por jabón: {formatMoney(result.totalCost / result.soapCount)}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {!result && (
        <div className="bg-gradient-to-r from-rose-50 to-sky-50 rounded-xl p-8 text-center border border-rose-200">
          <CalcIcon className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <p className="text-gray-600">
            Selecciona una receta y define el lote por gramos o por cantidad de jabones para calcular tu batch.
          </p>
        </div>
      )}
    </div>
  );
}
