import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, User, ShieldCheck, MapPin, Clock, AlertTriangle, Check, Ticket, Search } from 'lucide-react';
import { DestinationHospital, Patient, Trip, TripPassenger, Vehicle, ensurePassengerArray } from '../../types';
import { formatCPF, formatDateBR, formatPhone, formatPlate, formatSUS, generateBookingCode } from '../../utils/formatters';

interface BookingFormModalProps {
  preselectedTripId?: string;
  preselectedPatientId?: string;
  trips: Trip[];
  patients: Patient[];
  vehicles: Vehicle[];
  destinations: DestinationHospital[];
  onSaveBooking: (tripId: string, passenger: TripPassenger) => void;
  onClose: () => void;
  onOpenNewPatientModal?: () => void;
}

export const BookingFormModal: React.FC<BookingFormModalProps> = ({
  preselectedTripId,
  preselectedPatientId,
  trips,
  patients,
  vehicles,
  destinations,
  onSaveBooking,
  onClose,
  onOpenNewPatientModal,
}) => {
  const [selectedTripId, setSelectedTripId] = useState<string>(preselectedTripId || '');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(preselectedPatientId || '');
  const [patientSearch, setPatientSearch] = useState<string>('');
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when trip is preselected or selected
  useEffect(() => {
    if (selectedTripId && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [selectedTripId]);

  const [companionIncluded, setCompanionIncluded] = useState<boolean>(false);
  const [companionName, setCompanionName] = useState<string>('');
  const [companionCpf, setCompanionCpf] = useState<string>('');
  const [companionKinship, setCompanionKinship] = useState<string>('');
  
  const [destinationId, setDestinationId] = useState<string>('');
  const [appointmentTime, setAppointmentTime] = useState<string>('08:00');
  const [appointmentType, setAppointmentType] = useState<string>('Consulta Médica');
  const [notes, setNotes] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Active trips available for booking (scheduled or in_route)
  const availableTrips = trips.filter((t) => t.status === 'scheduled');

  // Filtered patients for selection
  const filteredPatients = patients.filter((p) => {
    const term = patientSearch.toLowerCase().trim();
    if (!term) return true;
    const cleanDigits = term.replace(/\D/g, '');
    return (
      (p.name || '').toLowerCase().includes(term) ||
      (cleanDigits && (p.cpf || '').includes(cleanDigits)) ||
      (cleanDigits && (p.susCard || '').includes(cleanDigits))
    );
  });

  const selectedTrip = trips.find((t) => t.id === selectedTripId);
  const selectedPatient = patients.find((p) => p.id === selectedPatientId);
  const selectedVehicle = vehicles.find((v) => v.id === selectedTrip?.vehicleId);

  // Calculate current seat capacity
  const currentOccupiedSeats = ensurePassengerArray(selectedTrip?.passengers).reduce(
    (acc, p) => acc + 1 + (p.companionIncluded ? 1 : 0),
    0
  );
  const maxCapacity = selectedVehicle?.maxCapacity || 0;
  const seatsNeeded = 1 + (companionIncluded ? 1 : 0);
  const seatsRemaining = maxCapacity - currentOccupiedSeats;
  const isOverbooking = maxCapacity > 0 && seatsNeeded > seatsRemaining;

  // When patient is selected, auto-fill default patient preferences
  useEffect(() => {
    if (selectedPatient) {
      setAppointmentType(selectedPatient.condition || 'Consulta Médica');
      if (selectedPatient.companionRequired) {
        setCompanionIncluded(true);
        setCompanionName(selectedPatient.companionName || '');
        setCompanionCpf(selectedPatient.companionCpf || '');
        setCompanionKinship(selectedPatient.companionKinship || '');
      } else {
        setCompanionIncluded(false);
      }
    }
  }, [selectedPatient]);

  // When trip is selected, pick default destination
  useEffect(() => {
    if (selectedTrip && selectedTrip.destinationIds?.length > 0) {
      setDestinationId(selectedTrip.destinationIds[0]);
    }
  }, [selectedTrip]);

  // Available destinations for selected trip
  const tripDestinations = destinations.filter(
    (d) => selectedTrip?.destinationIds?.includes(d.id) || destinations.length <= 6
  );

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedTripId) errs.trip = 'Selecione uma viagem programada';
    if (!selectedPatientId) errs.patient = 'Selecione um paciente cadastrado';
    if (!destinationId) errs.destination = 'Selecione o hospital ou clínica de atendimento';
    if (!appointmentTime) errs.appointmentTime = 'Horário do atendimento é obrigatório';
    if (companionIncluded && !companionName.trim()) {
      errs.companionName = 'Nome do acompanhante é obrigatório';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!selectedPatient || !selectedTrip) return;

    const destObj = destinations.find((d) => d.id === destinationId);

    // Auto calculate seat numbers
    const seatNumber = currentOccupiedSeats + 1;
    const companionSeatNumber = companionIncluded ? currentOccupiedSeats + 2 : undefined;

    const newPassenger: TripPassenger = {
      id: `pass-${Date.now()}`,
      bookingCode: generateBookingCode(),
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      patientBirthDate: selectedPatient.birthDate,
      patientCpf: formatCPF(selectedPatient.cpf),
      patientSus: formatSUS(selectedPatient.susCard),
      patientPhone: selectedPatient.phone,
      patientWhatsapp: selectedPatient.whatsapp || selectedPatient.phone,
      patientAddress: selectedPatient.boardingAddress || selectedPatient.address,
      mobility: selectedPatient.mobility,
      companionIncluded,
      companionName: companionIncluded ? companionName.trim() : undefined,
      companionBirthDate: companionIncluded ? selectedPatient.companionBirthDate : undefined,
      companionCpf: companionIncluded && companionCpf ? formatCPF(companionCpf) : undefined,
      companionAddress: companionIncluded ? (selectedPatient.companionAddress || selectedPatient.boardingAddress || selectedPatient.address) : undefined,
      companionKinship: companionIncluded ? companionKinship.trim() : undefined,
      destinationId: destObj?.id || 'dest-general',
      destinationName: destObj?.name || selectedTrip.destinationCity,
      destinationCity: destObj?.city || selectedTrip.destinationCity,
      appointmentTime,
      appointmentType,
      seatNumber,
      companionSeatNumber,
      status: 'confirmed',
      notes: notes.trim() || undefined,
      bookedAt: `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    };

    onSaveBooking(selectedTripId, newPassenger);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-800 text-white">
          <div className="flex items-center gap-2.5">
            <Ticket className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-bold text-lg">Novo Agendamento de Transporte de Paciente</h3>
              <p className="text-xs text-emerald-100">
                Alocação de vagas no veículo, controle de lotação e emissão de comprovante
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 text-slate-800 max-h-[80vh] overflow-y-auto space-y-4 text-xs">
          {/* Informações da Viagem Pré-selecionada (Exibe se vier de um atalho de viagem) */}
          {preselectedTripId && selectedTrip && selectedVehicle ? (
            <div className="bg-emerald-900 text-white rounded-xl p-4 shadow-md border border-emerald-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-emerald-300 text-[10px] font-extrabold tracking-wider uppercase block">
                  VIAGEM DE DESTINO SELECIONADA
                </span>
                <h4 className="text-base font-black tracking-tight text-white mt-0.5">
                  {selectedTrip.destinationCity} (TFD)
                </h4>
                <p className="text-emerald-100 text-[11px] mt-0.5">
                  Saída: <strong>{formatDateBR(selectedTrip.departureDate)}</strong> às <strong>{selectedTrip.departureTime}</strong> • {selectedTrip.departureLocation}
                </p>
                <p className="text-emerald-200/80 text-[10px] mt-1 font-medium">
                  Motorista: {selectedTrip.driverName} ({selectedTrip.driverPhone})
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="bg-emerald-850 px-3 py-2 rounded-lg border border-emerald-800 text-[11px]">
                  <span className="text-emerald-300 block text-[9px] uppercase font-bold">Veículo / Placa</span>
                  <strong>{selectedVehicle.model}</strong> <span className="font-mono text-emerald-200">({formatPlate(selectedVehicle.plate)})</span>
                </div>
                <div className="bg-emerald-850 px-3 py-2 rounded-lg border border-emerald-800 text-[11px]">
                  <span className="text-emerald-300 block text-[9px] uppercase font-bold">Lotação</span>
                  <strong>{currentOccupiedSeats} / {maxCapacity}</strong> <span className="text-emerald-200">({seatsRemaining} livres)</span>
                </div>
              </div>
            </div>
          ) : (
            /* Passo 1: Selecionar Viagem (Exibe se for agendamento geral sem viagem prévia) */
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60">
              <h4 className="font-bold text-slate-800 text-sm mb-2.5 flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  1. Seleção da Viagem / Rota
                </span>
                {selectedTrip && (
                  <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border">
                    {selectedTrip.code}
                  </span>
                )}
              </h4>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Selecione a Viagem Programada *</label>
                <select
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 font-medium focus:outline-emerald-600 ${
                    errors.trip ? 'border-rose-500' : 'border-slate-300'
                  }`}
                >
                  <option value="">Selecione uma viagem da lista...</option>
                  {availableTrips.map((t) => {
                    const veh = vehicles.find((v) => v.id === t.vehicleId);
                    const occupied = ensurePassengerArray(t.passengers).reduce((acc, p) => acc + 1 + (p.companionIncluded ? 1 : 0), 0);
                    const maxCap = veh?.maxCapacity || 0;
                    const free = maxCap - occupied;
                    return (
                      <option key={t.id} value={t.id}>
                        {formatDateBR(t.departureDate)} às {t.departureTime} → {t.destinationCity} | Veículo: {veh?.model} ({free} vagas livres de {maxCap})
                      </option>
                    );
                  })}
                </select>
                {errors.trip && <p className="text-rose-500 text-[11px] mt-0.5">{errors.trip}</p>}
              </div>

              {/* Painel de Lotação em Tempo Real */}
              {selectedTrip && selectedVehicle && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-slate-500 text-[11px]">Veículo / Placa:</span>
                    <p className="font-bold text-slate-900">{selectedVehicle.model} ({formatPlate(selectedVehicle.plate)})</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Motorista:</span>
                    <p className="font-bold text-slate-900">{selectedTrip.driverName}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Ocupação Atual:</span>
                    <p className="font-bold text-slate-900">
                      {currentOccupiedSeats} / {maxCapacity} assentos ocupados
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Vagas Restantes:</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                      seatsRemaining > 3 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {seatsRemaining > 0 ? `${seatsRemaining} vagas livres` : 'LOTADO'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {isOverbooking && (
            <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg flex items-center gap-2 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Atenção:</strong> Este agendamento requer {seatsNeeded} vaga(s), mas o veículo possui apenas {seatsRemaining} vaga(s) disponível(is).
              </span>
            </div>
          )}

          {/* Passo 2: Selecionar Paciente */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-700" />
                2. Paciente do Atendimento (SUS)
              </h4>
              {onOpenNewPatientModal && (
                <button
                  type="button"
                  onClick={onOpenNewPatientModal}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                >
                  + Cadastrar Novo Paciente
                </button>
              )}
            </div>

            {/* Campo de Busca Rápida de Paciente */}
            <div className="mb-2.5 relative">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Filtrar paciente por nome, CPF ou Cartão SUS..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Selecione o Paciente *</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 font-medium focus:outline-emerald-600 ${
                  errors.patient ? 'border-rose-500' : 'border-slate-300'
                }`}
              >
                <option value="">Selecione um paciente...</option>
                {filteredPatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} | CPF: {formatCPF(p.cpf)} | SUS: {formatSUS(p.susCard).slice(0, 12)}... {p.companionRequired ? '(Exige Acomp.)' : ''}
                  </option>
                ))}
              </select>
              {errors.patient && <p className="text-rose-500 text-[11px] mt-0.5">{errors.patient}</p>}
            </div>

            {/* Ficha Resumida do Paciente Selecionado */}
            {selectedPatient && (
              <div className="mt-3 p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 space-y-1.5">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-900 text-sm">{selectedPatient.name}</span>
                  <span className="px-2 py-0.5 bg-emerald-700 text-white rounded text-[10px] font-bold">
                    {selectedPatient.mobility}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-slate-700 text-[11px]">
                  <div>CPF: <strong className="font-mono">{formatCPF(selectedPatient.cpf)}</strong></div>
                  <div>Cartão SUS: <strong className="font-mono">{formatSUS(selectedPatient.susCard)}</strong></div>
                  <div>Contato: <strong>{formatPhone(selectedPatient.phone)}</strong></div>
                </div>
              </div>
            )}
          </div>

          {/* Passo 3: Acompanhante */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                3. Acompanhante nesta Viagem
              </h4>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={companionIncluded}
                  onChange={(e) => setCompanionIncluded(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <span className="font-bold text-slate-800 text-xs">Incluir Acompanhante (Reserva +1 Vaga)</span>
              </label>
            </div>

            {companionIncluded ? (
              <div className="space-y-3 bg-white p-3.5 rounded-lg border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Nome do Acompanhante *</label>
                    <input
                      type="text"
                      placeholder="Nome completo do acompanhante"
                      value={companionName}
                      onChange={(e) => setCompanionName(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 focus:outline-emerald-600 ${
                        errors.companionName ? 'border-rose-500' : 'border-slate-300'
                      }`}
                    />
                    {errors.companionName && <p className="text-rose-500 text-[11px] mt-0.5">{errors.companionName}</p>}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Grau de Parentesco / Vínculo</label>
                    <input
                      type="text"
                      placeholder="Ex: Filho(a), Cônjuge, Cuidador"
                      value={companionKinship}
                      onChange={(e) => setCompanionKinship(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">CPF do Acompanhante</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={formatCPF(companionCpf)}
                      onChange={(e) => setCompanionCpf(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono focus:outline-emerald-600"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-xs italic">
                Nenhum acompanhante adicionado. Apenas 1 assento será reservado para o paciente.
              </p>
            )}
          </div>

          {/* Passo 4: Cidade, Hospital de Destino e Especialidade */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60">
            <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <MapPin className="w-4 h-4 text-emerald-700" />
              4. Cidade, Hospital de Destino e Especialidade
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">1. Cidade do Atendimento *</label>
                <div className="px-3 py-2 border border-slate-300 bg-emerald-50/80 rounded-lg text-slate-900 font-bold text-xs flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{selectedTrip?.destinationCity || 'Campinas - SP'}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">2. Hospital / Clínica de Referência *</label>
                <select
                  value={destinationId}
                  onChange={(e) => {
                    setDestinationId(e.target.value);
                    const dest = destinations.find((d) => d.id === e.target.value);
                    if (dest && dest.specialties && dest.specialties.length > 0) {
                      setAppointmentType(dest.specialties[0]);
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 font-medium focus:outline-emerald-600 ${
                    errors.destination ? 'border-rose-500' : 'border-slate-300'
                  }`}
                >
                  <option value="">Selecione o hospital de referência...</option>
                  {tripDestinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.city})
                    </option>
                  ))}
                </select>
                {errors.destination && <p className="text-rose-500 text-[11px] mt-0.5">{errors.destination}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Horário da Consulta / Procedimento *</label>
                <input
                  type="time"
                  required
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 font-bold focus:outline-emerald-600 ${
                    errors.appointmentTime ? 'border-rose-500' : 'border-slate-300'
                  }`}
                />
                {errors.appointmentTime && <p className="text-rose-500 text-[11px] mt-0.5">{errors.appointmentTime}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">3. Especialidade / Procedimento *</label>
                <select
                  value={appointmentType}
                  onChange={(e) => setAppointmentType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:outline-emerald-600"
                >
                  <option value="Consulta Médica">Consulta Médica Geral / Retorno</option>
                  <option value="Oncologia">Oncologia / Quimioterapia / Radioterapia</option>
                  <option value="Hemodiálise">Hemodiálise / Nefrologia</option>
                  <option value="Cardiologia">Cardiologia / Cirurgia Cardíaca</option>
                  <option value="Oftalmologia">Oftalmologia / Catarata / Córnea</option>
                  <option value="Ortopedia">Ortopedia / Cirurgia Ortopédica</option>
                  <option value="Fisioterapia / Reabilitação">Fisioterapia / Reabilitação Física</option>
                  <option value="Exames Especializados">Exames Especializados (Ressonância/Tomografia)</option>
                  <option value="Cirurgia / Procedimento">Cirurgia Eletiva / Procedimento</option>
                  <option value="Avaliação Pré-operatória">Avaliação Pré-operatória</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Instruções / Observações</label>
                <input
                  type="text"
                  placeholder="Ex: Levar exames anteriores, jejum de 8h..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="text-xs text-slate-600">
              Assentos a reservar: <strong className="text-emerald-800 font-bold">{seatsNeeded} lugar(es)</strong>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-medium text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-confirm-booking"
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Confirmar Agendamento
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
