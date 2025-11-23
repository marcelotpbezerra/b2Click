
import React, { useState, useRef } from 'react';
import { InvoiceItem } from '../types';
import { saveInvoiceData, getInvoiceData, clearInvoiceData, parseNFeXML } from '../services/storage';
import { UploadIcon, TrashIcon, ClipboardIcon, FileTextIcon } from './Icons';

interface InvoiceImportViewProps {
  invoiceNumber: string;
  onDataLoaded: () => void;
}

const InvoiceImportView: React.FC<InvoiceImportViewProps> = ({ invoiceNumber, onDataLoaded }) => {
  const [mode, setMode] = useState<'FILE' | 'XML'>('XML');
  const [isDragging, setIsDragging] = useState(false);
  const [existingCount, setExistingCount] = useState(getInvoiceData(invoiceNumber).length);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let items: InvoiceItem[] = [];

        if (mode === 'XML') {
           items = parseNFeXML(content);
        } else {
          // Text/CSV Processing
          const lines = content.split(/\r\n|\n/);
          // Check heuristics for header
          const firstLine = lines[0]?.toLowerCase() || '';
          const hasHeader = firstLine.includes('código') || firstLine.includes('barcode') || firstLine.includes('nome');
          const startIndex = hasHeader ? 1 : 0;

          for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const parts = line.split(/[,;\t]/);
            if (parts.length >= 4) {
              const barcode = parts[0].trim();
              const systemCode = parts[1].trim();
              const name = parts[2].trim();
              const quantityString = parts[3].trim();
              const quantity = parseInt(quantityString, 10);
              
              if ((barcode || systemCode) && name && !isNaN(quantity)) {
                items.push({ barcode, systemCode, name, invoiceQuantity: quantity });
              }
            }
          }
        }

        if (items.length === 0) {
          setMessage({ type: 'error', text: 'Nenhum item válido encontrado no arquivo.' });
          return;
        }

        saveInvoiceData(invoiceNumber, items);
        setExistingCount(items.length);
        setMessage({ type: 'success', text: `Sucesso! ${items.length} itens importados para a nota ${invoiceNumber}.` });
        onDataLoaded();
      } catch (error) {
        setMessage({ type: 'error', text: 'Falha ao processar arquivo. Verifique o formato.' });
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
    if (confirm(`Tem certeza que deseja limpar os dados importados da nota ${invoiceNumber}?`)) {
      clearInvoiceData(invoiceNumber);
      setExistingCount(0);
      setMessage({ type: 'success', text: 'Dados da nota removidos.' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-brand-black">Importar NFe ({invoiceNumber})</h2>
        <p className="text-slate-500 mt-2">Carregue o XML ou arquivo de texto da nota fiscal para validação.</p>
      </div>

      {/* Mode Toggles */}
      <div className="flex justify-center gap-4 mb-6">
         <button 
           onClick={() => setMode('XML')}
           className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${mode === 'XML' ? 'bg-brand-black text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
         >
           Via XML (NFe)
         </button>
         <button 
           onClick={() => setMode('FILE')}
           className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${mode === 'FILE' ? 'bg-brand-black text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
         >
           Via Arquivo (CSV/TXT)
         </button>
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
          accept={mode === 'XML' ? ".xml" : ".csv,.txt"}
          onChange={(e) => e.target.files && processFile(e.target.files[0])}
        />
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-slate-100 rounded-full text-brand-black">
            {mode === 'XML' ? <FileTextIcon className="w-8 h-8" /> : <ClipboardIcon className="w-8 h-8" />}
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-700">
               {mode === 'XML' ? 'Carregar XML da NFe' : 'Carregar CSV/TXT'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {mode === 'XML' ? 'Arquivo padrão de Nota Fiscal Eletrônica' : 'Formato: Barras, Cód. Produto, Nome, Quantidade'}
            </p>
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
          <h3 className="font-semibold text-slate-700">Dados da Nota {invoiceNumber}</h3>
          {existingCount > 0 && (
             <button 
               onClick={handleClear}
               className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
             >
               <TrashIcon className="w-4 h-4" /> Limpar Dados
             </button>
          )}
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Itens Carregados</span>
            <span className="text-2xl font-bold text-brand-green">{existingCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceImportView;
