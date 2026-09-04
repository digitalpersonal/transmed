import React, { useState, useMemo } from 'react';
import { UserCircle2, Plus, Edit3, Trash2, Phone, Search, FileBadge } from 'lucide-react';
import { Driver } from '../types';

interface DriversViewProps {
  drivers: Driver[];
  onOpenNewDriverModal: () => void;
  onEditDriver: (driver: Driver) => void;
  onDeleteDriver: (driverId: string) => void;
}

export const DriversView: React.FC<DriversViewProps> = ({
  drivers,
  onOpenNewDriverModal,
  onEditDriver,
  onDeleteDriver,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredDrivers = useMemo(() => drivers.filter((d) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const cleanDigits = term.replace(/\D/g, '');
    return (
      (d.name || '').toLowerCase().includes(term) ||
      (cleanDigits && (d.cpf || '').includes(cleanDigits)) ||
      (cleanDigits && (d.cnh || '').includes(cleanDigits))
    );
  }), [drivers, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Motoristas (TFD)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastro de motoristas para atribuição em viagens de transporte sanitário
          </p>
        </div>

        <button
          id="btn-drivers-new"
          onClick={onOpenNewDriverModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Motorista</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou CNH..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDrivers.map((driver) => (
          <div
            key={driver.id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div className="p-5 space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <UserCircle2 className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      {driver.name}
                    </h3>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${driver.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      {driver.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">CPF</span>
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {driver.cpf}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Telefone</span>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{driver.phone}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <FileBadge className="w-3.5 h-3.5" />
                    CNH:
                  </span>
                  <strong className="text-slate-900">{driver.cnh} (Cat. {driver.cnhCategory})</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 pl-5">Validade:</span>
                  <span className="text-slate-900">
                    {driver.cnhExpiration.split('-').reverse().join('/')}
                  </span>
                </div>
                {(driver.cns || driver.cbo) && (
                  <div className="pt-2 mt-1.5 border-t border-dashed border-slate-200 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                    {driver.cns && (
                      <div>
                        <span className="text-slate-400 font-semibold block">CNS PROFISSIONAL</span>
                        <span className="font-mono font-bold text-slate-800">{driver.cns}</span>
                      </div>
                    )}
                    {driver.cbo && (
                      <div>
                        <span className="text-slate-400 font-semibold block">CBO ATUAÇÃO</span>
                        <span className="font-mono font-bold text-slate-800">{driver.cbo}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {driver.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[11px] text-slate-500 italic line-clamp-2">
                    {driver.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="bg-slate-50 p-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => onEditDriver(driver)}
                className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                title="Editar motorista"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Deseja inativar/remover o motorista ${driver.name}?`)) {
                    onDeleteDriver(driver.id);
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                title="Excluir motorista"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredDrivers.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white border border-slate-200 border-dashed rounded-xl">
            <UserCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">Nenhum motorista encontrado</h3>
            <p className="text-sm text-slate-500 mt-1">
              Tente mudar os termos da busca ou cadastre um novo motorista.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
