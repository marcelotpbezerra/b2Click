import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { saveProducts, getStoredProducts, clearProducts } from '../services/storage';
import { UploadIcon, TrashIcon } from './Icons';

interface UploadViewProps {
  onDataLoaded: () => void;
}

const UploadView: React.FC<UploadViewProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [existingCount, setExistingCount] = useState(getStoredProducts().length);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r\n|\n/);
        const products: Product[] = [];
        
        // Skip header if it exists (heuristic check)
        const firstLine = lines[0]?.toLowerCase() || '';
        const startIndex = (firstLine.includes('barcode') || firstLine.includes('código') || firstLine.includes('sistema')) ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Support comma, semicolon, or tab (Removed pipe | to strictly follow request)
          const parts = line.split(/[,;\t]/);
          const validParts = parts.map(p => p.trim()).filter(p => p !== '');

          // Expecting: BARCODE, SYSTEM_CODE, NAME
          if (validParts.length >= 3) {
            const barcode = validParts[0];
            const systemCode = validParts[1];
            // Join the rest back in case name has commas, though simple split is limited. 
            // ideally use a CSV parser lib, but for this simple logic:
            const name = validParts.slice(2).join(', '); 
            
            if (barcode && name) {
              products.push({ barcode, systemCode, name });
            }
          } else if (validParts.length === 2) {
            // Fallback for old format: BARCODE, NAME (System Code becomes empty)
            const barcode = validParts[0];
            const name = validParts[1];
            if (barcode && name) {
              products.push({ barcode, systemCode: '-', name });
            }
          }
        }

        if (products.length === 0) {
          setMessage({ type: 'error', text: 'Nenhum produto válido encontrado. Verifique o formato: Código Barras, Cód. Sistema, Nome' });
          return;
        }

        saveProducts(products);
        setExistingCount(products.length);
        setMessage({ type: 'success', text: `Sucesso! ${products.length} produtos importados.` });
        onDataLoaded();
      } catch (error) {
        setMessage({ type: 'error', text: 'Falha ao ler arquivo. Tente novamente.' });
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleClear = () => {
    if (confirm('Tem certeza que deseja apagar a base de produtos existente?')) {
      clearProducts();
      setExistingCount(0);
      setMessage({ type: 'success', text: 'Base de dados limpa.' });
      // We don't necessarily navigate away, just show it's empty
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-brand-black">Carregar Base de Produtos</h2>
        <p className="text-slate-500 mt-2">
          Carregue o arquivo com a lista de produtos para validação.
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
          isDragging ? 'border-brand-green bg-green-50' : 'border-slate-300 hover:border-brand-green hover:bg-slate-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".csv,.txt"
          onChange={(e) => e.target.files && processFile(e.target.files[0])}
        />
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-green-50 rounded-full text-brand-green">
            <UploadIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-700">Clique para carregar ou arraste e solte</p>
            <p className="text-sm text-slate-500 mt-1">Formato: Código Barras, Cód. Sistema, Nome</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`mt-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-semibold text-slate-700">Status da Base de Dados</h3>
          {existingCount > 0 && (
             <button 
               onClick={handleClear}
               className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
             >
               <TrashIcon className="w-4 h-4" /> Limpar Base
             </button>
          )}
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Total de Produtos Carregados</span>
            <span className="text-2xl font-bold text-brand-black">{existingCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadView;