import React, { useState, useEffect, useMemo } from 'react';
import { InventoryLog, ReportItem, InvoiceItem } from '../types';
import { getInventoryLogs, getInvoiceData } from '../services/storage';
import { generateInventoryInsights } from '../services/geminiService';
import { DownloadIcon, SparklesIcon } from './Icons';
import { CSV_HEADERS } from '../constants';

const ReportView: React.FC = () => {
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [filter, setFilter] = useState('');
  
  // AI State
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    setInvoiceItems(getInvoiceData());
    setLogs(getInventoryLogs());
  }, []);

  const reportData = useMemo(() => {
    // Calculate total scanned per barcode
    const scanCounts: Record<string, number> = {};
    logs.forEach(log => {
      scanCounts[log.barcode] = (scanCounts[log.barcode] || 0) + log.quantity;
    });

    // Generate report based ONLY on Invoice Items as per requirement
    const report: ReportItem[] = invoiceItems.map(item => {
      const counted = scanCounts[item.barcode] || 0;
      const diff = counted - item.invoiceQuantity;
      
      let status: ReportItem['status'] = 'MATCH';
      if (diff < 0) status = 'MISSING';
      if (diff > 0) status = 'SURPLUS';

      return {
        barcode: item.barcode,
        name: item.name,
        invoiceQuantity: item.invoiceQuantity,
        countedQuantity: counted,
        difference: diff,
        status
      };
    });

    return report;
  }, [invoiceItems, logs]);

  const filteredData = useMemo(() => {
    return reportData.filter(item => 
      item.name.toLowerCase().includes(filter.toLowerCase()) || 
      item.barcode.includes(filter)
    );
  }, [reportData, filter]);

  const handleExport = () => {
    const csvContent = [
      CSV_HEADERS.join(','),
      ...reportData.map(item => `"${item.barcode}","${item.name}",${item.invoiceQuantity},${item.countedQuantity},${item.difference},${item.status}`)
    ].join('\n');

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
    const discrepancyData = reportData
      .filter(item => item.status !== 'MATCH')
      .map(item => `${item.name}: Nota(${item.invoiceQuantity}) vs Real(${item.countedQuantity})`)
      .join('\n');

    if (!discrepancyData) {
      setAiInsight("Parabéns! Não foram encontradas divergências entre a nota fiscal e a contagem física.");
      setIsGeneratingAi(false);
      return;
    }

    const result = await generateInventoryInsights(reportData); 
    setAiInsight(result);
    setIsGeneratingAi(false);
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
            onClick={handleGenerateInsights}
            disabled={isGeneratingAi || reportData.length === 0}
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
          placeholder="Filtrar por nome ou código..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full md:w-1/3 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Código / Produto</th>
                <th className="p-4 font-semibold text-center">Qtd Nota</th>
                <th className="p-4 font-semibold text-center">Qtd Contada</th>
                <th className="p-4 font-semibold text-center">Diferença</th>
                <th className="p-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    {invoiceItems.length === 0 ? "Nenhuma nota fiscal importada." : "Nenhum item encontrado no filtro."}
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.barcode} className="hover:bg-green-50 transition-colors">
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
    </div>
  );
};

export default ReportView;