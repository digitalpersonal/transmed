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
  ChevronUp
} from 'lucide-react';
import { DestinationHospital, Trip, Vehicle, ensurePassengerArray } from '../types';
import { exportTripManifestToExcel } from '../utils/excel';
import { formatDateBR, formatPlate, getPassengerStatusLabel, getTripStatusLabel } from '../utils/formatters';

interface TripsViewProps {
  trips: Trip[];
  vehicles: Vehicle[];
  destinations: DestinationHospital[];
  onOpenNewTripModal: () => void;
  onEditTrip: (trip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
  onOpenNewBookingModal: (tripId: string) => void;
  onPrintManifest: (trip: Trip) => void;
  onOpenClosureModal: (trip: Trip) => void;
  onPrintClosure: (trip: Trip) => void;
  onPrintPassengerTicket: (trip: Trip, passengerId: string) => void;
}

export const TripsView: React.FC<TripsViewProps> = ({
  trips,
  vehicles,
  destinations,
  onOpenNewTripModal,
  onEditTrip,
  onDeleteTrip,
  onOpenNewBookingModal,
  onPrintManifest,
  onOpenClosureModal,
  onPrintClosure,
  onPrintPassengerTicket,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);

  const filteredTrips = useMemo(() => trips.filter((t) => {
    const term = searchTerm.toLowerCase().trim();
    const matchSearch =
      !term ||
      (t.code || '').toLowerCase().includes(term) ||
      (t.destinationCity || '').toLowerCase().includes(term) ||
      (t.driverName || '').toLowerCase().includes(term) ||
      (t.departureLocation || '').toLowerCase().includes(term) ||
      ensurePassengerArray(t.passengers).some((p) => (p.patientName || '').toLowerCase().includes(term));

    let matchStatus = false;
    if (statusFilter === 'all') matchStatus = true;
    else if (statusFilter === 'open') matchStatus = t.status === 'scheduled' || t.status === 'in_route';
    else matchStatus = t.status === statusFilter;
    
    return matchSearch && matchStatus;
  }), [trips, searchTerm, statusFilter]);

  const displayedTrips = useMemo(() => filteredTrips.slice(0, 30), [filteredTrips]);

  const toggleExpand = (tripId: string) => {
    setExpandedTripId((prev) => (prev === tripId ? null : tripId));
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Programação de Viagens & Gestão de Lotação</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie rotas para hospitais, controle a capacidade máxima por veículo e emita manifestos de bordo
          </p>
        </div>

        <button
          id="btn-trips-new"
          onClick={onOpenNewTripModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Agendar Nova Viagem</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por código, cidade destino, paciente ou motorista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-slate-800"
          />
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

            return (
              <div
                key={trip.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow"
              >
                {/* Header Card da Viagem */}
                <div className="p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex flex-col items-center justify-center font-bold shrink-0">
                        <span className="text-[10px] text-slate-400 uppercase">Saída</span>
                        <span className="text-sm leading-tight">{trip.departureTime}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">{trip.destinationCity}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.bg}`}>
                            {statusBadge.label}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-400">
                            {trip.code}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1 font-medium text-slate-800">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatDateBR(trip.departureDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {trip.departureLocation}
                          </span>
                          <span>
                            Motorista: <strong className="text-slate-800">{trip.driverName}</strong> ({trip.driverPhone})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dados do Veículo e Lotação */}
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">
                        {vehicle?.model}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        Placa: {vehicle ? formatPlate(vehicle.plate) : 'N/A'}
                      </div>
                      <div className="mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          freeSeats <= 0
                            ? 'bg-rose-100 text-rose-800'
                            : freeSeats <= 3
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {totalPass} de {maxCap} lugares ({freeSeats} livres)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Ocupação */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        occupancyPercent >= 100 ? 'bg-rose-500' : occupancyPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, occupancyPercent)}%` }}
                    ></div>
                  </div>

                  {/* Toolbar de Ações */}
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
                        title="Imprimir Manifesto de Bordo"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        <span>Imprimir Manifesto</span>
                      </button>

                      <button
                        onClick={() => exportTripManifestToExcel(trip, vehicle)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-emerald-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Exportar Lista para Excel"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Exportar Excel</span>
                      </button>

                      {trip.status !== 'completed' ? (
                        <>
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
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Fechar Viagem</span>
                          </button>
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
                        title="Editar detalhes da viagem"
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

                {/* Detalhes Expandidos da Viagem: Relação de Passageiros e Fechamento */}
                {isExpanded && (
                  <div className="bg-slate-50 border-t border-slate-200 p-5 space-y-4 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Passageiros Agendados nesta Viagem:
                      </h4>
                      <span className="text-slate-500 text-[11px]">
                        Clique no ícone de impressora para emitir o comprovante individual do paciente
                      </span>
                    </div>

                    {tripPassList.length === 0 ? (
                      <p className="text-slate-400 italic py-2">
                        Nenhum paciente agendado para esta viagem até o momento.
                      </p>
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
                              <th className="py-2.5 px-3 text-center">Comprovante</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {tripPassList.map((p) => {
                              const passBadge = getPassengerStatusLabel(p.status);
                              return (
                                <tr key={p.id} className="hover:bg-slate-50">
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-600 text-[11px]">
                                    {p.bookingCode}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="font-bold text-slate-900 block">{p.patientName}</span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[10px] text-slate-500">Tel: {p.patientPhone}</span>
                                      {p.patientPhone && p.patientPhone.replace(/\D/g, '').length >= 8 && (
                                        <a
                                          href={`https://wa.me/55${p.patientPhone.replace(/\D/g, '')}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[10px] text-emerald-600 hover:text-emerald-800 underline font-semibold"
                                        >
                                          WhatsApp
                                        </a>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                                    <div>{p.patientCpf}</div>
                                    <div className="text-slate-400 text-[10px]">SUS: {(p.patientSus || '').slice(0, 11)}...</div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {p.companionIncluded ? (
                                      <div>
                                        <span className="font-bold text-emerald-800 block">
                                          {p.companionName}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                          {p.companionKinship || 'Acompanhante'}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400">Sem acompanhante</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="font-medium text-slate-900">{p.destinationName}</div>
                                    <div className="text-[10px] text-slate-500">
                                      {p.appointmentType} às {p.appointmentTime}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${passBadge.bg}`}>
                                      {passBadge.label}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <button
                                      onClick={() => onPrintPassengerTicket(trip, p.id)}
                                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition-colors cursor-pointer"
                                      title="Imprimir Comprovante de Agendamento do Paciente"
                                    >
                                      <Printer className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Se viagem possui fechamento registrado */}
                    {trip.closure && (
                      <div className="p-3 bg-emerald-50/80 rounded-lg border border-emerald-200 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-emerald-950 block">Viagem Fechada em {trip.closure.closedAt}</span>
                          <span className="text-[11px] text-emerald-800">
                            Km Total: {trip.closure.totalKm} km • Compareceram: {trip.closure.boardedCount} • Faltas: {trip.closure.missedCount}
                          </span>
                        </div>
                        <button
                          onClick={() => onPrintClosure(trip)}
                          className="flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-xs cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Imprimir Termo de Fechamento
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        {filteredTrips.length > 30 && (
          <div className="bg-slate-50 border border-slate-200 p-3 text-center text-xs text-slate-500 font-medium rounded-xl">
            Exibindo as primeiras 30 viagens de {filteredTrips.length} encontradas. Utilize a busca ou os filtros para resultados específicos.
          </div>
        )}
      </div>

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
              Tem certeza que deseja excluir a viagem <strong>{tripToDelete.code}</strong> com destino a <strong>{tripToDelete.destinationCity}</strong>? Esta ação removerá o agendamento permanentemente.
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
    </div>
  );
};
