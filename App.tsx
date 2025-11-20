import React, { useState } from 'react';
import { ViewState } from './types';
import UploadView from './components/UploadView';
import InvoiceImportView from './components/InvoiceImportView';
import CollectionView from './components/CollectionView';
import ReportView from './components/ReportView';
import { UploadIcon, BarcodeIcon, FileTextIcon, ClipboardIcon, AppLogo } from './components/Icons';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.COLLECT);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleViewChange = (newView: ViewState) => {
    setView(newView);
    if (newView === ViewState.REPORT || newView === ViewState.COLLECT) {
      setRefreshKey(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <AppLogo className="w-full h-full drop-shadow-sm" />
            </div>
            <span className="font-bold text-xl text-brand-black tracking-tight">
              Validador de <span className="text-brand-green">Nota</span>
            </span>
          </div>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-1">
             <button 
               onClick={() => handleViewChange(ViewState.UPLOAD)}
               className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${view === ViewState.UPLOAD ? 'bg-green-50 text-brand-green' : 'text-slate-600 hover:bg-slate-100 hover:text-brand-black'}`}
             >
               <UploadIcon className="w-4 h-4" /> Base Produtos
             </button>
             <button 
               onClick={() => handleViewChange(ViewState.COLLECT)}
               className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${view === ViewState.COLLECT ? 'bg-green-50 text-brand-green' : 'text-slate-600 hover:bg-slate-100 hover:text-brand-black'}`}
             >
               <BarcodeIcon className="w-4 h-4" /> Coleta Física
             </button>
             <button 
               onClick={() => handleViewChange(ViewState.INVOICE)}
               className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${view === ViewState.INVOICE ? 'bg-green-50 text-brand-green' : 'text-slate-600 hover:bg-slate-100 hover:text-brand-black'}`}
             >
               <ClipboardIcon className="w-4 h-4" /> Importar Nota
             </button>
             <button 
               onClick={() => handleViewChange(ViewState.REPORT)}
               className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${view === ViewState.REPORT ? 'bg-green-50 text-brand-green' : 'text-slate-600 hover:bg-slate-100 hover:text-brand-black'}`}
             >
               <FileTextIcon className="w-4 h-4" /> Relatório Validação
             </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow w-full">
        <div key={refreshKey} className="animate-fade-in">
          {view === ViewState.UPLOAD && <UploadView onDataLoaded={() => handleViewChange(ViewState.COLLECT)} />}
          {view === ViewState.COLLECT && <CollectionView />}
          {view === ViewState.INVOICE && <InvoiceImportView onDataLoaded={() => handleViewChange(ViewState.REPORT)} />}
          {view === ViewState.REPORT && <ReportView />}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-30">
        <div className="flex justify-around items-center h-16">
          <button 
             onClick={() => handleViewChange(ViewState.UPLOAD)}
             className={`flex flex-col items-center justify-center w-full h-full transition-colors ${view === ViewState.UPLOAD ? 'text-brand-green' : 'text-slate-400'}`}
           >
             <UploadIcon className="w-5 h-5" />
             <span className="text-[10px] font-medium mt-1">Base</span>
           </button>
           <button 
             onClick={() => handleViewChange(ViewState.COLLECT)}
             className={`flex flex-col items-center justify-center w-full h-full transition-colors ${view === ViewState.COLLECT ? 'text-brand-green' : 'text-slate-400'}`}
           >
             <BarcodeIcon className="w-5 h-5" />
             <span className="text-[10px] font-medium mt-1">Coleta</span>
           </button>
           <button 
             onClick={() => handleViewChange(ViewState.INVOICE)}
             className={`flex flex-col items-center justify-center w-full h-full transition-colors ${view === ViewState.INVOICE ? 'text-brand-green' : 'text-slate-400'}`}
           >
             <ClipboardIcon className="w-5 h-5" />
             <span className="text-[10px] font-medium mt-1">Nota</span>
           </button>
           <button 
             onClick={() => handleViewChange(ViewState.REPORT)}
             className={`flex flex-col items-center justify-center w-full h-full transition-colors ${view === ViewState.REPORT ? 'text-brand-green' : 'text-slate-400'}`}
           >
             <FileTextIcon className="w-5 h-5" />
             <span className="text-[10px] font-medium mt-1">Validar</span>
           </button>
        </div>
      </div>
    </div>
  );
};

export default App;