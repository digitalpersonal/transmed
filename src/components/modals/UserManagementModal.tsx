import React, { useState, useEffect } from 'react';
import { X, UserCheck, Lock, Mail, UserPlus, Shield, Trash2, LogOut, CheckCircle2 } from 'lucide-react';
import { SystemUser } from '../../types';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from '../../lib/supabase';
import { subscribeToUsers, upsertUserFirestore, deleteUserFirestore } from '../../lib/supabaseSync';
import { createClient } from '@supabase/supabase-js';
import config from '../../lib/supabase-config.json';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [email, setEmail] = useState('digitalpersonal@gmail.com');
  const [password, setPassword] = useState('Mld3602#?+');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'operator'>('operator');
  const [newPassword, setNewPassword] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    const unsubscribeUsers = subscribeToUsers(setSystemUsers);
    return () => {
      unsubscribeAuth();
      unsubscribeUsers();
    };
  }, []);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      showToast('Login de Administrador realizado com sucesso!');
    } catch (err: any) {
      console.error('Login error:', err);
      const errMsg = err.message || String(err);
      
      if (errMsg.includes('Email not confirmed')) {
        setAuthError(
          'Este e-mail ainda não está confirmado. IMPORTANTE: Vá no seu painel do Supabase > Authentication > Providers > Email e DESATIVE a opção "Confirm email" para conseguir logar imediatamente sem confirmação!'
        );
        showToast('Confirmação de e-mail pendente no Supabase.', 'error');
        setIsLoggingIn(false);
        return;
      }

      if (errMsg.includes('Invalid login credentials') && email.trim() === 'digitalpersonal@gmail.com') {
        // Fallback or attempt auto-creation
        try {
          await createUserWithEmailAndPassword(auth, email.trim(), password);
          showToast('Conta de Administrador criada e logada com sucesso!');
          setIsLoggingIn(false);
          return;
        } catch (createErr: any) {
          console.error('Fallback create error:', createErr);
          const createErrMsg = createErr.message || String(createErr);
          if (createErrMsg.includes('security purposes') || createErrMsg.includes('50 seconds') || createErrMsg.includes('rate limit')) {
            setAuthError(
              'As credenciais são inválidas. Tentei criar a conta padrão automaticamente, mas o Supabase bloqueou temporariamente por limite de tempo. Por favor, crie o usuário digitalpersonal@gmail.com manualmente no console do Supabase (Authentication > Add User)!'
            );
            showToast('Aguarde para tentar novamente ou crie no painel.', 'error');
            setIsLoggingIn(false);
            return;
          }
          if (createErrMsg.includes('Email not confirmed')) {
            setAuthError(
              'A conta de administrador foi pré-criada, mas requer confirmação. IMPORTANTE: Vá no console do Supabase > Authentication > Providers > Email e DESATIVE a opção "Confirm email" para logar!'
            );
            showToast('Desative a confirmação de e-mail no Supabase.', 'warning');
            setIsLoggingIn(false);
            return;
          }
        }
      }
      
      setAuthError(`Erro ao autenticar: ${errMsg}. Verifique as credenciais ou se o usuário existe no Supabase.`);
      showToast('Erro de autenticação.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast('Sessão encerrada.', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim() || !newPassword.trim()) {
      showToast('Preencha todos os campos do novo usuário.', 'error');
      return;
    }

    try {
      // Create a secondary Supabase client so the logged-in admin is not signed out
      const secondarySupabase = createClient(config.supabaseUrl, config.supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
      
      // Create user in secondary auth
      const { data, error } = await secondarySupabase.auth.signUp({
        email: newEmail.trim(),
        password: newPassword,
      });
      if (error) throw error;

      // Save in users table
      const newUser: SystemUser = {
        id: `usr-${Date.now()}`,
        email: newEmail.trim(),
        name: newName.trim(),
        role: newRole,
        createdAt: new Date().toISOString(),
      };
      await upsertUserFirestore(newUser);
      showToast(`Usuário ${newName} cadastrado com sucesso!`);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || String(err);
      if (errMsg.includes('security purposes') || errMsg.includes('50 seconds') || errMsg.includes('rate limit')) {
        errMsg = 'O Supabase limita a criação de novos acessos por e-mail a 1 por minuto por segurança. Por favor, aguarde 50 segundos ou crie este usuário manualmente no console do Supabase (Authentication > Users > Add User).';
      } else if (errMsg.includes('Email not confirmed')) {
        errMsg = 'O usuário foi registrado, mas precisa confirmar o e-mail. Para evitar isso, desative "Confirm email" nas configurações do seu Supabase > Authentication > Providers > Email.';
      }
      showToast(`Erro ao criar usuário: ${errMsg}`, 'error');
    }
  };

  const isAdmin = currentUser?.email === 'digitalpersonal@gmail.com' || systemUsers.some(u => u.email === currentUser?.email && u.role === 'admin');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-emerald-300" />
            <div>
              <h3 className="font-bold text-lg">Controle de Acesso e Administradores</h3>
              <p className="text-xs text-emerald-200">Gerenciamento de credenciais e usuários do TFD</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!currentUser ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4 max-w-md mx-auto py-4">
              <div className="text-center mb-6">
                <h4 className="font-bold text-slate-800 text-base">Identificação de Administrador</h4>
                <p className="text-xs text-slate-500 mt-1">Entre com as credenciais administrativas do sistema</p>
              </div>

              {authError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs">
                  {authError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail do Administrador</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    placeholder="digitalpersonal@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Senha de Acesso</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-800/20 flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                {isLoggingIn ? 'Autenticando...' : 'Entrar como Administrador'}
              </button>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 mt-4">
                <strong>Nota:</strong> Credenciais padrão pré-configuradas:<br/>
                • E-mail: <code>digitalpersonal@gmail.com</code><br/>
                • Senha: <code>Mld3602#?+</code>
              </div>
            </form>
          ) : (
            /* Logged In Dashboard / User Management */
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    {currentUser.email?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Logado como:</div>
                    <div className="font-bold text-slate-900 text-sm">{currentUser.email}</div>
                    <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Sessão Ativa de Administrador
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>

              {/* Register New User Form */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm">
                <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-600" /> Cadastrar Novo Usuário / Operador
                </h4>
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Ex: Maria da Silva"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">E-mail de Acesso</label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="operador@saude.gov.br"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Senha Inicial</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nível de Permissão</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
                    >
                      <option value="operator">Operador / Atendente TFD</option>
                      <option value="admin">Administrador Geral</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 pt-1">
                    <button
                      type="submit"
                      className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Cadastrar Usuário no Sistema
                    </button>
                  </div>
                </form>
              </div>

              {/* Users List */}
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-2">Usuários Autorizados no Sistema</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <th className="py-2.5 px-3">Nome</th>
                        <th className="py-2.5 px-3">E-mail</th>
                        <th className="py-2.5 px-3">Função</th>
                        <th className="py-2.5 px-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {systemUsers.map((usr) => (
                        <tr key={usr.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-medium text-slate-900">{usr.name}</td>
                          <td className="py-2.5 px-3 text-slate-600">{usr.email}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                              usr.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {usr.role === 'admin' ? 'Administrador' : 'Operador'}
                            </span>
                          </td>
                           <td className="py-2.5 px-3 text-right">
                            {usr.email !== 'digitalpersonal@gmail.com' && (
                              deletingUserId === usr.id ? (
                                <div className="flex items-center gap-1.5 justify-end animate-in fade-in slide-in-from-right-2 duration-150">
                                  <span className="text-[10px] text-rose-600 font-bold">Excluir?</span>
                                  <button
                                    onClick={async () => {
                                      await deleteUserFirestore(usr.id);
                                      showToast('Usuário removido.', 'info');
                                      setDeletingUserId(null);
                                    }}
                                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[10px] cursor-pointer"
                                  >
                                    Sim
                                  </button>
                                  <button
                                    onClick={() => setDeletingUserId(null)}
                                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-[10px] cursor-pointer"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeletingUserId(usr.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                  title="Remover usuário"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
