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
        <div className="p-8 text-slate-800 text-sm font-sans bg-white overflow-y-auto flex-1 print:overflow-visible print:p-0 print:m-0">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-4 mb-5 flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-emerald-700 text-white rounded-lg flex items-center justify-center font-bold text-xl tracking-wider shadow-xs">
                SUS
              </div>
              <div>
                <h1 className="text-base font-black uppercase text-slate-900">{config.municipalityName}</h1>
                <h2 className="text-sm font-bold text-emerald-800">{config.departmentName}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{config.address} • Tel: {config.phone}</p>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">Setor de Regulação e Transporte Sanitário Eletivo (TFD)</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-md border border-emerald-300">
                VIA DO PACIENTE
              </span>
              <p className="text-xs text-slate-400 mt-2">Código Agendamento</p>
              <p className="text-lg font-black tracking-wider text-slate-900 font-mono">{passenger.bookingCode}</p>
            </div>
          </div>

          <div className="text-center bg-slate-100 py-1.5 px-4 rounded-md mb-5 border border-slate-200">
            <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">
              COMPROVANTE DE AGENDAMENTO DE TRANSPORTE DE PACIENTES
            </h3>
          </div>

          {/* Grid Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {/* Paciente */}
            <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/50">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 mb-2">
                <User className="w-4 h-4 text-emerald-700" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">1. Dados do Paciente</h4>
              </div>
              <div className="space-y-1.5 text-xs">
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
            <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/50">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">2. Acompanhante Autorizado</h4>
              </div>
              {passenger.companionIncluded ? (
                <div className="space-y-1.5 text-xs">
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
                  <div className="p-1.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-[11px] font-medium">
                    ✓ Autorizado com assento reservado no veículo.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-20 text-slate-400 text-xs">
                  <span>Sem acompanhante autorizado para esta viagem</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">(Paciente com autonomia ambulatorial)</span>
                </div>
              )}
            </div>
          </div>

          {/* Dados da Viagem e Destino */}
          <div className="border border-slate-300 rounded-lg p-4 mb-5 bg-white">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 mb-3">
              <MapPin className="w-4 h-4 text-emerald-700" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">3. Dados da Viagem e Atendimento Médico</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-3">
              <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200">
                <span className="text-slate-500 block text-[11px] font-semibold">DATA DA VIAGEM</span>
                <span className="text-base font-black text-slate-900">{formatDateBR(trip.departureDate)}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200">
                <span className="text-slate-500 block text-[11px] font-semibold">HORÁRIO DE SAÍDA</span>
                <span className="text-base font-black text-emerald-700">{trip.departureTime} horas</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200">
                <span className="text-slate-500 block text-[11px] font-semibold">HORÁRIO DA CONSULTA / PROCEDIMENTO</span>
                <span className="text-base font-black text-slate-900">{passenger.appointmentTime || 'Conforme agendado'}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-emerald-50/60 rounded-md border border-emerald-200">
                <span className="text-emerald-900 font-bold block text-xs">LOCAL DE EMBARQUE NO MUNICÍPIO:</span>
                <span className="font-bold text-slate-900 text-sm">{trip.departureLocation}</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">Comparecer impreterivelmente 20 minutos antes do horário de saída.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div>
                  <span className="text-slate-500 font-medium">Hospital / Clínica de Destino:</span>
                  <p className="font-bold text-slate-900">{passenger.destinationName}</p>
                  <p className="text-slate-600 text-[11px]">Cidade: {passenger.destinationCity}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Especialidade / Motivo:</span>
                  <p className="font-bold text-slate-900">{passenger.appointmentType}</p>
                  {passenger.notes && (
                    <p className="text-slate-600 text-[11px] mt-0.5">Obs: {passenger.notes}</p>
                  )}
                </div>
              </div>

              {vehicle && (
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-slate-600 text-[11px]">
                  <span>Veículo: <strong className="text-slate-900">{vehicle.model} ({vehicle.plate})</strong></span>
                  <span>Motorista: <strong className="text-slate-900">{trip.driverName} ({trip.driverPhone})</strong></span>
                  <span>Assento Paciente: <strong className="text-emerald-800 font-bold">Nº {passenger.seatNumber || 'Ordem Chegada'}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Instruções Obrigatórias */}
          <div className="border border-amber-300 bg-amber-50/70 rounded-lg p-3.5 mb-5 text-xs text-amber-950">
            <div className="flex items-center gap-1.5 font-bold mb-1.5 text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>INSTRUÇÕES E ORIENTAÇÕES IMPORTANTES AO PACIENTE</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900">
              {config.instructionsPatient.map((inst, i) => (
                <li key={i}>{inst}</li>
              ))}
            </ul>
          </div>

          {/* Rodapé e Canhoto de Confirmação */}
          <div className="border-t-2 border-dashed border-slate-400 pt-4 mt-6">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</span>
              <span>Código de Autenticação: <strong className="font-mono text-slate-700">{passenger.bookingCode}-SUS-TFD</strong></span>
              <span className="font-bold text-slate-700">{config.tfdCoordinator}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
