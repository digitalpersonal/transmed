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
  Bus
} from 'lucide-react';
import { Trip, Vehicle, ensurePassengerArray } from '../types';
import { formatDateBR, formatPlate, getPassengerStatusLabel } from '../utils/formatters';

interface BookingsViewProps {
  trips: Trip[];
  vehicles: Vehicle[];
  onOpenNewBookingModal: () => void;
  onPrintTicket: (trip: Trip, passengerId: string) => void;
  onCancelBooking: (tripId: string, passengerId: string) => void;
}

export const BookingsView: React.FC<BookingsViewProps> = ({
  trips,
  vehicles,
  onOpenNewBookingModal,
  onPrintTicket,
  onCancelBooking,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Flatten all passengers from all trips
  const allBookings = trips.flatMap((trip) =>
    ensurePassengerArray(trip.passengers).map((passenger) => ({
      trip,
      passenger,
      vehicle: vehicles.find((v) => v.id === trip.vehicleId),
    }))
  );

  const filteredBookings = useMemo(() => allBookings.filter(({ trip, passenger }) => {
    const term = searchTerm.toLowerCase().trim();
    const cleanDigits = term.replace(/\D/g, '');
    const matchSearch =
      !term ||
      (passenger.patientName || '').toLowerCase().includes(term) ||
      (cleanDigits && (passenger.patientCpf || '').replace(/\D/g, '').includes(cleanDigits)) ||
      (cleanDigits && (passenger.patientSus || '').replace(/\D/g, '').includes(cleanDigits)) ||
      (passenger.bookingCode || '').toLowerCase().includes(term) ||
      (passenger.destinationName || '').toLowerCase().includes(term) ||
      (trip.destinationCity || '').toLowerCase().includes(term) ||
      (passenger.companionName && passenger.companionName.toLowerCase().includes(term));

    const matchStatus = statusFilter === 'all' || passenger.status === statusFilter;
    return matchSearch && matchStatus;
  }), [allBookings, searchTerm, statusFilter]);

  const displayedBookings = useMemo(() => filteredBookings.slice(0, 50), [filteredBookings]);

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

        <button
          id="btn-bookings-new"
          onClick={onOpenNewBookingModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Agendamento</span>
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nome do paciente, CPF, cartão SUS, código ou destino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-emerald-600"
          />
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
                          <button
                            id={`btn-print-ticket-${passenger.id}`}
                            onClick={() => onPrintTicket(trip, passenger.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
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
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
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
        {filteredBookings.length > 50 && (
          <div className="bg-slate-50 border-t border-slate-200 p-3 text-center text-xs text-slate-500 font-medium">
            Exibindo os primeiros 50 resultados de {filteredBookings.length} encontrados. Utilize a busca para encontrar agendamentos específicos.
          </div>
        )}
      </div>
    </div>
  );
};
