import React, { useState, useEffect } from 'react';
import { X, Bus, Save, ShieldCheck, Gauge } from 'lucide-react';
import { Vehicle, VehicleStatus, VehicleType } from '../../types';
import { formatPlate } from '../../utils/formatters';

interface VehicleFormModalProps {
  vehicle?: Vehicle | null;
  onSave: (vehicle: Vehicle) => void;
  onClose: () => void;
}

const VEHICLE_TYPES: { type: VehicleType; label: string; defaultCap: number }[] = [
  { type: 'van', label: 'Van Executiva de Passageiros (ex: Renault Master, Ducato)', defaultCap: 16 },
  { type: 'minibus', label: 'Micro-ônibus (ex: Volare Attack)', defaultCap: 24 },
  { type: 'bus', label: 'Ônibus Rodoviário Intermunicipal', defaultCap: 44 },
  { type: 'car', label: 'Carro de Apoio / Minivan (ex: Spin 7 Lugares)', defaultCap: 6 },
  { type: 'ambulance_basic', label: 'Ambulância Suporte Básico', defaultCap: 4 },
  { type: 'ambulance_icu', label: 'Ambulância UTI Móvel / Suporte Avançado', defaultCap: 3 },
];

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  vehicle,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    plate: '',
    model: '',
    brand: '',
    year: new Date().getFullYear(),
    type: 'van',
    maxCapacity: 16,
    wheelchairCapacity: 0,
    currentDriver: '',
    driverPhone: '',
    status: 'available',
    currentKm: 0,
    fuelType: 'Diesel S10',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (vehicle) {
      setFormData(vehicle);
    }
  }, [vehicle]);

  const handleTypeChange = (newType: VehicleType) => {
    const defaultObj = VEHICLE_TYPES.find((v) => v.type === newType);
    setFormData((prev) => ({
      ...prev,
      type: newType,
      maxCapacity: prev.maxCapacity || defaultObj?.defaultCap || 16,
    }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.plate?.trim()) errs.plate = 'Placa é obrigatória';
    if (!formData.model?.trim()) errs.model = 'Modelo do veículo é obrigatório';
    if (!formData.brand?.trim()) errs.brand = 'Marca/Fabricante é obrigatória';
    if (!formData.maxCapacity || formData.maxCapacity < 1) {
      errs.maxCapacity = 'Lotação máxima deve ser no mínimo 1 lugar';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const vehicleToSave: Vehicle = {
      id: vehicle?.id || `veh-${Date.now()}`,
      plate: (formData.plate || '').toUpperCase().trim(),
      model: formData.model!.trim(),
      brand: formData.brand!.trim(),
      year: Number(formData.year) || new Date().getFullYear(),
      type: formData.type || 'van',
      maxCapacity: Number(formData.maxCapacity),
      wheelchairCapacity: Number(formData.wheelchairCapacity) || 0,
      currentDriver: formData.currentDriver?.trim() || 'Motorista da Escala',
      driverPhone: formData.driverPhone?.trim() || '',
      status: (formData.status as VehicleStatus) || 'available',
      currentKm: Number(formData.currentKm) || 0,
      fuelType: formData.fuelType || 'Diesel S10',
      notes: formData.notes?.trim() || undefined,
      createdAt: vehicle?.createdAt || new Date().toISOString().slice(0, 10),
    };

    onSave(vehicleToSave);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Bus className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-bold text-lg">
                {vehicle ? `Editar Veículo ${formatPlate(vehicle.plate)}` : 'Cadastrar Novo Veículo na Frota'}
              </h3>
              <p className="text-xs text-slate-300">
                Definição de lotação máxima de passageiros, acessibilidade e motorista
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 text-slate-800 max-h-[80vh] overflow-y-auto space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Placa do Veículo *</label>
              <input
                type="text"
                required
                placeholder="Ex: ABC-1234 ou ABC1D23"
                value={formData.plate || ''}
                onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 font-mono font-bold focus:outline-sky-600 ${
                  errors.plate ? 'border-rose-500' : 'border-slate-300'
                }`}
              />
              {errors.plate && <p className="text-rose-500 text-[11px] mt-0.5">{errors.plate}</p>}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Marca / Fabricante *</label>
              <input
                type="text"
                required
                placeholder="Ex: Renault, Fiat, Marcopolo..."
                value={formData.brand || ''}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 focus:outline-sky-600 ${
                  errors.brand ? 'border-rose-500' : 'border-slate-300'
                }`}
              />
              {errors.brand && <p className="text-rose-500 text-[11px] mt-0.5">{errors.brand}</p>}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ano de Fabricação</label>
              <input
                type="number"
                value={formData.year || new Date().getFullYear()}
                onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-sky-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Modelo Completo do Veículo *</label>
            <input
              type="text"
              required
              placeholder="Ex: Master Minibus Executiva 16L, Ducato Maxi Passageiro..."
              value={formData.model || ''}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 font-semibold focus:outline-sky-600 ${
                errors.model ? 'border-rose-500' : 'border-slate-300'
              }`}
            />
            {errors.model && <p className="text-rose-500 text-[11px] mt-0.5">{errors.model}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tipo de Veículo *</label>
              <select
                value={formData.type || 'van'}
                onChange={(e) => handleTypeChange(e.target.value as VehicleType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:outline-sky-600"
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status Operacional</label>
              <select
                value={formData.status || 'available'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:outline-sky-600"
              >
                <option value="available">Disponível para Viagens</option>
                <option value="in_trip">Em Viagem no Momento</option>
                <option value="maintenance">Em Manutenção Mecânica</option>
              </select>
            </div>
          </div>

          {/* Destaque Lotação Máxima */}
          <div className="p-4 bg-sky-50 rounded-lg border border-sky-200">
            <h4 className="font-bold text-sky-950 text-sm mb-2.5 flex items-center gap-1.5">
              <Bus className="w-4 h-4 text-sky-700" />
              Controle de Capacidade e Lotação Máxima
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Lotação Máxima de Passageiros Sentados *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={60}
                  value={formData.maxCapacity || 16}
                  onChange={(e) => setFormData({ ...formData, maxCapacity: Number(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 text-base font-black focus:outline-sky-600 ${
                    errors.maxCapacity ? 'border-rose-500' : 'border-sky-300'
                  }`}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Capacidade máxima permitida para agendamento seguro sem superlotação.
                </p>
                {errors.maxCapacity && <p className="text-rose-500 text-[11px] mt-0.5">{errors.maxCapacity}</p>}
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Vagas Adaptadas para Cadeirante (Rampa/Elevador)
                </label>
                <input
                  type="number"
                  min={0}
                  max={6}
                  value={formData.wheelchairCapacity || 0}
                  onChange={(e) => setFormData({ ...formData, wheelchairCapacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-base font-bold focus:outline-sky-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Vagas com cinto de fixação e elevador acessível.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Motorista Titular</label>
              <input
                type="text"
                placeholder="Nome do motorista padrão"
                value={formData.currentDriver || ''}
                onChange={(e) => setFormData({ ...formData, currentDriver: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-sky-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Telefone do Motorista</label>
              <input
                type="text"
                placeholder="(00) 00000-0000"
                value={formData.driverPhone || ''}
                onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-sky-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quilometragem Atual (Km)</label>
              <input
                type="number"
                placeholder="Ex: 45000"
                value={formData.currentKm || 0}
                onChange={(e) => setFormData({ ...formData, currentKm: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono focus:outline-sky-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Observações de Manutenção</label>
            <textarea
              rows={2}
              placeholder="Histórico de revisões, troca de óleo, pneus, ar-condicionado..."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-sky-600 resize-none"
            />
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-medium text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-save-vehicle"
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Salvar Veículo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
