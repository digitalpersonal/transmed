import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, MapPin, Bus, Save, Plus, AlertCircle } from 'lucide-react';
import { DestinationHospital, DestinationCity, Trip, Vehicle, Driver, ensurePassengerArray } from '../../types';
import { formatPlate, generateTripCode, getVehicleTypeLabel } from '../../utils/formatters';

interface TripFormModalProps {
  trip?: Trip | null;
  vehicles: Vehicle[];
  drivers: Driver[];
  destinations: DestinationHospital[];
  cities?: DestinationCity[];
  onSave: (trip: Trip) => void;
  onClose: () => void;
}

export const TripFormModal: React.FC<TripFormModalProps> = ({
  trip,
  vehicles,
  drivers,
  destinations,
  cities = [],
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<Partial<Trip>>({
    code: '',
    departureDate: new Date().toISOString().slice(0, 10),
    departureTime: '05:00',
    estimatedReturnDate: new Date().toISOString().slice(0, 10),
    estimatedReturnTime: '18:00',
    originCity: 'Município de Origem',
    destinationCity: 'Campinas - SP',
    departureLocation: 'Garagem Municipal da Saúde (Av. da Saúde, 250)',
    vehicleId: '',
    driverId: '',
    driverName: '',
    driverPhone: '',
    status: 'scheduled',
    destinationIds: [],
    passengers: [],
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Gera lista completa e unificada de TODAS as CIDADES cadastradas
  const allAvailableCities = useMemo(() => {
    const cityMap = new Map<string, { label: string; cityOnly: string; state: string }>();

    // Cidades do cadastro de cidades
    (cities || []).forEach((c) => {
      const cityClean = c.cityName.trim();
      const stateClean = (c.state || 'SP').trim();
      const key = `${cityClean.toUpperCase()}-${stateClean.toUpperCase()}`;
      if (!cityMap.has(key)) {
        cityMap.set(key, {
          label: `${cityClean} - ${stateClean}`,
          cityOnly: cityClean,
          state: stateClean,
        });
      }
    });

    // Cidades existentes em unidades/hospitais de referência
    (destinations || []).forEach((d) => {
      const cityClean = d.city.trim();
      const stateClean = (d.state || 'SP').trim();
      const key = `${cityClean.toUpperCase()}-${stateClean.toUpperCase()}`;
      if (!cityMap.has(key)) {
        cityMap.set(key, {
          label: `${cityClean} - ${stateClean}`,
          cityOnly: cityClean,
          state: stateClean,
        });
      }
    });

    return Array.from(cityMap.values()).sort((a, b) =>
      a.cityOnly.localeCompare(b.cityOnly, 'pt-BR')
    );
  }, [cities, destinations]);

  // 2. Gera lista completa de HOSPITAISE CLÍNICAS unificando destinations e mainHospitals das cidades
  const allAvailableHospitals = useMemo(() => {
    const hospitalMap = new Map<string, DestinationHospital>();

    // Hospitais cadastrados em destinations
    (destinations || []).forEach((d) => {
      hospitalMap.set(d.id, d);
    });

    // Hospitais cadastrados como hospitais principais das cidades
    (cities || []).forEach((c) => {
      (c.mainHospitals || []).forEach((hName, idx) => {
        const cleanHName = hName.trim();
        if (!cleanHName) return;

        // Verifica se já existe um hospital com mesmo nome na mesma cidade
        const exists = Array.from(hospitalMap.values()).some(
          (h) =>
            h.name.toLowerCase().trim() === cleanHName.toLowerCase() &&
            h.city.toLowerCase().trim() === c.cityName.toLowerCase().trim()
        );

        if (!exists) {
          const genId = `hosp-${c.cityName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${idx}`;
          hospitalMap.set(genId, {
            id: genId,
            name: cleanHName,
            city: c.cityName,
            state: c.state || 'SP',
            address: `Unidade / Recepção de Atendimento - ${c.cityName}`,
            phone: c.contactPhone || '',
            specialties: c.specialties || [],
          });
        }
      });
    });

    return Array.from(hospitalMap.values());
  }, [destinations, cities]);

  // 3. Filtra os hospitais pela cidade de destino selecionada
  const filteredHospitals = useMemo(() => {
    if (!formData.destinationCity || formData.destinationCity === 'Outra Cidade') {
      return allAvailableHospitals;
    }

    const cleanSelectedCity = formData.destinationCity
      .split('-')[0]
      .trim()
      .toLowerCase();

    const filtered = allAvailableHospitals.filter((h) => {
      const hCity = h.city.trim().toLowerCase();
      return hCity.includes(cleanSelectedCity) || cleanSelectedCity.includes(hCity);
    });

    return filtered.length > 0 ? filtered : allAvailableHospitals;
  }, [formData.destinationCity, allAvailableHospitals]);

  useEffect(() => {
    if (trip) {
      setFormData(trip);
    } else {
      const defaultVehicle = vehicles.find((v) => v.status === 'available') || vehicles[0];
      const defaultDriver = drivers.find((d) => d.status === 'active') || drivers[0];
      const initialDate = new Date().toISOString().slice(0, 10);
      setFormData((prev) => ({
        ...prev,
        code: generateTripCode(initialDate, Math.floor(Math.random() * 90) + 10),
        vehicleId: defaultVehicle?.id || '',
        driverId: defaultDriver?.id || '',
        driverName: defaultDriver?.name || '',
        driverPhone: defaultDriver?.phone || '',
        destinationIds: (destinations || []).slice(0, 2).map((d) => d.id),
      }));
    }
  }, [trip, vehicles, drivers, destinations]);

  // When vehicle changes, we just update the vehicleId (driver is separate now)
  const handleVehicleChange = (vehId: string) => {
    setFormData((prev) => ({
      ...prev,
      vehicleId: vehId,
    }));
  };

  const handleDriverChange = (drvId: string) => {
    const selectedDriver = drivers.find((d) => d.id === drvId);
    setFormData((prev) => ({
      ...prev,
      driverId: drvId,
      driverName: selectedDriver?.name || '',
      driverPhone: selectedDriver?.phone || '',
    }));
  };

  const selectedVehicle = vehicles.find((v) => v.id === formData.vehicleId);

  const toggleDestination = (destId: string) => {
    const current = formData.destinationIds || [];
    if (current.includes(destId)) {
      setFormData({ ...formData, destinationIds: current.filter((id) => id !== destId) });
    } else {
      setFormData({ ...formData, destinationIds: [...current, destId] });
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.departureDate) errs.departureDate = 'Data de saída é obrigatória';
    if (!formData.departureTime) errs.departureTime = 'Horário de saída é obrigatório';
    if (!formData.destinationCity?.trim()) errs.destinationCity = 'Cidade de destino é obrigatória';
    if (!formData.departureLocation?.trim()) errs.departureLocation = 'Local de embarque é obrigatório';
    if (!formData.vehicleId) errs.vehicleId = 'Selecione um veículo da frota';
    if (!formData.driverId) errs.driverName = 'Selecione o motorista designado';
    if (!formData.driverName?.trim()) errs.driverName = 'Nome do motorista é obrigatório';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const tripToSave: Trip = {
      id: trip?.id || `trip-${Date.now()}`,
      code: formData.code || generateTripCode(formData.departureDate!, 1),
      departureDate: formData.departureDate!,
      departureTime: formData.departureTime!,
      estimatedReturnDate: formData.estimatedReturnDate || formData.departureDate!,
      estimatedReturnTime: formData.estimatedReturnTime || '18:00',
      originCity: formData.originCity || 'Município de Origem',
      destinationCity: formData.destinationCity!.trim(),
      departureLocation: formData.departureLocation!.trim(),
      vehicleId: formData.vehicleId!,
      driverId: formData.driverId,
      driverName: formData.driverName!.trim(),
      driverPhone: formData.driverPhone || '',
      status: trip?.status || 'scheduled',
      destinationIds: formData.destinationIds || [],
      passengers: ensurePassengerArray(trip?.passengers),
      notes: formData.notes?.trim() || undefined,
      closure: trip?.closure,
      createdAt: trip?.createdAt || new Date().toISOString().slice(0, 10),
    };

    onSave(tripToSave);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Bus className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-bold text-lg">
                {trip ? `Editar Viagem ${trip.code}` : 'Agendar Nova Viagem de Transporte Sanitário'}
              </h3>
              <p className="text-xs text-slate-300">
                Programação de data, veículo com lotação máxima, rota e motorista
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
          {/* Sessão: Datas e Horários */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60">
            <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              1. Programação de Data e Horário
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Data de Saída *</label>
                <input
                  type="date"
                  required
                  value={formData.departureDate || ''}
                  onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 focus:outline-sky-600 ${
                    errors.departureDate ? 'border-rose-500' : 'border-slate-300'
                  }`}
                />
                {errors.departureDate && <p className="text-rose-500 text-[11px] mt-0.5">{errors.departureDate}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Horário de Saída *</label>
                <input
                  type="time"
                  required
                  value={formData.departureTime || ''}
                  onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 font-bold focus:outline-sky-600 ${
                    errors.departureTime ? 'border-rose-500' : 'border-slate-300'
                  }`}
                />
                {errors.departureTime && <p className="text-rose-500 text-[11px] mt-0.5">{errors.departureTime}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Data Prevista Retorno</label>
                <input
                  type="date"
                  value={formData.estimatedReturnDate || ''}
                  onChange={(e) => setFormData({ ...formData, estimatedReturnDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-sky-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Horário Previsto Retorno</label>
                <input
                  type="time"
                  value={formData.estimatedReturnTime || ''}
                  onChange={(e) => setFormData({ ...formData, estimatedReturnTime: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-sky-600"
                />
              </div>
            </div>
          </div>

          {/* Sessão: Origem, Destino e Paradas */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60">
            <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <MapPin className="w-4 h-4 text-sky-600" />
              2. Itinerário: Cidade, Hospitais e Especialidades
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">1. Cidade Destino da Viagem *</label>
                <select
                  value={formData.destinationCity || ''}
                  onChange={(e) => setFormData({ ...formData, destinationCity: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 font-bold focus:outline-sky-600 ${
                    errors.destinationCity ? 'border-rose-500' : 'border-slate-300'
                  }`}
                >
                  <option value="">Selecione a cidade de destino...</option>
                  {allAvailableCities.map((c) => (
                    <option key={c.label} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                  <option value="Outra Cidade">Outra Cidade (Digitação Livre)</option>
                </select>
                {formData.destinationCity === 'Outra Cidade' && (
                  <input
                    type="text"
                    placeholder="Digite o nome da cidade de destino..."
                    onChange={(e) => setFormData({ ...formData, destinationCity: e.target.value })}
                    className="w-full mt-2 px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900"
                  />
                )}
                {errors.destinationCity && <p className="text-rose-500 text-[11px] mt-0.5">{errors.destinationCity}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ponto de Embarque no Município *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Garagem Municipal da Saúde / Praça da Matriz"
                  value={formData.departureLocation || ''}
                  onChange={(e) => setFormData({ ...formData, departureLocation: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 focus:outline-sky-600 ${
                    errors.departureLocation ? 'border-rose-500' : 'border-slate-300'
                  }`}
                />
                {errors.departureLocation && <p className="text-rose-500 text-[11px] mt-0.5">{errors.departureLocation}</p>}
              </div>
            </div>

            {/* Seleção de Hospitais / Destinos vinculados à Cidade (Dropdown) */}
            <div className="mb-3">
              <label className="block font-semibold text-slate-700 mb-1.5">
                2. Hospitais e Clínicas de Referência (Filtrados por Cidade):
              </label>

              {/* Menu Dropdown para Seleção de Hospitais */}
              <select
                value=""
                onChange={(e) => {
                  const selectedId = e.target.value;
                  if (selectedId) {
                    if (!formData.destinationIds?.includes(selectedId)) {
                      setFormData({
                        ...formData,
                        destinationIds: [...(formData.destinationIds || []), selectedId],
                      });
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:outline-sky-600 text-xs shadow-2xs"
              >
                <option value="">-- Selecione um hospital ou clínica para adicionar ao roteiro --</option>
                {filteredHospitals.map((dest) => {
                  const isSelected = (formData.destinationIds || []).includes(dest.id);
                  return (
                    <option key={dest.id} value={dest.id} disabled={isSelected}>
                      {dest.name} ({dest.city} - {dest.state}) {isSelected ? '✓ (Já Selecionado)' : ''}
                    </option>
                  );
                })}
              </select>

              {/* Lista de Hospitais Incluídos no Roteiro */}
              <div className="mt-2.5">
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Hospitais / Unidades Selecionadas no Roteiro ({formData.destinationIds?.length || 0}):
                </span>

                {(formData.destinationIds || []).length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic p-2 bg-slate-100 rounded-md border border-slate-200">
                    Nenhum hospital selecionado. Escolha um ou mais hospitais no menu suspenso acima.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allAvailableHospitals
                      .filter((d) => (formData.destinationIds || []).includes(d.id))
                      .map((dest) => (
                        <div
                          key={dest.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 border border-sky-300 text-sky-950 rounded-lg text-xs font-semibold shadow-2xs"
                        >
                          <div>
                            <span className="font-bold">{dest.name}</span>
                            <span className="text-[10px] text-sky-700 font-normal block">
                              {dest.city} - {dest.state}
                              {dest.specialties && dest.specialties.length > 0 && ` • Esp: ${dest.specialties.slice(0, 2).join(', ')}`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleDestination(dest.id)}
                            className="p-1 hover:bg-sky-200 text-sky-800 rounded-md transition-colors cursor-pointer"
                            title="Remover hospital da viagem"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Visualização e Seleção de Especialidades Atendidas */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                3. Especialidades / Procedimentos Médicos Atendidos na Viagem:
              </label>
              <div className="flex flex-wrap gap-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                {['Oncologia / Quimioterapia', 'Hemodiálise', 'Cardiologia', 'Cirurgia Geral', 'Oftalmologia', 'Ortopedia', 'Pediatria', 'Neurologia', 'Exames de Alta Complexidade'].map((spec, i) => (
                  <span key={i} className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-800 rounded font-medium text-[11px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Sessão: Veículo e Motorista (Lotação Máxima) */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60">
            <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Bus className="w-4 h-4 text-sky-600" />
              3. Veículo da Frota e Motorista (Controle de Lotação)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Veículo Selecionado *</label>
                <select
                  value={formData.vehicleId || ''}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 font-medium focus:outline-sky-600 ${
                    errors.vehicleId ? 'border-rose-500' : 'border-slate-300'
                  }`}
                >
                  <option value="">Selecione um veículo...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.model} ({formatPlate(v.plate)}) - Lotação: {v.maxCapacity} passageiros
                    </option>
                  ))}
                </select>
                {errors.vehicleId && <p className="text-rose-500 text-[11px] mt-0.5">{errors.vehicleId}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motorista Designado *</label>
                <select
                  value={formData.driverId || ''}
                  onChange={(e) => handleDriverChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white text-slate-900 focus:outline-sky-600 ${
                    errors.driverName ? 'border-rose-500' : 'border-slate-300'
                  }`}
                >
                  <option value="">Selecione um motorista...</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} (CNH: {d.cnh})
                    </option>
                  ))}
                </select>
                {errors.driverName && <p className="text-rose-500 text-[11px] mt-0.5">{errors.driverName}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Telefone do Motorista</label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={formData.driverPhone || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>

            {selectedVehicle && (
              <div className="mt-3 p-3 bg-sky-50 rounded-lg border border-sky-200 flex flex-wrap items-center justify-between text-xs">
                <div>
                  <span className="text-slate-600">Tipo: </span>
                  <strong className="text-slate-900">{getVehicleTypeLabel(selectedVehicle.type)}</strong>
                </div>
                <div>
                  <span className="text-slate-600">Lotação Máxima: </span>
                  <strong className="text-sky-800 text-sm">{selectedVehicle.maxCapacity} assentos</strong>
                </div>
                {selectedVehicle.wheelchairCapacity > 0 && (
                  <div>
                    <span className="text-slate-600">Vagas Acessíveis Cadeirante: </span>
                    <strong className="text-emerald-700">{selectedVehicle.wheelchairCapacity} vagas</strong>
                  </div>
                )}
                <div>
                  <span className="text-slate-600">Km Atual: </span>
                  <strong className="text-slate-900 font-mono">{(selectedVehicle.currentKm || 0).toLocaleString()} km</strong>
                </div>
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Observações da Viagem</label>
            <textarea
              rows={2}
              placeholder="Instruções para o motorista, paradas programadas, restrições..."
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
              id="btn-save-trip"
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Salvar Viagem
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
