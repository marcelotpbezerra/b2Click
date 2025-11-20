import React, { useState, useEffect, useRef } from 'react';
import { Product, InventoryLog } from '../types';
import { getStoredProducts, addInventoryLog, getInventoryLogs } from '../services/storage';
import { PlusIcon, SearchIcon, BarcodeIcon } from './Icons';

const CollectionView: React.FC = () => {
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState<number | string>(''); // Starts empty
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [recentLogs, setRecentLogs] = useState<InventoryLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProducts(getStoredProducts());
    // Load last 5 logs for display
    const logs = getInventoryLogs();
    setRecentLogs(logs.slice(-5).reverse());
    barcodeInputRef.current?.focus();
  }, []);

  // Debounce/Effect to find product name as user types barcode
  useEffect(() => {
    if (!barcode) {
      setCurrentProduct(null);
      return;
    }
    const found = products.find(p => p.barcode === barcode);
    setCurrentProduct(found || { barcode, name: 'Produto Desconhecido', systemCode: '-' });
  }, [barcode, products]);

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (barcode.trim()) {
        // Jump to quantity field instead of submitting
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
      barcode,
      quantity: qtyNum,
      timestamp: Date.now()
    });

    // Update UI
    setRecentLogs(prev => [newLog, ...prev].slice(0, 5));
    setError(null);
    
    // Reset for next scan
    setBarcode('');
    setQuantity(''); // Reset to empty
    setCurrentProduct(null);
    barcodeInputRef.current?.focus();
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-6">
        {/* Header - Uses Brand Black */}
        <div className="p-6 bg-brand-black text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-green rounded-lg text-white">
               <BarcodeIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Coleta de Dados</h2>
              <p className="text-slate-300 text-sm">Escaneie o código, digite a quantidade e confirme</p>
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

      {/* Recent Activity */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-slate-800 mb-4 px-2 border-l-4 border-brand-green pl-3">Atividade Recente</h3>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
          {recentLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 italic">Nenhum item escaneado ainda.</div>
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-semibold text-slate-800">
                    {products.find(p => p.barcode === log.barcode)?.name || 'Produto Desconhecido'}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">{log.barcode}</p>
                </div>
                <div className="flex items-center gap-2">
                   <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-sm">
                     +{log.quantity}
                   </span>
                   <span className="text-xs text-slate-400">
                     {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CollectionView;