import React, { useState } from 'react';
import { X, MapPin, Building2, Phone, FileText, Clock, Compass } from 'lucide-react';
import { DestinationCity } from '../../types';

interface DestinationCityModalProps {
  city?: DestinationCity | null;
  onSave: (city: DestinationCity) => void;
  onClose: () => void;
}

export const DestinationCityModal: React.FC<DestinationCityModalProps> = ({
  city,
  onSave,
  onClose,
}) => {
  const [cityName, setCityName] = useState(city?.cityName || '');
  const [state, setState] = useState(city?.state || 'SP');
  const [distanceKm, setDistanceKm] = useState<number>(city?.distanceKm || 100);
  const [estimatedTravelTime, setEstimatedTravelTime] = useState(city?.estimatedTravelTime || '1h 30min');
  const [hospitalsInput, setHospitalsInput] = useState(city?.mainHospitals ? city.mainHospitals.join(', ') : '');
  const [specialtiesInput, setSpecialtiesInput] = useState(city?.specialties ? city.specialties.join(', ') : '');
  const [contactPhone, setContactPhone] = useState(city?.contactPhone || '');
  const [notes, setNotes] = useState(city?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityName.trim()) return;

    const mainHospitals = hospitalsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const specialties = specialtiesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newCity: DestinationCity = {
      id: city?.id || `dcity-${Date.now()}`,
      cityName: cityName.trim(),
      state: state.trim().toUpperCase(),
      distanceKm: Number(distanceKm) || 0,
      estimatedTravelTime: estimatedTravelTime.trim(),
      mainHospitals,
      specialties,
      contactPhone: contactPhone.trim(),
      notes: notes.trim(),
    };

    onSave(newCity);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 rounded-lg text-white">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {city ? 'Editar Cidade de Destino' : 'Cadastrar Nova Cidade Atendida'}
              </h3>
              <p className="text-xs text-slate-400">
                Gerencie as cidades de referência para o tratamento fora do domicílio (TFD)
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Nome da Cidade *</label>
              <input
                type="text"
                required
                placeholder="Ex: Campinas, Barretos, São Paulo"
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">UF *</label>
              <input
                type="text"
                required
                maxLength={2}
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600 font-medium uppercase text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Distância (Km aprox.)</label>
              <input
                type="number"
                min="0"
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tempo Estimado de Viagem</label>
              <input
                type="text"
                placeholder="Ex: 1h 30min"
                value={estimatedTravelTime}
                onChange={(e) => setEstimatedTravelTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Hospitais / Centros de Referência (separados por vírgula)</label>
            <input
              type="text"
              placeholder="Ex: Hospital das Clínicas (HC Unicamp), Centro Médico"
              value={hospitalsInput}
              onChange={(e) => setHospitalsInput(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Especialidades Médicas Atendidas (separadas por vírgula)</label>
            <input
              type="text"
              placeholder="Ex: Oncologia, Cardiologia, Hemodiálise, Oftalmologia"
              value={specialtiesInput}
              onChange={(e) => setSpecialtiesInput(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Telefone de Contato / Regulação</label>
            <input
              type="text"
              placeholder="Ex: (19) 3521-7000"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Observações / Orientações de Logística</label>
            <textarea
              rows={3}
              placeholder="Informações adicionais sobre horários de saída, rotas ou orientações para motoristas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-emerald-600"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
            >
              {city ? 'Salvar Alterações' : 'Cadastrar Cidade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
