
import React, { useState, useEffect, useRef } from 'react';
import { BarcodeIcon, ClipboardIcon, FileTextIcon } from './Icons';
import { getActiveSessions, parseNFeXML, getInvoiceNumberFromXML, saveInvoiceData } from '../services/storage';
import { InventorySessionSummary } from '../types';

interface CollectorDashboardProps {
  onStartCollection: (invoiceNumber: string) => void;
}

const CollectorDashboard: React.FC<CollectorDashboardProps> = ({ onStartCollection }) => {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [recentSessions, setRecentSessions] = useState<InventorySessionSummary[]>([]);
  const [xmlError, setXmlError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load active sessions to allow resuming
    setRecentSessions(getActiveSessions());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invoiceNumber.trim()) {
      onStartCollection(invoiceNumber.trim());
    }
  };

  const handleXmlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setXmlError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        
        // 1. Extract Invoice Number
        const extractedNumber = getInvoiceNumberFromXML(content);
        if (!extractedNumber) {
          setXmlError('Não foi possível identificar o número da nota no XML.');
          return;
        }

        // 2. Parse Items
        const items = parseNFeXML(content);
        if (items.length === 0) {
          setXmlError('Nenhum item encontrado no XML.');
          return;
        }

        // 3. Save Data and Start
        saveInvoiceData(extractedNumber, items);
        onStartCollection(extractedNumber);

      } catch (err) {
        setXmlError('Erro ao processar o arquivo XML.');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-md mx-auto p-6 pt-8">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center mb-8">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-green">
          <BarcodeIcon className="w-8 h-8" />
        </div>
        
        <h2 className="text-2xl font-bold text-brand-black mb-2">Nova Coleta</h2>
        <p className="text-slate-500 mb-6">
          Informe o número da nota ou importe o XML para iniciar.
        </p>

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="mb-4 text-left">
            <label className="block text-sm font-medium text-slate-700 mb-2">Número da Nota</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full bg-white rounded-xl border-2 border-slate-200 p-4 text-center text-xl font-mono tracking-widest focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition-all"
              placeholder="000000"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-brand-green hover:bg-opacity-90 text-white font-bold py-4 px-6 rounded-xl shadow-md transition-transform active:scale-95 mb-4"
          >
            INICIAR MANUALMENTE
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">OU</span>
            </div>
          </div>

          <div className="mt-4">
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden"
              accept=".xml"
              onChange={handleXmlUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-brand-black hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl shadow-sm flex items-center justify-center gap-2"
            >
              <FileTextIcon className="w-5 h-5" />
              <span>IMPORTAR XML DA NOTA</span>
            </button>
            {xmlError && (
              <p className="text-red-500 text-xs mt-2">{xmlError}</p>
            )}
          </div>
        </form>
      </div>

      {recentSessions.length > 0 && (
        <div className="animate-fade-in">
          <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-3 px-2">Retomar Coleta</h3>
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <button
                key={session.invoiceNumber}
                onClick={() => onStartCollection(session.invoiceNumber)}
                className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-brand-green hover:shadow-md transition-all text-left group flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg text-slate-400 group-hover:bg-blue-50 group-hover:text-brand-green transition-colors">
                    <ClipboardIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">Nota {session.invoiceNumber}</h4>
                    <p className="text-xs text-slate-500">
                      {session.totalItemsScanned} itens coletados
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                   {new Date(session.lastActivity).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectorDashboard;
