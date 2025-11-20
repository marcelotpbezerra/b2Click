import React, { useState } from 'react';
import { AppLogo, UserIcon, LockIcon } from './Icons';
import { authenticateUser } from '../services/storage';
import { User } from '../types';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const user = authenticateUser(username, password);
    
    if (user) {
      onLogin(user);
    } else {
      setError('Usuário ou senha inválidos.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-brand-black p-8 text-center">
          <div className="w-20 h-20 bg-white rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg">
            <AppLogo className="w-16 h-16" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Validador de <span className="text-brand-green">Nota</span></h1>
          <p className="text-slate-400 mt-2 text-sm">Entre com suas credenciais para acessar</p>
        </div>

        <div className="p-8 pt-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Usuário</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 w-full bg-white rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition-all"
                  placeholder="Digite seu usuário"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 w-full bg-white rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none transition-all"
                  placeholder="Digite sua senha"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-brand-green hover:bg-opacity-90 text-white font-bold py-3 px-6 rounded-lg transition-transform active:scale-95 shadow-md"
            >
              ENTRAR
            </button>
          </form>
        </div>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-xs text-slate-400">Powered by Redesoft &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;