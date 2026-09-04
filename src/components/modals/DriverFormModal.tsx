import React, { useState, useEffect } from 'react';
import { X, UserCircle2, Save } from 'lucide-react';
import { Driver } from '../../types';

interface DriverFormModalProps {
  driver?: Driver | null;
  onSave: (driver: Omit<Driver, 'id' | 'createdAt'> | Driver) => void;
  onClose: () => void;
}

export const DriverFormModal: React.FC<DriverFormModalProps> = ({
  driver,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnh, setCnh] = useState('');
  const [cnhCategory, setCnhCategory] = useState('D');
  const [cnhExpiration, setCnhExpiration] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (driver) {
      setName(driver.name);
      setCpf(driver.cpf);
      setCnh(driver.cnh);
      setCnhCategory(driver.cnhCategory);
      setCnhExpiration(driver.cnhExpiration);
      setPhone(driver.phone);
      setWhatsapp(driver.whatsapp || '');
      setStatus(driver.status);
      setNotes(driver.notes || '');
    }
  }, [driver]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!cpf.trim()) newErrors.cpf = 'CPF é obrigatório';
    if (!cnh.trim()) newErrors.cnh = 'CNH é obrigatória';
    if (!cnhCategory.trim()) newErrors.cnhCategory = 'Categoria da CNH é obrigatória';
    if (!cnhExpiration.trim()) newErrors.cnhExpiration = 'Validade da CNH é obrigatória';
    if (!phone.trim()) newErrors.phone = 'Telefone é obrigatório';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const driverData = {
      ...(driver && { id: driver.id, createdAt: driver.createdAt }),
      name: name.trim(),
      cpf: cpf.trim(),
      cnh: cnh.trim(),
      cnhCategory: cnhCategory.trim(),
      cnhExpiration: cnhExpiration.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
      status,
      notes: notes.trim() || undefined,
    };

    onSave(driverData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
              <UserCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {driver ? 'Editar Motorista' : 'Cadastrar Motorista'}
              </h2>
              <p className="text-xs text-slate-500">
                Preencha os dados do motorista e da habilitação.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Nome do motorista"
                />
                {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  CPF *
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="000.000.000-00"
                />
                {errors.cpf && <p className="text-xs text-rose-500 mt-1">{errors.cpf}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Telefone *
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="(00) 00000-0000"
                />
                {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  CNH *
                </label>
                <input
                  type="text"
                  value={cnh}
                  onChange={(e) => setCnh(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Número da CNH"
                />
                {errors.cnh && <p className="text-xs text-rose-500 mt-1">{errors.cnh}</p>}
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Categoria *
                </label>
                <select
                  value={cnhCategory}
                  onChange={(e) => setCnhCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                  <option value="AB">AB</option>
                  <option value="AC">AC</option>
                  <option value="AD">AD</option>
                  <option value="AE">AE</option>
                </select>
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Validade CNH *
                </label>
                <input
                  type="date"
                  value={cnhExpiration}
                  onChange={(e) => setCnhExpiration(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                {errors.cnhExpiration && <p className="text-xs text-rose-500 mt-1">{errors.cnhExpiration}</p>}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Observações
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[80px]"
                placeholder="Observações sobre o motorista..."
              />
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              Salvar Motorista
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
