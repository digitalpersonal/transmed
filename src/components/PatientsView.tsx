import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Download, 
  Edit3, 
  Trash2, 
  Ticket, 
  Phone, 
  MapPin, 
  HeartPulse, 
  ShieldCheck,
  Calendar,
  MessageCircle,
  Clock,
  History,
  Bus,
  UserCheck,
  CheckCircle2,
  X,
  ArrowRight
} from 'lucide-react';
import { Patient, Trip, Vehicle, ensurePassengerArray } from '../types';
import { downloadSamplePatientTemplate, exportPatientsToExcel } from '../utils/excel';
import { calculateAge, formatCPF, formatDateBR, formatPhone, formatSUS, formatPlate } from '../utils/formatters';
import { PatientHistoryModal } from './modals/PatientHistoryModal';

interface PatientsViewProps {
  patients: Patient[];
  trips?: Trip[];
  vehicles?: Vehicle[];
  onOpenNewPatientModal: () => void;
  onEditPatient: (patient: Patient) => void;
  onDeletePatient: (patientId: string) => void;
  onOpenNewBookingModalWithPatient: (patientId: string, tripId?: string) => void;
  onOpenImportExcelModal: () => void;
  onCleanupPatients?: () => void;
  isAdmin?: boolean;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  patients,
  trips = [],
  vehicles = [],
  onOpenNewPatientModal,
  onEditPatient,
  onDeletePatient,
  onOpenNewBookingModalWithPatient,
  onOpenImportExcelModal,
  onCleanupPatients,
  isAdmin,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [companionFilter, setCompanionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingHistoryPatient, setViewingHistoryPatient] = useState<Patient | null>(null);

  // Trip Search state in PatientsView
  const [tripSearchTerm, setTripSearchTerm] = useState<string>('');
  const [selectedTripForBooking, setSelectedTripForBooking] = useState<Trip | null>(null);
  const [showTripSearchWidget, setShowTripSearchWidget] = useState<boolean>(true);

  const PAGE_SIZE = 200;

  // Helper to normalize Portuguese diacritics / accents
  const normalizeString = (str: string): string => {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  };

  // Calculate Registration Statistics
  const stats = useMemo(() => {
    const totalPatients = patients.length;
    const withCompanionReq = patients.filter((p) => p.companionRequired).length;
    const namedCompanions = patients.filter((p) => p.companionName && p.companionName.trim().length > 0).length;
    const totalOverallPeople = totalPatients + namedCompanions;

    return {
      totalPatients,
      withCompanionReq,
      namedCompanions,
      totalOverallPeople,
    };
  }, [patients]);

  // Filtered Patients List
  const filteredPatients = useMemo(() => {
    const term = normalizeString(searchTerm.trim());
    const cleanDigits = term.replace(/\D/g, '');
    const isSearchActive = term.length >= 3 || cleanDigits.length >= 3;

    const filtered = patients.filter((p) => {
      const matchSearch =
        !isSearchActive ||
        normalizeString(p.name).includes(term) ||
        (cleanDigits && (p.cpf || '').replace(/\D/g, '').includes(cleanDigits)) ||
        (cleanDigits && (p.susCard || '').replace(/\D/g, '').includes(cleanDigits)) ||
        (cleanDigits && ((p.whatsapp || '') + (p.phone || '')).replace(/\D/g, '').includes(cleanDigits)) ||
        (p.address && normalizeString(p.address).includes(term)) ||
        (p.boardingAddress && normalizeString(p.boardingAddress).includes(term)) ||
        (p.neighborhood && normalizeString(p.neighborhood).includes(term)) ||
        (p.companionName && normalizeString(p.companionName).includes(term));

      const matchCondition = conditionFilter === 'all' || p.condition === conditionFilter;
      const matchCompanion =
        companionFilter === 'all' ||
        (companionFilter === 'yes' && p.companionRequired) ||
        (companionFilter === 'no' && !p.companionRequired);

      return matchSearch && matchCondition && matchCompanion;
    });

    return filtered.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [patients, searchTerm, conditionFilter, companionFilter]);

  // Filtered Available Trips for Quick Booking Widget
  const availableScheduledTrips = useMemo(() => {
    const scheduled = trips.filter((t) => t.status === 'scheduled' || t.status === 'in_route');
    const term = normalizeString(tripSearchTerm.trim());
    const isSearchActive = term.length >= 3;

    if (!isSearchActive) return scheduled;

    return scheduled.filter((t) => {
      const destCity = normalizeString(t.destinationCity || '');
      const destHosp = normalizeString(t.destinationHospital || '');
      const driver = normalizeString(t.driverName || '');
      const code = (t.code || '').toLowerCase();
      const dateBr = formatDateBR(t.departureDate);
      const dateIso = t.departureDate || '';

      const veh = vehicles.find((v) => v.id === t.vehicleId);
      const vehModel = normalizeString(veh?.model || '');
      const vehPlate = (veh?.plate || '').toLowerCase();

      return (
        destCity.includes(term) ||
        destHosp.includes(term) ||
        driver.includes(term) ||
        code.includes(term) ||
        dateBr.includes(term) ||
        dateIso.includes(term) ||
        vehModel.includes(term) ||
        vehPlate.includes(term)
      );
    });
  }, [trips, vehicles, tripSearchTerm]);

  const totalPages = Math.ceil(filteredPatients.length / PAGE_SIZE);
  const displayedPatients = useMemo(() => 
    filteredPatients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), 
  [filteredPatients, currentPage]);

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Cadastro Geral de Pacientes & Acompanhantes (TFD)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Base de dados de pacientes regulados pelo SUS com controle de mobilidade, WhatsApp, endereços e acompanhantes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onCleanupPatients && (
            <button
              onClick={onCleanupPatients}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold border border-amber-300 transition-colors cursor-pointer"
              title="Detectar e mesclar pacientes com mesmo CPF, SUS ou Nome repetido"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-700" />
              <span>Limpar Pacientes Duplicados</span>
            </button>
          )}

          {isAdmin && (
            <>
              <button
                onClick={() => exportPatientsToExcel(patients)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-emerald-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                title="Exportar todos os pacientes para planilha Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Excel</span>
              </button>

              <button
                onClick={onOpenImportExcelModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-300 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Importar Planilha</span>
              </button>
            </>
          )}

          <button
            id="btn-patients-new"
            onClick={onOpenNewPatientModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Paciente</span>
          </button>
        </div>
      </div>

      {/* Summary Statistics Bar (Requisito 1: Informar quantos tem cadastrados) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pacientes Cadastrados</span>
            <span className="text-2xl font-black text-slate-900 mt-0.5 block">{stats.totalPatients}</span>
            <span className="text-[10px] text-slate-400">Titulares regulados no SUS</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Com Acompanhante</span>
            <span className="text-2xl font-black text-emerald-800 mt-0.5 block">{stats.withCompanionReq}</span>
            <span className="text-[10px] text-slate-400">Exigem direito a acompanhante</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Acompanhantes Nomeados</span>
            <span className="text-2xl font-black text-sky-800 mt-0.5 block">{stats.namedCompanions}</span>
            <span className="text-[10px] text-slate-400">Familiares / Cuidadores informados</span>
          </div>
          <div className="p-3 bg-sky-50 text-sky-700 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-300 bg-emerald-50/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">Total Geral de Pessoas</span>
            <span className="text-2xl font-black text-emerald-900 mt-0.5 block">{stats.totalOverallPeople}</span>
            <span className="text-[10px] text-emerald-700">Pacientes + Acompanhantes</span>
          </div>
          <div className="p-3 bg-emerald-700 text-white rounded-xl shadow-xs">
            <HeartPulse className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Trip Search & Fast-Booking Widget (Requisito 2: Campo de busca de viagens para facilitar o cadastro do paciente nela) */}
      <div className="bg-slate-900 text-white p-5 rounded-xl shadow-lg border border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 rounded-lg text-white">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Busca Rápida de Viagens Programadas</h3>
              <p className="text-xs text-slate-300">
                Pesquise a viagem por cidade, hospital, data, veículo ou motorista e selecione para agendar pacientes diretamente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTripSearchWidget(!showTripSearchWidget)}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
          >
            {showTripSearchWidget ? 'Ocultar Busca de Viagens' : 'Exibir Busca de Viagens'}
          </button>
        </div>

        {showTripSearchWidget && (
          <div className="space-y-3 pt-1 border-t border-slate-800">
            {/* Input de Busca de Viagem */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar viagem por cidade de destino (ex: Campinas, São Paulo), hospital, data (DD/MM), motorista ou veículo..."
                value={tripSearchTerm}
                onChange={(e) => setTripSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
              />
              {tripSearchTerm && (
                <button
                  onClick={() => setTripSearchTerm('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Banner de Viagem Atualmente Selecionada (se houver) */}
            {selectedTripForBooking && (
              <div className="p-3 bg-emerald-900/90 border border-emerald-500/50 rounded-lg flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">VIAGEM SELECIONADA PARA AGENDAMENTO RÁPIDO:</span>
                    <strong className="text-white text-sm">
                      {selectedTripForBooking.destinationCity} ({selectedTripForBooking.destinationHospital || 'Hospital TFD'})
                    </strong>
                    <span className="text-emerald-200 ml-2">
                      • {formatDateBR(selectedTripForBooking.departureDate)} às {selectedTripForBooking.departureTime} ({selectedTripForBooking.driverName})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-emerald-200 bg-emerald-950 px-2.5 py-1 rounded border border-emerald-700 font-medium">
                    Clique em <strong>"Agendar nesta Viagem"</strong> em qualquer paciente abaixo!
                  </span>
                  <button
                    onClick={() => setSelectedTripForBooking(null)}
                    className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                    title="Desmarcar viagem"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Resultado da Busca de Viagens */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {availableScheduledTrips.length === 0 ? (
                <div className="col-span-full p-4 bg-slate-800/60 rounded-lg text-center text-slate-400 text-xs">
                  Nenhuma viagem programada encontrada para o termo "{tripSearchTerm}".
                </div>
              ) : (
                availableScheduledTrips.map((trip) => {
                  const veh = vehicles.find((v) => v.id === trip.vehicleId);
                  const passengers = ensurePassengerArray(trip.passengers);
                  const occupied = passengers.reduce((acc, p) => acc + 1 + (p.companionIncluded ? 1 : 0), 0);
                  const maxCap = veh?.maxCapacity || 0;
                  const free = Math.max(0, maxCap - occupied);
                  const isSelected = selectedTripForBooking?.id === trip.id;

                  return (
                    <div
                      key={trip.id}
                      className={`p-3 rounded-lg border transition-all flex flex-col justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500/30'
                          : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-mono font-bold text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                            {trip.code}
                          </span>
                          <span className="text-slate-300 font-bold flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatDateBR(trip.departureDate)} às {trip.departureTime}
                          </span>
                        </div>

                        <h4 className="font-bold text-white text-xs leading-tight">
                          {trip.destinationCity}
                        </h4>
                        <p className="text-[11px] text-slate-300 font-medium truncate">
                          {trip.destinationHospital || 'Hospital de Referência'}
                        </p>

                        <div className="mt-2 text-[10px] text-slate-400 flex flex-wrap items-center justify-between gap-1 border-t border-slate-700/60 pt-1.5">
                          <span>
                            {veh ? `${veh.model} (${formatPlate(veh.plate)})` : 'Veículo Escala'}
                          </span>
                          <span className={`font-bold px-1.5 py-0.5 rounded ${
                            free > 0 ? 'bg-emerald-900/80 text-emerald-300' : 'bg-rose-900/80 text-rose-300'
                          }`}>
                            {free > 0 ? `${free} vagas livres` : 'LOTADO'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedTripForBooking(isSelected ? null : trip)}
                          className={`flex-1 py-1.5 px-2 rounded font-bold text-[11px] transition-colors cursor-pointer text-center ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                          }`}
                        >
                          {isSelected ? '✓ Viagem Selecionada' : 'Fixar p/ Lista'}
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenNewBookingModalWithPatient('', trip.id)}
                          className="py-1.5 px-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          title="Abrir formulário de agendamento para esta viagem"
                        >
                          <Ticket className="w-3 h-3" />
                          <span>Agendar...</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nome, WhatsApp, CPF, Cartão SUS, endereço de embarque ou acompanhante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-emerald-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white font-medium focus:outline-emerald-600"
          >
            <option value="all">Todas as Condições Clínicas</option>
            <option value="Consulta Médica">Consulta Médica</option>
            <option value="Hemodiálise">Hemodiálise</option>
            <option value="Quimioterapia / Oncologia">Quimioterapia / Oncologia</option>
            <option value="Cirurgia / Procedimento">Cirurgia / Procedimento</option>
            <option value="Exames Especializados">Exames Especializados</option>
            <option value="Fisioterapia / Reabilitação">Fisioterapia / Reabilitação</option>
          </select>

          <select
            value={companionFilter}
            onChange={(e) => setCompanionFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white font-medium focus:outline-emerald-600"
          >
            <option value="all">Todos (Acomp. Sim/Não)</option>
            <option value="yes">Apenas com Acompanhante</option>
            <option value="no">Sem Acompanhante</option>
          </select>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">
            Listagem de Pacientes ({filteredPatients.length} encontrados de {patients.length} cadastrados)
          </span>
          {selectedTripForBooking && (
            <span className="text-emerald-800 font-bold bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300 text-[11px]">
              Viagem fixada: {selectedTripForBooking.destinationCity} ({formatDateBR(selectedTripForBooking.departureDate)})
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-3">Paciente</th>
                <th className="py-3 px-3">Documentos (CPF / CNS)</th>
                <th className="py-3 px-3">Contato (WhatsApp) & Endereço de Embarque</th>
                <th className="py-3 px-3">Condição & Mobilidade</th>
                <th className="py-3 px-3">Acompanhante Cadastrado</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600">Nenhum paciente encontrado</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Cadastre um novo paciente ou importe sua planilha de Excel
                    </p>
                  </td>
                </tr>
              ) : (
                displayedPatients.map((patient) => {
                  const phoneDisplay = (patient.whatsapp || patient.phone || '').trim();
                  const cleanPhoneNum = phoneDisplay.replace(/\D/g, '');
                  const isPhoneValid = cleanPhoneNum.length >= 8 && !/^0+$/.test(cleanPhoneNum);
                  const boardingLoc = patient.boardingAddress?.trim() || patient.address?.trim() || 'Não informado';

                  return (
                    <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 text-sm block">
                          {patient.name}
                        </span>
                        {patient.birthDate && (
                          <span className="text-[11px] text-slate-500">
                            {formatDateBR(patient.birthDate)} ({calculateAge(patient.birthDate)})
                          </span>
                        )}
                        {patient.procedureTime && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Horário Habitual: <strong>{patient.procedureTime}</strong></span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                        <div>CPF: <strong>{formatCPF(patient.cpf)}</strong></div>
                        <div className="text-emerald-800 font-semibold">
                          SUS: {formatSUS(patient.susCard)}
                        </div>
                        {patient.rg && <div className="text-slate-400 text-[10px]">RG: {patient.rg}</div>}
                      </td>

                      {/* Contato (WhatsApp) & Endereço de Embarque */}
                      <td className="py-3 px-3">
                        <div className="space-y-1.5 min-w-[210px]">
                          {/* WhatsApp / Telefone */}
                          {phoneDisplay ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
                                {isPhoneValid ? <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Phone className="w-3 h-3 text-emerald-600" />}
                                <span>{isPhoneValid ? formatPhone(cleanPhoneNum) : phoneDisplay}</span>
                              </span>
                              {isPhoneValid && (
                                <a
                                  href={`https://wa.me/55${cleanPhoneNum}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-emerald-700 hover:text-emerald-900 font-semibold underline flex items-center gap-0.5"
                                  title="Abrir conversa no WhatsApp Web"
                                >
                                  WhatsApp ↗
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>WhatsApp não cadastrado</span>
                            </div>
                          )}

                          {/* Endereço de Embarque */}
                          <div className="text-[11px] text-slate-800 flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-semibold text-slate-900">
                                <span className="text-[10px] uppercase font-bold text-slate-500">Embarque: </span>
                                {boardingLoc}
                              </div>
                              {patient.neighborhood && (
                                <div className="text-[10px] text-slate-500">
                                  Bairro: {patient.neighborhood}
                                </div>
                              )}
                              {patient.address && patient.boardingAddress && patient.address !== patient.boardingAddress && (
                                <div className="text-[10px] text-slate-400 italic">
                                  Residência: {patient.address}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[10px] mb-1">
                          {patient.condition}
                        </span>
                        <div className="text-[11px] text-slate-600 font-medium">
                          Mob: <strong className="text-slate-800">{patient.mobility}</strong>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {patient.companionRequired ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-emerald-800 font-bold text-xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{patient.companionName || 'Acompanhante Autorizado'}</span>
                            </div>
                            <span className="text-[10px] text-slate-600 block">
                              {patient.companionKinship || 'Acompanhante'} {patient.companionBirthDate ? `• Nasc: ${formatDateBR(patient.companionBirthDate)}` : ''}
                            </span>
                            {patient.companionCpf && (
                              <span className="text-[10px] text-slate-500 font-mono block">
                                CPF: {formatCPF(patient.companionCpf)}
                              </span>
                            )}
                            {patient.companionAddress && patient.companionAddress !== patient.boardingAddress && (
                              <span className="text-[10px] text-slate-500 block">
                                Emb. Acomp: {patient.companionAddress}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Sem acompanhante</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewingHistoryPatient(patient)}
                            className="flex items-center gap-1 px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-850 rounded font-bold text-xs transition-colors cursor-pointer"
                            title="Ver histórico de viagens e frequência do paciente"
                          >
                            <History className="w-3.5 h-3.5 text-sky-700" />
                            <span>Histórico</span>
                          </button>

                          <button
                            onClick={() => onOpenNewBookingModalWithPatient(patient.id, selectedTripForBooking?.id)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold text-xs transition-colors cursor-pointer ${
                              selectedTripForBooking
                                ? 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                            }`}
                            title={selectedTripForBooking ? `Agendar ${patient.name} diretamente para a viagem de ${selectedTripForBooking.destinationCity}` : "Agendar viagem para este paciente"}
                          >
                            <Ticket className="w-3.5 h-3.5" />
                            <span>{selectedTripForBooking ? 'Agendar nesta Viagem' : 'Agendar'}</span>
                          </button>

                          <button
                            onClick={() => onEditPatient(patient)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Editar cadastro"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Deseja excluir o cadastro de ${patient.name}?`)) {
                                onDeletePatient(patient.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Excluir cadastro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {filteredPatients.length > PAGE_SIZE && (
            <div className="flex items-center justify-between bg-slate-50 border-t border-slate-200 p-3">
              <span className="text-xs text-slate-500 font-medium">
                Exibindo {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredPatients.length)} de {filteredPatients.length} pacientes
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

      {/* Modal de Histórico do Paciente */}
      {viewingHistoryPatient && (
        <PatientHistoryModal
          patient={viewingHistoryPatient}
          trips={trips}
          vehicles={vehicles}
          onClose={() => setViewingHistoryPatient(null)}
          onOpenNewBooking={(patientId) => {
            setViewingHistoryPatient(null);
            onOpenNewBookingModalWithPatient(patientId, selectedTripForBooking?.id);
          }}
        />
      )}
    </div>
  );
};
