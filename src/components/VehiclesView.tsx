import React from 'react';
import { Truck, Plus, Bus, Edit3, Trash2, Gauge, ShieldCheck, Phone, Wrench, UserCheck } from 'lucide-react';
import { Vehicle } from '../types';
import { formatPlate, getVehicleStatusLabel, getVehicleTypeLabel } from '../utils/formatters';

interface VehiclesViewProps {
  vehicles: Vehicle[];
  onOpenNewVehicleModal: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicleId: string) => void;
}

export const VehiclesView: React.FC<VehiclesViewProps> = ({
  vehicles,
  onOpenNewVehicleModal,
  onEditVehicle,
  onDeleteVehicle,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Frota Municipal de Transporte Sanitário</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastro de vans, ambulâncias, micro-ônibus e carros com especificação de lotação máxima e motorista
          </p>
        </div>

        <button
          id="btn-vehicles-new"
          onClick={onOpenNewVehicleModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Veículo</span>
        </button>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {vehicles.map((vehicle) => {
          const statusBadge = getVehicleStatusLabel(vehicle.status);

          return (
            <div
              key={vehicle.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="p-5 space-y-3.5">
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {vehicle.brand} • {vehicle.year}
                    </span>
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      {vehicle.model}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {getVehicleTypeLabel(vehicle.type)}
                    </p>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge.bg}`}>
                    {statusBadge.label}
                  </span>
                </div>

                {/* Placa e Lotação Máxima Destacadas */}
                <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Placa</span>
                    <span className="font-mono font-black text-sm text-slate-900">
                      {formatPlate(vehicle.plate)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Lotação Máxima</span>
                    <span className="font-black text-base text-sky-800">
                      {vehicle.maxCapacity} passageiros
                    </span>
                  </div>
                </div>

                {/* Detalhes Operacionais */}
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <UserCheck className="w-3.5 h-3.5" />
                      Motorista:
                    </span>
                    <strong className="text-slate-900">{vehicle.currentDriver}</strong>
                  </div>

                  {vehicle.driverPhone && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Phone className="w-3.5 h-3.5" />
                        Contato:
                      </span>
                      <span className="font-medium text-slate-800">{vehicle.driverPhone}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Gauge className="w-3.5 h-3.5" />
                      Quilometragem:
                    </span>
                    <strong className="font-mono text-slate-900">{(vehicle.currentKm || 0).toLocaleString()} km</strong>
                  </div>

                  {vehicle.wheelchairCapacity > 0 && (
                    <div className="flex items-center justify-between text-emerald-800 font-semibold bg-emerald-50 px-2 py-1 rounded">
                      <span>Acessibilidade Cadeirante:</span>
                      <strong>{vehicle.wheelchairCapacity} vaga(s)</strong>
                    </div>
                  )}
                </div>

                {vehicle.notes && (
                  <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">
                    {vehicle.notes}
                  </p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => onEditVehicle(vehicle)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>

                <button
                  onClick={() => {
                    if (window.confirm(`Deseja excluir o veículo ${vehicle.model} (${vehicle.plate})?`)) {
                      onDeleteVehicle(vehicle.id);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                  title="Excluir veículo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
