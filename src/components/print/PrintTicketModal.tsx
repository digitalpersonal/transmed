import React from 'react';
import { Printer, X, ShieldCheck, MapPin, Calendar, Clock, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { MunicipalConfig, Trip, TripPassenger, Vehicle } from '../../types';
import { calculateAge, formatDateBR, formatDateTimeBR } from '../../utils/formatters';

interface PrintTicketModalProps {
  passenger: TripPassenger;
  trip: Trip;
  vehicle?: Vehicle;
  config: MunicipalConfig;
  onClose: () => void;
}

export const PrintTicketModal: React.FC<PrintTicketModalProps> = ({
  passenger,
  trip,
  vehicle,
  config,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/60 p-2 sm:p-4 overflow-y-auto backdrop-blur-xs print:p-0 print:bg-transparent print:static print:block">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:w-full print:max-w-none my-auto print:my-0 border border-slate-200">
        {/* Modal Toolbar - Hidden during print */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0 rounded-t-xl border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-lg">Comprovante Oficial de Agendamento de Transporte</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              id="btn-print-ticket"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir Comprovante
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Ticket Area */}
        <div className="p-8 text-slate-800 text-sm font-sans bg-white overflow-y-auto flex-1 print:overflow-visible print:p-8 print:m-0 print:text-[11px]">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-4 mb-5 print:pb-2 print:mb-2.5 flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 print:w-10 print:h-10 bg-emerald-700 text-white rounded-lg flex items-center justify-center font-bold text-xl print:text-base tracking-wider shadow-xs">
                SUS
              </div>
              <div>
                <h1 className="text-base print:text-sm font-black uppercase text-slate-900">{config.municipalityName}</h1>
                <h2 className="text-sm print:text-xs font-bold text-emerald-800">{config.departmentName}</h2>
                <p className="text-xs print:text-[10px] text-slate-500 mt-0.5">{config.address} • Tel: {config.phone}</p>
                <p className="text-xs print:text-[10px] font-semibold text-slate-700 mt-0.5">Setor de Regulação e Transporte Sanitário Eletivo (TFD)</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 print:px-2 print:py-0.5 bg-emerald-100 text-emerald-800 font-bold text-xs print:text-[10px] rounded-md border border-emerald-300">
                VIA DO PACIENTE
              </span>
              <p className="text-xs print:text-[10px] text-slate-400 mt-1">Código Agendamento</p>
              <p className="text-lg print:text-sm font-black tracking-wider text-slate-900 font-mono">{passenger.bookingCode}</p>
            </div>
          </div>

          <div className="text-center bg-slate-100 py-1.5 px-4 rounded-md mb-5 print:mb-2.5 print:py-1 border border-slate-200">
            <h3 className="font-bold text-slate-800 text-sm print:text-xs tracking-wide uppercase">
              COMPROVANTE DE AGENDAMENTO DE TRANSPORTE DE PACIENTES
            </h3>
          </div>

          {/* Grid Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2 mb-5 print:mb-2.5">
            {/* Paciente */}
            <div className="border border-slate-300 rounded-lg p-3.5 print:p-2 bg-slate-50/50">
              <div className="flex items-center gap-2 pb-2 print:pb-1 border-b border-slate-200 mb-2 print:mb-1.5">
                <User className="w-4 h-4 print:w-3.5 print:h-3.5 text-emerald-700" />
                <h4 className="font-bold text-xs print:text-[11px] uppercase tracking-wider text-slate-800">1. Dados do Paciente</h4>
              </div>
              <div className="space-y-1.5 print:space-y-1 text-xs print:text-[11px]">
                <div>
                  <span className="text-slate-500 font-medium">Nome: </span>
                  <span className="font-bold text-slate-900">{passenger.patientName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 font-medium">CPF: </span>
                    <span className="font-semibold text-slate-800 font-mono">{passenger.patientCpf}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Cartão SUS: </span>
                    <span className="font-semibold text-slate-800 font-mono">{passenger.patientSus}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 font-medium">Telefone: </span>
                    <span className="font-semibold text-slate-800">{passenger.patientPhone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Mobilidade: </span>
                    <span className="font-bold text-emerald-800">{passenger.mobility}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Acompanhante */}
            <div className="border border-slate-300 rounded-lg p-3.5 print:p-2 bg-slate-50/50">
              <div className="flex items-center gap-2 pb-2 print:pb-1 border-b border-slate-200 mb-2 print:mb-1.5">
                <ShieldCheck className="w-4 h-4 print:w-3.5 print:h-3.5 text-emerald-700" />
                <h4 className="font-bold text-xs print:text-[11px] uppercase tracking-wider text-slate-800">2. Acompanhante Autorizado</h4>
              </div>
              {passenger.companionIncluded ? (
                <div className="space-y-1.5 print:space-y-1 text-xs print:text-[11px]">
                  <div>
                    <span className="text-slate-500 font-medium">Nome: </span>
                    <span className="font-bold text-slate-900">{passenger.companionName || 'Informado no cadastro'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 font-medium">CPF: </span>
                      <span className="font-semibold text-slate-800 font-mono">{passenger.companionCpf || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Parentesco: </span>
                      <span className="font-semibold text-slate-800">{passenger.companionKinship || 'Acompanhante'}</span>
                    </div>
                  </div>
                  <div className="p-1.5 print:p-1 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-[11px] print:text-[10px] font-medium">
                    ✓ Autorizado com assento reservado no veículo.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-20 print:h-14 text-slate-400 text-xs print:text-[11px]">
                  <span>Sem acompanhante autorizado para esta viagem</span>
                  <span className="text-[11px] print:text-[10px] text-slate-400 mt-0.5">(Paciente com autonomia ambulatorial)</span>
                </div>
              )}
            </div>
          </div>

          {/* Dados da Viagem e Destino */}
          <div className="border border-slate-300 rounded-lg p-4 print:p-2.5 mb-5 print:mb-2.5 bg-white">
            <div className="flex items-center gap-2 pb-2 print:pb-1 border-b border-slate-200 mb-3 print:mb-1.5">
              <MapPin className="w-4 h-4 print:w-3.5 print:h-3.5 text-emerald-700" />
              <h4 className="font-bold text-xs print:text-[11px] uppercase tracking-wider text-slate-800">3. Dados da Viagem e Atendimento Médico</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 print:gap-2 text-xs print:text-[11px] mb-3 print:mb-2">
              <div className="p-2.5 print:p-1.5 bg-slate-50 rounded-md border border-slate-200">
                <span className="text-slate-500 block text-[11px] print:text-[10px] font-semibold">DATA DA VIAGEM</span>
                <span className="text-base print:text-sm font-black text-slate-900">{formatDateBR(trip.departureDate)}</span>
              </div>
              <div className="p-2.5 print:p-1.5 bg-slate-50 rounded-md border border-slate-200">
                <span className="text-slate-500 block text-[11px] print:text-[10px] font-semibold">HORÁRIO DE SAÍDA</span>
                <span className="text-base print:text-sm font-black text-emerald-700">{trip.departureTime} horas</span>
              </div>
              <div className="p-2.5 print:p-1.5 bg-slate-50 rounded-md border border-slate-200">
                <span className="text-slate-500 block text-[11px] print:text-[10px] font-semibold">HORÁRIO DA CONSULTA / PROCEDIMENTO</span>
                <span className="text-base print:text-sm font-black text-slate-900">{passenger.appointmentTime || 'Conforme agendado'}</span>
              </div>
            </div>

            <div className="space-y-2 print:space-y-1 text-xs print:text-[11px]">
              <div className="p-3 print:p-2 bg-emerald-50 rounded-lg border-2 border-emerald-200">
                <div className="flex items-center gap-2 mb-2 print:mb-1 border-b border-emerald-200/50 pb-1">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                  <span className="text-emerald-900 font-black text-xs print:text-[11px] uppercase">Local de Embarque (Ponto de Saída)</span>
                </div>
                
                <div className="space-y-2 print:space-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] print:text-[9px] font-bold text-emerald-800 uppercase min-w-[85px] print:min-w-[75px]">Paciente:</span>
                      <span className="font-black text-slate-900 text-sm print:text-xs">
                        {passenger.patientAddress || trip.departureLocation}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span className="text-[10px] print:text-[9px] font-bold text-slate-600 uppercase">Hora de Saída:</span>
                      <span className="font-black text-emerald-800 text-sm print:text-xs">{passenger.boardingTime || trip.departureTime}</span>
                    </div>
                  </div>

                  {passenger.companionIncluded && (
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-1 border-t border-emerald-200/30">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] print:text-[9px] font-bold text-emerald-800 uppercase min-w-[85px] print:min-w-[75px]">Acompanhante:</span>
                        <span className="font-black text-slate-900 text-sm print:text-xs">
                          {passenger.companionAddress || passenger.patientAddress || trip.departureLocation}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] print:text-[9px] font-bold text-slate-600 uppercase">Hora de Saída:</span>
                        <span className="font-black text-emerald-800 text-sm print:text-xs">{passenger.companionBoardingTime || passenger.boardingTime || trip.departureTime}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-2 print:mt-1 pt-1 border-t border-emerald-200/30">
                  <span className="block text-[10px] print:text-[9px] text-slate-600 italic">
                    * Favor estar no ponto com 20 minutos de antecedência. Em caso de atraso, o veículo seguirá viagem para não comprometer os demais atendimentos.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:gap-2 mt-2 print:mt-1">
                <div>
                  <span className="text-slate-500 font-medium">Hospital / Clínica de Destino:</span>
                  <p className="font-bold text-slate-900">{passenger.destinationName}</p>
                  <p className="text-slate-600 text-[11px] print:text-[10px]">Cidade: {passenger.destinationCity}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Especialidade / Motivo:</span>
                  <p className="font-bold text-slate-900">{passenger.appointmentType}</p>
                  {passenger.notes && (
                    <p className="text-slate-600 text-[11px] print:text-[10px] mt-0.5">Obs: {passenger.notes}</p>
                  )}
                </div>
              </div>

              {vehicle && (
                <div className="pt-2 print:pt-1 border-t border-slate-200 flex flex-wrap items-center justify-end text-slate-600 text-[11px] print:text-[10px]">
                  <span>Assento Paciente: <strong className="text-emerald-800 font-bold">Nº {passenger.seatNumber || 'Ordem Chegada'}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Instruções Obrigatórias */}
          <div className="border border-amber-300 bg-amber-50/70 rounded-lg p-4 print:p-2.5 mb-6 print:mb-2.5 text-sm text-amber-950">
            <div className="flex items-center gap-2 font-bold mb-2 print:mb-1 text-amber-900 text-xs print:text-[11px]">
              <AlertCircle className="w-4 h-4 print:w-3.5 print:h-3.5 text-amber-700 shrink-0" />
              <span>INSTRUÇÕES E ORIENTAÇÕES IMPORTANTES AO PACIENTE</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 print:space-y-1 text-xs sm:text-sm print:text-[10px] text-amber-900">
              {config.instructionsPatient.map((inst, i) => (
                <li key={i}>{inst}</li>
              ))}
            </ul>
          </div>

          {/* Rodapé e Canhoto de Confirmação com Assinatura, CPF e Data de Emissão */}
          <div className="border-t-2 border-dashed border-slate-400 pt-6 mt-6 print:pt-3 print:mt-3 space-y-5 print:space-y-2">
            <div className="grid grid-cols-2 gap-4 print:gap-2 text-sm print:text-xs bg-slate-50 p-4 print:p-2 rounded-lg border border-slate-200">
              <div>
                <span className="font-bold text-slate-700 block text-xs print:text-[10px] uppercase">Nome do Paciente:</span>
                <span className="font-black text-slate-900 text-base print:text-xs">{passenger.patientName}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-700 block text-xs print:text-[10px] uppercase">Data e Hora da Emissão:</span>
                <span className="font-bold text-slate-900 text-sm print:text-xs">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</span>
              </div>
            </div>

            {/* Campo de Assinatura do Paciente no Rodapé */}
            <div className="pt-2 print:pt-1 pb-1">
              <div className="w-80 max-w-full mx-auto text-center space-y-1">
                <div className="border-b-2 border-slate-900 h-10 print:h-8"></div>
                <p className="font-bold text-slate-900 text-xs print:text-[11px]">Assinatura do(a) Paciente ou Responsável</p>
                <p className="text-xs print:text-[10px] text-slate-800 font-bold">{passenger.patientName}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs print:text-[10px] text-slate-500 pt-2 print:pt-1 border-t border-slate-200">
              <span>Código de Autenticação: <strong className="font-mono text-slate-700">{passenger.bookingCode}-SUS-TFD</strong></span>
              <span className="font-bold text-slate-700">{config.tfdCoordinator || 'Coordenação TFD'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
