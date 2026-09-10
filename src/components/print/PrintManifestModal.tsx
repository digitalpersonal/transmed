import React from 'react';
import { Printer, X, Bus, MapPin, Calendar, Clock, Phone, Users, ShieldAlert } from 'lucide-react';
import { MunicipalConfig, Trip, Vehicle, ensurePassengerArray } from '../../types';
import { formatDateBR, formatPlate, getVehicleTypeLabel } from '../../utils/formatters';

interface PrintManifestModalProps {
  trip: Trip;
  vehicle?: Vehicle;
  config: MunicipalConfig;
  onClose: () => void;
}

export const PrintManifestModal: React.FC<PrintManifestModalProps> = ({
  trip,
  vehicle,
  config,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const passList = ensurePassengerArray(trip.passengers);
  const totalPassengers = passList.reduce(
    (acc, p) => acc + 1 + (p.companionIncluded ? 1 : 0),
    0
  );

  const maxCapacity = vehicle?.maxCapacity || 0;
  const isOverCapacity = maxCapacity > 0 && totalPassengers > maxCapacity;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/60 p-2 sm:p-4 overflow-y-auto backdrop-blur-xs print:p-0 print:bg-transparent print:static print:block">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:w-full print:max-w-none my-auto print:my-0 border border-slate-200">
        {/* Header Modal Toolbar */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0 rounded-t-xl border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bus className="w-5 h-5 text-sky-400" />
            <h3 className="font-semibold text-lg">Manifesto Oficial de Bordo / Lista de Passageiros</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              id="btn-print-manifest"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir Manifesto (A4)
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div className="p-8 text-slate-900 text-xs font-sans bg-white overflow-y-auto flex-1 print:overflow-visible print:p-0 print:m-0">
          {/* Header Oficial */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-slate-900 text-white rounded flex items-center justify-center font-bold text-xl">
                SUS
              </div>
              <div>
                <h1 className="text-base font-black uppercase text-slate-900">{config.municipalityName}</h1>
                <h2 className="text-sm font-bold text-slate-700">{config.departmentName}</h2>
                <p className="text-xs text-slate-500">{config.address} • Tel: {config.phone}</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">MANIFESTO OFICIAL DE TRANSPORTE SANITÁRIO ELETIVO (TFD)</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm text-slate-500 block">Código da Viagem</span>
              <span className="text-lg font-black font-mono text-slate-900">{trip.code}</span>
              <span className="text-xs text-slate-500 block mt-1">Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          {/* Dados Operacionais da Viagem */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-4 bg-slate-50 rounded-md border border-slate-300 mb-4">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase block">Data de Saída</span>
              <span className="font-bold text-slate-900 text-base">{formatDateBR(trip.departureDate)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase block">Horário de Saída</span>
              <span className="font-bold text-slate-900 text-base">{trip.departureTime}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase block">Origem / Embarque</span>
              <span className="font-bold text-slate-900 text-sm">{trip.departureLocation}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase block">Destino Principal</span>
              <span className="font-bold text-emerald-800 text-base">{trip.destinationCity}</span>
            </div>

            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase block">Veículo / Tipo</span>
              <span className="font-bold text-slate-900 text-sm">
                {vehicle ? `${vehicle.model}` : 'Não atribuído'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase block">Placa</span>
              <span className="font-bold text-slate-900 font-mono text-sm">
                {vehicle ? formatPlate(vehicle.plate) : '-'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase block">Motorista Responsável</span>
              <span className="font-bold text-slate-900 text-sm">{trip.driverName} ({trip.driverPhone})</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase block">Lotação (Pass/Vagas)</span>
              <span className={`font-bold text-base ${isOverCapacity ? 'text-rose-600' : 'text-slate-900'}`}>
                {totalPassengers} / {maxCapacity || '∞'} lugares
              </span>
            </div>
          </div>

          {/* Tabela de Passageiros para o Motorista */}
          <div className="mb-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800 mb-2 flex items-center justify-between">
              <span>Relação Nominal de Passageiros (Pacientes e Acompanhantes)</span>
              <span className="text-xs text-slate-500 font-normal">Total de Assentos Reservados: {totalPassengers}</span>
            </h3>

            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300 text-xs">
                    <th className="py-3 px-2 text-center w-8">#</th>
                    <th className="py-3 px-2 w-16">Cód.</th>
                    <th className="py-3 px-3">Nome do Paciente / Acompanhante</th>
                    <th className="py-3 px-2 w-28">CPF / SUS</th>
                    <th className="py-3 px-2 w-24">Contato</th>
                    <th className="py-3 px-2">Destino / Hospital</th>
                    <th className="py-3 px-2 w-16 text-center">Horário</th>
                    <th className="py-3 px-2 w-32 text-center">Assinatura no Embarque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {passList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400 text-sm">
                        Nenhum passageiro agendado para esta viagem.
                      </td>
                    </tr>
                  ) : (
                    passList.map((p, idx) => {
                      const uniqueKey = p.bookingCode ? `${p.bookingCode}-${idx}` : `passenger-${p.id || idx}-${idx}`;
                      return (
                        <React.Fragment key={uniqueKey}>
                        {/* Linha do Paciente */}
                        <tr className="hover:bg-slate-50">
                          <td className="py-3 px-2 text-center font-bold text-slate-700">{idx + 1}</td>
                          <td className="py-3 px-2 font-mono text-xs text-slate-600">{p.bookingCode}</td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block text-sm">{p.patientName}</span>
                            <span className="text-xs text-emerald-800 font-medium">
                              Mob: {p.mobility} • Esp: {p.appointmentType}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-mono text-xs">
                            <div className="font-bold text-slate-900">CPF: {p.patientCpf}</div>
                            <div className="text-slate-600 font-medium">SUS: {(p.patientSus || '').slice(0, 15)}...</div>
                          </td>
                          <td className="py-3 px-2 text-xs font-semibold">{p.patientPhone}</td>
                          <td className="py-3 px-2 font-medium">
                            <div className="text-sm font-semibold">{p.destinationName}</div>
                            <div className="text-slate-600 text-xs">{p.destinationCity}</div>
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-slate-800">{p.appointmentTime}</td>
                          <td className="py-3 px-2 border-l border-slate-200 text-center">
                            <div className="h-8 border-b border-slate-300 w-full mb-1"></div>
                            <span className="text-[10px] text-slate-500 font-medium block">[ ] Embarcou [ ] Falta</span>
                          </td>
                        </tr>

                        {/* Linha do Acompanhante se houver */}
                        {p.companionIncluded && (
                          <tr className="bg-slate-50/70 text-slate-700">
                            <td className="py-2 px-2 text-center font-semibold text-slate-400">↳</td>
                            <td className="py-2 px-2 font-mono text-xs text-slate-400">ACOMP</td>
                            <td className="py-2 px-3">
                              <span className="font-semibold text-slate-800 text-sm">
                                {p.companionName || 'Acompanhante autorizado'}
                              </span>
                              <span className="text-xs text-slate-500 block">
                                Vínculo: {p.companionKinship || 'Acompanhante de ' + p.patientName}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-xs font-mono font-bold text-slate-800">
                              CPF: {p.companionCpf || '-'}
                            </td>
                            <td className="py-2 px-2 text-xs">-</td>
                            <td className="py-2 px-2 text-xs text-slate-500">
                              (Acompanha paciente)
                            </td>
                            <td className="py-2 px-2 text-center text-slate-500">-</td>
                            <td className="py-2 px-2 border-l border-slate-200 text-center">
                              <div className="h-6 border-b border-slate-300 w-full mb-1"></div>
                              <span className="text-[10px] text-slate-500 font-medium block">Assinatura Acomp.</span>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Observações da Viagem e Assinaturas */}
          <div className="grid grid-cols-2 gap-4 border-t border-slate-300 pt-3 text-xs">
            <div>
              <span className="font-bold text-slate-800 block mb-1">OBSERVAÇÕES OPERACIONAIS:</span>
              <p className="text-slate-600 bg-slate-50 p-3 rounded border border-slate-200 min-h-16 text-sm">
                {trip.notes || 'Sem observações especiais registradas para esta viagem.'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="border-b border-slate-400 h-10 mb-2"></div>
                <div className="text-center font-bold text-slate-800 text-sm">
                  {trip.driverName} - Assinatura do Motorista
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>Km Inicial do Veículo: ___________</span>
                <span>Km Final do Veículo: ___________</span>
              </div>
            </div>
          </div>

          {/* Rodapé Oficial */}
          <div className="mt-6 pt-3 border-t border-slate-200 text-center text-xs text-slate-400 font-medium">
            Documento de controle interno para fins de fiscalização e prestação de contas do SUS / TFD municipal.
          </div>
        </div>
      </div>
    </div>
  );
};
