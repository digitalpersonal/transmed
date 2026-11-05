import React, { useState, useMemo } from 'react';
import { 
  Ticket, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  Calendar, 
  User, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Trash2,
  Bus,
  MessageCircle,
  UserCheck
} from 'lucide-react';
import { Trip, Vehicle, MunicipalConfig, ensurePassengerArray } from '../types';
import { formatDateBR, formatPlate, getPassengerStatusLabel } from '../utils/formatters';
import { getWhatsAppConfirmationLink } from '../utils/whatsapp';

interface BookingsViewProps {
  trips: Trip[];
  vehicles: Vehicle[];
  config?: MunicipalConfig;
  onOpenNewBookingModal: () => void;
  onPrintTicket: (trip: Trip, passengerId: string) => void;
  onCancelBooking: (tripId: string, passengerId: string) => void;
  onCleanupTrips?: () => void;
}

export const BookingsView: React.FC<BookingsViewProps> = ({
  trips,
  vehicles,
  config,
  onOpenNewBookingModal,
  onPrintTicket,
  onCancelBooking,
  onCleanupTrips,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Helper to normalize Portuguese diacritics / accents
  const normalizeString = (str: string): string => {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  };

  // Flatten all passengers from all trips
  const allBookings = useMemo(() => {
    return trips.flatMap((trip) =>
      ensurePassengerArray(trip.passengers).map((passenger) => ({
        trip,
        passenger,
        vehicle: vehicles.find((v) => v.id === trip.vehicleId),
      }))
    );
  }, [trips, vehicles]);

  const filteredBookings = useMemo(() => {
    const term = normalizeString(searchTerm.trim());
    const cleanDigits = term.replace(/\D/g, '');

    const filtered = allBookings.filter(({ trip, passenger }) => {
      const matchSearch =
        !term ||
        normalizeString(passenger.patientName).includes(term) ||
        normalizeString(passenger.companionName || '').includes(term) ||
        (cleanDigits && (passenger.patientCpf || '').replace(/\D/g, '').includes(cleanDigits)) ||
        (cleanDigits && (passenger.patientSus || '').replace(/\D/g, '').includes(cleanDigits)) ||
        (cleanDigits && ((passenger.patientPhone || '') + (passenger.patientWhatsapp || '')).replace(/\D/g, '').includes(cleanDigits)) ||
        normalizeString(passenger.bookingCode).includes(term) ||
        normalizeString(trip.code || '').includes(term) ||
        normalizeString(passenger.destinationName).includes(term) ||
        normalizeString(trip.destinationCity).includes(term) ||
        normalizeString(passenger.patientAddress || '').includes(term) ||
        normalizeString(trip.driverName || '').includes(term);

      const matchStatus = statusFilter === 'all' || passenger.status === statusFilter;
      return matchSearch && matchStatus;
    });

    return filtered.sort((a, b) => {
      // Sort by departure date descending, then patient name
      if (a.trip.departureDate !== b.trip.departureDate) {
        return b.trip.departureDate.localeCompare(a.trip.departureDate);
      }
      return a.passenger.patientName.localeCompare(b.passenger.patientName, 'pt-BR');
    });
  }, [allBookings, searchTerm, statusFilter]);

  const displayedBookings = useMemo(() => filteredBookings.slice(0, 500), [filteredBookings]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Agendamentos & Emissão de Comprovantes</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pesquise agendamentos de pacientes, consulte assentos reservados e imprima a via oficial do paciente
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onCleanupTrips && (
            <button
              type="button"
              onClick={() => onCleanupTrips()}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold border border-amber-300 transition-colors cursor-pointer"
              title="Unifica agendamentos e passageiros repetidos nas viagens"
            >
              <UserCheck className="w-4 h-4 text-amber-700" />
              <span>Limpar Agendamentos Duplicados</span>
            </button>
          )}

          <button
            id="btn-bookings-new"
            onClick={onOpenNewBookingModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Digite qualquer parte do nome do paciente, CPF, cartão SUS, acompanhante, código ou destino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-emerald-600 font-semibold"
            autoFocus
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 font-bold text-xs"
              title="Limpar busca"
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
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white font-medium focus:outline-emerald-600"
          >
            <option value="all">Todos os Status</option>
            <option value="confirmed">Confirmados</option>
            <option value="boarded">Embarcados</option>
            <option value="missed">Faltas (No-Show)</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-3">Código</th>
                <th className="py-3 px-3">Paciente (SUS)</th>
                <th className="py-3 px-3">Acompanhante</th>
                <th className="py-3 px-3">Data da Viagem & Rota</th>
                <th className="py-3 px-3">Destino & Consulta</th>
                <th className="py-3 px-3">Veículo / Motorista</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Ticket className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600">Nenhum agendamento encontrado</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Clique em Novo Agendamento para vincular um paciente a uma viagem
                    </p>
                  </td>
                </tr>
              ) : (
                displayedBookings.map(({ trip, passenger, vehicle }) => {
                  const statusBadge = getPassengerStatusLabel(passenger.status);
                  const uniqueKey = passenger.bookingCode || `${trip.id}-${passenger.id}`;
                  return (
                    <tr key={uniqueKey} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-emerald-800">
                        {passenger.bookingCode}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block text-xs">
                          {passenger.patientName}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-mono">
                            CPF: {passenger.patientCpf}
                          </span>
                          {passenger.patientPhone && passenger.patientPhone.replace(/\D/g, '').length >= 8 && (
                            <a
                              href={`https://wa.me/55${passenger.patientPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-emerald-600 hover:text-emerald-800 underline font-semibold"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          SUS: {passenger.patientSus}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {passenger.companionIncluded ? (
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {passenger.companionName}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold">
                              {passenger.companionKinship || 'Acompanhante autorizado'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Sem acompanhante</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">
                          {formatDateBR(trip.departureDate)} às {trip.departureTime}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {trip.destinationCity}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900">{passenger.destinationName}</div>
                        <div className="text-[11px] text-emerald-800 font-bold">
                          {passenger.appointmentType} ({passenger.appointmentTime})
                        </div>
                      </td>

                      <td className="py-3 px-3 text-[11px]">
                        <div className="font-medium text-slate-800">
                          {vehicle ? vehicle.model : 'Veículo da Escala'}
                        </div>
                        <div className="text-slate-500">
                          {trip.driverName}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge.bg}`}>
                          {statusBadge.label}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {(() => {
                            const waLink = getWhatsAppConfirmationLink(passenger, trip, vehicle, config);
                            return waLink ? (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                                title="Enviar confirmação e local de embarque no WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">WhatsApp</span>
                              </a>
                            ) : null;
                          })()}

                          <button
                            id={`btn-print-ticket-${passenger.id}`}
                            onClick={() => onPrintTicket(trip, passenger.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="Imprimir Comprovante de Agendamento do Paciente"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Imprimir</span>
                          </button>

                          {passenger.status === 'confirmed' && trip.status === 'scheduled' && (
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Deseja cancelar o agendamento de ${passenger.patientName}? O assento será liberado.`
                                  )
                                ) {
                                  onCancelBooking(trip.id, passenger.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Cancelar agendamento e liberar vaga"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
          <div className="bg-slate-50 border-t border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
            <span className="text-slate-700">
              Exibindo <strong>{displayedBookings.length}</strong> de <strong>{filteredBookings.length}</strong> agendamento(s) encontrado(s)
              {searchTerm ? <span className="text-emerald-800 font-bold font-sans"> para "{searchTerm}"</span> : ''}.
            </span>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
              >
                Limpar Busca
              </button>
            )}
          </div>
      </div>
    </div>
  );
};
