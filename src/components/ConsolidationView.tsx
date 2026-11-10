import React, { useState, useMemo } from 'react';
import { 
  Bus, 
  ArrowRightLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Car,
  ChevronRight,
  MoreVertical,
  Printer,
  Ticket
} from 'lucide-react';
import { Trip, Vehicle, TripPassenger, ensurePassengerArray, Driver } from '../types';
import { formatDateBR, formatPlate } from '../utils/formatters';
import { MovePassengerModal } from './modals/MovePassengerModal';
import { TripDispatchModal } from './modals/TripDispatchModal';

interface ConsolidationViewProps {
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onMovePassenger: (sourceTripId: string, targetTripId: string, passengerId: string) => void;
  onDispatchTrip: (tripId: string, vehicleId: string, driverId: string, driverName: string, driverPhone: string) => void;
  onPrintManifest: (trip: Trip) => void;
  onOpenBookingModal: (tripId: string) => void;
}

export const ConsolidationView: React.FC<ConsolidationViewProps> = ({
  trips,
  vehicles,
  drivers,
  onMovePassenger,
  onDispatchTrip,
  onPrintManifest,
  onOpenBookingModal,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrow = tomorrowObj.toISOString().slice(0, 10);

  const [selectedDate, setSelectedDate] = useState<string>(tomorrow);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [movePassengerContext, setMovePassengerContext] = useState<{ passenger: TripPassenger; trip: Trip } | null>(null);
  const [dispatchTrip, setDispatchTrip] = useState<Trip | null>(null);

  const dateTrips = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return trips
      .filter(t => {
        if (t.status === 'cancelled') return false;

        if (term) {
          const matchCity = (t.destinationCity || '').toLowerCase().includes(term);
          const matchCode = (t.code || '').toLowerCase().includes(term);
          const matchDate = (t.departureDate || '').includes(term) || formatDateBR(t.departureDate).includes(term);
          const matchPatient = ensurePassengerArray(t.passengers).some(p => 
            (p.patientName || '').toLowerCase().includes(term) ||
            (p.patientCpf || '').includes(term) ||
            (p.companionName || '').toLowerCase().includes(term)
          );
          return matchCity || matchCode || matchDate || matchPatient;
        }

        return t.departureDate === selectedDate;
      })
      .sort((a, b) => {
        const dateCompare = (a.departureDate || '').localeCompare(b.departureDate || '');
        if (dateCompare !== 0) return dateCompare;
        return a.departureTime.localeCompare(b.departureTime);
      });
  }, [trips, selectedDate, searchTerm]);

  const totalPassengersOnDate = dateTrips.reduce((acc, t) => 
    acc + ensurePassengerArray(t.passengers).reduce((pAcc, p) => pAcc + 1 + (p.companionIncluded ? 1 : 0), 0)
  , 0);

  return (
    <div className="space-y-6">
      {/* Header e Seletor de Data / Busca */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="w-6 h-6 text-emerald-600" />
              Central de Logística & Consolidação de Viagens
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualize toda a demanda, mova passageiros entre carros e finalize as escalas de veículos.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <button
              onClick={() => { setSelectedDate(today); setSearchTerm(''); }}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                selectedDate === today && !searchTerm ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => { setSelectedDate(tomorrow); setSearchTerm(''); }}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                selectedDate === tomorrow && !searchTerm ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Amanhã
            </button>
            <div className="h-6 w-px bg-slate-300 mx-1"></div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setSearchTerm(''); }}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer px-2"
            />
          </div>
        </div>

        {/* Barra de Busca por Cidade, Data ou Paciente */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por cidade, data (ex: 15/05), código da viagem ou nome do paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-emerald-600 shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-700 font-bold"
            >
              Limpar busca ✕
            </button>
          )}
        </div>
      </div>

      {/* Resumo do Dia */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-900 text-white p-4 rounded-xl shadow-sm">
          <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Total de Viagens Exibidas</span>
          <div className="text-2xl font-black mt-0.5">{dateTrips.length}</div>
          <p className="text-[10px] text-emerald-200/70 mt-1">{searchTerm ? 'Filtradas por termo de busca' : `Programadas para ${formatDateBR(selectedDate)}`}</p>
        </div>
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Demanda de Passageiros</span>
          <div className="text-2xl font-black mt-0.5">{totalPassengersOnDate}</div>
          <p className="text-[10px] text-slate-400 mt-1">Incluindo acompanhantes autorizados</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Status das Escalas</span>
          <div className="text-2xl font-black text-slate-900 mt-0.5">
            {dateTrips.filter(t => !!t.vehicleId).length} / {dateTrips.length}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Viagens com veículo e motorista definidos</p>
        </div>
      </div>

      {/* Grid de Viagens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {dateTrips.length === 0 ? (
          <div className="lg:col-span-full py-20 bg-white rounded-xl border-2 border-dashed border-slate-200 text-center">
            <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <h4 className="text-slate-400 font-bold">Nenhuma viagem encontrada com os critérios informados.</h4>
          </div>
        ) : (
          dateTrips.map(trip => {
            const vehicle = vehicles.find(v => v.id === trip.vehicleId);
            const passList = ensurePassengerArray(trip.passengers);
            const occupied = passList.reduce((acc, p) => acc + 1 + (p.companionIncluded ? 1 : 0), 0);
            const maxCap = vehicle?.maxCapacity || 0;
            const isFull = maxCap > 0 && occupied >= maxCap;

            return (
              <div 
                key={trip.id} 
                className={`bg-white rounded-xl border-2 overflow-hidden shadow-sm flex flex-col transition-all ${
                  !trip.vehicleId ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                {/* Trip Header */}
                <div className={`p-4 border-b ${!trip.vehicleId ? 'bg-amber-50/50' : 'bg-slate-50/50'}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900 text-base">{trip.destinationCity}</h3>
                        <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold text-slate-500">
                          {trip.code}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-bold text-slate-700">
                          <Calendar className="w-3.5 h-3.5" /> {formatDateBR(trip.departureDate)}
                        </span>
                        <span className="flex items-center gap-1 font-bold text-slate-700">
                          <Clock className="w-3.5 h-3.5" /> {trip.departureTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {trip.departureLocation}
                        </span>
                      </div>
                    </div>
                    {!trip.vehicleId ? (
                      <button
                        onClick={() => setDispatchTrip(trip)}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
                      >
                        Escalar Carro
                      </button>
                    ) : (
                      <button
                        onClick={() => setDispatchTrip(trip)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-300 transition-colors cursor-pointer"
                      >
                        Alterar Carro
                      </button>
                    )}
                  </div>

                  {/* Vehicle Info */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${!trip.vehicleId ? 'bg-amber-100' : 'bg-sky-100'}`}>
                        <Car className={`w-4 h-4 ${!trip.vehicleId ? 'text-amber-700' : 'text-sky-700'}`} />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-900 leading-tight">
                          {vehicle ? vehicle.model : 'Aguardando Escala'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {trip.driverName || 'Sem motorista'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-black ${isFull ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {occupied} {maxCap > 0 ? `/ ${maxCap}` : ''} <span className="text-[10px] font-bold uppercase">Assentos</span>
                      </div>
                      <div className="w-24 h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                        <div 
                          className={`h-full transition-all ${isFull ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: maxCap > 0 ? `${Math.min(100, (occupied / maxCap) * 100)}%` : '0%' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Passenger List */}
                <div className="flex-1 overflow-y-auto max-h-[300px] p-2 space-y-1 bg-white">
                  <div className="px-2 py-1 flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-2">
                    <span>Passageiros Agendados</span>
                    <span>{passList.length} Pac.</span>
                  </div>
                  {passList.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-[11px] italic">Nenhum passageiro nesta rota.</p>
                  ) : (
                    passList.map(p => (
                      <div 
                        key={p.id}
                        className="group flex items-center justify-between p-2 rounded-lg border border-transparent hover:border-sky-200 hover:bg-sky-50 transition-all"
                      >
                        <div className="flex items-start gap-2 overflow-hidden">
                          <div className="mt-1 w-6 h-6 rounded bg-slate-100 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-slate-800 truncate" title={p.patientName}>
                              {p.patientName}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 truncate">
                              <span className="font-semibold text-sky-700">🏥 {p.destinationName}</span>
                              {p.companionIncluded && (
                                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 font-black">
                                  +Acomp
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setMovePassengerContext({ passenger: p, trip })}
                          className="p-1.5 opacity-0 group-hover:opacity-100 bg-white border border-slate-200 hover:border-sky-500 hover:text-sky-600 rounded shadow-xs transition-all cursor-pointer"
                          title="Mover para outra viagem"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Trip Footer Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onPrintManifest(trip)}
                      className="p-1.5 bg-white border border-slate-200 hover:border-sky-500 hover:text-sky-600 rounded shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                      title="Imprimir Manifesto de Bordo"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase">Manifesto</span>
                    </button>
                    <button
                      onClick={() => onOpenBookingModal(trip.id)}
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-sm transition-all cursor-pointer flex items-center gap-1"
                      title="Adicionar paciente de última hora"
                    >
                      <Ticket className="w-3.5 h-3.5 text-emerald-200" />
                      <span className="text-[10px] font-black uppercase">Agend. Urgente</span>
                    </button>
                  </div>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    trip.status === 'scheduled' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {trip.status === 'scheduled' ? 'Planejada' : 'Em Rota'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {movePassengerContext && (
        <MovePassengerModal
          passenger={movePassengerContext.passenger}
          currentTrip={movePassengerContext.trip}
          availableTrips={trips.filter(t => t.departureDate === selectedDate)}
          vehicles={vehicles}
          onClose={() => setMovePassengerContext(null)}
          onMove={(sourceId, targetId, passengerId) => {
            onMovePassenger(sourceId, targetId, passengerId);
            setMovePassengerContext(null);
          }}
        />
      )}

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
    </div>
  );
};
