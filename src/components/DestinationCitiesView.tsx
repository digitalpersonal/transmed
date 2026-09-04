import React, { useState } from 'react';
import { MapPin, Plus, Phone, Clock, Search, Trash2, Edit3, Compass, Hospital, Stethoscope, Building2 } from 'lucide-react';
import { DestinationCity, DestinationHospital } from '../types';

interface DestinationCitiesViewProps {
  cities: DestinationCity[];
  destinations?: DestinationHospital[];
  onOpenNewCityModal: () => void;
  onEditCity: (city: DestinationCity) => void;
  onDeleteCity: (cityId: string) => void;
}

export const DestinationCitiesView: React.FC<DestinationCitiesViewProps> = ({
  cities,
  destinations = [],
  onOpenNewCityModal,
  onEditCity,
  onDeleteCity,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'cities' | 'hospitals' | 'specialties'>('cities');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCities = cities.filter((c) =>
    c.cityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mainHospitals.some((h) => h.toLowerCase().includes(searchTerm.toLowerCase())) ||
    c.specialties.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredHospitals = destinations.filter((h) =>
    h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.specialties || []).some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Collect all unique specialties across cities & hospitals
  const allSpecialtiesMap = new Map<string, { cities: Set<string>; hospitals: Set<string> }>();
  
  cities.forEach((c) => {
    c.specialties.forEach((spec) => {
      if (!allSpecialtiesMap.has(spec)) {
        allSpecialtiesMap.set(spec, { cities: new Set(), hospitals: new Set() });
      }
      allSpecialtiesMap.get(spec)!.cities.add(c.cityName);
    });
  });

  destinations.forEach((h) => {
    (h.specialties || []).forEach((spec) => {
      if (!allSpecialtiesMap.has(spec)) {
        allSpecialtiesMap.set(spec, { cities: new Set(), hospitals: new Set() });
      }
      allSpecialtiesMap.get(spec)!.cities.add(h.city);
      allSpecialtiesMap.get(spec)!.hospitals.add(h.name);
    });
  });

  const specialtiesList = Array.from(allSpecialtiesMap.entries())
    .map(([name, data]) => ({
      name,
      cities: Array.from(data.cities),
      hospitals: Array.from(data.hospitals),
    }))
    .filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Destinos TFD, Hospitais & Especialidades</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerenciamento separado de cidades de referência, hospitais credenciados e especialidades médicas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenNewCityModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Nova Cidade</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs Selector: Cidade, Hospital, Especialidade */}
      <div className="flex items-center gap-2 bg-slate-200/80 p-1.5 rounded-xl text-xs font-bold border border-slate-300">
        <button
          onClick={() => setActiveSubTab('cities')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'cities'
              ? 'bg-white text-emerald-800 shadow-xs border border-slate-200 font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4 text-emerald-700" />
          <span>1. Cidades Atendidas ({cities.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('hospitals')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'hospitals'
              ? 'bg-white text-emerald-800 shadow-xs border border-slate-200 font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Hospital className="w-4 h-4 text-emerald-700" />
          <span>2. Hospitais de Referência ({destinations.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('specialties')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'specialties'
              ? 'bg-white text-emerald-800 shadow-xs border border-slate-200 font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Stethoscope className="w-4 h-4 text-emerald-700" />
          <span>3. Especialidades Médicas ({specialtiesList.length})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder={`Buscar no módulo de ${
            activeSubTab === 'cities' ? 'cidades' : activeSubTab === 'hospitals' ? 'hospitais' : 'especialidades'
          }...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* ABA 1: CIDADES */}
      {activeSubTab === 'cities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCities.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
              <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">Nenhuma cidade de destino encontrada</p>
              <p className="text-xs text-slate-400 mt-1">Cadastre as cidades atendidas para organizar as rotas sanitárias.</p>
            </div>
          ) : (
            filteredCities.map((city) => (
              <div key={city.id} className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">
                          {city.cityName} - {city.state}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1 font-mono font-medium">
                            <Compass className="w-3.5 h-3.5 text-slate-400" />
                            {city.distanceKm} km
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {city.estimatedTravelTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditCity(city)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar Cidade"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteCity(city.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Cidade"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Hospitais */}
                  <div className="mb-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Hospitais na Cidade:
                    </span>
                    <div className="space-y-1">
                      {city.mainHospitals.map((hosp, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <Hospital className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{hosp}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Specialties */}
                  <div className="mb-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Especialidades Principais:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {city.specialties.map((spec, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  {city.notes && (
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-2">
                      {city.notes}
                    </p>
                  )}
                </div>

                {city.contactPhone && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold text-slate-500">Contato / Regulação:</span>
                    <span className="font-mono font-bold text-slate-900 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      {city.contactPhone}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ABA 2: HOSPITAIS */}
      {activeSubTab === 'hospitals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHospitals.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
              <Hospital className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">Nenhum hospital encontrado</p>
            </div>
          ) : (
            filteredHospitals.map((hosp) => (
              <div key={hosp.id} className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-sky-50 text-sky-700 rounded-lg border border-sky-200">
                      <Hospital className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">{hosp.name}</h4>
                      <span className="text-[11px] text-emerald-700 font-semibold">{hosp.city} - {hosp.state}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-3">{hosp.address}</p>

                  <div className="mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Especialidades:</span>
                    <div className="flex flex-wrap gap-1">
                      {(hosp.specialties || []).map((spec, i) => (
                        <span key={i} className="px-2 py-0.5 bg-sky-50 text-sky-900 rounded text-[10px] font-medium border border-sky-100">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="text-[11px] text-slate-500">Telefone:</span>
                  <span className="font-mono font-bold text-slate-800 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    {hosp.phone}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ABA 3: ESPECIALIDADES */}
      {activeSubTab === 'specialties' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {specialtiesList.map((spec, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">{spec.name}</h4>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cidades Atendidas:</span>
                <div className="flex flex-wrap gap-1">
                  {spec.cities.map((city, cIdx) => (
                    <span key={cIdx} className="px-2 py-0.5 bg-emerald-50 text-emerald-900 rounded text-[11px] font-bold border border-emerald-200">
                      {city}
                    </span>
                  ))}
                </div>
              </div>

              {spec.hospitals.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hospitais de Referência:</span>
                  <ul className="space-y-1 text-xs text-slate-700 font-medium">
                    {spec.hospitals.map((hosp, hIdx) => (
                      <li key={hIdx} className="flex items-center gap-1 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        <span>{hosp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
