import React, { useState, useEffect } from 'react';
import { X, User, ShieldCheck, HeartPulse, MapPin, AlertCircle, Save, Phone } from 'lucide-react';
import { MobilityType, Patient, PatientCondition } from '../../types';
import { calculateAge, formatCPF, formatPhone, formatSUS } from '../../utils/formatters';

interface PatientFormModalProps {
  patient?: Patient | null;
  onSave: (patient: Patient) => void;
  onClose: () => void;
}

const CONDITIONS: PatientCondition[] = [
  'Consulta Médica',
  'Hemodiálise',
  'Quimioterapia / Oncologia',
  'Radioterapia',
  'Cirurgia / Procedimento',
  'Exames Especializados',
  'Fisioterapia / Reabilitação',
  'Avaliação Pré-operatória',
  'Outro',
];

const MOBILITIES: MobilityType[] = ['Ambulante', 'Cadeirante', 'Maca', 'Oxigênio / Suporte'];

export const PatientFormModal: React.FC<PatientFormModalProps> = ({
  patient,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<Partial<Patient>>(() => {
    const saved = localStorage.getItem(`patient-form-${patient?.id || 'new'}`);
    return saved ? JSON.parse(saved) : {
      name: '',
      cpf: '',
      susCard: '',
      rg: '',
      birthDate: '',
      phone: '',
      whatsapp: '',
      emergencyPhone: '',
      address: '',
      boardingAddress: '',
      neighborhood: '',
      city: 'Município de Origem',
      condition: 'Consulta Médica',
      mobility: 'Ambulante',
      procedureTime: '08:00',
      companionRequired: false,
      companionName: '',
      companionBirthDate: '',
      companionCpf: '',
      companionAddress: '',
      companionKinship: '',
      companionPhone: '',
      companionReason: '',
      bloodType: '',
      allergies: '',
      notes: '',
    };
  });

  useEffect(() => {
    localStorage.setItem(`patient-form-${patient?.id || 'new'}`, JSON.stringify(formData));
  }, [formData, patient]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (patient) {
      setFormData(patient);
    }
  }, [patient]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.name?.trim()) errs.name = 'Nome completo é obrigatório';
    if (!formData.cpf?.trim()) {
      errs.cpf = 'CPF é obrigatório';
    } else if (formData.cpf.replace(/\D/g, '').length !== 11) {
      errs.cpf = 'CPF deve conter 11 dígitos';
    }
    if (!formData.susCard?.trim()) {
      errs.susCard = 'Cartão SUS é obrigatório';
    } else if (formData.susCard.replace(/\D/g, '').length !== 15) {
      errs.susCard = 'Cartão SUS deve conter 15 dígitos';
    }
    if (!formData.phone?.trim()) errs.phone = 'Telefone/WhatsApp de contato é obrigatório';
    if (!formData.address?.trim()) errs.address = 'Endereço é obrigatório';

    if (formData.companionRequired) {
      if (!formData.companionName?.trim()) {
        errs.companionName = 'Nome do acompanhante é obrigatório quando exigido';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const cleanCpf = (formData.cpf || '').replace(/\D/g, '');
    const cleanSus = (formData.susCard || '').replace(/\D/g, '');
    const cleanCompCpf = formData.companionCpf ? formData.companionCpf.replace(/\D/g, '') : undefined;
    const phoneVal = formData.whatsapp || formData.phone || '';

    const patientToSave: Patient = {
      id: patient?.id || `pat-${Date.now()}`,
      name: formData.name!.trim(),
      cpf: cleanCpf,
      susCard: cleanSus,
      rg: formData.rg?.trim() || undefined,
      birthDate: formData.birthDate || '',
      phone: phoneVal.trim(),
      whatsapp: phoneVal.trim(),
      emergencyPhone: formData.emergencyPhone?.trim() || undefined,
      address: formData.address!.trim(),
      boardingAddress: formData.boardingAddress?.trim() || formData.address!.trim(),
      neighborhood: formData.neighborhood?.trim() || 'Centro',
      city: formData.city?.trim() || 'Município de Origem',
      condition: formData.condition || 'Consulta Médica',
      mobility: formData.mobility || 'Ambulante',
      procedureTime: formData.procedureTime?.trim() || '08:00',
      companionRequired: Boolean(formData.companionRequired),
      companionName: formData.companionRequired ? formData.companionName?.trim() : undefined,
      companionBirthDate: formData.companionRequired ? formData.companionBirthDate : undefined,
      companionCpf: formData.companionRequired && cleanCompCpf ? cleanCompCpf : undefined,
      companionAddress: formData.companionRequired ? (formData.companionAddress?.trim() || formData.boardingAddress?.trim() || formData.address?.trim()) : undefined,
      companionKinship: formData.companionRequired ? formData.companionKinship?.trim() : undefined,
      companionPhone: formData.companionRequired ? formData.companionPhone?.trim() : undefined,
      companionReason: formData.companionRequired ? formData.companionReason?.trim() : undefined,
      bloodType: formData.bloodType?.trim() || undefined,
      allergies: formData.allergies?.trim() || undefined,
      notes: formData.notes?.trim() || undefined,
      createdAt: patient?.createdAt || new Date().toISOString().slice(0, 10),
    };

    localStorage.removeItem(`patient-form-${patient?.id || 'new'}`);
    onSave(patientToSave);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-800 text-white">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-bold text-lg">
                {patient ? 'Editar Cadastro do Paciente' : 'Novo Cadastro de Paciente (TFD)'}
              </h3>
              <p className="text-xs text-emerald-100">
                Informações cadastrais, documentos do SUS e dados de acompanhante
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 text-slate-800 max-h-[80vh] overflow-y-auto space-y-5 text-xs">
          {/* Sessão 1: Dados Pessoais & Identificação */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
            <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <User className="w-4 h-4 text-emerald-700" />
              1. Identificação do Paciente
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Nome Completo do Paciente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Maria Aparecida da Silva"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 focus:outline-emerald-600 ${
                    errors.name ? 'border-rose-500' : 'border-slate-300'
                  }`}
                />
                {errors.name && <p className="text-rose-500 text-[11px] mt-0.5">{errors.name}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Data de Nascimento {formData.birthDate && `(${calculateAge(formData.birthDate)})`}
                </label>
                <input
                  type="date"
                  value={formData.birthDate || ''}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  CPF (apenas números ou formatado) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  value={formatCPF(formData.cpf || '')}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value.replace(/\D/g, '') })}
                  className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 font-mono focus:outline-emerald-600 ${
                    errors.cpf ? 'border-rose-500' : 'border-slate-300'
                  }`}
                />
                {errors.cpf && <p className="text-rose-500 text-[11px] mt-0.5">{errors.cpf}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cartão Nacional de Saúde (SUS) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="700 0000 0000 0000 (15 dígitos)"
                  value={formatSUS(formData.susCard || '')}
                  onChange={(e) => setFormData({ ...formData, susCard: e.target.value.replace(/\D/g, '') })}
                  className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 font-mono focus:outline-emerald-600 ${
                    errors.susCard ? 'border-rose-500' : 'border-slate-300'
                  }`}
                />
                {errors.susCard && <p className="text-rose-500 text-[11px] mt-0.5">{errors.susCard}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Documento RG</label>
                <input
                  type="text"
                  placeholder="Ex: 12.345.678-9"
                  value={formData.rg || ''}
                  onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Telefone Principal (WhatsApp) *</label>
                <input
                  type="text"
                  required
                  placeholder="(00) 00000-0000"
                  value={formatPhone(formData.phone || '')}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                  className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 focus:outline-emerald-600 ${
                    errors.phone ? 'border-rose-500' : 'border-slate-300'
                  }`}
                />
                {errors.phone && <p className="text-rose-500 text-[11px] mt-0.5">{errors.phone}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Telefone de Emergência / Recado</label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={formatPhone(formData.emergencyPhone || '')}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipo Sanguíneo</label>
                <select
                  value={formData.bloodType || ''}
                  onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
                >
                  <option value="">Não informado</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            {/* Endereço & Embarque */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-200">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Endereço Residencial (Rua e Nº) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rua das Flores, 120"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 focus:outline-emerald-600 ${
                    errors.address ? 'border-rose-500' : 'border-slate-300'
                  }`}
                />
                {errors.address && <p className="text-rose-500 text-[11px] mt-0.5">{errors.address}</p>}
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bairro</label>
                <input
                  type="text"
                  placeholder="Ex: Jardim Alvorada"
                  value={formData.neighborhood || ''}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Endereço de Embarque do Paciente (Se diferente)</label>
                <input
                  type="text"
                  placeholder="Ex: Ponto central, UBS Central ou mesmo endereço residencial"
                  value={formData.boardingAddress || ''}
                  onChange={(e) => setFormData({ ...formData, boardingAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Horário Habitual do Procedimento</label>
                <input
                  type="time"
                  value={formData.procedureTime || '08:00'}
                  onChange={(e) => setFormData({ ...formData, procedureTime: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Sessão 2: Condição de Saúde e Necessidade de Transporte */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
            <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <HeartPulse className="w-4 h-4 text-emerald-700" />
              2. Perfil Clínico e Mobilidade
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Condição Principal / Motivo TFD *</label>
                <select
                  value={formData.condition || 'Consulta Médica'}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value as PatientCondition })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:outline-emerald-600"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Necessidade de Mobilidade / Acessibilidade *</label>
                <select
                  value={formData.mobility || 'Ambulante'}
                  onChange={(e) => setFormData({ ...formData, mobility: e.target.value as MobilityType })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:outline-emerald-600"
                >
                  {MOBILITIES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Alergias Conhecidas</label>
                <input
                  type="text"
                  placeholder="Ex: Alergia a contraste, dipirona, látex..."
                  value={formData.allergies || ''}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Sessão 3: Acompanhante */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                3. Direito a Acompanhante no Veículo
              </h4>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.companionRequired || false}
                  onChange={(e) => setFormData({ ...formData, companionRequired: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <span className="font-bold text-emerald-900 text-xs">Exige Acompanhante (Reserva +1 Vaga)</span>
              </label>
            </div>

            {formData.companionRequired ? (
              <div className="space-y-3 bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nome do Acompanhante *
                    </label>
                    <input
                      type="text"
                      placeholder="Nome completo do acompanhante"
                      value={formData.companionName || ''}
                      onChange={(e) => setFormData({ ...formData, companionName: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 focus:outline-emerald-600 ${
                        errors.companionName ? 'border-rose-500' : 'border-slate-300'
                      }`}
                    />
                    {errors.companionName && (
                      <p className="text-rose-500 text-[11px] mt-0.5">{errors.companionName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Data Nasc. Acompanhante</label>
                    <input
                      type="date"
                      value={formData.companionBirthDate || ''}
                      onChange={(e) => setFormData({ ...formData, companionBirthDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">CPF do Acompanhante</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={formatCPF(formData.companionCpf || '')}
                      onChange={(e) => setFormData({ ...formData, companionCpf: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono focus:outline-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Grau de Parentesco / Vínculo</label>
                    <input
                      type="text"
                      placeholder="Ex: Mãe, Filho, Esposa, Cuidador"
                      value={formData.companionKinship || ''}
                      onChange={(e) => setFormData({ ...formData, companionKinship: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Telefone do Acompanhante</label>
                    <input
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={formatPhone(formData.companionPhone || '')}
                      onChange={(e) => setFormData({ ...formData, companionPhone: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Endereço de Embarque do Acompanhante</label>
                    <input
                      type="text"
                      placeholder="Ex: Mesmo do paciente ou endereço específico"
                      value={formData.companionAddress || ''}
                      onChange={(e) => setFormData({ ...formData, companionAddress: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Justificativa / Laudo Médico</label>
                    <input
                      type="text"
                      placeholder="Ex: Idoso > 60 anos, Menor, Laudo TFD nº..."
                      value={formData.companionReason || ''}
                      onChange={(e) => setFormData({ ...formData, companionReason: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-xs italic">
                Paciente realizará o transporte de forma autônoma (ocupa apenas 1 vaga no veículo).
              </p>
            )}
          </div>

          {/* Sessão 4: Observações Gerais */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Observações Complementares / Histórico
            </label>
            <textarea
              rows={2}
              placeholder="Instruções adicionais, horários de tratamento frequentes, orientações especiais de embarque..."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600 resize-none"
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-medium text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-save-patient"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Salvar Paciente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
