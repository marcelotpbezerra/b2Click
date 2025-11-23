
import React, { useState, useEffect, useMemo } from 'react';
import { InventoryLog, ReportItem, InvoiceItem, Product, User } from '../types';
import { getInventoryLogs, getInvoiceData, getStoredProducts, clearInventoryLogs, clearInvoiceData, getUserName, updateInvoiceItemQuantity, updateInvoiceItemFactor } from '../services/storage';
import { generateInventoryInsights } from '../services/geminiService';
import { DownloadIcon, SparklesIcon, TrashIcon, CalculatorIcon } from './Icons';
import { CSV_HEADERS } from '../constants';

interface ExtraItem {
  barcode: string;
  systemCode: string;
  name: string;
  countedQuantity: number;
}

interface ReportViewProps {
  invoiceNumber: string;
  onSessionReset: () => void;
  currentUser: User;
}

const ReportView: React.FC<ReportViewProps> = ({ invoiceNumber, onSessionReset, currentUser }) => {
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState('');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Calculator State
  const [calculatorTarget, setCalculatorTarget] = useState<{ item: ReportItem, value: string } | null>(null);

  useEffect(() => {
    setInvoiceItems(getInvoiceData(invoiceNumber));
    setLogs(getInventoryLogs(invoiceNumber));
    setProducts(getStoredProducts());
  }, [invoiceNumber]);

  const { reportData, extraItems, usersInvolved } = useMemo(() => {
    const scanCounts: Record<string, number> = {};
    const userIds = new Set<string>();

    logs.forEach(log => {
      scanCounts[log.barcode] = (scanCounts[log.barcode] || 0) + log.quantity;
      userIds.add(log.userId);
    });

    const matchedBarcodes = new Set<string>();

    const mainReport: ReportItem[] = invoiceItems.map(item => {
      let counted = 0;
      let matchedBarcode = '';

      if (item.barcode && scanCounts[item.barcode] !== undefined) {
        counted = scanCounts[item.barcode];
        matchedBarcode = item.barcode;
      } 
      else if (!item.barcode && item.systemCode) {
         const productInDb = products.find(p => p.systemCode === item.systemCode);
         if (productInDb && productInDb.barcode && scanCounts[productInDb.barcode] !== undefined) {
            counted = scanCounts[productInDb.barcode];
            matchedBarcode = productInDb.barcode;
         }
      }

      if (matchedBarcode) {
        matchedBarcodes.add(matchedBarcode);
      }

      // Conversion Logic
      const factor = item.conversionFactor || 1;
      const convertedQty = item.invoiceQuantity * factor;

      const diff = counted - convertedQty;
      let status: ReportItem['status'] = 'MATCH';
      if (diff < 0) status = 'MISSING';
      if (diff > 0) status = 'SURPLUS';

      return {
        systemCode: item.systemCode || '-',
        barcode: item.barcode || matchedBarcode || '-', 
        name: item.name,
        invoiceQuantity: item.invoiceQuantity,
        conversionFactor: factor,
        convertedQuantity: convertedQty,
        countedQuantity: counted,
        difference: diff,
        status
      };
    });

    const extras: ExtraItem[] = Object.entries(scanCounts)
      .filter(([barcode]) => !matchedBarcodes.has(barcode))
      .map(([barcode, quantity]) => {
        const knownProduct = products.find(p => p.barcode === barcode);
        return {
          barcode,
          systemCode: knownProduct?.systemCode || '-',
          name: knownProduct ? knownProduct.name : 'Não Cadastrado / Desconhecido',
          countedQuantity: quantity
        };
      });

    return { 
      reportData: mainReport, 
      extraItems: extras,
      usersInvolved: Array.from(userIds).map(getUserName)
    };
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

  const canEdit = currentUser.role === 'ADMIN' || currentUser.role === 'VALIDATOR';

  // Normalize Helper
  const normalize = (val: string) => val === '-' ? '' : val;

  const handleQuantityUpdate = (item: ReportItem, newQuantity: number) => {
    if (isNaN(newQuantity) || newQuantity < 0) return;

    // Revert display value '-' to '' for matching logic, as raw data might be empty string
    const targetSystemCode = normalize(item.systemCode);
    const targetBarcode = normalize(item.barcode);

    updateInvoiceItemQuantity(invoiceNumber, targetSystemCode, targetBarcode, newQuantity);
    
    setInvoiceItems(prev => prev.map(i => {
      const iSystem = i.systemCode || '';
      const iBarcode = i.barcode || '';
      // Use loose matching logic similar to storage service
      if ((targetSystemCode && iSystem === targetSystemCode) || (!targetSystemCode && iBarcode === targetBarcode)) {
         return { ...i, invoiceQuantity: newQuantity };
      }
      return i;
    }));
  };

  const handleFactorUpdate = (item: ReportItem, newFactor: number) => {
    if (isNaN(newFactor) || newFactor <= 0) return;

    const targetSystemCode = normalize(item.systemCode);
    const targetBarcode = normalize(item.barcode);

    updateInvoiceItemFactor(invoiceNumber, targetSystemCode, targetBarcode, newFactor);

    setInvoiceItems(prev => prev.map(i => {
      const iSystem = i.systemCode || '';
      const iBarcode = i.barcode || '';
      if ((targetSystemCode && iSystem === targetSystemCode) || (!targetSystemCode && iBarcode === targetBarcode)) {
         return { ...i, conversionFactor: newFactor };
      }
      return i;
    }));
  };

  const handleCalculatorOpen = (item: ReportItem) => {
    setCalculatorTarget({ item, value: item.invoiceQuantity.toString() });
  };

  const handleCalculatorChange = (val: string) => {
      if (/^[0-9+\-*/.() ]*$/.test(val)) {
          setCalculatorTarget(prev => prev ? { ...prev, value: val } : null);
      }
  };

  const handleCalculatorApply = () => {
    if (!calculatorTarget) return;
    try {
      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + calculatorTarget.value)();
      if (!isNaN(result)) {
         handleQuantityUpdate(calculatorTarget.item, Math.floor(Number(result)));
         setCalculatorTarget(null);
      }
    } catch (e) {
      alert("Expressão inválida");
    }
  };

  const handleExport = () => {
    let csvContent = [
      CSV_HEADERS.join(','),
      ...reportData.map(item => `${item.systemCode},${item.barcode},${item.name},${item.invoiceQuantity},${item.conversionFactor},${item.convertedQuantity},${item.countedQuantity},${item.difference},${item.status}`)
    ].join('\n');

    if (extraItems.length > 0) {
      csvContent += '\n\nITENS FORA DA NOTA\nCód. Sistema,Código,Nome,Quantidade Contada';
      csvContent += '\n' + extraItems.map(item => `${item.systemCode},${item.barcode},${item.name},${item.countedQuantity}`).join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `validacao_nota_${invoiceNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateInsights = async () => {
    setIsGeneratingAi(true);
    let contextData = reportData
      .filter(item => item.status !== 'MATCH')
      .map(item => `${item.name}: Nota(${item.invoiceQuantity} x ${item.conversionFactor} = ${item.convertedQuantity}) vs Real(${item.countedQuantity})`)
      .join('\n');

    if (extraItems.length > 0) {
       contextData += '\nEXTRAS:\n' + extraItems.map(i => `${i.name}: ${i.countedQuantity} un.`).join('\n');
    }

    if (!contextData) {
      setAiInsight("Tudo certo com a nota " + invoiceNumber + "!");
      setIsGeneratingAi(false);
      return;
    }

    const result = await generateInventoryInsights(reportData);
    setAiInsight(result);
    setIsGeneratingAi(false);
  };

  const handleResetClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm(`Deseja encerrar a conferência da nota ${invoiceNumber} e limpar os dados desta sessão?`)) {
      clearInventoryLogs(invoiceNumber);
      clearInvoiceData(invoiceNumber);
      onSessionReset();
    }
  };

  return (
    <div className="max-w-[90rem] mx-auto p-4 md:p-6 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-black">Validação da Nota {invoiceNumber}</h2>
          <p className="text-slate-500 text-sm">Coletado por: {usersInvolved.join(', ') || 'Nenhum usuário'}</p>
        </div>
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={handleGenerateInsights}
            disabled={isGeneratingAi || (reportData.length === 0 && extraItems.length === 0)}
            className="bg-brand-black hover:bg-slate-800 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors"
          >
            {isGeneratingAi ? <span className="animate-pulse">...</span> : <SparklesIcon className="w-5 h-5 text-brand-green" />}
            <span>Análise IA</span>
          </button>
          <button 
            type="button"
            onClick={handleExport}
            className="bg-white border border-slate-300 text-slate-700 hover:bg-green-50 hover:text-brand-green border-brand-green px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors"
          >
            <DownloadIcon className="w-5 h-5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

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

      <div className="mb-4">
        <input
          type="text"
          placeholder="Filtrar..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full md:w-1/3 bg-white px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-green outline-none"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">Itens da Nota Fiscal</h3>
          <span className="text-xs text-slate-400 md:hidden animate-pulse">← Arraste para ver mais →</span>
        </div>
        
        {/* 
           Mobile Table Fix: 
           - max-h-[65vh]: Constraints height to viewport, forcing vertical scroll inside.
           - relative: Context for sticky headers.
        */}
        <div className="overflow-auto max-h-[65vh] relative">
          <table className="w-full min-w-[1000px] text-left border-collapse">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wider">
                <th className="p-3 md:p-4 font-semibold min-w-[200px] bg-slate-50">Produto</th>
                <th className="p-3 md:p-4 font-semibold text-center w-32 bg-slate-50">Qtd Nota</th>
                <th className="p-3 md:p-4 font-semibold text-center w-24 bg-slate-50">Fator</th>
                <th className="p-3 md:p-4 font-semibold text-center bg-slate-100 w-24">Qtd Final</th>
                <th className="p-3 md:p-4 font-semibold text-center w-24 bg-slate-50">Contado</th>
                <th className="p-3 md:p-4 font-semibold text-center w-24 bg-slate-50">Dif</th>
                <th className="p-3 md:p-4 font-semibold text-center w-28 bg-slate-50">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Nenhum dado.</td></tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr key={`${item.barcode}-${idx}`} className="hover:bg-green-50 transition-colors">
                    <td className="p-3 md:p-4">
                      <div className="font-medium text-slate-800 text-sm md:text-base">{item.name}</div>
                      <div className="text-xs font-mono text-slate-500">{item.barcode} | {item.systemCode}</div>
                    </td>
                    <td className="p-3 md:p-4 text-center font-mono text-slate-600">
                      {canEdit ? (
                        <div className="flex items-center justify-center gap-2 relative">
                           <input 
                            key={`qty-${item.invoiceQuantity}`}
                            type="number" 
                            className="w-16 md:w-20 text-center border border-slate-300 rounded px-1 py-1 focus:ring-2 focus:ring-brand-green outline-none bg-white"
                            defaultValue={item.invoiceQuantity}
                            onBlur={(e) => handleQuantityUpdate(item, Number(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                          />
                          <button 
                            onClick={() => handleCalculatorOpen(item)}
                            className="p-1 text-slate-400 hover:text-brand-green hover:bg-green-50 rounded transition-colors"
                            title="Calculadora"
                          >
                             <CalculatorIcon className="w-4 h-4" />
                          </button>
                          
                          {/* Inline Calculator Popover */}
                          {calculatorTarget?.item.barcode === item.barcode && calculatorTarget.item.systemCode === item.systemCode && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white shadow-xl rounded-xl border border-slate-200 z-50 p-3">
                              <div className="mb-2">
                                <input 
                                  type="text" 
                                  value={calculatorTarget.value}
                                  onChange={(e) => handleCalculatorChange(e.target.value)}
                                  className="w-full border border-slate-300 rounded p-2 text-right font-mono text-sm mb-2 focus:border-brand-green outline-none"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if(e.key === 'Enter') handleCalculatorApply();
                                    if(e.key === 'Escape') setCalculatorTarget(null);
                                  }}
                                />
                              </div>
                              <div className="grid grid-cols-4 gap-1 mb-2">
                                {['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'].map(key => (
                                  <button 
                                    key={key}
                                    onClick={() => {
                                      if(key === '=') handleCalculatorApply();
                                      else handleCalculatorChange(calculatorTarget.value + key);
                                    }}
                                    className={`p-2 rounded text-sm font-bold ${key === '=' ? 'bg-brand-green text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                  >
                                    {key}
                                  </button>
                                ))}
                              </div>
                              <div className="flex justify-between">
                                <button onClick={() => setCalculatorTarget(null)} className="text-xs text-red-500 hover:underline">Fechar</button>
                                <button onClick={() => setCalculatorTarget(prev => prev ? {...prev, value: ''} : null)} className="text-xs text-slate-500 hover:underline">Limpar</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        item.invoiceQuantity
                      )}
                    </td>
                    <td className="p-3 md:p-4 text-center">
                       {canEdit ? (
                         <input 
                            key={`fac-${item.conversionFactor}`}
                            type="number"
                            step="0.01"
                            className="w-14 md:w-16 text-center border border-slate-300 rounded px-1 py-1 focus:ring-2 focus:ring-brand-green outline-none bg-white text-sm"
                            defaultValue={item.conversionFactor}
                            onBlur={(e) => handleFactorUpdate(item, Number(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                         />
                       ) : (
                         <span className="text-slate-600">{item.conversionFactor}</span>
                       )}
                    </td>
                    <td className="p-3 md:p-4 text-center font-bold font-mono text-slate-900 bg-slate-100 border-x border-slate-200">
                      {item.convertedQuantity}
                    </td>
                    <td className="p-3 md:p-4 text-center font-bold font-mono text-slate-800">{item.countedQuantity}</td>
                    <td className={`p-3 md:p-4 text-center font-bold font-mono ${item.difference === 0 ? 'text-brand-green' : item.difference < 0 ? 'text-red-600' : 'text-orange-500'}`}>
                      {item.difference > 0 ? `+${item.difference}` : item.difference}
                    </td>
                    <td className="p-3 md:p-4 text-center">
                      {item.status === 'MATCH' && <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">OK</span>}
                      {item.status === 'MISSING' && <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">FALTA</span>}
                      {item.status === 'SURPLUS' && <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">SOBRA</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(filteredExtras.length > 0 || (extraItems.length > 0 && !filter)) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden border-t-4 border-t-orange-400 mb-8">
          <div className="px-6 py-4 border-b border-slate-200 bg-orange-50 flex justify-between items-center">
            <h3 className="font-bold text-orange-900">Itens Extras</h3>
            <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded text-xs font-bold">{extraItems.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wider">
                  <th className="p-3 md:p-4 font-semibold">Produto</th>
                  <th className="p-3 md:p-4 font-semibold text-center">Qtd</th>
                  <th className="p-3 md:p-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExtras.map((item) => (
                  <tr key={item.barcode} className="hover:bg-orange-50 transition-colors">
                    <td className="p-3 md:p-4">
                      <div className="font-medium text-slate-800">{item.name}</div>
                      <div className="text-xs font-mono text-slate-500">{item.barcode}</div>
                    </td>
                    <td className="p-3 md:p-4 text-center font-bold font-mono text-slate-800">{item.countedQuantity}</td>
                    <td className="p-3 md:p-4 text-center">
                      <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">EXTRA</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-center pt-6 border-t border-slate-200">
        <button 
          type="button"
          onClick={handleResetClick}
          className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-6 py-3 rounded-lg flex items-center gap-2 font-bold transition-colors cursor-pointer shadow-sm border border-red-200"
        >
          <TrashIcon className="w-5 h-5" />
          <span>Encerrar Conferência</span>
        </button>
      </div>
    </div>
  );
};

export default ReportView;
