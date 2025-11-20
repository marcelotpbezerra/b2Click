import React, { useState, useEffect, useMemo } from 'react';
import { InventoryLog, ReportItem, InvoiceItem, Product } from '../types';
import { getInventoryLogs, getInvoiceData, getStoredProducts } from '../services/storage';
import { generateInventoryInsights } from '../services/geminiService';
import { DownloadIcon, SparklesIcon, TrashIcon } from './Icons';
import { CSV_HEADERS } from '../constants';

interface ExtraItem {
  barcode: string;
  systemCode: string;
  name: string;
  countedQuantity: number;
}

interface ReportViewProps {
  onSessionReset: () => void;
}

const ReportView: React.FC<ReportViewProps> = ({ onSessionReset }) => {
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState('');
  
  // AI State
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    setInvoiceItems(getInvoiceData());
    setLogs(getInventoryLogs());
    setProducts(getStoredProducts());
  }, []);

  const { reportData, extraItems } = useMemo(() => {
    // Calculate total scanned per barcode
    const scanCounts: Record<string, number> = {};
    logs.forEach(log => {
      scanCounts[log.barcode] = (scanCounts[log.barcode] || 0) + log.quantity;
    });

    // 1. Generate Main Report based on Invoice Items
    const mainReport: ReportItem[] = invoiceItems.map(item => {
      const counted = scanCounts[item.barcode] || 0;
      const diff = counted - item.invoiceQuantity;
      
      let status: ReportItem['status'] = 'MATCH';
      if (diff < 0) status = 'MISSING';
      if (diff > 0) status = 'SURPLUS';

      // Remove from tracking to identify extras later
      delete scanCounts[item.barcode];

      // Find product info for system code
      const productInfo = products.find(p => p.barcode === item.barcode);

      return {
        systemCode: productInfo?.systemCode || '-',
        barcode: item.barcode,
        name: item.name,
        invoiceQuantity: item.invoiceQuantity,
        countedQuantity: counted,
        difference: diff,
        status
      };
    });

    // 2. Identify Extra Items (Remaining keys in scanCounts)
    const extras: ExtraItem[] = Object.entries(scanCounts).map(([barcode, quantity]) => {
      const knownProduct = products.find(p => p.barcode === barcode);
      return {
        barcode,
        systemCode: knownProduct?.systemCode || '-',
        name: knownProduct ? knownProduct.name : 'Não Cadastrado / Desconhecido',
        countedQuantity: quantity
      };
    });

    return { reportData: mainReport, extraItems: extras };
  }, [invoiceItems, logs, products]);

  const filteredData = useMemo(() => {
    return reportData.filter(item => 
      item.name.toLowerCase().includes(filter.toLowerCase()) || 
      item.barcode.includes(filter) ||
      item.systemCode.includes(filter)
    );
  }, [reportData, filter]);

  const filteredExtras = useMemo(() => {
    return extraItems.filter(item => 
      item.name.toLowerCase().includes(filter.toLowerCase()) || 
      item.barcode.includes(filter) ||
      item.systemCode.includes(filter)
    );
  }, [extraItems, filter]);

  const handleExport = () => {
    // Main report content
    let csvContent = [
      CSV_HEADERS.join(','),
      ...reportData.map(item => `"${item.systemCode}","${item.barcode}","${item.name}",${item.invoiceQuantity},${item.countedQuantity},${item.difference},${item.status}`)
    ].join('\n');

    // Append Extra Items if any
    if (extraItems.length > 0) {
      csvContent += '\n\nITENS FORA DA NOTA\nCód. Sistema,Código,Nome,Quantidade Contada';
      csvContent += '\n' + extraItems.map(item => `"${item.systemCode}","${item.barcode}","${item.name}",${item.countedQuantity}`).join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `validacao_nota_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateInsights = async () => {
    setIsGeneratingAi(true);
    
    let contextData = reportData
      .filter(item => item.status !== 'MATCH')
      .map(item => `${item.name} (Cód: ${item.systemCode}): Nota(${item.invoiceQuantity}) vs Real(${item.countedQuantity})`)
      .join('\n');

    if (extraItems.length > 0) {
       contextData += '\n\nITENS EXTRA (NÃO ESTAVAM NA NOTA):\n' + 
         extraItems.map(i => `${i.name} (Cód: ${i.systemCode}): ${i.countedQuantity} un.`).join('\n');
    }

    if (!contextData) {
      setAiInsight("Parabéns! Não foram encontradas divergências e nenhum item extra foi coletado.");
      setIsGeneratingAi(false);
      return;
    }

    const result = await generateInventoryInsights(reportData);
    
    setAiInsight(result);
    setIsGeneratingAi(false);
  };

  const handleResetClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onSessionReset();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-black">Validação da Nota</h2>
          <p className="text-slate-500">Comparativo: Nota Fiscal vs. Contagem Física.</p>
        </div>
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={handleGenerateInsights}
            disabled={isGeneratingAi || (reportData.length === 0 && extraItems.length === 0)}
            className="bg-brand-black hover:bg-slate-800 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors"
          >
            {isGeneratingAi ? (
              <span className="animate-pulse">Analisando...</span>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5 text-brand-green" />
                <span>Análise IA</span>
              </>
            )}
          </button>
          <button 
            type="button"
            onClick={handleExport}
            className="bg-white border border-slate-300 text-slate-700 hover:bg-green-50 hover:text-brand-green hover:border-brand-green px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors"
          >
            <DownloadIcon className="w-5 h-5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* AI Insight Panel */}
      {aiInsight && (
        <div className="mb-8 bg-slate-50 border-l-4 border-brand-green rounded-r-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
             <SparklesIcon className="w-5 h-5 text-brand-green" />
             <h3 className="font-bold text-brand-black">Análise de Divergências</h3>
          </div>
          <div className="prose prose-sm text-slate-700 max-w-none whitespace-pre-line leading-relaxed">
            {aiInsight}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filtrar por nome, código de barras ou sistema..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full md:w-1/3 bg-white px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none"
        />
      </div>

      {/* Main Comparison Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-700">Itens da Nota Fiscal</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Cód. Sistema</th>
                <th className="p-4 font-semibold">Barras / Produto</th>
                <th className="p-4 font-semibold text-center">Qtd Nota</th>
                <th className="p-4 font-semibold text-center">Qtd Contada</th>
                <th className="p-4 font-semibold text-center">Diferença</th>
                <th className="p-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    {invoiceItems.length === 0 ? "Nenhuma nota fiscal importada." : "Nenhum item encontrado no filtro."}
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.barcode} className="hover:bg-green-50 transition-colors">
                    <td className="p-4 font-mono text-sm text-slate-600">{item.systemCode}</td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{item.name}</div>
                      <div className="text-xs font-mono text-slate-500">{item.barcode}</div>
                    </td>
                    <td className="p-4 text-center font-mono text-slate-600">{item.invoiceQuantity}</td>
                    <td className="p-4 text-center font-bold font-mono text-slate-800">{item.countedQuantity}</td>
                    <td className={`p-4 text-center font-bold font-mono ${
                      item.difference === 0 ? 'text-brand-green' : item.difference < 0 ? 'text-red-600' : 'text-orange-500'
                    }`}>
                      {item.difference > 0 ? `+${item.difference}` : item.difference}
                    </td>
                    <td className="p-4 text-center">
                      {item.status === 'MATCH' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">OK</span>}
                      {item.status === 'MISSING' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">FALTA</span>}
                      {item.status === 'SURPLUS' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">SOBRA</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extra Items Table */}
      {(filteredExtras.length > 0 || (extraItems.length > 0 && !filter)) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden border-t-4 border-t-orange-400 mb-8">
          <div className="px-6 py-4 border-b border-slate-200 bg-orange-50 flex justify-between items-center">
            <h3 className="font-bold text-orange-900">Itens Não Constantes na Nota (Extras)</h3>
            <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded text-xs font-bold">{extraItems.length} itens</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">Cód. Sistema</th>
                  <th className="p-4 font-semibold">Barras / Produto</th>
                  <th className="p-4 font-semibold text-center">Qtd Contada</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExtras.length === 0 ? (
                   <tr><td colSpan={4} className="p-4 text-center text-slate-400">Nenhum item extra no filtro.</td></tr>
                ) : (
                  filteredExtras.map((item) => (
                    <tr key={item.barcode} className="hover:bg-orange-50 transition-colors">
                      <td className="p-4 font-mono text-sm text-slate-600">{item.systemCode}</td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800">{item.name}</div>
                        <div className="text-xs font-mono text-slate-500">{item.barcode}</div>
                      </td>
                      <td className="p-4 text-center font-bold font-mono text-slate-800">{item.countedQuantity}</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">NÃO PREVISTO</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Area to Reset */}
      <div className="flex justify-center pt-6 border-t border-slate-200">
        <button 
          type="button"
          onClick={handleResetClick}
          className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-6 py-3 rounded-lg flex items-center gap-2 font-bold transition-colors cursor-pointer shadow-sm border border-red-200"
        >
          <TrashIcon className="w-5 h-5" />
          <span>Concluir e Limpar Coleta</span>
        </button>
      </div>
    </div>
  );
};

export default ReportView;