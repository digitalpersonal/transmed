import React, { useState, useMemo } from 'react';
import { 
  FileCheck, 
  Printer, 
  Download, 
  Gauge, 
  Users, 
  CheckCircle2, 
  MapPin, 
  FileSpreadsheet,
  Bus
} from 'lucide-react';
import { DestinationHospital, MunicipalConfig, Patient, Trip, Vehicle } from '../types';
import { exportClosuresReportToExcel } from '../utils/excel';
import { formatDateBR, formatPlate } from '../utils/formatters';

interface ClosuresAndReportsViewProps {
  trips: Trip[];
  vehicles: Vehicle[];
  patients: Patient[];
  destinations: DestinationHospital[];
  config: MunicipalConfig;
  onPrintClosure: (trip: Trip) => void;
}

export const ClosuresAndReportsView: React.FC<ClosuresAndReportsViewProps> = ({
  trips,
  vehicles,
  patients,
  destinations,
  config,
  onPrintClosure,
}) => {
  const [selectedCity, setSelectedCity] = useState<string>('all');

  const completedTrips = useMemo(() => trips.filter((t) => t.status === 'completed' && t.closure), [trips]);

  // Operational Aggregations
  const totalKmRun = useMemo(() => completedTrips.reduce((acc, t) => acc + (t.closure?.totalKm || 0), 0), [completedTrips]);

  const totalBoarded = useMemo(() => completedTrips.reduce((acc, t) => acc + (t.closure?.boardedCount || 0), 0), [completedTrips]);
  const totalMissed = useMemo(() => completedTrips.reduce((acc, t) => acc + (t.closure?.missedCount || 0), 0), [completedTrips]);
  const totalBooked = totalBoarded + totalMissed;
  const attendanceRate = totalBooked > 0 ? Math.round((totalBoarded / totalBooked) * 100) : 100;

  // Filtered completed trips
  const filteredTrips = useMemo(() => completedTrips.filter((t) => {
    if (selectedCity === 'all') return true;
    return (t.destinationCity || '').toLowerCase().includes((selectedCity || '').toLowerCase());
  }), [completedTrips, selectedCity]);

  const displayedTrips = useMemo(() => filteredTrips.slice(0, 50), [filteredTrips]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Fechamentos de Viagens & Relatórios Gerenciais</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro oficial de viagens, controle de quilometragem e assiduidade dos pacientes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportClosuresReportToExcel(trips, vehicles)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Relatório Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Consolidados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold uppercase">Km Total Rodado</span>
            <Gauge className="w-5 h-5 text-slate-700" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{(totalKmRun || 0).toLocaleString()}</span>
            <span className="text-xs text-slate-500 font-medium">km</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{completedTrips.length} viagens finalizadas</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold uppercase">Assiduidade (Frequência)</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{attendanceRate}%</span>
            <span className="text-xs text-emerald-700 font-medium">dos agendados</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalBoarded} embarcados • {totalMissed} faltas
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold uppercase">Total de Passageiros</span>
            <Users className="w-5 h-5 text-sky-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{totalBoarded}</span>
            <span className="text-xs text-sky-700 font-medium">transportados</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Pacientes e acompanhantes</p>
        </div>
      </div>

      {/* Tabela de Fechamentos de Viagens */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900">Histórico de Fechamentos de Viagens</h3>
            <p className="text-xs text-slate-500">Relação de viagens concluídas com registro de presença e vistoria</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white font-medium focus:outline-emerald-600"
            >
              <option value="all">Todas as Cidades Destino</option>
              <option value="Campinas">Campinas</option>
              <option value="São Paulo">São Paulo</option>
              <option value="Barretos">Barretos</option>
              <option value="Ribeirão Preto">Ribeirão Preto</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Data / Destino</th>
                <th className="py-2.5 px-3">Veículo / Motorista</th>
                <th className="py-2.5 px-3">Km Percorrido</th>
                <th className="py-2.5 px-3">Frequência</th>
                <th className="py-2.5 px-3">Fechado Em / Por</th>
                <th className="py-2.5 px-3 text-center">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedTrips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <FileCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600">Nenhuma viagem fechada no histórico</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Conclua uma viagem na aba "Viagens & Lotação" para gerar o termo de fechamento
                    </p>
                  </td>
                </tr>
              ) : (
                displayedTrips.map((trip) => {
                  const closure = trip.closure!;
                  const vehicle = vehicles.find((v) => v.id === trip.vehicleId);

                  return (
                    <tr key={trip.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {trip.code}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{trip.destinationCity}</span>
                        <span className="text-[11px] text-slate-500">{formatDateBR(trip.departureDate)}</span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">
                          {vehicle ? `${vehicle.model} (${formatPlate(vehicle.plate)})` : '-'}
                        </div>
                        <div className="text-[11px] text-slate-500">{trip.driverName}</div>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {closure.totalKm} km
                        <span className="text-[10px] text-slate-400 font-normal block">
                          ({closure.startKm} → {closure.endKm})
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <span className="text-emerald-700">{closure.boardedCount} embarcados</span>
                          {closure.missedCount > 0 && (
                            <span className="text-rose-600 font-medium">({closure.missedCount} faltas)</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-[11px] text-slate-600">
                        <div>{closure.closedAt}</div>
                        <div className="text-slate-400 text-[10px]">{closure.closedBy}</div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onPrintClosure(trip)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="Imprimir Relatório de Fechamento"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span>Imprimir</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {filteredTrips.length > 50 && (
            <div className="bg-slate-50 border-t border-slate-200 p-3 text-center text-xs text-slate-500 font-medium">
              Exibindo os primeiros 50 registros de {filteredTrips.length}. Utilize os filtros para relatórios mais específicos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
