import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Save, 
  RotateCcw, 
  Download, 
  Upload, 
  Trash2, 
  Clock, 
  Database, 
  ShieldCheck, 
  CheckCircle2, 
  RefreshCw,
  Calendar
} from 'lucide-react';
import { MunicipalConfig, BackupSnapshot } from '../../types';
import { formatDateBR } from '../../utils/formatters';

interface ConfigModalProps {
  config: MunicipalConfig;
  snapshots?: BackupSnapshot[];
  onSaveConfig: (newConfig: MunicipalConfig) => void;
  onResetData: () => void;
  onClearAllData: () => void;
  onExportBackup: () => void;
  onImportBackup: (jsonString: string) => void;
  onCreateSnapshot?: (trigger: 'automatic' | 'manual') => Promise<void>;
  onRestoreSnapshot?: (snapshot: BackupSnapshot) => Promise<void>;
  onDeleteSnapshot?: (snapshotId: string) => Promise<void>;
  onClose: () => void;
  isAdmin?: boolean;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  config,
  snapshots = [],
  onSaveConfig,
  onResetData,
  onClearAllData,
  onExportBackup,
  onImportBackup,
  onCreateSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onClose,
  isAdmin,
}) => {
  const [formData, setFormData] = useState<MunicipalConfig>({ ...config });
  const [newInstruction, setNewInstruction] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleAddInstruction = () => {
    if (!newInstruction.trim()) return;
    setFormData((prev) => ({
      ...prev,
      instructionsPatient: [...prev.instructionsPatient, newInstruction.trim()],
    }));
    setNewInstruction('');
  };

  const handleRemoveInstruction = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      instructionsPatient: prev.instructionsPatient.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        onImportBackup(content);
        onClose();
      }
    };
    reader.readAsText(file);
  };

  const handleCreateSnapshotNow = async () => {
    if (!onCreateSnapshot) return;
    setIsCreatingSnapshot(true);
    try {
      await onCreateSnapshot('manual');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleRestoreSnapshotClick = async (snap: BackupSnapshot) => {
    if (!onRestoreSnapshot) return;
    const confirmMsg = `Deseja realmente restaurar o backup de ${new Date(snap.createdAt).toLocaleString('pt-BR')}?\nOs dados atuais do sistema serão substituídos por este backup.`;
    if (window.confirm(confirmMsg)) {
      setRestoringId(snap.id);
      try {
        await onRestoreSnapshot(snap);
        onClose();
      } finally {
        setRestoringId(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-lg">Configurações & Backups Automáticos</h3>
              <p className="text-xs text-slate-300">
                Personalização de cabeçalhos oficiais, agendamento de backups e restauração
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 text-slate-800 max-h-[80vh] overflow-y-auto space-y-5 text-xs">
          {/* Seção de Backup Automático Pré-determinado */}
          <div className="border border-emerald-300 rounded-lg p-4 bg-emerald-50/60 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
              <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-700" />
                Agendamento do Backup Automático Diário
              </h4>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.autoBackupEnabled ?? true}
                  onChange={(e) => setFormData({ ...formData, autoBackupEnabled: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <span className="font-bold text-emerald-900 text-xs">Ativar Backup Automático</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Horário Pré-determinado do Backup Diário
                </label>
                <input
                  type="time"
                  required
                  value={formData.autoBackupTime || '23:00'}
                  onChange={(e) => setFormData({ ...formData, autoBackupTime: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-bold focus:outline-emerald-600"
                />
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-[11px] space-y-1">
                <span className="text-slate-500 block font-semibold">Status do Agendamento:</span>
                {formData.autoBackupEnabled !== false ? (
                  <p className="text-emerald-800 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Próximo backup agendado diariamente às <strong>{formData.autoBackupTime || '23:00'}</strong></span>
                  </p>
                ) : (
                  <p className="text-amber-800 font-bold">
                    Backup automático desativado.
                  </p>
                )}
                {formData.lastAutoBackupDate && (
                  <p className="text-slate-500 text-[10px]">
                    Última execução automática: {formatDateBR(formData.lastAutoBackupDate)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Histórico de Snapshots Salvos na Nuvem (Supabase) */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-700" />
                  Histórico de Backups Salvos na Nuvem (Snapshots)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Cópia de segurança salva diretamente no Supabase em tempo real
                </p>
              </div>

              <button
                type="button"
                disabled={isCreatingSnapshot}
                onClick={handleCreateSnapshotNow}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                {isCreatingSnapshot ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Salvar Backup na Nuvem Agora</span>
              </button>
            </div>

            {/* Tabela de Snapshots */}
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white">
              {snapshots.length === 0 ? (
                <div className="p-4 text-center text-slate-500 italic">
                  Nenhum backup em nuvem registrado ainda.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2">Data e Hora</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2">Registros Salvos</th>
                      <th className="p-2 text-right">Ações de Restauração</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {snapshots.map((snap) => (
                      <tr key={snap.id} className="hover:bg-slate-50">
                        <td className="p-2 font-mono font-bold text-slate-800">
                          {new Date(snap.createdAt).toLocaleDateString('pt-BR')} às {new Date(snap.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            snap.trigger === 'automatic'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}>
                            {snap.trigger === 'automatic' ? 'Automático' : 'Manual'}
                          </span>
                        </td>
                        <td className="p-2 text-slate-600 text-[11px]">
                          {snap.patientsCount} pacientes • {snap.tripsCount} viagens
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={restoringId === snap.id}
                              onClick={() => handleRestoreSnapshotClick(snap)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] transition-colors cursor-pointer"
                              title="Restaurar este backup no sistema"
                            >
                              {restoringId === snap.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              <span>Restaurar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const blob = new Blob([snap.fullDataJSON], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `backup-tfd-${snap.createdAt.slice(0, 10)}.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-200"
                              title="Baixar Arquivo JSON"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {onDeleteSnapshot && (
                              <button
                                type="button"
                                onClick={() => onDeleteSnapshot(snap.id)}
                                className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50"
                                title="Excluir Cópia"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Identificação da Secretaria de Saúde */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60 space-y-3">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Building2 className="w-4 h-4 text-emerald-700" />
              Identificação do Município e Órgão de Saúde
            </h4>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nome do Município / Prefeitura *</label>
              <input
                type="text"
                required
                value={formData.municipalityName}
                onChange={(e) => setFormData({ ...formData, municipalityName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-bold focus:outline-emerald-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nome da Secretaria / Departamento *</label>
              <input
                type="text"
                required
                value={formData.departmentName}
                onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Telefone da Divisão de Transporte</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">E-mail Institucional</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Endereço da Secretaria de Saúde</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Coordenação / Setor Responsável</label>
              <input
                type="text"
                value={formData.tfdCoordinator}
                onChange={(e) => setFormData({ ...formData, tfdCoordinator: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
              />
            </div>
          </div>

          {/* Instruções impressas no comprovante */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60 space-y-3">
            <h4 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
              Orientações Impressas no Comprovante de Agendamento do Paciente
            </h4>

            <div className="space-y-2">
              {formData.instructionsPatient.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                  <span className="text-slate-800 text-xs">{idx + 1}. {item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInstruction(idx)}
                    className="text-rose-600 hover:text-rose-800 text-xs font-bold px-2 py-0.5"
                  >
                    Excluir
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Adicionar nova orientação ao paciente..."
                value={newInstruction}
                onChange={(e) => setNewInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddInstruction();
                  }
                }}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-xs focus:outline-emerald-600"
              />
              <button
                type="button"
                onClick={handleAddInstruction}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Backup Arquivo Local */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h5 className="font-bold text-slate-800 text-xs">Backup em Arquivo do Computador (.json)</h5>
              <p className="text-[11px] text-slate-500">Baixe um arquivo físico para guardar no seu computador</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExportBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-bold text-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar Arquivo JSON
              </button>

              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-bold text-xs cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Restaurar Arquivo JSON</span>
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>

              {isAdmin && (
                <>
                  {confirmReset ? (
                    <div className="flex items-center gap-2 bg-rose-50 p-1.5 rounded border border-rose-200">
                      <span className="text-xs text-rose-700 font-bold px-1">Restaurar dados padrão?</span>
                      <button type="button" onClick={() => setConfirmReset(false)} className="px-2 py-1 text-xs text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100 cursor-pointer">Cancelar</button>
                      <button type="button" onClick={() => { onResetData(); onClose(); }} className="px-2 py-1 text-xs text-white bg-rose-600 rounded hover:bg-rose-700 font-bold cursor-pointer">Sim</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmReset(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-rose-700 hover:bg-rose-50 rounded text-xs font-bold cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restaurar Padrão
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Opções de Limpeza para Produção */}
          {isAdmin && (
            <div className="border border-slate-200 rounded-lg p-4 bg-rose-50/40 space-y-3">
              <div>
                <h5 className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  Limpeza de Dados para Produção
                </h5>
                <p className="text-[11px] text-rose-700 mt-0.5">Use estas opções para zerar o sistema antes de iniciar o uso real.</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {confirmClear ? (
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-rose-200 shadow-sm">
                    <span className="text-xs text-rose-800 font-bold px-1">Deseja apagar TUDO do sistema?</span>
                    <button type="button" onClick={() => setConfirmClear(false)} className="px-3 py-1.5 text-xs text-slate-600 bg-slate-50 rounded hover:bg-slate-100 cursor-pointer">Cancelar</button>
                    <button type="button" onClick={() => { onClearAllData(); onClose(); }} className="px-3 py-1.5 text-xs text-white bg-rose-600 rounded hover:bg-rose-700 font-bold cursor-pointer">Confirmar EXCLUSÃO TOTAL</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-sm cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Zerar Sistema Completo (Pacientes + Viagens)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Footer Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-medium text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Salvar Configurações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
