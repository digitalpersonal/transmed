import React, { useMemo } from 'react';
import { 
  Bus, 
  Users, 
  Calendar, 
  Ticket, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  Plus, 
  Printer, 
  MapPin, 
  TrendingUp, 
  ShieldCheck, 
  FileCheck,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import { DestinationHospital, MunicipalConfig, Patient, Trip, Vehicle, ensurePassengerArray } from '../types';
import { formatDateBR, formatPlate, getTripStatusLabel, getVehicleTypeLabel } from '../utils/formatters';

interface DashboardViewProps {
  trips: Trip[];
  patients: Patient[];
  vehicles: Vehicle[];
  destinations: DestinationHospital[];
  config: MunicipalConfig;
  onNavigateTab: (tab: 'trips' | 'bookings' | 'patients' | 'vehicles' | 'reports') => void;
  onOpenNewBookingModal: (tripId?: string) => void;
  onOpenNewTripModal: () => void;
  onOpenNewPatientModal: () => void;
  onOpenImportExcelModal: () => void;
  onPrintManifest: (trip: Trip) => void;
  onOpenClosureModal: (trip: Trip) => void;
  onClearSystem: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  trips,
  patients,
  vehicles,
  destinations,
  config,
  onNavigateTab,
  onOpenNewBookingModal,
  onOpenNewTripModal,
  onOpenNewPatientModal,
  onOpenImportExcelModal,
  onPrintManifest,
  onOpenClosureModal,
  onClearSystem,
}) => {
  const scheduledTrips = useMemo(() => trips.filter((t) => t.status === 'scheduled' || t.status === 'in_route'), [trips]);
  const completedTrips = useMemo(() => trips.filter((t) => t.status === 'completed'), [trips]);
  
  // Total passengers across scheduled trips
  const totalScheduledPassengers = useMemo(() => scheduledTrips.reduce((acc, t) => {
    return acc + ensurePassengerArray(t.passengers).reduce((pAcc, p) => pAcc + 1 + (p.companionIncluded ? 1 : 0), 0);
  }, 0), [scheduledTrips]);

  // Total seat capacity of active scheduled trips
  const totalScheduledCapacity = useMemo(() => scheduledTrips.reduce((acc, t) => {
    const veh = vehicles.find((v) => v.id === t.vehicleId);
    return acc + (veh?.maxCapacity || 0);
  }, 0), [scheduledTrips, vehicles]);

  const averageOccupancy = totalScheduledCapacity > 0
    ? Math.round((totalScheduledPassengers / totalScheduledCapacity) * 100)
    : 0;

  const availableVehiclesCount = useMemo(() => vehicles.filter((v) => v.status === 'available').length, [vehicles]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Call to Action */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30 mb-2.5">
            PAINEL OPERACIONAL TFD
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Gestão Integrada de Transporte Sanitário e Pacientes
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Controle de lotação máxima por veículo, cadastro com cartão SUS e acompanhantes, emissão de comprovantes com canhoto e fechamento de viagens.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4 pt-2">
            <button
              id="btn-quick-new-booking"
              onClick={() => onOpenNewBookingModal(scheduledTrips[0]?.id)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition-colors cursor-pointer"
            >
              <Ticket className="w-4 h-4" />
              Novo Agendamento de Paciente
            </button>

            <button
              id="btn-quick-new-trip"
              onClick={onOpenNewTripModal}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold border border-slate-600 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Agendar Nova Viagem
            </button>

            <button
              id="btn-quick-import-excel"
              onClick={onOpenImportExcelModal}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-bold border border-emerald-500/40 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Importar Planilha Excel
            </button>
            <button
              onClick={onClearSystem}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-900/80 hover:bg-rose-800 text-rose-200 rounded-lg text-xs font-bold border border-rose-500/40 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Tudo
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div 
          onClick={() => onNavigateTab('trips')}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-sky-300 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold uppercase">Viagens em Aberto</span>
            <div className="w-9 h-9 bg-sky-50 text-sky-700 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <Bus className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{scheduledTrips.length}</span>
            <span className="text-xs text-sky-700 font-medium">em aberto</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {completedTrips.length} viagens já concluídas
          </p>
        </div>

        {/* Card 2 */}
        <div 
          onClick={() => onNavigateTab('bookings')}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold uppercase">Pacientes Agendados</span>
            <div className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalScheduledPassengers}</span>
            <span className="text-xs text-emerald-700 font-medium">lugares reservados</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {patients.length} pacientes na base total
          </p>
        </div>

        {/* Card 3 */}
        <div 
          onClick={() => onNavigateTab('trips')}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-amber-300 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold uppercase">Ocupação da Frota</span>
            <div className="w-9 h-9 bg-amber-50 text-amber-700 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{averageOccupancy}%</span>
            <span className="text-xs text-slate-500 font-medium">
              ({totalScheduledPassengers}/{totalScheduledCapacity || 0} assentos)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className={`h-1.5 rounded-full ${
                averageOccupancy > 90 ? 'bg-rose-500' : averageOccupancy > 70 ? 'bg-emerald-500' : 'bg-sky-500'
              }`}
              style={{ width: `${Math.min(100, averageOccupancy)}%` }}
            ></div>
          </div>
        </div>

        {/* Card 4 */}
        <div 
          onClick={() => onNavigateTab('vehicles')}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-400 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold uppercase">Frota Municipal</span>
            <div className="w-9 h-9 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <Bus className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{vehicles.length}</span>
            <span className="text-xs text-slate-600 font-medium">veículos totais</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            {availableVehiclesCount} disponíveis na garagem
          </p>
        </div>
      </div>

      {/* Main Grid: Próximas Viagens e Controle de Lotação */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Viagens em Aberto e Status de Lotação */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Viagens em Aberto & Lotação</h3>
              <p className="text-xs text-slate-500">Acompanhe vagas livres, assentos ocupados e emita manifestos</p>
            </div>
            <button
              onClick={() => onNavigateTab('trips')}
              className="flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-900 cursor-pointer"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {scheduledTrips.length === 0 ? (
              <div className="p-8 bg-white rounded-xl border border-slate-200 text-center">
                <Bus className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-sm">Nenhuma viagem agendada no momento</p>
                <p className="text-xs text-slate-400 mt-1">Clique em Nova Viagem para programar itinerários</p>
                <button
                  onClick={onOpenNewTripModal}
                  className="mt-3 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer"
                >
                  + Agendar Nova Viagem
                </button>
              </div>
            ) : (
              scheduledTrips.map((trip) => {
                const isToday = trip.departureDate === new Date().toISOString().slice(0, 10);
                const vehicle = vehicles.find((v) => v.id === trip.vehicleId);
                const maxCap = vehicle?.maxCapacity || 16;
                const passList = ensurePassengerArray(trip.passengers);
                const totalPass = passList.reduce((acc, p) => acc + 1 + (p.companionIncluded ? 1 : 0), 0);
                const freeSeats = maxCap - totalPass;
                const occupancyPercent = maxCap > 0 ? Math.round((totalPass / maxCap) * 100) : 0;
                const statusBadge = getTripStatusLabel(trip.status);

                return (
                  <div
                    key={trip.id}
                    className={`p-4 bg-white rounded-xl border ${isToday ? 'border-amber-400 ring-1 ring-amber-400' : 'border-slate-200'} hover:shadow-md transition-shadow space-y-3`}
                  >
                    {isToday && (
                      <div className="flex items-center gap-1.5 text-amber-700 text-[10px] font-bold uppercase mb-2 bg-amber-50 px-2 py-1 rounded">
                        <Calendar className="w-3 h-3" />
                        Viagem programada para HOJE
                      </div>
                    )}
                    {/* Linha Superior */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-800 shrink-0 font-mono font-bold text-xs">
                          {trip.departureTime}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 text-sm">{trip.destinationCity}</span>
                            {trip.destinationHospital && trip.destinationHospital !== trip.destinationCity && (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                {trip.destinationHospital}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge.bg}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Saída: <strong>{formatDateBR(trip.departureDate)}</strong> às <strong>{trip.departureTime}</strong> • {trip.departureLocation}
                            {trip.destinationHospital && (
                              <span className="block text-[11px] text-emerald-800 font-medium mt-0.5">
                                Destino: {trip.destinationHospital}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono text-slate-400 block">{trip.code}</span>
                        <span className="text-xs font-bold text-slate-700">
                          {vehicle?.model} ({vehicle ? formatPlate(vehicle.plate) : 'N/A'})
                        </span>
                      </div>
                    </div>

                    {/* Barra de Progresso de Lotação */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="text-slate-600 font-semibold">
                          Ocupação do Veículo ({totalPass} de {maxCap} lugares):
                        </span>
                        <span className={`font-bold ${
                          freeSeats <= 0 ? 'text-rose-600' : freeSeats <= 3 ? 'text-amber-600' : 'text-emerald-700'
                        }`}>
                          {freeSeats > 0 ? `${freeSeats} vagas disponíveis (${occupancyPercent}%)` : 'LOTAÇÃO MÁXIMA ATINGIDA'}
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            occupancyPercent >= 100 ? 'bg-rose-500' : occupancyPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, occupancyPercent)}%` }}
                        ></div>
                      </div>

                      {/* Lista resumida de passageiros */}
                      {passList.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap gap-1.5 items-center text-[11px]">
                          <span className="text-slate-400 font-medium">Passageiros:</span>
                          {passList.slice(0, 4).map((p) => (
                            <span key={p.id} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-medium">
                              {(p.patientName || '').split(' ')[0]} {(p.patientName || '').split(' ')[1] || ''}
                              {p.companionIncluded ? ' (+1 acomp)' : ''}
                            </span>
                          ))}
                          {passList.length > 4 && (
                            <span className="text-slate-500 font-bold">+{passList.length - 4} outros</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação da Viagem */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="text-[11px] text-slate-500">
                        Motorista: <strong>{trip.driverName}</strong> ({trip.driverPhone})
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onPrintManifest(trip)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="Imprimir lista de passageiros para o motorista"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span>Manifesto de Bordo</span>
                        </button>

                        <button
                          onClick={() => onOpenNewBookingModal(trip.id)}
                          disabled={freeSeats <= 0}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            freeSeats <= 0
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agendar Paciente</span>
                        </button>

                        <button
                          onClick={() => onOpenClosureModal(trip)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="Registrar Km, faltas e fechamento"
                        >
                          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Fechar Viagem</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna 3: Atalhos, Destinos e Procedimentos Mais Atendidos */}
        <div className="space-y-6">
          {/* Hospitais / Polos de Destino Frequentes */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-700" />
              Destinos e Polos Hospitalares (TFD)
            </h4>

            <div className="space-y-2">
              {(destinations || []).slice(0, 5).map((dest) => (
                <div key={dest.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                  <div className="font-bold text-slate-900">{dest.name}</div>
                  <div className="text-[11px] text-slate-500">{dest.city} - {dest.state}</div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(dest.specialties || []).slice(0, 3).map((spec, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Destaque: Pacientes com Necessidades Especiais */}
          <div className="bg-emerald-50/70 rounded-xl border border-emerald-200 p-4 space-y-3">
            <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Acessibilidade & Acompanhantes
            </h4>
            <p className="text-xs text-emerald-900">
              O sistema calcula automaticamente <strong>2 vagas</strong> quando o paciente tem direito a acompanhante, evitando que viagens fiquem superlotadas.
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-emerald-200 text-xs font-bold text-emerald-900">
              <span>Pacientes com Acompanhante:</span>
              <span>{patients.filter((p) => p.companionRequired).length} cadastrados</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
