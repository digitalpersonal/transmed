import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bus, 
  User, 
  Check, 
  AlertCircle,
  Clock,
  MapPin,
  Users
} from 'lucide-react';
import { Trip, Vehicle, Driver, ensurePassengerArray } from '../../types';
import { formatPlate } from '../../utils/formatters';

interface TripDispatchModalProps {
  trip: Trip;
  vehicles: Vehicle[];
  drivers: Driver[];
  onSave: (tripId: string, vehicleId: string, driverId: string, driverName: string, driverPhone: string) => void;
  onClose: () => void;
}

export const TripDispatchModal: React.FC<TripDispatchModalProps> = ({
  trip,
  vehicles,
  drivers,
  onSave,
  onClose,
}) => {
  const [vehicleId, setVehicleId] = useState<string>(trip.vehicleId || '');
  const [driverId, setDriverId] = useState<string>(trip.driverId || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passList = ensurePassengerArray(trip.passengers);
  const totalOccupied = passList.reduce((acc, p) => acc + 1 + (p.companionIncluded ? 1 : 0), 0);

  const selectedVehicle = vehicles.find(v => v.id === vehicleId);
  const selectedDriver = drivers.find(d => d.id === driverId);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!vehicleId) errs.vehicleId = 'Selecione um veículo';
    if (!driverId) errs.driverId = 'Selecione um motorista';
    
    if (selectedVehicle && totalOccupied > selectedVehicle.maxCapacity) {
      errs.capacity = `Lotação excedida! O veículo selecionado suporta ${selectedVehicle.maxCapacity} e a viagem tem ${totalOccupied} passageiros.`;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selectedDriver) return;

    onSave(
      trip.id,
      vehicleId,
      driverId,
      selectedDriver.name,
      selectedDriver.phone
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <Bus className="w-6 h-6 text-sky-400" />
            <div>
              <h3 className="font-bold text-lg leading-tight">Fechar Romaneio da Viagem</h3>
              <p className="text-xs text-slate-300">
                Atribua o veículo e o motorista para imprimir o manifesto de bordo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Trip Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block uppercase font-bold text-[9px]">Destino</span>
              <strong className="text-slate-900">{trip.destinationCity}</strong>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-bold text-[9px]">Data / Hora</span>
              <strong className="text-slate-900">{trip.departureDate} às {trip.departureTime}</strong>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-bold text-[9px]">Ocupação Atual</span>
              <strong className="text-emerald-700">{totalOccupied} passageiros</strong>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-xs">Selecione o Veículo *</label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-sky-600 ${
                  errors.vehicleId ? 'border-rose-500' : 'border-slate-300'
                }`}
              >
                <option value="">-- Selecione o veículo da frota --</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.model} ({formatPlate(v.plate)}) - Cap: {v.maxCapacity} assentos
                  </option>
                ))}
              </select>
              {errors.vehicleId && <p className="text-rose-500 text-[10px] mt-1 font-bold">{errors.vehicleId}</p>}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-xs">Selecione o Motorista *</label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-sky-600 ${
                  errors.driverId ? 'border-rose-500' : 'border-slate-300'
                }`}
              >
                <option value="">-- Selecione o motorista da escala --</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.phone})
                  </option>
                ))}
              </select>
              {errors.driverId && <p className="text-rose-500 text-[10px] mt-1 font-bold">{errors.driverId}</p>}
            </div>

            {errors.capacity && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p><strong>Erro de Lotação:</strong> {errors.capacity}</p>
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-[11px] text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Ao confirmar, esta viagem será considerada "Pronta para Saída" e você poderá imprimir o 
              romaneio oficial para o motorista. Você ainda poderá mover passageiros se necessário.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              Finalizar e Fechar Romaneio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
