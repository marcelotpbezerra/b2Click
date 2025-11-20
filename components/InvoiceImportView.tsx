import React, { useState, useRef } from 'react';
import { InvoiceItem } from '../types';
import { saveInvoiceData, getInvoiceData, clearInvoiceData } from '../services/storage';
import { UploadIcon, TrashIcon, ClipboardIcon } from './Icons';

interface InvoiceImportViewProps {
  onDataLoaded: () => void;
}

const InvoiceImportView: React.FC<InvoiceImportViewProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [existingCount, setExistingCount] = useState(getInvoiceData().length);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r\n|\n/);
        const items: InvoiceItem[] = [];
        
        const startIndex = lines[0]?.toLowerCase().includes('barcode') || lines[0]?.toLowerCase().includes('código') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Support comma, semicolon, tab, or pipe (|)
          const parts = line.split(/[,;\t|]/);
          const validParts = parts.map(p => p.trim()).filter(p => p !== '');

          // Expecting: CODE | NAME | QUANTITY
          if (validParts.length >= 3) {
            const barcode = validParts[0];
            const name = validParts[1];
            const quantity = parseInt(validParts[2], 10);
            
            if (barcode && name && !isNaN(quantity)) {
              items.push({ barcode, name, invoiceQuantity: quantity });
            }
          }
        }

        if (items.length === 0) {
          setMessage({ type: 'error', text: 'Nenhum item válido encontrado. Formato exigido: Código | Nome | Quantidade' });
          return;
        }

        saveInvoiceData(items);
        setExistingCount(items.length);
        setMessage({ type: 'success', text: `Sucesso! ${items.length} itens da nota importados.` });
        onDataLoaded();
      } catch (error) {
        setMessage({ type: 'error', text: 'Falha ao ler arquivo da nota. Tente novamente.' });
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
    if (confirm('Tem certeza que deseja limpar os dados da nota fiscal?')) {
      clearInvoiceData();
      setExistingCount(0);
      setMessage({ type: 'success', text: 'Dados da nota removidos.' });
      onDataLoaded();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-brand-black">Importar Nota Fiscal</h2>
        <p className="text-slate-500 mt-2">
          Carregue o arquivo da nota para comparação. <br/>
          Formato: <code className="bg-slate-100 px-1 rounded text-slate-700">Código | Nome | Quantidade</code>
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
          isDragging ? 'border-brand-black bg-slate-100' : 'border-slate-300 hover:border-brand-black hover:bg-slate-50'
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
          <div className="p-4 bg-slate-800 rounded-full text-white">
            <ClipboardIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-700">Carregar Arquivo da Nota</p>
            <p className="text-sm text-slate-500 mt-1">TXT ou CSV</p>
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
          <h3 className="font-semibold text-slate-700">Status da Nota Fiscal</h3>
          {existingCount > 0 && (
             <button 
               onClick={handleClear}
               className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
             >
               <TrashIcon className="w-4 h-4" /> Limpar Nota
             </button>
          )}
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Itens na Nota</span>
            <span className="text-2xl font-bold text-brand-green">{existingCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceImportView;