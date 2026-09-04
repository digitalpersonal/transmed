import { DestinationHospital, DestinationCity, MunicipalConfig, Patient, Trip, Vehicle, Driver, ensurePassengerArray } from '../types';
import { INITIAL_DESTINATIONS, INITIAL_DESTINATION_CITIES, INITIAL_MUNICIPAL_CONFIG, INITIAL_PATIENTS, INITIAL_TRIPS, INITIAL_VEHICLES, INITIAL_DRIVERS } from '../data/initialData';

const STORAGE_KEYS = {
  PATIENTS: 'tfd_patients_v1',
  VEHICLES: 'tfd_vehicles_v2',
  TRIPS: 'tfd_trips_v1',
  DESTINATIONS: 'tfd_destinations_v1',
  DESTINATION_CITIES: 'tfd_destination_cities_v2',
  CONFIG: 'tfd_config_v1',
  DRIVERS: 'tfd_drivers_v2',
  DELETED_TRIPS: 'tfd_deleted_trips_v1',
};

export function getDeletedTripIds(): string[] {
  try {
    const data = safeGetItem(STORAGE_KEYS.DELETED_TRIPS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function markTripAsDeleted(tripId: string): void {
  try {
    const deleted = getDeletedTripIds();
    if (!deleted.includes(tripId)) {
      deleted.push(tripId);
      safeSetItem(STORAGE_KEYS.DELETED_TRIPS, JSON.stringify(deleted));
    }
  } catch (e) {
    console.error('Error marking trip as deleted', e);
  }
}

// In-memory fallback if localStorage is blocked by iframe sandbox
const memoryStore: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch (e) {
    console.warn(`localStorage read error for key ${key}, falling back to memory`, e);
  }
  return memoryStore[key] || null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn(`localStorage write error for key ${key}, falling back to memory`, e);
  }
  memoryStore[key] = value;
}

export function getStoredPatients(): Patient[] {
  try {
    const data = safeGetItem(STORAGE_KEYS.PATIENTS);
    if (!data) {
      safeSetItem(STORAGE_KEYS.PATIENTS, JSON.stringify(INITIAL_PATIENTS));
      return INITIAL_PATIENTS;
    }
    const parsed: Patient[] = JSON.parse(data);
    if (!Array.isArray(parsed)) return INITIAL_PATIENTS;
    return parsed.map((p) => {
      let rawPhone = (p.whatsapp || p.phone || '').trim();
      const digitsOnly = rawPhone.replace(/\D/g, '');
      if (digitsOnly.length < 8 || /^0+$/.test(digitsOnly)) {
        rawPhone = '';
      }
      return {
        ...p,
        phone: rawPhone,
        whatsapp: rawPhone,
        boardingAddress: p.boardingAddress || p.address || '',
        procedureTime: p.procedureTime || '08:00',
      };
    });
  } catch (e) {
    console.error('Error loading patients from storage', e);
    return INITIAL_PATIENTS;
  }
}

export function savePatients(patients: Patient[]): void {
  try {
    safeSetItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
  } catch (e) {
    console.error('Error saving patients', e);
  }
}

export function getStoredVehicles(): Vehicle[] {
  try {
    const data = safeGetItem(STORAGE_KEYS.VEHICLES);
    if (!data) {
      safeSetItem(STORAGE_KEYS.VEHICLES, JSON.stringify(INITIAL_VEHICLES));
      return INITIAL_VEHICLES;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : INITIAL_VEHICLES;
  } catch (e) {
    console.error('Error loading vehicles from storage', e);
    return INITIAL_VEHICLES;
  }
}

export function saveVehicles(vehicles: Vehicle[]): void {
  try {
    safeSetItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
  } catch (e) {
    console.error('Error saving vehicles', e);
  }
}

export function getStoredTrips(): Trip[] {
  try {
    const deletedIds = getDeletedTripIds();
    const data = safeGetItem(STORAGE_KEYS.TRIPS);
    if (!data) {
      const filteredInitial = INITIAL_TRIPS.filter(t => !deletedIds.includes(t.id));
      safeSetItem(STORAGE_KEYS.TRIPS, JSON.stringify(filteredInitial));
      return filteredInitial;
    }
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return INITIAL_TRIPS.filter(t => !deletedIds.includes(t.id));
    return parsed
      .map((t: any) => ({
        ...t,
        passengers: ensurePassengerArray(t.passengers)
      }))
      .filter((t) => !deletedIds.includes(t.id));
  } catch (e) {
    console.error('Error loading trips from storage', e);
    return INITIAL_TRIPS;
  }
}

export function saveTrips(trips: Trip[]): void {
  try {
    const deletedIds = getDeletedTripIds();
    const filtered = trips.filter(t => !deletedIds.includes(t.id));
    safeSetItem(STORAGE_KEYS.TRIPS, JSON.stringify(filtered));
  } catch (e) {
    console.error('Error saving trips', e);
  }
}

export function getStoredDestinations(): DestinationHospital[] {
  try {
    const data = safeGetItem(STORAGE_KEYS.DESTINATIONS);
    let destinationsList: DestinationHospital[] = [];
    if (data) {
      const parsed = JSON.parse(data);
      destinationsList = Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DESTINATIONS;
    } else {
      destinationsList = [...INITIAL_DESTINATIONS];
    }

    // Garante que todos os hospitais das cidades cadastradas estejam presentes em destinationsList
    const existingKeys = new Set(
      destinationsList.map((d) => `${d.name.toLowerCase().trim()}_${d.city.toLowerCase().trim()}`)
    );

    let addedCount = 0;
    INITIAL_DESTINATION_CITIES.forEach((c) => {
      (c.mainHospitals || []).forEach((hName, idx) => {
        const cleanHName = hName.trim();
        if (!cleanHName) return;
        const key = `${cleanHName.toLowerCase()}_${c.cityName.toLowerCase().trim()}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          destinationsList.push({
            id: `dest-${c.cityName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${idx}`,
            name: cleanHName,
            city: c.cityName,
            state: c.state || 'SP',
            address: `Atendimento / Recepção TFD - ${c.cityName}`,
            phone: c.contactPhone || '(19) 3855-4000',
            specialties: c.specialties || ['Atendimento Especializado'],
          });
          addedCount++;
        }
      });
    });

    if (!data || addedCount > 0) {
      safeSetItem(STORAGE_KEYS.DESTINATIONS, JSON.stringify(destinationsList));
    }

    return destinationsList;
  } catch (e) {
    console.error('Error loading destinations from storage', e);
    return INITIAL_DESTINATIONS;
  }
}

export function saveDestinations(destinations: DestinationHospital[]): void {
  try {
    safeSetItem(STORAGE_KEYS.DESTINATIONS, JSON.stringify(destinations));
  } catch (e) {
    console.error('Error saving destinations', e);
  }
}

export function getStoredDestinationCities(): DestinationCity[] {
  try {
    const data = safeGetItem(STORAGE_KEYS.DESTINATION_CITIES);
    if (!data) {
      safeSetItem(STORAGE_KEYS.DESTINATION_CITIES, JSON.stringify(INITIAL_DESTINATION_CITIES));
      return INITIAL_DESTINATION_CITIES;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : INITIAL_DESTINATION_CITIES;
  } catch (e) {
    console.error('Error loading destination cities from storage', e);
    return INITIAL_DESTINATION_CITIES;
  }
}

export function saveDestinationCities(cities: DestinationCity[]): void {
  try {
    safeSetItem(STORAGE_KEYS.DESTINATION_CITIES, JSON.stringify(cities));
  } catch (e) {
    console.error('Error saving destination cities', e);
  }
}

export function getStoredConfig(): MunicipalConfig {
  try {
    const data = safeGetItem(STORAGE_KEYS.CONFIG);
    if (!data) {
      safeSetItem(STORAGE_KEYS.CONFIG, JSON.stringify(INITIAL_MUNICIPAL_CONFIG));
      return INITIAL_MUNICIPAL_CONFIG;
    }
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === 'object' ? parsed : INITIAL_MUNICIPAL_CONFIG;
  } catch (e) {
    console.error('Error loading config from storage', e);
    return INITIAL_MUNICIPAL_CONFIG;
  }
}

export function saveConfig(config: MunicipalConfig): void {
  try {
    safeSetItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving config', e);
  }
}

export function getStoredDrivers(): Driver[] {
  try {
    const data = safeGetItem(STORAGE_KEYS.DRIVERS);
    if (!data) {
      safeSetItem(STORAGE_KEYS.DRIVERS, JSON.stringify(INITIAL_DRIVERS));
      return INITIAL_DRIVERS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : INITIAL_DRIVERS;
  } catch (e) {
    console.error('Error loading drivers from storage', e);
    return INITIAL_DRIVERS;
  }
}

export function saveDrivers(drivers: Driver[]): void {
  try {
    safeSetItem(STORAGE_KEYS.DRIVERS, JSON.stringify(drivers));
  } catch (e) {
    console.error('Error saving drivers', e);
  }
}

export function resetAllData(): void {
  try {
    safeSetItem(STORAGE_KEYS.PATIENTS, JSON.stringify(INITIAL_PATIENTS));
    safeSetItem(STORAGE_KEYS.VEHICLES, JSON.stringify(INITIAL_VEHICLES));
    safeSetItem(STORAGE_KEYS.TRIPS, JSON.stringify(INITIAL_TRIPS));
    safeSetItem(STORAGE_KEYS.DESTINATIONS, JSON.stringify(INITIAL_DESTINATIONS));
    safeSetItem(STORAGE_KEYS.CONFIG, JSON.stringify(INITIAL_MUNICIPAL_CONFIG));
    safeSetItem(STORAGE_KEYS.DRIVERS, JSON.stringify(INITIAL_DRIVERS));
  } catch (e) {
    console.error('Error resetting data', e);
  }
}

export function exportAllDataJSON(): string {
  const fullBackup = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    patients: getStoredPatients(),
    vehicles: getStoredVehicles(),
    trips: getStoredTrips(),
    destinations: getStoredDestinations(),
    destinationCities: getStoredDestinationCities(),
    config: getStoredConfig(),
    drivers: getStoredDrivers(),
  };
  return JSON.stringify(fullBackup, null, 2);
}

export function importAllDataJSON(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (Array.isArray(data.patients)) savePatients(data.patients);
    if (Array.isArray(data.vehicles)) saveVehicles(data.vehicles);
    if (Array.isArray(data.trips)) saveTrips(data.trips);
    if (Array.isArray(data.destinations)) saveDestinations(data.destinations);
    if (Array.isArray(data.destinationCities)) saveDestinationCities(data.destinationCities);
    if (data.config && typeof data.config === 'object') saveConfig(data.config);
    if (Array.isArray(data.drivers)) saveDrivers(data.drivers);
    return true;
  } catch (e) {
    console.error('Import failed', e);
    return false;
  }
}

export const getTrips = getStoredTrips;
export const getPatients = getStoredPatients;
export const getVehicles = getStoredVehicles;
export const getDestinations = getStoredDestinations;
export const getDestinationCities = getStoredDestinationCities;
export const getMunicipalConfig = getStoredConfig;
export const getDrivers = getStoredDrivers;
export const saveMunicipalConfig = saveConfig;
export const resetToInitialData = resetAllData;
export const exportDatabaseBackup = () => {
  try {
    const jsonStr = exportAllDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-tfd-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (err) {
    console.error('Failed to export backup', err);
  }
};
export const importDatabaseBackup = importAllDataJSON;

