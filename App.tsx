
import React, { useState, useEffect } from 'react';
import { ViewState, User } from './types';
import UploadView from './components/UploadView';
import InvoiceImportView from './components/InvoiceImportView';
import CollectionView from './components/CollectionView';
import ReportView from './components/ReportView';
import LoginView from './components/LoginView';
import AdminPanel from './components/AdminPanel';
import CollectorDashboard from './components/CollectorDashboard';
import ValidatorDashboard from './components/ValidatorDashboard';
import { UploadIcon, BarcodeIcon, FileTextIcon, ClipboardIcon, AppLogo, LogoutIcon, SettingsIcon, SearchIcon } from './components/Icons';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD_COLLECTOR);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // New Global State: Active Invoice Number
  const [activeInvoiceNumber, setActiveInvoiceNumber] = useState<string | null>(null);

  useEffect(() => {
    const sessionUser = sessionStorage.getItem('sim_session_user');
    if (sessionUser) {
      const user = JSON.parse(sessionUser);
      handleLogin(user);
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('sim_session_user', JSON.stringify(user));
    
    // Route based on Role
    if (user.role === 'ADMIN') {
      setView(ViewState.DASHBOARD_VALIDATOR);
    } else if (user.role === 'VALIDATOR') {
      setView(ViewState.DASHBOARD_VALIDATOR);
    } else {
      setView(ViewState.DASHBOARD_COLLECTOR);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveInvoiceNumber(null);
    sessionStorage.removeItem('sim_session_user');
  };

  const handleViewChange = (newView: ViewState) => {
    setView(newView);
    setRefreshKey(prev => prev + 1);
  };

  // --- Flow Handlers ---

  // Collector sets an invoice number
  const handleStartCollection = (invoiceNumber: string) => {
    setActiveInvoiceNumber(invoiceNumber);
    handleViewChange(ViewState.COLLECT);
  };

  const handleChangeInvoice = () => {
    setActiveInvoiceNumber(null);
    // Force return to the Collector Dashboard to enter a new number
    handleViewChange(ViewState.DASHBOARD_COLLECTOR);
  };

  // Validator selects a session
  const handleSelectSession = (invoiceNumber: string) => {
    setActiveInvoiceNumber(invoiceNumber);
    handleViewChange(ViewState.INVOICE); // Validator starts by seeing Invoice import screen or straight to report if exists
  };

  const handleValidatorDone = () => {
     setActiveInvoiceNumber(null);
     handleViewChange(ViewState.DASHBOARD_VALIDATOR);
  };

  // If not logged in
  if (!currentUser) {
    return <LoginView onLogin={handleLogin} />;
  }

  const NavButton = ({ icon: Icon, label, targetView, onClick, active }: any) => {
    const isActive = active || view === targetView;
    return (
      <button 
        onClick={onClick ? onClick : () => handleViewChange(targetView)} 
        className={`flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-brand-green' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <Icon className={`w-6 h-6 mb-1 ${isActive ? 'scale-110' : ''} transition-transform`} />
        <span className="text-[10px] font-medium leading-none">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <AppLogo className="w-full h-full drop-shadow-sm" />
            </div>
            <span className="font-bold text-xl text-brand-black tracking-tight">
              Nota <span className="text-brand-green">Certa</span>
            </span>
            {currentUser.role !== 'ADMIN' && (
               <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full uppercase font-bold tracking-wide hidden sm:inline-block">
                 {currentUser.role === 'VALIDATOR' ? 'Conferente' : 'Coletor'}
               </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex gap-1">
              
              {/* Links available to ADMIN and VALIDATOR */}
              {(currentUser.role === 'ADMIN' || currentUser.role === 'VALIDATOR') && (
                <>
                  <button onClick={() => handleViewChange(ViewState.UPLOAD)} className={`px-3 py-2 text-sm font-medium hover:text-brand-black ${view === ViewState.UPLOAD ? 'text-brand-green font-bold' : 'text-slate-600'}`}>
                    Base Produtos
                  </button>
                  <button onClick={() => handleViewChange(ViewState.DASHBOARD_VALIDATOR)} className={`px-3 py-2 text-sm font-medium hover:text-brand-black ${view === ViewState.DASHBOARD_VALIDATOR ? 'text-brand-green font-bold' : 'text-slate-600'}`}>
                    Conferência
                  </button>
                  {/* Validators/Admins can also access Collection Dashboard if needed */}
                  <button onClick={() => handleViewChange(ViewState.DASHBOARD_COLLECTOR)} className={`px-3 py-2 text-sm font-medium hover:text-brand-black ${view === ViewState.DASHBOARD_COLLECTOR ? 'text-brand-green font-bold' : 'text-slate-600'}`}>
                    Coleta
                  </button>
                </>
              )}

              {/* Links exclusively for ADMIN */}
              {currentUser.role === 'ADMIN' && (
                <button onClick={() => handleViewChange(ViewState.ADMIN)} className={`px-3 py-2 text-sm font-medium hover:text-brand-black ${view === ViewState.ADMIN ? 'text-brand-green font-bold' : 'text-slate-600'}`}>
                  Usuários
                </button>
              )}

              {/* Workflow Specific Links (Active Invoice) */}
              {(currentUser.role === 'VALIDATOR' || currentUser.role === 'ADMIN') && activeInvoiceNumber && (
                 <>
                   <div className="h-6 w-px bg-slate-200 mx-2"></div>
                   <button onClick={() => handleViewChange(ViewState.INVOICE)} className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${view === ViewState.INVOICE ? 'bg-blue-50 text-brand-green' : 'text-slate-600'}`}>
                      <ClipboardIcon className="w-4 h-4" /> Dados NFe
                   </button>
                   <button onClick={() => handleViewChange(ViewState.REPORT)} className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${view === ViewState.REPORT ? 'bg-blue-50 text-brand-green' : 'text-slate-600'}`}>
                      <FileTextIcon className="w-4 h-4" /> Validação
                   </button>
                 </>
              )}
              
              {/* Helper Text */}
              {currentUser.role === 'VALIDATOR' && !activeInvoiceNumber && view === ViewState.DASHBOARD_VALIDATOR && (
                 <span className="text-sm text-slate-400 italic ml-2">Selecione uma nota abaixo</span>
              )}

              {currentUser.role === 'COLLECTOR' && activeInvoiceNumber && (
                <button onClick={handleChangeInvoice} className="text-sm text-slate-500 hover:text-brand-black ml-2 bg-slate-100 px-3 py-1 rounded-md transition-colors">
                   Trocar Nota
                </button>
              )}
            </nav>

            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700 hidden sm:block">{currentUser.name}</span>
              <button onClick={handleLogout} className="text-slate-500 hover:text-red-600 p-2 rounded-full hover:bg-slate-100" title="Sair">
                <LogoutIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full mb-16 md:mb-0">
        <div key={refreshKey} className="animate-fade-in">
          
          {/* Admin Views */}
          {view === ViewState.ADMIN && currentUser.role === 'ADMIN' && (
             <AdminPanel currentUser={currentUser} />
          )}
          {view === ViewState.UPLOAD && (currentUser.role === 'ADMIN' || currentUser.role === 'VALIDATOR') && (
             <UploadView onDataLoaded={() => {}} />
          )}

          {/* Collector Views */}
          {view === ViewState.DASHBOARD_COLLECTOR && (
             <CollectorDashboard onStartCollection={handleStartCollection} />
          )}
          {view === ViewState.COLLECT && activeInvoiceNumber && (
             <CollectionView invoiceNumber={activeInvoiceNumber} currentUserId={currentUser.id} />
          )}

          {/* Validator Views */}
          {view === ViewState.DASHBOARD_VALIDATOR && (
             <ValidatorDashboard onSelectSession={handleSelectSession} />
          )}
          {view === ViewState.INVOICE && activeInvoiceNumber && (
             <InvoiceImportView invoiceNumber={activeInvoiceNumber} onDataLoaded={() => handleViewChange(ViewState.REPORT)} />
          )}
          {view === ViewState.REPORT && activeInvoiceNumber && (
             <ReportView 
                invoiceNumber={activeInvoiceNumber} 
                onSessionReset={handleValidatorDone} 
                currentUser={currentUser}
             />
          )}

        </div>
      </main>

      {/* Bottom Navigation Bar (Mobile Only) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         <div className="flex justify-around items-center h-16 px-2">
            
            {activeInvoiceNumber ? (
              // --- WORKFLOW MODE (Inside an Invoice) ---
              <>
                {/* Common: Back/Exit */}
                <NavButton 
                  icon={LogoutIcon} 
                  label={currentUser.role === 'COLLECTOR' ? "Trocar Nota" : "Sair Nota"} 
                  onClick={currentUser.role === 'COLLECTOR' ? handleChangeInvoice : handleValidatorDone} 
                />
                
                {/* Validator/Admin: Invoice Data */}
                {(currentUser.role === 'VALIDATOR' || currentUser.role === 'ADMIN') && (
                  <NavButton icon={ClipboardIcon} label="NFe" targetView={ViewState.INVOICE} />
                )}

                {/* Common: Collection/Scan */}
                <NavButton icon={BarcodeIcon} label="Coletar" targetView={ViewState.COLLECT} />

                {/* Validator/Admin: Report */}
                {(currentUser.role === 'VALIDATOR' || currentUser.role === 'ADMIN') && (
                  <NavButton icon={FileTextIcon} label="Validar" targetView={ViewState.REPORT} />
                )}
              </>
            ) : (
              // --- DASHBOARD MODE (Global Navigation) ---
              <>
                 {/* Admin/Validator: Check Dashboard */}
                 {(currentUser.role === 'ADMIN' || currentUser.role === 'VALIDATOR') && (
                    <NavButton icon={SearchIcon} label="Conf." targetView={ViewState.DASHBOARD_VALIDATOR} />
                 )}

                 {/* Admin/Validator: Products Base */}
                 {(currentUser.role === 'ADMIN' || currentUser.role === 'VALIDATOR') && (
                    <NavButton icon={UploadIcon} label="Prods" targetView={ViewState.UPLOAD} />
                 )}

                 {/* All: Collection Dashboard */}
                 <NavButton icon={BarcodeIcon} label="Coleta" targetView={ViewState.DASHBOARD_COLLECTOR} />

                 {/* Admin: Users */}
                 {currentUser.role === 'ADMIN' && (
                    <NavButton icon={SettingsIcon} label="Admin" targetView={ViewState.ADMIN} />
                 )}
                 
                 {/* All: Logout */}
                 <NavButton icon={LogoutIcon} label="Sair" onClick={handleLogout} />
              </>
            )}
         </div>
      </div>
    </div>
  );
};

export default App;
