
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { getUsers, saveUser, deleteUser, checkUsernameExists } from '../services/storage';
import { PlusIcon, TrashIcon, LockIcon, UserIcon, SettingsIcon } from './Icons';

interface AdminPanelProps {
  currentUser: User;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'COLLECTOR' as UserRole,
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setUsers(getUsers());
  };

  const handleOpenModal = (user?: User) => {
    setFormError('');
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        username: user.username,
        password: user.password, 
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        username: '',
        password: '',
        role: 'COLLECTOR',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleDelete = (userToDelete: User) => {
    if (userToDelete.id === currentUser.id) {
      alert("Você não pode excluir seu próprio usuário.");
      return;
    }

    if (confirm(`Tem certeza que deseja excluir o usuário ${userToDelete.username}?`)) {
      deleteUser(userToDelete.id);
      loadUsers();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || !formData.username || !formData.password) {
      setFormError("Todos os campos obrigatórios devem ser preenchidos.");
      return;
    }

    const isUsernameTaken = checkUsernameExists(formData.username, editingUser?.id);
    if (isUsernameTaken) {
      setFormError("Este nome de usuário já está em uso.");
      return;
    }

    const userToSave: User = {
      id: editingUser ? editingUser.id : crypto.randomUUID(),
      name: formData.name,
      username: formData.username,
      password: formData.password,
      role: formData.role,
    };

    saveUser(userToSave);
    loadUsers();
    handleCloseModal();
  };

  return (
    <div className="max-w-5xl mx-auto p-6 pb-24">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-brand-black flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" /> Gestão de Usuários
          </h2>
          <p className="text-slate-500">Adicione, remova ou altere as permissões de acesso.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-brand-green hover:bg-opacity-90 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 shadow-sm transition-all"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Novo Usuário</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-brand-black text-white text-sm uppercase tracking-wider">
              <th className="p-4 font-semibold">Nome</th>
              <th className="p-4 font-semibold">Usuário</th>
              <th className="p-4 font-semibold">Função</th>
              <th className="p-4 font-semibold text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  {user.name}
                  {user.id === currentUser.id && <span className="text-xs bg-green-100 text-brand-green px-2 py-0.5 rounded-full ml-2">Você</span>}
                </td>
                <td className="p-4 text-slate-600 font-mono text-sm">{user.username}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 
                    user.role === 'VALIDATOR' ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role === 'ADMIN' ? 'Admin' : user.role === 'VALIDATOR' ? 'Conferente' : 'Coletor'}
                  </span>
                </td>
                <td className="p-4 flex justify-center gap-2">
                  <button
                    onClick={() => handleOpenModal(user)}
                    className="p-2 text-slate-500 hover:text-brand-black hover:bg-slate-100 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <LockIcon className="w-4 h-4" />
                  </button>
                  {user.id !== currentUser.id && (
                    <button
                      onClick={() => handleDelete(user)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="bg-brand-black px-6 py-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-brand-green outline-none"
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome de Usuário *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full bg-white rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-brand-green outline-none"
                  placeholder="Ex: jsilva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha *</label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-white rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-brand-green outline-none font-mono"
                  placeholder="Digite a senha"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Função (Role)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                  className="w-full bg-white rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-brand-green outline-none"
                >
                  <option value="COLLECTOR">Coletor (Apenas Scan)</option>
                  <option value="VALIDATOR">Conferente (Audit e XML)</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              {formError && (
                <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{formError}</p>
              )}

              <div className="flex gap-3 mt-6 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-slate-100 text-slate-700 font-semibold py-2.5 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-green text-white font-bold py-2.5 rounded-lg hover:bg-opacity-90 transition-colors shadow-md"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
