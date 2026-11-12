import React, { useState, useMemo } from 'react';
import { 
  Bus, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  MapPin, 
  Printer, 
  FileSpreadsheet, 
  FileCheck, 
  Edit3, 
  Trash2, 
  UserCheck, 
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Navigation,
  MessageCircle,
  ArrowRightLeft,
  Ticket
} from 'lucide-react';
import { DestinationHospital, Trip, Vehicle, MunicipalConfig, ensurePassengerArray, TripPassenger, Driver } from '../types';
import { exportTripManifestToExcel } from '../utils/excel';
import { formatDateBR, formatPlate, getPassengerStatusLabel, getTripStatusLabel } from '../utils/formatters';
import { getWhatsAppConfirmationLink } from '../utils/whatsapp';
import { TripDispatchModal } from './modals/TripDispatchModal';
import { MovePassengerModal } from './modals/MovePassengerModal';
import { ConsolidationView } from './ConsolidationView';
import { BookingsView } from './BookingsView';

interface TripsViewProps {
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
  destinations: DestinationHospital[];
  config?: MunicipalConfig;
  onOpenNewTripModal: () => void;
  onEditTrip: (trip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
  onOpenNewBookingModal: (tripId?: string) => void;
  onPrintManifest: (trip: Trip) => void;
  onOpenClosureModal: (trip: Trip) => void;
  onPrintClosure: (trip: Trip) => void;
  onPrintPassengerTicket: (trip: Trip, passengerId: string) => void;
  onRemoveCompanion?: (tripId: string, passengerId: string) => void;
  onCleanupTrips?: () => void;
  onDispatchTrip: (tripId: string, vehicleId: string, driverId: string, driverName: string, driverPhone: string) => void;
  onMovePassenger: (sourceTripId: string, targetTripId: string, passengerId: string) => void;
  onCancelBooking: (tripId: string, passengerId: string) => void;
}

export const TripsView: React.FC<TripsViewProps> = ({
  trips,
  vehicles,
  drivers,
  destinations,
  config,
  onOpenNewTripModal,
  onEditTrip,
  onDeleteTrip,
  onOpenNewBookingModal,
  onPrintManifest,
  onOpenClosureModal,
  onPrintClosure,
  onPrintPassengerTicket,
  onRemoveCompanion,
  onCleanupTrips,
  onDispatchTrip,
  onMovePassenger,
  onCancelBooking,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'kanban' | 'bookings'>('list');

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  
  // New States for Workflow
  const [dispatchTrip, setDispatchTrip] = useState<Trip | null>(null);
  const [movePassengerContext, setMovePassengerContext] = useState<{ passenger: TripPassenger; trip: Trip } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const [dateFilter, setDateFilter] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'tomorrow' | 'week'>('all');

  const filteredTrips = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrowStr = tomorrowObj.toISOString().slice(0, 10);

    const nextWeekObj = new Date();
    nextWeekObj.setDate(nextWeekObj.getDate() + 7);
    const nextWeekStr = nextWeekObj.toISOString().slice(0, 10);

    const filtered = trips.filter((t) => {
      const term = searchTerm.toLowerCase().trim();
      const dateBr = formatDateBR(t.departureDate);
      const dateBrShort = dateBr.slice(0, 5);
      const dateIso = t.departureDate || '';

      const matchSearch =
        !term ||
        (t.code || '').toLowerCase().includes(term) ||
        (t.destinationCity || '').toLowerCase().includes(term) ||
        (t.destinationHospital || '').toLowerCase().includes(term) ||
        (t.driverName || '').toLowerCase().includes(term) ||
        (t.departureLocation || '').toLowerCase().includes(term) ||
        dateIso.includes(term) ||
        dateBr.includes(term) ||
        dateBrShort.includes(term) ||
        (term === 'hoje' && dateIso === todayStr) ||
        (term === 'amanha' && dateIso === tomorrowStr) ||
        (term === 'amanhã' && dateIso === tomorrowStr) ||
        ensurePassengerArray(t.passengers).some((p) => (p.patientName || '').toLowerCase().includes(term));

      let matchStatus = false;
      if (statusFilter === 'all') matchStatus = true;
      else if (statusFilter === 'open') matchStatus = t.status === 'scheduled' || t.status === 'in_route';
      else matchStatus = t.status === statusFilter;

      let matchDate = true;
      if (dateFilter) {
        matchDate = t.departureDate === dateFilter;
      } else if (datePreset === 'today') {
        matchDate = t.departureDate === todayStr;
      } else if (datePreset === 'tomorrow') {
        matchDate = t.departureDate === tomorrowStr;
      } else if (datePreset === 'week') {
        matchDate = t.departureDate >= todayStr && t.departureDate <= nextWeekStr;
      }
      
      return matchSearch && matchStatus && matchDate;
    });

    return filtered.sort((a, b) => {
      const today = new Date().toISOString().slice(0, 10);
      const isTodayA = a.departureDate === today;
      const isTodayB = b.departureDate === today;

      if (isTodayA && !isTodayB) return -1;
      if (!isTodayA && isTodayB) return 1;

      if (a.departureDate === b.departureDate) {
        return (a.departureTime || '').localeCompare(b.departureTime || '');
      }

      if (statusFilter === 'completed') {
        return (b.departureDate || '').localeCompare(a.departureDate || '');
      }

      return (a.departureDate || '').localeCompare(b.departureDate || '');
    });
  }, [trips, searchTerm, statusFilter, dateFilter, datePreset]);

  const totalPages = Math.ceil(filteredTrips.length / PAGE_SIZE);
  const displayedTrips = useMemo(() => 
    filteredTrips.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), 
  [filteredTrips, currentPage]);

  const toggleExpand = (tripId: string) => {
    setExpandedTripId((prev) => (prev === tripId ? null : tripId));
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tab Navigation */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Gestão de Viagens, Lotação & Logística</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gerencie rotas, feche romaneios de veículos, emita manifestos e controle todos os agendamentos
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onCleanupTrips && (
              <button
                type="button"
                onClick={() => onCleanupTrips()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold border border-amber-300 transition-colors cursor-pointer"
                title="Unifica passageiros duplicados nas viagens e recalcula assentos"
              >
                <UserCheck className="w-4 h-4 text-amber-700" />
                <span>Limpar Duplicados</span>
              </button>
            )}

            <button
              id="btn-trips-new"
              onClick={onOpenNewTripModal}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Agendar Nova Viagem</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => setActiveSubTab('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'list'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Bus className="w-4 h-4" />
            <span>Lista de Viagens & Lotação</span>
          </button>
          <button
            onClick={() => setActiveSubTab('kanban')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'kanban'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Central de Logística (Kanban)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('bookings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'bookings'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Lista de Agendamentos & Vouchers</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Lista de Viagens & Lotação */}
      {activeSubTab === 'list' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[240px] relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por código, cidade, hospital, motorista, paciente ou data (ex: 15/05)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-slate-800"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-emerald-50/70 border border-emerald-300 px-3 py-1 rounded-lg text-xs">
                <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-bold text-emerald-900 text-[11px] uppercase shrink-0">Data:</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setDatePreset('all');
                  }}
                  className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer text-xs"
                />
                {dateFilter && (
                  <button
                    type="button"
                    onClick={() => setDateFilter('')}
                    className="text-slate-400 hover:text-rose-600 font-bold ml-1 cursor-pointer text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white font-medium focus:outline-slate-800"
                >
                  <option value="open">Somente Viagens em Aberto</option>
                  <option value="all">Todos os Status</option>
                  <option value="scheduled">Apenas Agendadas</option>
                  <option value="in_route">Apenas Em Rota</option>
                  <option value="completed">Concluídas / Fechadas</option>
                  <option value="cancelled">Canceladas</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Período:</span>
                <button
                  type="button"
                  onClick={() => { setDatePreset('all'); setDateFilter(''); }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                    datePreset === 'all' && !dateFilter ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas ({trips.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setDatePreset('today'); setDateFilter(''); }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                    datePreset === 'today' && !dateFilter ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  📅 Hoje
                </button>
                <button
                  type="button"
                  onClick={() => { setDatePreset('tomorrow'); setDateFilter(''); }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                    datePreset === 'tomorrow' && !dateFilter ? 'bg-emerald-700 text-white shadow-xs' : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  Amanhã
                </button>
                <button
                  type="button"
                  onClick={() => { setDatePreset('week'); setDateFilter(''); }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                    datePreset === 'week' && !dateFilter ? 'bg-sky-700 text-white shadow-xs' : 'bg-sky-50 text-sky-900 border border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  Próximos 7 Dias
                </button>
              </div>

              {(dateFilter || datePreset !== 'all' || searchTerm || statusFilter !== 'open') && (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {filteredTrips.length} viagem(ns) encontrada(s)
                </span>
              )}
            </div>
          </div>

          {/* Trips Cards List */}
          <div className="space-y-4">
            {displayedTrips.length === 0 ? (
              <div className="p-12 bg-white rounded-xl border border-slate-200 text-center">
                <Bus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-slate-700 text-sm">Nenhuma viagem encontrada</h4>
                <p className="text-xs text-slate-400 mt-1">Ajuste os filtros ou crie um novo agendamento de viagem.</p>
              </div>
            ) : (
              displayedTrips.map((trip) => {
                const vehicle = vehicles.find((v) => v.id === trip.vehicleId);
                const maxCap = vehicle?.maxCapacity || 16;
                const tripPassList = ensurePassengerArray(trip.passengers);
                const totalPass = tripPassList.reduce((acc, p) => acc + 1 + (p.companionIncluded ? 1 : 0), 0);
                const freeSeats = maxCap - totalPass;
                const occupancyPercent = maxCap > 0 ? Math.round((totalPass / maxCap) * 100) : 0;
                const statusBadge = getTripStatusLabel(trip.status);
                const isExpanded = expandedTripId === trip.id;
                const isToday = trip.departureDate === new Date().toISOString().slice(0, 10);

                const resolvedHosp = trip.destinationHospital || (
                  trip.destinationIds && trip.destinationIds.length > 0
                    ? destinations.find(d => d.id === trip.destinationIds[0])?.name
                    : undefined
                );

                return (
                  <div
                    key={trip.id}
                    className={`rounded-xl border-2 overflow-hidden shadow-xs transition-shadow ${
                      isToday ? 'bg-amber-50/40 border-amber-400 ring-2 ring-amber-400/20 shadow-md' : 'bg-white border-slate-200 hover:shadow-md'
                    }`}
                  >
                    {isToday && (
                      <div className="flex items-center gap-1.5 text-amber-700 text-[10px] font-bold uppercase bg-amber-50 px-5 py-1.5 border-b border-amber-200">
                        <Calendar className="w-3 h-3" />
                        Viagem programada para HOJE
                      </div>
                    )}
                    
                    <div className="p-5 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex flex-col items-center justify-center font-bold shrink-0">
                            <span className="text-[10px] text-slate-400 uppercase">Saída</span>
                            <span className="text-sm leading-tight">{trip.departureTime}</span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-black text-slate-900">{trip.destinationCity}</h3>
                              {resolvedHosp && resolvedHosp !== trip.destinationCity && (
                                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  {resolvedHosp}
                                </span>
                              )}
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.bg}`}>
                                <span className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${statusBadge.dot}`}></span>
                                {statusBadge.label}
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-400">{trip.code}</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                              <span className="flex items-center gap-1 font-medium text-slate-800">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {formatDateBR(trip.departureDate)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                Origem: {trip.departureLocation}
                              </span>
                              {resolvedHosp && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                                  Destino: <strong className="text-emerald-800">{resolvedHosp}</strong>
                                </span>
                              )}
                              <span>
                                Motorista: <strong className="text-slate-800">{trip.driverName || 'Não designado'}</strong> {trip.driverPhone ? `(${trip.driverPhone})` : ''}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900">
                            {vehicle ? vehicle.model : 'Veículo não escalado'}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            Placa: {vehicle ? formatPlate(vehicle.plate) : 'A definir'}
                          </div>
                          <div className="mt-1">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              freeSeats <= 0 ? 'bg-rose-100 text-rose-800' : freeSeats <= 3 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {totalPass} de {maxCap} lugares ({freeSeats} livres)
                            </span>
                          </div>
                        </div>
                      </div>

                      {tripPassList.length > 0 && (
                        <div className="bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100/80 flex flex-wrap gap-2 items-center text-[11px] mt-1 mb-2">
                          <span className="text-emerald-800 font-bold flex items-center gap-1 shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                            <span>Roteiro de Paradas:</span>
                          </span>
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {Array.from(new Set(tripPassList.map(p => p.destinationName).filter(Boolean))).map((dest, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-white border border-emerald-200 rounded text-emerald-900 font-semibold text-[10px] shadow-2xs">
                                🏥 {dest}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            occupancyPercent >= 100 ? 'bg-rose-500' : occupancyPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, occupancyPercent)}%` }}
                        ></div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => toggleExpand(trip.id)}
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span>{tripPassList.length} paciente(s) agendado(s) ({totalPass} assentos)</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => onPrintManifest(trip)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            <span>Imprimir Manifesto</span>
                          </button>

                          <button
                            onClick={() => exportTripManifestToExcel(trip, vehicle)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-emerald-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Exportar Excel</span>
                          </button>

                          {trip.status !== 'completed' ? (
                            <>
                              <button
                                onClick={() => onOpenNewBookingModal(trip.id)}
                                disabled={freeSeats <= 0 && !!trip.vehicleId}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                  freeSeats <= 0 && !!trip.vehicleId ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                }`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Agendar Paciente</span>
                              </button>

                              {!trip.vehicleId ? (
                                <button
                                  onClick={() => setDispatchTrip(trip)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <Bus className="w-3.5 h-3.5 text-sky-400" />
                                  <span>Fechar Romaneio</span>
                                </button>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => setDispatchTrip(trip)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-300"
                                    title="Mudar veículo ou motorista desta viagem"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                    <span>Trocar Carro</span>
                                  </button>
                                  <button
                                    onClick={() => onOpenClosureModal(trip)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-emerald-300"
                                  >
                                    <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Registrar Km/Freq.</span>
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <button
                              onClick={() => onPrintClosure(trip)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>Ver Fechamento / Recibo</span>
                            </button>
                          )}

                          <button
                            onClick={() => onEditTrip(trip)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                            title="Editar detalhes"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setTripToDelete(trip)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                            title="Excluir viagem"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Detalhes Expandidos */}
                    {isExpanded && (
                      <div className="bg-slate-50 border-t border-slate-200 p-5 space-y-4 text-xs">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                            Passageiros Agendados nesta Viagem:
                          </h4>
                        </div>

                        {tripPassList.length === 0 ? (
                          <p className="text-slate-400 italic py-2">Nenhum paciente agendado para esta viagem.</p>
                        ) : (
                          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                  <th className="py-2.5 px-3">Cód.</th>
                                  <th className="py-2.5 px-3">Nome do Paciente</th>
                                  <th className="py-2.5 px-3">CPF / SUS</th>
                                  <th className="py-2.5 px-3">Acompanhante</th>
                                  <th className="py-2.5 px-3">Destino / Consulta</th>
                                  <th className="py-2.5 px-3">Status</th>
                                  <th className="py-2.5 px-3 text-center">Ações</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {tripPassList.map((p) => {
                                  const passBadge = getPassengerStatusLabel(p.status);
                                  return (
                                    <tr key={p.id} className="hover:bg-slate-50">
                                      <td className="py-2.5 px-3 font-mono font-bold text-slate-600 text-[11px]">{p.bookingCode}</td>
                                      <td className="py-2.5 px-3">
                                        <span className="font-bold text-slate-900 block">{p.patientName}</span>
                                        <span className="text-[10px] text-slate-500">Tel: {p.patientPhone}</span>
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                                        <div>{p.patientCpf}</div>
                                        <div className="text-slate-400 text-[10px]">SUS: {(p.patientSus || '').slice(0, 11)}...</div>
                                      </td>
                                      <td className="py-2.5 px-3">
                                        {p.companionIncluded ? (
                                          <span className="font-bold text-emerald-800">{p.companionName || 'Acompanhante'}</span>
                                        ) : (
                                          <span className="text-slate-400">Sem acomp.</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <div className="font-medium text-slate-900">{p.destinationName}</div>
                                        <div className="text-[10px] text-slate-500">{p.appointmentType} às {p.appointmentTime}</div>
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${passBadge.bg}`}>
                                          {passBadge.label}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <button
                                            onClick={() => setMovePassengerContext({ passenger: p, trip })}
                                            className="p-1.5 bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 rounded-lg transition-colors cursor-pointer"
                                            title="Mover paciente para outra viagem/carro"
                                          >
                                            <ArrowRightLeft className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => onPrintPassengerTicket(trip, p.id)}
                                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                                            title="Imprimir Comprovante"
                                          >
                                            <Printer className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {filteredTrips.length > PAGE_SIZE && (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <span className="text-xs text-slate-500 font-medium">
                  Exibindo {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredTrips.length)} de {filteredTrips.length} viagens
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-50 cursor-pointer"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-50 cursor-pointer"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Central de Logística (Kanban) */}
      {activeSubTab === 'kanban' && (
        <ConsolidationView
          trips={trips}
          vehicles={vehicles}
          drivers={drivers}
          onMovePassenger={onMovePassenger}
          onDispatchTrip={onDispatchTrip}
          onPrintManifest={onPrintManifest}
          onOpenBookingModal={onOpenNewBookingModal}
        />
      )}

      {/* Sub-Tab 3: Lista de Agendamentos & Vouchers */}
      {activeSubTab === 'bookings' && (
        <BookingsView
          trips={trips}
          vehicles={vehicles}
          config={config}
          onOpenNewBookingModal={onOpenNewBookingModal}
          onPrintTicket={onPrintPassengerTicket}
          onCancelBooking={onCancelBooking}
          onCleanupTrips={onCleanupTrips}
        />
      )}

      {/* Delete Confirmation Modal */}
      {tripToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Confirmar Exclusão de Viagem</h3>
            </div>
            <p className="text-sm text-slate-600">
              Tem certeza que deseja excluir a viagem <strong>{tripToDelete.code}</strong> com destino a <strong>{tripToDelete.destinationCity}</strong>?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setTripToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteTrip(tripToDelete.id);
                  setTripToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Sim, Excluir Viagem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {dispatchTrip && (
        <TripDispatchModal
          trip={dispatchTrip}
          vehicles={vehicles}
          drivers={drivers}
          onClose={() => setDispatchTrip(null)}
          onSave={(tripId, vehicleId, driverId, driverName, driverPhone) => {
            onDispatchTrip(tripId, vehicleId, driverId, driverName, driverPhone);
            setDispatchTrip(null);
          }}
        />
      )}

      {/* Move Passenger Modal */}
      {movePassengerContext && (
        <MovePassengerModal
          passenger={movePassengerContext.passenger}
          currentTrip={movePassengerContext.trip}
          availableTrips={trips}
          vehicles={vehicles}
          onClose={() => setMovePassengerContext(null)}
          onMove={(sourceId, targetId, passengerId) => {
            onMovePassenger(sourceId, targetId, passengerId);
            setMovePassengerContext(null);
          }}
        />
      )}
    </div>
  );
};
