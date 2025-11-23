
import React, { useEffect, useState } from 'react';
import { getActiveSessions } from '../services/storage';
import { InventorySessionSummary } from '../types';
import { ClipboardIcon, SearchIcon } from './Icons';

interface ValidatorDashboardProps {
  onSelectSession: (invoiceNumber: string) => void;
}

const ValidatorDashboard: React.FC<ValidatorDashboardProps> = ({ onSelectSession }) => {
  const [sessions, setSessions] = useState<InventorySessionSummary[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSessions(getActiveSessions());
  }, []);

  const filteredSessions = sessions.filter(s => 
    s.invoiceNumber.includes(search)
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-brand-black mb-2">Painel de Conferência</h2>
        <p className="text-slate-500">Selecione uma nota fiscal ativa para realizar a validação.</p>
      </div>

      <div className="mb-6 relative">
         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-slate-400" />
         </div>
         <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar número da nota..."
            className="pl-10 w-full bg-white border border-slate-300 rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-brand-green outline-none"
         />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filteredSessions.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-400">Nenhuma contagem ativa encontrada.</p>
          </div>
        ) : (
          filteredSessions.map(session => (
            <button
              key={session.invoiceNumber}
              onClick={() => onSelectSession(session.invoiceNumber)}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-brand-green hover:shadow-md transition-all text-left group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 rounded-lg text-brand-green group-hover:bg-brand-green group-hover:text-white transition-colors">
                   <ClipboardIcon className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium text-slate-400">
                  Última ativ.: {new Date(session.lastActivity).toLocaleDateString()}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 mb-1">Nota {session.invoiceNumber}</h3>
              <div className="flex items-center justify-between text-sm text-slate-500">
                 <span>Itens coletados: <strong>{session.totalItemsScanned}</strong></span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default ValidatorDashboard;
