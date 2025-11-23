
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, InventoryLog, InvoiceItem } from '../types';
import { getStoredProducts, addInventoryLog, getInventoryLogs, getInvoiceData } from '../services/storage';
import { PlusIcon, SearchIcon, BarcodeIcon, FileTextIcon } from './Icons';

interface CollectionViewProps {
  invoiceNumber: string;
  currentUserId: string;
}

interface ConferenceItem {
  barcode: string;
  systemCode: string;
  name: string;
  invoiceQty: number;
  countedQty: number;
  status: 'PENDING' | 'COMPLETE' | 'OVER';
}

const CollectionView: React.FC<CollectionViewProps> = ({ invoiceNumber, currentUserId }) => {
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState<number | string>(''); 
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [recentLogs, setRecentLogs] = useState<InventoryLog[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProducts(getStoredProducts());
    setInvoiceItems(getInvoiceData(invoiceNumber));
    // Load logs ONLY for this invoice
    const logs = getInventoryLogs(invoiceNumber);
    setRecentLogs(logs.slice(-5).reverse());
    barcodeInputRef.current?.focus();
  }, [invoiceNumber]);

  // Derived state for the Conference List
  const { conferenceList, extraItems } = useMemo(() => {
    const logs = getInventoryLogs(invoiceNumber); // Get fresh logs (or use recentLogs if we updated state correctly, but safer to re-fetch or use context)
    // NOTE: recentLogs is just the last 5. We need all logs for calculating totals.
    // Ideally, we should lift logs state or fetch all here. Let's fetch all inside useMemo or useEffect. 
    // Optimization: Let's fetch all logs in the render cycle or state to ensure accuracy.
    // For now, I'll trust the component re-renders when a log is added and I will update a 'allLogs' state.
    return { conferenceList: [], extraItems: [] }; // Placeholder for the actual calculation below
  }, [recentLogs, invoiceItems, invoiceNumber]); // recentLogs trigger re-render but doesn't hold all data

  // Proper State for All Logs
  const [allLogs, setAllLogs] = useState<InventoryLog[]>([]);

  useEffect(() => {
    setAllLogs(getInventoryLogs(invoiceNumber));
  }, [recentLogs, invoiceNumber]);

  const conferenceData = useMemo(() => {
    const counts: Record<string, number> = {};
    allLogs.forEach(log => {
      counts[log.barcode] = (counts[log.barcode] || 0) + log.quantity;
    });

    const items: ConferenceItem[] = invoiceItems.map(invItem => {
      // Find count by barcode OR systemCode
      let counted = 0;
      if (invItem.barcode && counts[invItem.barcode]) {
        counted = counts[invItem.barcode];
      } else if (invItem.systemCode) {
         // Try to match systemCode to a product in DB to find barcode, or match loosely?
         // Simpler logic: if XML has systemCode, check if we logged a barcode that maps to this systemCode
         // OR, simplified:
         // The collector logs BARCODES. The InvoiceItem might NOT have a barcode (if from XML).
         // So we need to link: Log(Barcode) -> Product(SystemCode) -> InvoiceItem(SystemCode)
         
         // 1. Direct Barcode Match
         if (invItem.barcode && counts[invItem.barcode]) {
           counted = counts[invItem.barcode];
         } else {
           // 2. Indirect match via Products DB
           // Find any logged barcode that belongs to this invoice item's system code
           const productsMatchingSystemCode = products.filter(p => p.systemCode === invItem.systemCode);
           productsMatchingSystemCode.forEach(p => {
             if (counts[p.barcode]) counted += counts[p.barcode];
           });
         }
      }

      let status: ConferenceItem['status'] = 'PENDING';
      if (counted >= invItem.invoiceQuantity) status = 'COMPLETE';
      if (counted > invItem.invoiceQuantity) status = 'OVER';

      return {
        barcode: invItem.barcode,
        systemCode: invItem.systemCode,
        name: invItem.name,
        invoiceQty: invItem.invoiceQuantity,
        countedQty: counted,
        status
      };
    });

    // Find Extras
    const matchedBarcodes = new Set<string>();
    items.forEach(i => {
       if (i.barcode) matchedBarcodes.add(i.barcode);
       // Also add variations from products db
       const p = products.find(p => p.systemCode === i.systemCode);
       if (p) matchedBarcodes.add(p.barcode);
    });

    const extras = Object.entries(counts).filter(([bc]) => !matchedBarcodes.has(bc)).map(([bc, qty]) => {
      const p = products.find(prod => prod.barcode === bc);
      return {
        barcode: bc,
        name: p?.name || 'Desconhecido',
        qty
      };
    });

    // Sort: Pending first, then Complete
    items.sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      return 0;
    });

    return { items, extras };
  }, [allLogs, invoiceItems, products]);

  // Debounce/Effect to find product name as user types barcode
  useEffect(() => {
    if (!barcode) {
      setCurrentProduct(null);
      return;
    }
    // 1. Try Local Products DB
    let found = products.find(p => p.barcode === barcode);
    
    // 2. Try Invoice Items (if imported from XML, they have names)
    if (!found) {
      const invItem = invoiceItems.find(i => i.barcode === barcode);
      if (invItem) {
        found = { barcode: invItem.barcode, systemCode: invItem.systemCode, name: invItem.name };
      }
    }

    setCurrentProduct(found || { barcode, name: 'Produto Desconhecido', systemCode: '-' });
  }, [barcode, products, invoiceItems]);

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (barcode.trim()) {
        quantityInputRef.current?.focus();
      }
    }
  };

  const handleAdd = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const qtyNum = Number(quantity);
    if (!barcode) {
      setError("Por favor insira um código de barras.");
      barcodeInputRef.current?.focus();
      return;
    }
    if (quantity === '' || isNaN(qtyNum) || qtyNum <= 0) {
      setError("Por favor insira uma quantidade válida.");
      quantityInputRef.current?.focus();
      return;
    }

    const newLog = addInventoryLog({
      invoiceNumber, // Link to current invoice
      userId: currentUserId,
      barcode,
      quantity: qtyNum,
      timestamp: Date.now()
    });

    // Update UI
    setRecentLogs(prev => [newLog, ...prev].slice(0, 5));
    // Trigger full logs reload for conference list
    setAllLogs(getInventoryLogs(invoiceNumber));

    setError(null);
    
    // Reset for next scan
    setBarcode('');
    setQuantity('');
    setCurrentProduct(null);
    barcodeInputRef.current?.focus();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24">
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-brand-black">Coleta em Andamento</h1>
          <p className="text-slate-500 text-sm">Nota Fiscal: <span className="font-mono font-bold text-brand-green">{invoiceNumber}</span></p>
        </div>
        {invoiceItems.length > 0 && (
           <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium self-start md:self-auto">
             XML Importado ({invoiceItems.length} itens)
           </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-6">
        <div className="p-6 bg-brand-black text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-green rounded-lg text-white">
               <BarcodeIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Scanear Item</h2>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Active Product Display */}
          <div className={`p-4 rounded-lg border transition-colors ${currentProduct ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
             <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Produto Identificado</p>
             <h3 className={`text-xl font-bold ${currentProduct?.name === 'Produto Desconhecido' ? 'text-orange-600' : 'text-slate-800'}`}>
               {currentProduct ? currentProduct.name : 'Aguardando leitura...'}
             </h3>
             {currentProduct && (
               <p className="text-slate-500 font-mono text-sm mt-1">{currentProduct.barcode}</p>
             )}
          </div>

          <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4">
             <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Código de Barras</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    ref={barcodeInputRef}
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={handleBarcodeKeyDown}
                    className="pl-10 w-full bg-white rounded-lg border-slate-300 border p-3 focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none font-mono text-lg transition-shadow"
                    placeholder="Escaneie aqui..."
                    autoComplete="off"
                  />
                </div>
             </div>

             <div className="w-full md:w-32">
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label>
                <input 
                  ref={quantityInputRef}
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Qtd"
                  className="w-full bg-white rounded-lg border-slate-300 border p-3 focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none font-mono text-lg text-center transition-shadow"
                />
             </div>

             <div className="flex items-end">
               <button 
                 type="submit"
                 className="w-full md:w-auto bg-brand-green hover:bg-opacity-90 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md active:transform active:scale-95"
               >
                 <PlusIcon className="w-5 h-5" />
                 <span>ADICIONAR</span>
               </button>
             </div>
          </form>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-100">{error}</p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-bold text-slate-800 mb-4 px-2 border-l-4 border-brand-green pl-3 flex items-center gap-2">
          <FileTextIcon className="w-5 h-5 text-brand-green" />
          Conferência da Nota
        </h3>
        
        {invoiceItems.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
             <p className="text-slate-500 mb-2">Nenhum dado de nota fiscal importado.</p>
             <p className="text-xs text-slate-400">Apenas o registro livre de coletas está ativo.</p>
             
             {/* Fallback to Recent Activity if no Invoice Data */}
             <div className="mt-6 text-left">
                <h4 className="text-sm font-bold text-slate-700 mb-2">Últimos registros</h4>
                {recentLogs.map((log) => (
                  <div key={log.id} className="py-2 border-b border-slate-100 text-sm flex justify-between">
                     <span>{log.barcode}</span>
                     <span className="font-bold">+{log.quantity}</span>
                  </div>
                ))}
             </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             {/* Progress Header */}
             <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-600">
                  {conferenceData.items.filter(i => i.status === 'COMPLETE' || i.status === 'OVER').length} / {conferenceData.items.length} itens conferidos
                </span>
                <div className="h-2 w-24 bg-slate-200 rounded-full overflow-hidden">
                   <div 
                      className="h-full bg-brand-green transition-all duration-500"
                      style={{ width: `${(conferenceData.items.filter(i => i.status !== 'PENDING').length / conferenceData.items.length) * 100}%` }}
                   ></div>
                </div>
             </div>

             <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
               {conferenceData.items.map((item, idx) => (
                 <div key={idx} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${item.status === 'COMPLETE' ? 'bg-green-50' : item.status === 'OVER' ? 'bg-orange-50' : 'bg-white hover:bg-slate-50'}`}>
                    <div className="flex-1">
                       <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                       <div className="flex gap-2 mt-1">
                          <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">{item.barcode || item.systemCode}</span>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-4 self-end sm:self-auto">
                       <div className="text-right">
                          <span className="block text-xs text-slate-400 uppercase">Contado</span>
                          <span className={`text-lg font-bold font-mono ${item.status === 'PENDING' ? 'text-slate-600' : item.status === 'OVER' ? 'text-orange-600' : 'text-green-600'}`}>
                             {item.countedQty} <span className="text-xs text-slate-400 font-normal">/ {item.invoiceQty}</span>
                          </span>
                       </div>
                       
                       <div className="w-8 flex justify-center">
                          {item.status === 'COMPLETE' && <span className="text-green-500 text-xl">✓</span>}
                          {item.status === 'OVER' && <span className="text-orange-500 font-bold text-xs">SOBRA</span>}
                       </div>
                    </div>
                 </div>
               ))}
             </div>

             {conferenceData.extras.length > 0 && (
               <div className="bg-orange-50 border-t border-orange-200">
                 <div className="px-4 py-2 bg-orange-100 text-orange-800 text-xs font-bold uppercase">
                   Itens Extras (Não constam na nota)
                 </div>
                 {conferenceData.extras.map((extra, idx) => (
                   <div key={idx} className="p-3 border-b border-orange-100 flex justify-between items-center">
                      <div>
                        <div className="text-sm font-bold text-orange-900">{extra.name}</div>
                        <div className="text-xs font-mono text-orange-700">{extra.barcode}</div>
                      </div>
                      <span className="font-bold text-orange-800">+{extra.qty}</span>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionView;
