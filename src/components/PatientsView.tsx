import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Download, 
  Edit3, 
  Trash2, 
  Ticket, 
  Phone, 
  MapPin, 
  HeartPulse, 
  ShieldCheck,
  Calendar,
  MessageCircle,
  Clock
} from 'lucide-react';
import { Patient } from '../types';
import { downloadSamplePatientTemplate, exportPatientsToExcel } from '../utils/excel';
import { calculateAge, formatCPF, formatDateBR, formatPhone, formatSUS } from '../utils/formatters';

interface PatientsViewProps {
  patients: Patient[];
  onOpenNewPatientModal: () => void;
  onEditPatient: (patient: Patient) => void;
  onDeletePatient: (patientId: string) => void;
  onOpenNewBookingModalWithPatient: (patientId: string) => void;
  onOpenImportExcelModal: () => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  patients,
  onOpenNewPatientModal,
  onEditPatient,
  onDeletePatient,
  onOpenNewBookingModalWithPatient,
  onOpenImportExcelModal,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [companionFilter, setCompanionFilter] = useState<string>('all');

  const filteredPatients = useMemo(() => patients.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    const cleanDigits = term.replace(/\D/g, '');
    const matchSearch =
      !term ||
      (p.name || '').toLowerCase().includes(term) ||
      (cleanDigits && (p.cpf || '').includes(cleanDigits)) ||
      (cleanDigits && (p.susCard || '').includes(cleanDigits)) ||
      (cleanDigits && ((p.whatsapp || '') + (p.phone || '')).includes(cleanDigits)) ||
      (cleanDigits && p.whatsapp && p.whatsapp.includes(cleanDigits)) ||
      (p.address || '').toLowerCase().includes(term) ||
      (p.boardingAddress && p.boardingAddress.toLowerCase().includes(term)) ||
      (p.neighborhood && p.neighborhood.toLowerCase().includes(term)) ||
      (p.companionName && p.companionName.toLowerCase().includes(term));

    const matchCondition = conditionFilter === 'all' || p.condition === conditionFilter;
    const matchCompanion =
      companionFilter === 'all' ||
      (companionFilter === 'yes' && p.companionRequired) ||
      (companionFilter === 'no' && !p.companionRequired);

    return matchSearch && matchCondition && matchCompanion;
  }), [patients, searchTerm, conditionFilter, companionFilter]);

  const displayedPatients = useMemo(() => filteredPatients.slice(0, 50), [filteredPatients]);

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Cadastro Geral de Pacientes & Acompanhantes (TFD)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Base de dados de pacientes regulados pelo SUS com controle de mobilidade, WhatsApp, endereços e acompanhantes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportPatientsToExcel(patients)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-emerald-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            title="Exportar todos os pacientes para planilha Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={onOpenImportExcelModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-300 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Importar Planilha</span>
          </button>

          <button
            id="btn-patients-new"
            onClick={onOpenNewPatientModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Paciente</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nome, WhatsApp, CPF, Cartão SUS, endereço de embarque ou acompanhante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-emerald-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white font-medium focus:outline-emerald-600"
          >
            <option value="all">Todas as Condições Clínicas</option>
            <option value="Consulta Médica">Consulta Médica</option>
            <option value="Hemodiálise">Hemodiálise</option>
            <option value="Quimioterapia / Oncologia">Quimioterapia / Oncologia</option>
            <option value="Cirurgia / Procedimento">Cirurgia / Procedimento</option>
            <option value="Exames Especializados">Exames Especializados</option>
            <option value="Fisioterapia / Reabilitação">Fisioterapia / Reabilitação</option>
          </select>

          <select
            value={companionFilter}
            onChange={(e) => setCompanionFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white font-medium focus:outline-emerald-600"
          >
            <option value="all">Todos (Acomp. Sim/Não)</option>
            <option value="yes">Apenas com Acompanhante</option>
            <option value="no">Sem Acompanhante</option>
          </select>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-3">Paciente</th>
                <th className="py-3 px-3">Documentos (CPF / CNS)</th>
                <th className="py-3 px-3">Contato (WhatsApp) & Endereço de Embarque</th>
                <th className="py-3 px-3">Condição & Mobilidade</th>
                <th className="py-3 px-3">Acompanhante Cadastrado</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600">Nenhum paciente encontrado</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Cadastre um novo paciente ou importe sua planilha de Excel
                    </p>
                  </td>
                </tr>
              ) : (
                displayedPatients.map((patient) => {
                  const phoneDisplay = (patient.whatsapp || patient.phone || '').trim();
                  const cleanPhoneNum = phoneDisplay.replace(/\D/g, '');
                  const isPhoneValid = cleanPhoneNum.length >= 8 && !/^0+$/.test(cleanPhoneNum);
                  const boardingLoc = patient.boardingAddress?.trim() || patient.address?.trim() || 'Não informado';

                  return (
                    <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 text-sm block">
                          {patient.name}
                        </span>
                        {patient.birthDate && (
                          <span className="text-[11px] text-slate-500">
                            {formatDateBR(patient.birthDate)} ({calculateAge(patient.birthDate)})
                          </span>
                        )}
                        {patient.procedureTime && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Horário Habitual: <strong>{patient.procedureTime}</strong></span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                        <div>CPF: <strong>{formatCPF(patient.cpf)}</strong></div>
                        <div className="text-emerald-800 font-semibold">
                          SUS: {formatSUS(patient.susCard)}
                        </div>
                        {patient.rg && <div className="text-slate-400 text-[10px]">RG: {patient.rg}</div>}
                      </td>

                      {/* Contato (WhatsApp) & Endereço de Embarque */}
                      <td className="py-3 px-3">
                        <div className="space-y-1.5 min-w-[210px]">
                          {/* WhatsApp / Telefone */}
                          {phoneDisplay ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
                                {isPhoneValid ? <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Phone className="w-3 h-3 text-emerald-600" />}
                                <span>{isPhoneValid ? formatPhone(cleanPhoneNum) : phoneDisplay}</span>
                              </span>
                              {isPhoneValid && (
                                <a
                                  href={`https://wa.me/55${cleanPhoneNum}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-emerald-700 hover:text-emerald-900 font-semibold underline flex items-center gap-0.5"
                                  title="Abrir conversa no WhatsApp Web"
                                >
                                  WhatsApp ↗
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>WhatsApp não cadastrado</span>
                            </div>
                          )}

                          {/* Endereço de Embarque */}
                          <div className="text-[11px] text-slate-800 flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-semibold text-slate-900">
                                <span className="text-[10px] uppercase font-bold text-slate-500">Embarque: </span>
                                {boardingLoc}
                              </div>
                              {patient.neighborhood && (
                                <div className="text-[10px] text-slate-500">
                                  Bairro: {patient.neighborhood}
                                </div>
                              )}
                              {patient.address && patient.boardingAddress && patient.address !== patient.boardingAddress && (
                                <div className="text-[10px] text-slate-400 italic">
                                  Residência: {patient.address}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[10px] mb-1">
                          {patient.condition}
                        </span>
                        <div className="text-[11px] text-slate-600 font-medium">
                          Mob: <strong className="text-slate-800">{patient.mobility}</strong>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {patient.companionRequired ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-emerald-800 font-bold text-xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{patient.companionName || 'Acompanhante Autorizado'}</span>
                            </div>
                            <span className="text-[10px] text-slate-600 block">
                              {patient.companionKinship || 'Acompanhante'} {patient.companionBirthDate ? `• Nasc: ${formatDateBR(patient.companionBirthDate)}` : ''}
                            </span>
                            {patient.companionCpf && (
                              <span className="text-[10px] text-slate-500 font-mono block">
                                CPF: {formatCPF(patient.companionCpf)}
                              </span>
                            )}
                            {patient.companionAddress && patient.companionAddress !== patient.boardingAddress && (
                              <span className="text-[10px] text-slate-500 block">
                                Emb. Acomp: {patient.companionAddress}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Sem acompanhante</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenNewBookingModalWithPatient(patient.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-bold text-xs transition-colors cursor-pointer"
                            title="Agendar viagem para este paciente"
                          >
                            <Ticket className="w-3.5 h-3.5" />
                            <span>Agendar</span>
                          </button>

                          <button
                            onClick={() => onEditPatient(patient)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
                            title="Editar cadastro"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Deseja excluir o cadastro de ${patient.name}?`)) {
                                onDeletePatient(patient.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                            title="Excluir cadastro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {filteredPatients.length > 50 && (
            <div className="bg-slate-50 border-t border-slate-200 p-3 text-center text-xs text-slate-500 font-medium">
              Exibindo os primeiros 50 resultados de {filteredPatients.length} encontrados. Utilize a busca para encontrar pacientes específicos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
