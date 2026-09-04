import React, { useState } from 'react';
import { X, Settings, Building2, Phone, Mail, MapPin, Save, RotateCcw, Download, Upload, Trash2 } from 'lucide-react';
import { MunicipalConfig } from '../../types';

interface ConfigModalProps {
  config: MunicipalConfig;
  onSaveConfig: (newConfig: MunicipalConfig) => void;
  onResetData: () => void;
  onClearAllData: () => void;
  onExportBackup: () => void;
  onImportBackup: (jsonString: string) => void;
  onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  config,
  onSaveConfig,
  onResetData,
  onClearAllData,
  onExportBackup,
  onImportBackup,
  onClose,
}) => {
  const [formData, setFormData] = useState<MunicipalConfig>({ ...config });
  const [newInstruction, setNewInstruction] = useState<string>('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-lg">Configurações da Secretaria de Saúde e TFD</h3>
              <p className="text-xs text-slate-300">
                Personalize cabeçalhos de impressão oficial, telefones e instruções ao paciente
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
        <form onSubmit={handleSubmit} className="p-6 text-slate-800 max-h-[80vh] overflow-y-auto space-y-4 text-xs">
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

          {/* Backup e Restauração */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h5 className="font-bold text-slate-800 text-xs">Backup & Dados do Sistema</h5>
              <p className="text-[11px] text-slate-500">Exporte ou restaure todos os dados (pacientes, viagens, frotas)</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExportBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-bold text-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar Backup JSON
              </button>

              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-bold text-xs cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Restaurar Backup</span>
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>

              {confirmClear ? (
                <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded border border-red-200">
                  <span className="text-xs text-red-700 font-bold px-1">Tem certeza? Apagar TUDO?</span>
                  <button type="button" onClick={() => setConfirmClear(false)} className="px-2 py-1 text-xs text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100 cursor-pointer">Cancelar</button>
                  <button type="button" onClick={() => { onClearAllData(); onClose(); }} className="px-2 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700 font-bold cursor-pointer">Sim</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-red-700 hover:bg-red-50 rounded text-xs font-bold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Tudo (Zerar)
                </button>
              )}
              
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
            </div>
          </div>

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
