import React, { useState } from 'react';
import { 
  X, 
  FileCheck, 
  Gauge, 
  Save, 
  Car, 
  Users
} from 'lucide-react';
import { Trip, TripClosure, Vehicle, ensurePassengerArray } from '../../types';
import { formatDateBR, formatPlate } from '../../utils/formatters';

interface TripClosureModalProps {
  trip: Trip;
  vehicle?: Vehicle;
  onSaveClosure: (
    tripId: string, 
    closure: TripClosure, 
    updatedPassengerStatuses: { id: string; status: 'confirmed' | 'boarded' | 'missed' | 'cancelled' }[]
  ) => void;
  onClose: () => void;
}

export const TripClosureModal: React.FC<TripClosureModalProps> = ({
  trip,
  vehicle,
  onSaveClosure,
  onClose,
}) => {
  const passList = ensurePassengerArray(trip.passengers);

  // Quilometragem e Horários
  const [startKm, setStartKm] = useState<number>(trip.closure?.startKm || vehicle?.currentKm || 0);
  const [endKm, setEndKm] = useState<number>(trip.closure?.endKm || (vehicle?.currentKm ? vehicle.currentKm + 280 : 280));
  const [departureTimeActual, setDepartureTimeActual] = useState<string>(
    trip.closure?.departureTimeActual || trip.departureTime || '06:00'
  );
  const [returnTimeActual, setReturnTimeActual] = useState<string>(
    trip.closure?.returnTimeActual || trip.estimatedReturnTime || '18:30'
  );

  // Vistoria do Veículo
  const [fuelLitres, setFuelLitres] = useState<number>(trip.closure?.fuelLitres || 0);
  const [fuelLevelReturn, setFuelLevelReturn] = useState<string>(trip.closure?.fuelLevelReturn || 'Cheio');
  const [vehicleCleanliness, setVehicleCleanliness] = useState<string>(trip.closure?.vehicleCleanliness || 'Bom');
  const [vehicleMaintenanceAlert, setVehicleMaintenanceAlert] = useState<boolean>(trip.closure?.vehicleMaintenanceAlert || false);
  const [vehicleMaintenanceNotes, setVehicleMaintenanceNotes] = useState<string>(trip.closure?.vehicleMaintenanceNotes || '');

  // Ocorrências e Responsável
  const [closedBy, setClosedBy] = useState<string>(trip.closure?.closedBy || 'Coordenação TFD / Gestão de Frota');
  const [closedByRole, setClosedByRole] = useState<string>(trip.closure?.closedByRole || 'Coordenador do TFD');
  const [closedByRegistration, setClosedByRegistration] = useState<string>(
    trip.closure?.closedByRegistration || 'Matrícula 4092-1'
  );
  const [incidents, setIncidents] = useState<string>(
    trip.closure?.incidents || 'Viagem concluída com sucesso. Todos os pacientes realizaram o atendimento sem intercorrências médicas no trajeto.'
  );
  const [driverNotes, setDriverNotes] = useState<string>(trip.closure?.driverNotes || '');

  // Estado da frequência dos passageiros
  const [passengerStatuses, setPassengerStatuses] = useState<Record<string, 'boarded' | 'missed' | 'cancelled'>>(() => {
    const initial: Record<string, 'boarded' | 'missed' | 'cancelled'> = {};
    passList.forEach((p) => {
      initial[p.id] = (p.status === 'missed' || p.status === 'cancelled') ? p.status : 'boarded';
    });
    return initial;
  });

  // Cálculos Automáticos
  const totalKm = Math.max(0, endKm - startKm);

  // Quantidade de pacientes e acompanhantes
  const totalPatientsCount = passList.length;
  const totalCompanionsCount = passList.filter((p) => p.companionIncluded).length;
  const totalPassengers = totalPatientsCount + totalCompanionsCount;

  // Embarcados
  const boardedPatientsCount = passList.filter((p) => passengerStatuses[p.id] === 'boarded').length;
  const boardedCompanionsCount = passList.filter((p) => passengerStatuses[p.id] === 'boarded' && p.companionIncluded).length;
  const boardedCount = boardedPatientsCount + boardedCompanionsCount;

  // Ausências e Cancelamentos
  const missedPatientsCount = passList.filter((p) => passengerStatuses[p.id] === 'missed').length;
  const missedCompanionsCount = passList.filter((p) => passengerStatuses[p.id] === 'missed' && p.companionIncluded).length;
  const missedCount = missedPatientsCount + missedCompanionsCount;

  const cancelledPatientsCount = passList.filter((p) => passengerStatuses[p.id] === 'cancelled').length;
  const cancelledCompanionsCount = passList.filter((p) => passengerStatuses[p.id] === 'cancelled' && p.companionIncluded).length;
  const cancelledCount = cancelledPatientsCount + cancelledCompanionsCount;

  const attendanceRate = totalPassengers > 0 ? Math.round((boardedCount / totalPassengers) * 100) : 100;

  const handleStatusChange = (passengerId: string, status: 'boarded' | 'missed' | 'cancelled') => {
    setPassengerStatuses((prev) => ({ ...prev, [passengerId]: status }));
  };

  const handleMarkAllBoarded = () => {
    const updated: Record<string, 'boarded' | 'missed' | 'cancelled'> = {};
    passList.forEach((p) => {
      updated[p.id] = 'boarded';
    });
    setPassengerStatuses(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const closure: TripClosure = {
      id: trip.closure?.id || `clo-${Date.now()}`,
      tripId: trip.id,
      closedAt: new Date().toLocaleString('pt-BR'),
      closedBy: closedBy.trim(),
      closedByRole: closedByRole.trim(),
      closedByRegistration: closedByRegistration.trim(),

      startKm,
      endKm,
      totalKm,
      departureTimeActual,
      returnTimeActual,

      totalPassengers,
      totalPatientsCount,
      totalCompanionsCount,
      boardedCount,
      boardedPatientsCount,
      boardedCompanionsCount,
      missedCount,
      cancelledCount,

      fuelLitres,
      fuelLevelReturn,
      vehicleCleanliness,
      vehicleMaintenanceAlert,
      vehicleMaintenanceNotes: vehicleMaintenanceNotes.trim() || undefined,

      incidents: incidents.trim(),
      driverNotes: driverNotes.trim() || undefined,
    };

    const updatedStatuses = Object.entries(passengerStatuses).map(([id, status]) => ({
      id,
      status,
    }));

    onSaveClosure(trip.id, closure, updatedStatuses);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <FileCheck className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="font-bold text-lg leading-tight">Fechamento e Registro Oficial da Viagem</h3>
              <p className="text-xs text-slate-300">
                Viagem: <span className="font-mono font-bold text-emerald-300">{trip.code}</span> • Destino: <strong>{trip.destinationCity}</strong> ({formatDateBR(trip.departureDate)})
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 text-slate-800 max-h-[82vh] overflow-y-auto space-y-6 text-xs">
          
          {/* Card Resumo da Capacidade / Indicadores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-slate-900 text-white rounded-xl shadow-sm">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Agendados</span>
              <div className="text-lg font-black text-white flex items-baseline gap-1">
                {totalPassengers} <span className="text-[10px] text-slate-400 font-normal">pessoas</span>
              </div>
              <p className="text-[10px] text-slate-400">
                {totalPatientsCount} pac. + {totalCompanionsCount} acomp.
              </p>
            </div>

            <div>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase block">Efetivo Embarcado</span>
              <div className="text-lg font-black text-emerald-300 flex items-baseline gap-1">
                {boardedCount} <span className="text-[10px] text-emerald-400 font-normal">transportados</span>
              </div>
              <p className="text-[10px] text-emerald-400 font-medium">
                {boardedPatientsCount} pac. + {boardedCompanionsCount} acomp.
              </p>
            </div>

            <div>
              <span className="text-[10px] text-rose-400 font-semibold uppercase block">Ausências / Faltas</span>
              <div className="text-lg font-black text-rose-300 flex items-baseline gap-1">
                {missedCount} <span className="text-[10px] text-rose-400 font-normal">ausentes</span>
              </div>
              <p className="text-[10px] text-rose-400 font-medium">
                Taxa de presença: {attendanceRate}%
              </p>
            </div>

            <div>
              <span className="text-[10px] text-sky-400 font-semibold uppercase block">Veículo & Placa</span>
              <div className="text-sm font-bold text-sky-200 mt-0.5 truncate">
                {vehicle ? vehicle.model : 'Veículo da Frota'}
              </div>
              <p className="text-[10px] font-mono text-sky-300">
                {vehicle ? formatPlate(vehicle.plate) : '-'} • {vehicle?.maxCapacity || 16} lugares
              </p>
            </div>
          </div>

          {/* 1. FREQUÊNCIA E PRESENÇA DOS PASSAGEIROS */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 shadow-xs">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2.5 mb-3 gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-700" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">1. Frequência e Chamada dos Passageiros Agendados</h4>
                  <p className="text-[11px] text-slate-500">Confirme quem realmente embarcou na viagem e justifique eventuais faltas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleMarkAllBoarded}
                className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border border-emerald-300"
              >
                ✓ Marcar Todos como Compareceram
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {passList.length === 0 ? (
                <p className="text-slate-400 italic py-4 text-center">Nenhum passageiro vinculado a esta viagem.</p>
              ) : (
                passList.map((p, idx) => {
                  const currentStat = passengerStatuses[p.id] || 'boarded';
                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-lg border flex flex-wrap items-center justify-between gap-3 transition-colors ${
                        currentStat === 'boarded'
                          ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs'
                          : currentStat === 'missed'
                          ? 'bg-rose-50/80 border-rose-300'
                          : 'bg-slate-100 border-slate-300'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-500 text-[11px]">#{idx + 1}</span>
                          <span className="font-bold text-slate-900 text-xs">{p.patientName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600">
                            Cód: {p.bookingCode}
                          </span>
                        </div>

                        {p.companionIncluded && (
                          <div className="text-[11px] text-slate-700 font-medium pl-5 flex items-center gap-1">
                            <span>↳ Acompanhante:</span>
                            <strong className="text-slate-900">{p.companionName || 'Acompanhante Registrado'}</strong>
                            <span className="text-slate-500 text-[10px]">({p.companionKinship || 'Acompanhante'})</span>
                          </div>
                        )}

                        <div className="text-[10px] text-slate-500 pl-5">
                          Destino: <strong className="text-slate-700">{p.destinationName}</strong> • {p.appointmentType} ({p.appointmentTime})
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(p.id, 'boarded')}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            currentStat === 'boarded'
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-emerald-50'
                          }`}
                        >
                          ✓ Compareceu {p.companionIncluded ? '(+1 acomp)' : ''}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(p.id, 'missed')}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            currentStat === 'missed'
                              ? 'bg-rose-700 text-white shadow-xs'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-rose-50'
                          }`}
                        >
                          ✕ Falta (No-Show)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(p.id, 'cancelled')}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                            currentStat === 'cancelled'
                              ? 'bg-slate-700 text-white'
                              : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Cancelou
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. QUILOMETRAGEM E HORÁRIOS EFETIVOS */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
              <Gauge className="w-4 h-4 text-sky-700" />
              2. Quilometragem e Horários Efetivos de Trajeto
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Saída Efetiva *</label>
                <input
                  type="time"
                  required
                  value={departureTimeActual}
                  onChange={(e) => setDepartureTimeActual(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-bold focus:outline-sky-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Retorno Efetivo *</label>
                <input
                  type="time"
                  required
                  value={returnTimeActual}
                  onChange={(e) => setReturnTimeActual(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-bold focus:outline-sky-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Km Inicial Odômetro *</label>
                <input
                  type="number"
                  required
                  value={startKm}
                  onChange={(e) => setStartKm(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono focus:outline-sky-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Km Final Odômetro *</label>
                <input
                  type="number"
                  required
                  value={endKm}
                  onChange={(e) => setEndKm(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono focus:outline-sky-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Km Total Percorrido</label>
                <div className="px-3 py-2 bg-sky-100 border border-sky-300 rounded-lg font-black font-mono text-sky-900 text-sm">
                  {totalKm} km
                </div>
              </div>
            </div>
          </div>

          {/* 3. VISTORIA DO VEÍCULO E CONDIÇÕES DE RETORNO */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 shadow-xs space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
              <Car className="w-4 h-4 text-slate-700" />
              3. Vistoria e Estado do Veículo no Retorno
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nível de Combustível no Retorno</label>
                <select
                  value={fuelLevelReturn}
                  onChange={(e) => setFuelLevelReturn(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:outline-slate-700"
                >
                  <option value="Cheio">Cheio (Tanque Cheio)</option>
                  <option value="3/4">3/4 de Tanque</option>
                  <option value="1/2">1/2 de Tanque</option>
                  <option value="1/4">1/4 de Tanque</option>
                  <option value="Reserva">Nível Crítico / Reserva</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Limpeza Interna do Veículo</label>
                <select
                  value={vehicleCleanliness}
                  onChange={(e) => setVehicleCleanliness(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:outline-slate-700"
                >
                  <option value="Excelente">Excelente (Higienizado)</option>
                  <option value="Bom">Bom (Estado Normal)</option>
                  <option value="Necessita Limpeza">Necessita Lavagem / Higienização</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vehicleMaintenanceAlert}
                    onChange={(e) => setVehicleMaintenanceAlert(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                  />
                  <span className="text-rose-700">Requer Manutenção Preventiva / Oficina</span>
                </label>
              </div>
            </div>

            {vehicleMaintenanceAlert && (
              <div>
                <label className="block font-semibold text-rose-800 mb-1">Detalhes de Manutenção Recomendada *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Barulho ao frear, alinhamento necessário, lâmpada queimada..."
                  value={vehicleMaintenanceNotes}
                  onChange={(e) => setVehicleMaintenanceNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-rose-300 bg-rose-50 rounded-lg text-slate-900 focus:outline-rose-600"
                />
              </div>
            )}
          </div>

          {/* 4. RELATÓRIO DE OCORRÊNCIAS E RESPONSÁVEL */}
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Relatório Oficial de Ocorrências Médicas e Percurso *
              </label>
              <textarea
                rows={2}
                required
                placeholder="Registre emergências de saúde, atrasos em consultas médicas, desvios ou ocorrências de trânsito..."
                value={incidents}
                onChange={(e) => setIncidents(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-slate-700 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Servidor Responsável pelo Fechamento *</label>
                <input
                  type="text"
                  required
                  value={closedBy}
                  onChange={(e) => setClosedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Cargo / Função *</label>
                <input
                  type="text"
                  required
                  value={closedByRole}
                  onChange={(e) => setClosedByRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Matrícula / Registro do Servidor</label>
                <input
                  type="text"
                  value={closedByRegistration}
                  onChange={(e) => setClosedByRegistration(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-slate-700 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Observações Gerais do Motorista ({trip.driverName})</label>
              <input
                type="text"
                placeholder="Anotações do motorista ao encerrar o turno..."
                value={driverNotes}
                onChange={(e) => setDriverNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-slate-700"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="text-slate-500 text-[11px]">
              * Os dados deste termo serão salvos com carimbo de data para controle oficial.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-confirm-closure"
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Finalizar e Registrar Fechamento Oficial
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
