import React from 'react';
import { 
  X, 
  User, 
  Calendar, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  HeartPulse, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Truck, 
  ExternalLink,
  MessageCircle,
  Ticket
} from 'lucide-react';
import { Patient, Trip, Vehicle, ensurePassengerArray } from '../../types';
import { calculateAge, formatCPF, formatDateBR, formatPhone, formatSUS } from '../../utils/formatters';

interface PatientHistoryModalProps {
  patient: Patient;
  trips: Trip[];
  vehicles: Vehicle[];
  onClose: () => void;
  onOpenNewBooking?: (patientId: string) => void;
}

export const PatientHistoryModal: React.FC<PatientHistoryModalProps> = ({
  patient,
  trips,
  vehicles,
  onClose,
  onOpenNewBooking,
}) => {
  // Find all trips where this patient was a passenger
  const patientBookings = trips.flatMap((trip) => {
    const passengers = ensurePassengerArray(trip.passengers);
    const matched = passengers.filter(
      (p) => p.patientId === patient.id || (patient.cpf && p.patientCpf === patient.cpf)
    );
    const vehicle = vehicles.find((v) => v.id === trip.vehicleId);

    return matched.map((passenger) => ({
      trip,
      passenger,
      vehicle,
    }));
  }).sort((a, b) => (b.trip.departureDate || '').localeCompare(a.trip.departureDate || ''));

  const totalTrips = patientBookings.length;
  const attendedCount = patientBookings.filter(b => b.passenger.status === 'boarded' || (b.trip.status === 'completed' && b.passenger.status !== 'missed' && b.passenger.status !== 'cancelled')).length;
  const missedCount = patientBookings.filter(b => b.passenger.status === 'missed').length;
  const confirmedFuture = patientBookings.filter(b => b.trip.status === 'scheduled' && b.passenger.status === 'confirmed').length;

  const rawPhone = (patient.whatsapp || patient.phone || '').replace(/\D/g, '');
  const hasPhone = rawPhone.length >= 8;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden my-6 border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white leading-tight">{patient.name}</h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded border border-emerald-500/30">
                  {patient.mobility}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Prontuário e Histórico Completo de Viagens no TFD
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-800">
          {/* Card Resumo do Paciente */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Documentos & Idade</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {patient.birthDate ? `${calculateAge(patient.birthDate)} anos (${formatDateBR(patient.birthDate)})` : 'Data não informada'}
              </p>
              <p className="text-slate-600 font-mono mt-0.5">CPF: {formatCPF(patient.cpf)}</p>
              <p className="text-emerald-800 font-mono font-semibold">SUS: {formatSUS(patient.susCard)}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Contato & Endereço</span>
              <p className="font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                {patient.phone ? formatPhone(patient.phone) : 'Sem telefone'}
              </p>
              <p className="text-slate-600 mt-1 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Embarque:</strong> {patient.boardingAddress || patient.address || 'Não cadastrado'}
                </span>
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Condição & Acompanhante</span>
              <span className="inline-block px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[11px] mt-0.5">
                {patient.condition}
              </span>
              {patient.companionRequired ? (
                <div className="mt-2 text-slate-700 bg-white p-2 rounded border border-slate-200">
                  <span className="font-bold text-emerald-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {patient.companionName || 'Acompanhante Autorizado'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {patient.companionKinship || 'Parentesco não especificado'}
                    {patient.companionCpf ? ` • CPF: ${formatCPF(patient.companionCpf)}` : ''}
                  </span>
                </div>
              ) : (
                <p className="text-slate-400 mt-2 italic">Não necessita de acompanhante</p>
              )}
            </div>
          </div>

          {/* Estatísticas de Frequência */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Total de Agendamentos</span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">{totalTrips}</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center shadow-xs">
              <span className="text-emerald-700 text-[10px] uppercase font-bold block">Compareceu / Concluídas</span>
              <span className="text-2xl font-black text-emerald-900 mt-0.5 block">{attendedCount}</span>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center shadow-xs">
              <span className="text-rose-700 text-[10px] uppercase font-bold block">Faltas (No-Show)</span>
              <span className="text-2xl font-black text-rose-900 mt-0.5 block">{missedCount}</span>
            </div>
            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-center shadow-xs">
              <span className="text-sky-700 text-[10px] uppercase font-bold block">Viagens Futuras</span>
              <span className="text-2xl font-black text-sky-900 mt-0.5 block">{confirmedFuture}</span>
            </div>
          </div>

          {/* Lista do Histórico de Viagens */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-700" />
                Histórico de Todas as Viagens do Paciente ({patientBookings.length})
              </h4>
              {onOpenNewBooking && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenNewBooking(patient.id);
                  }}
                  className="flex items-center gap-1 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Novo Agendamento</span>
                </button>
              )}
            </div>

            {patientBookings.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200">
                <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-600">Nenhuma viagem registrada para este paciente</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Os agendamentos futuros e passados aparecerão aqui automaticamente.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Data da Viagem</th>
                      <th className="py-2.5 px-3">Cidade / Hospital Destino</th>
                      <th className="py-2.5 px-3">Procedimento</th>
                      <th className="py-2.5 px-3">Veículo & Motorista</th>
                      <th className="py-2.5 px-3">Acompanhante</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {patientBookings.map(({ trip, passenger, vehicle }, idx) => {
                      const isPast = trip.departureDate < new Date().toISOString().slice(0, 10);
                      return (
                        <tr key={`${trip.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                            <span className="block font-bold">{formatDateBR(trip.departureDate)}</span>
                            <span className="text-[11px] text-slate-500 font-normal">Saída às {trip.departureTime}</span>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="font-bold text-emerald-950 block">{passenger.destinationCity || trip.destinationCity}</span>
                            <span className="text-[11px] text-slate-600">{passenger.destinationName}</span>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-800 block">{passenger.appointmentType}</span>
                            <span className="text-[10px] text-slate-500">Horário: {passenger.appointmentTime}</span>
                          </td>

                          <td className="py-2.5 px-3 text-[11px]">
                            <span className="font-medium text-slate-800 block">
                              {vehicle ? vehicle.model : 'Veículo Municipal'}
                            </span>
                            <span className="text-slate-500">{trip.driverName}</span>
                          </td>

                          <td className="py-2.5 px-3">
                            {passenger.companionIncluded ? (
                              <span className="font-semibold text-emerald-800 block">
                                {passenger.companionName || 'Sim (Autorizado)'}
                              </span>
                            ) : (
                              <span className="text-slate-400">Não</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              passenger.status === 'boarded' 
                                ? 'bg-emerald-100 text-emerald-800'
                                : passenger.status === 'missed'
                                ? 'bg-rose-100 text-rose-800'
                                : isPast
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-sky-100 text-sky-800'
                            }`}>
                              {passenger.status === 'boarded' 
                                ? 'Compareceu'
                                : passenger.status === 'missed'
                                ? 'Falta (No-Show)'
                                : isPast
                                ? 'Concluída'
                                : 'Confirmado'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0">
          <div className="text-slate-500 text-[11px]">
            {hasPhone && (
              <a
                href={`https://wa.me/55${rawPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-bold"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Conversar com o paciente no WhatsApp</span>
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
          >
            Fechar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
