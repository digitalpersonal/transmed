import React from 'react';
import { Printer, X, FileCheck, CheckCircle, AlertTriangle, Gauge, Users, Car } from 'lucide-react';
import { MunicipalConfig, Trip, Vehicle, ensurePassengerArray } from '../../types';
import { formatDateBR, formatPlate } from '../../utils/formatters';

interface PrintClosureModalProps {
  trip: Trip;
  vehicle?: Vehicle;
  config: MunicipalConfig;
  onClose: () => void;
}

export const PrintClosureModal: React.FC<PrintClosureModalProps> = ({
  trip,
  vehicle,
  config,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const closure = trip.closure;
  if (!closure) return null;

  const passList = ensurePassengerArray(trip.passengers);
  const totalPatients = closure.totalPatientsCount || passList.length;
  const totalCompanions = closure.totalCompanionsCount || passList.filter((p) => p.companionIncluded).length;
  const totalPeopleScheduled = closure.totalPassengers || (totalPatients + totalCompanions);

  const boardedCount = closure.boardedCount || passList.filter((p) => p.status === 'boarded').length;
  const missedCount = closure.missedCount || passList.filter((p) => p.status === 'missed').length;
  const cancelledCount = closure.cancelledCount || passList.filter((p) => p.status === 'cancelled').length;

  const attendancePercent = totalPeopleScheduled > 0 ? Math.round((boardedCount / totalPeopleScheduled) * 100) : 100;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/60 p-2 sm:p-4 overflow-y-auto backdrop-blur-xs print:p-0 print:bg-transparent print:static print:block">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:w-full print:max-w-none my-auto print:my-0 border border-slate-200">
        {/* Header Toolbar (Não sai na impressão) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0 rounded-t-xl border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <FileCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-lg">Termo Oficial de Fechamento de Viagem (TFD)</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              id="btn-print-closure"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir Fechamento
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="p-8 text-slate-800 text-xs font-sans bg-white overflow-y-auto flex-1 print:overflow-visible print:p-0 print:m-0">
          {/* Header Timbrado Oficial */}
          <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-start justify-between">
            <div>
              <h1 className="text-sm font-black uppercase text-slate-900">{config.municipalityName}</h1>
              <h2 className="text-xs font-bold text-emerald-800">{config.departmentName}</h2>
              <p className="text-[11px] text-slate-500">{config.address} • Fone: {config.phone}</p>
              <p className="text-xs font-bold text-slate-900 mt-1 uppercase tracking-wide">
                TERMO OFICIAL DE FECHAMENTO E REGISTRO DE VIAGEM SANITÁRIA (TFD)
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white font-bold text-xs rounded">
                VIAGEM FINALIZADA
              </span>
              <p className="text-xs font-mono font-bold text-slate-900 mt-1.5">{trip.code}</p>
              <p className="text-[10px] text-slate-500">Registrado em: {closure.closedAt}</p>
            </div>
          </div>

          {/* Dados Gerais do Trajeto e Veículo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 mb-4 text-xs">
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Data da Viagem</span>
              <span className="font-bold text-slate-900">{formatDateBR(trip.departureDate)}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Cidade Destino</span>
              <span className="font-bold text-slate-900">{trip.destinationCity}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Veículo / Placa</span>
              <span className="font-bold text-slate-900">
                {vehicle ? `${vehicle.model} (${formatPlate(vehicle.plate)})` : 'Veículo Oficial'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Motorista Escalado</span>
              <span className="font-bold text-slate-900">{trip.driverName}</span>
            </div>

            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Horário Saída Real</span>
              <span className="font-bold text-slate-900">{closure.departureTimeActual || trip.departureTime}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Horário Retorno Real</span>
              <span className="font-bold text-slate-900">{closure.returnTimeActual}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Odômetro Saída / Chegada</span>
              <span className="font-bold text-slate-900 font-mono">{closure.startKm} km → {closure.endKm} km</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Quilometragem Total</span>
              <span className="font-black text-emerald-800 font-mono text-sm">{closure.totalKm} km</span>
            </div>
          </div>

          {/* Resumo de Frequência e Vistoria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* 1. Resumo de Frequência e Lotação */}
            <div className="border border-slate-200 rounded-lg p-3.5 bg-white">
              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider pb-1.5 border-b border-slate-100 mb-2 flex items-center justify-between">
                <span>1. Frequência dos Passageiros</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                  Efetividade: {attendancePercent}%
                </span>
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-600">Pacientes Agendados:</span>
                  <span className="font-bold text-slate-900">{totalPatients} pacientes</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-600">Acompanhantes Registrados:</span>
                  <span className="font-bold text-slate-900">{totalCompanions} acompanhantes</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-100 font-semibold text-slate-800">
                  <span>Total de Lugares Agendados:</span>
                  <span>{totalPeopleScheduled} pessoas</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-100 text-emerald-700 font-bold">
                  <span>Pessoas Embarcadas (Efetivo):</span>
                  <span>{boardedCount} pessoas</span>
                </div>
                <div className="flex justify-between py-0.5 text-rose-700">
                  <span>Faltas (No-Show sem aviso):</span>
                  <span className="font-bold">{missedCount} faltas</span>
                </div>
              </div>
            </div>

            {/* 2. Vistoria e Estado do Veículo */}
            <div className="border border-slate-200 rounded-lg p-3.5 bg-white">
              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider pb-1.5 border-b border-slate-100 mb-2">
                2. Vistoria e Estado do Veículo
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-600">Nível de Combustível no Retorno:</span>
                  <span className="font-bold text-slate-900">{closure.fuelLevelReturn || 'Cheio'}</span>
                </div>
                {closure.fuelLitres ? (
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-600">Combustível Abastecido (Litros):</span>
                    <span className="font-bold text-slate-900">{closure.fuelLitres} L</span>
                  </div>
                ) : null}
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-600">Higienização e Limpeza:</span>
                  <span className="font-bold text-slate-900">{closure.vehicleCleanliness || 'Bom'}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Alerta de Manutenção:</span>
                  <span className={`font-bold ${closure.vehicleMaintenanceAlert ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {closure.vehicleMaintenanceAlert ? '⚠️ REQUER MANUTENÇÃO' : '✓ Nenhuma Avaria'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Relatório de Ocorrências e Intercorrências Médicas */}
          <div className="border border-slate-200 rounded-lg p-3.5 mb-4 bg-white">
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-1.5">
              3. Relatório Oficial de Ocorrências e Intercorrências Médicas no Trajeto
            </h4>
            <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
              {closure.incidents || 'Viagem realizada sem intercorrências médicas. Todos os atendimentos foram concluídos.'}
            </p>
            {closure.driverNotes && (
              <p className="text-xs text-slate-600 mt-2 italic">
                Observação do Motorista: "{closure.driverNotes}"
              </p>
            )}
            {closure.vehicleMaintenanceNotes && (
              <p className="text-xs text-rose-700 font-medium mt-1">
                Nota de Manutenção: {closure.vehicleMaintenanceNotes}
              </p>
            )}
          </div>

          {/* Lista Resumida dos Passageiros e Presença para Arquivo */}
          <div className="mb-6">
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-2">
              4. Lista de Chamada e Presença dos Pacientes
            </h4>
            <table className="w-full text-left text-[11px] border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-200 text-slate-700">
                  <th className="py-1.5 px-2 border-r">Nº</th>
                  <th className="py-1.5 px-2 border-r">Paciente</th>
                  <th className="py-1.5 px-2 border-r">Acompanhante</th>
                  <th className="py-1.5 px-2 border-r">Destino / Procedimento</th>
                  <th className="py-1.5 px-2 text-center">Status Presença</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {passList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-2 text-center text-slate-400 italic">
                      Nenhum paciente listado
                    </td>
                  </tr>
                ) : (
                  passList.map((p, i) => (
                    <tr key={p.id || i} className="hover:bg-slate-50">
                      <td className="py-1 px-2 border-r text-center font-mono">{i + 1}</td>
                      <td className="py-1 px-2 border-r font-bold text-slate-900">{p.patientName}</td>
                      <td className="py-1 px-2 border-r text-slate-600">{p.companionIncluded ? p.companionName : '-'}</td>
                      <td className="py-1 px-2 border-r text-slate-700">{p.destinationName} ({p.appointmentTime})</td>
                      <td className="py-1 px-2 text-center font-bold">
                        {p.status === 'boarded' ? (
                          <span className="text-emerald-700">✓ COMPARECEU</span>
                        ) : p.status === 'missed' ? (
                          <span className="text-rose-700">✕ FALTA (NO-SHOW)</span>
                        ) : (
                          <span className="text-slate-500">CANCELADO</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Assinaturas Digitais */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t-2 border-slate-300">
            <div className="text-center">
              <div className="border-b border-slate-400 h-8 mb-1.5"></div>
              <p className="font-bold text-slate-900">{trip.driverName}</p>
              <p className="text-[10px] text-slate-500">Motorista Responsável pela Viagem</p>
            </div>

            <div className="text-center">
              <div className="border-b border-slate-400 h-8 mb-1.5"></div>
              <p className="font-bold text-slate-900">{closure.closedBy}</p>
              <p className="text-[10px] text-slate-500">
                {closure.closedByRole || 'Coordenação de Transporte TFD'} {closure.closedByRegistration ? `(${closure.closedByRegistration})` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
