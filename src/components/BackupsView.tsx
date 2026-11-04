import React, { useState } from 'react';
import { 
  Database, 
  Clock, 
  Save, 
  RotateCcw, 
  Download, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  Calendar, 
  FileText,
  Sparkles
} from 'lucide-react';
import { MunicipalConfig, BackupSnapshot } from '../types';
import { formatDateBR } from '../utils/formatters';

interface BackupsViewProps {
  config: MunicipalConfig;
  snapshots: BackupSnapshot[];
  onUpdateConfig: (newConfig: MunicipalConfig) => void;
  onCreateSnapshot: (trigger: 'automatic' | 'manual') => Promise<void>;
  onRestoreSnapshot: (snapshot: BackupSnapshot) => Promise<void>;
  onDeleteSnapshot: (snapshotId: string) => Promise<void>;
  onExportBackup: () => void;
  onImportBackup: (jsonString: string) => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  isAdmin?: boolean;
}

export const BackupsView: React.FC<BackupsViewProps> = ({
  config,
  snapshots,
  onUpdateConfig,
  onCreateSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onExportBackup,
  onImportBackup,
  showToast,
  isAdmin = true,
}) => {
  const [autoEnabled, setAutoEnabled] = useState<boolean>(config.autoBackupEnabled ?? true);
  const [autoTime, setAutoTime] = useState<string>(config.autoBackupTime || '23:00');
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState<boolean>(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleSaveBackupSchedule = async () => {
    setIsSavingConfig(true);
    try {
      const updatedConfig: MunicipalConfig = {
        ...config,
        autoBackupEnabled: autoEnabled,
        autoBackupTime: autoTime,
      };
      await onUpdateConfig(updatedConfig);
      showToast(`Configuração de backup salva! Backup agendado para às ${autoTime} diariamente.`, 'success');
    } catch (err) {
      console.error('Error saving backup schedule:', err);
      showToast('Erro ao salvar agendamento.', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCreateSnapshotClick = async () => {
    setIsCreatingSnapshot(true);
    try {
      await onCreateSnapshot('manual');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleRestoreClick = async (snap: BackupSnapshot) => {
    const confirmMsg = `Deseja realmente restaurar o backup registrado em ${new Date(snap.createdAt).toLocaleString('pt-BR')}?\n\nOs dados atuais do sistema serão substituídos pelas informações contidas nesta cópia de segurança.`;
    if (window.confirm(confirmMsg)) {
      setRestoringId(snap.id);
      try {
        await onRestoreSnapshot(snap);
      } finally {
        setRestoringId(null);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        onImportBackup(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Centro de Segurança e Proteção de Dados (TFD)</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">Agendamento & Gestão de Backups</h2>
          <p className="text-slate-300 text-xs mt-1 max-w-2xl">
            Configure o horário do backup diário automático na nuvem, visualize histórico de cópias e restaure o sistema instantaneamente em caso de qualquer problema.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isCreatingSnapshot}
            onClick={handleCreateSnapshotClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            {isCreatingSnapshot ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Sparkles className="w-4 h-4 text-emerald-200" />
            )}
            <span>Criar Backup na Nuvem Agora</span>
          </button>
        </div>
      </div>

      {/* Grid: Configuração de Horário Agendado + Ações Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Agendamento Diário */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-md border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-700" />
              Configuração do Backup Automático Diário
            </h3>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoEnabled}
                onChange={(e) => setAutoEnabled(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <span className="font-bold text-slate-800 text-xs">Ativar Execução Automática</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block font-bold text-slate-700 text-xs mb-1">
                Horário Pré-determinado do Backup Diário
              </label>
              <input
                type="time"
                value={autoTime}
                onChange={(e) => setAutoTime(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 font-bold text-sm focus:outline-emerald-600 focus:bg-white transition-all"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                O sistema efetuará automaticamente o backup em nuvem diariamente neste horário.
              </p>
            </div>

            <div>
              <button
                type="button"
                disabled={isSavingConfig}
                onClick={handleSaveBackupSchedule}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                {isSavingConfig ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                ) : (
                  <Save className="w-4 h-4 text-emerald-400" />
                )}
                <span>Salvar Agendamento</span>
              </button>
            </div>
          </div>

          {/* Status Box */}
          <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-emerald-900 font-extrabold uppercase text-[10px] tracking-wider block">
                STATUS DO AGENDAMENTO
              </span>
              {autoEnabled ? (
                <p className="text-emerald-950 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Backup automático ativo diariamente às <strong>{autoTime}</strong></span>
                </p>
              ) : (
                <p className="text-amber-900 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Backup automático desativado.</span>
                </p>
              )}
            </div>

            {config.lastAutoBackupDate && (
              <div className="text-right sm:text-right border-t sm:border-t-0 border-emerald-200 pt-2 sm:pt-0">
                <span className="text-slate-500 block text-[10px]">Última Execução Automática</span>
                <span className="font-mono font-bold text-slate-900">{formatDateBR(config.lastAutoBackupDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Arquivos de Backup para Computador */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
            <Download className="w-5 h-5 text-emerald-700" />
            Backup Local no Computador
          </h3>

          <p className="text-slate-600 text-xs leading-relaxed">
            Além das cópias na nuvem, você pode baixar um arquivo <strong>.JSON</strong> físico para guardar no seu computador ou pen drive.
          </p>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={onExportBackup}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-bold text-xs transition-colors cursor-pointer border border-slate-300"
            >
              <Download className="w-4 h-4 text-slate-700" />
              <span>Baixar Arquivo JSON do Sistema</span>
            </button>

            <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl font-bold text-xs border border-emerald-300 transition-colors cursor-pointer">
              <Upload className="w-4 h-4 text-emerald-700" />
              <span>Restaurar de Arquivo JSON</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Histórico de Snapshots Salvos no Supabase */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-700" />
              Histórico de Cópias de Segurança na Nuvem ({snapshots.length})
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Lista de todos os backups mantidos com segurança na nuvem Supabase.
            </p>
          </div>
        </div>

        {/* Tabela Principal de Snapshots */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          {snapshots.length === 0 ? (
            <div className="p-8 text-center text-slate-500 italic space-y-2">
              <Database className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold">Nenhum backup em nuvem criado ainda.</p>
              <p className="text-xs text-slate-400">Clique em "Criar Backup na Nuvem Agora" ou aguarde o horário agendado.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <th className="p-3">Data e Hora de Criação</th>
                  <th className="p-3">Origem</th>
                  <th className="p-3">Total de Registros Salvos</th>
                  <th className="p-3 text-right">Ações de Restauração</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {snapshots.map((snap) => (
                  <tr key={snap.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900 text-sm">
                      {new Date(snap.createdAt).toLocaleDateString('pt-BR')} às {new Date(snap.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>

                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        snap.trigger === 'automatic'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-sky-100 text-sky-900 border border-sky-300'
                      }`}>
                        {snap.trigger === 'automatic' ? (
                          <>
                            <Clock className="w-3 h-3 text-emerald-700" />
                            <span>Automático (Agendado)</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-sky-700" />
                            <span>Manual (Operador)</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="p-3 text-slate-700 text-xs">
                      <strong>{snap.patientsCount}</strong> pacientes • <strong>{snap.tripsCount}</strong> viagens • <strong>{snap.vehiclesCount}</strong> veículos • <strong>{snap.driversCount}</strong> motoristas
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={restoringId === snap.id}
                          onClick={() => handleRestoreClick(snap)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-sm transition-colors cursor-pointer"
                          title="Restaurar este ponto de backup imediatamente"
                        >
                          {restoringId === snap.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          <span>Restaurar Agora</span>
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
                          className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors"
                          title="Baixar Cópia JSON"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {onDeleteSnapshot && (
                          <button
                            type="button"
                            onClick={() => onDeleteSnapshot(snap.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Excluir Registro"
                          >
                            <Trash2 className="w-4 h-4" />
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
    </div>
  );
};
