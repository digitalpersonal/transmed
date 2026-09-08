import { supabase } from './supabase';
import { Patient, Vehicle, Driver, DestinationHospital, DestinationCity, Trip, MunicipalConfig, SystemUser, ensurePassengerArray } from '../types';
import { INITIAL_PATIENTS, INITIAL_VEHICLES, INITIAL_DRIVERS, INITIAL_DESTINATIONS, INITIAL_TRIPS, INITIAL_MUNICIPAL_CONFIG, INITIAL_DESTINATION_CITIES } from '../data/initialData';
import { 
  getStoredPatients, savePatients, 
  getStoredVehicles, saveVehicles, 
  getStoredDrivers, saveDrivers, 
  getStoredDestinations, saveDestinations, 
  getStoredTrips, saveTrips, 
  getStoredConfig, saveConfig,
  getStoredDestinationCities, saveDestinationCities,
  markTripAsDeleted, getDeletedTripIds
} from '../utils/storage';

export async function seedAllFirestore() {
  try {
    await Promise.all([
      supabase.from('patients').upsert(INITIAL_PATIENTS),
      supabase.from('vehicles').upsert(INITIAL_VEHICLES),
      supabase.from('drivers').upsert(INITIAL_DRIVERS),
      supabase.from('destinations').upsert(INITIAL_DESTINATIONS),
      supabase.from('trips').upsert(INITIAL_TRIPS),
      supabase.from('config').upsert({ id: 'municipal', data: INITIAL_MUNICIPAL_CONFIG }),
      supabase.from('config').upsert({ id: 'destination-cities', data: INITIAL_DESTINATION_CITIES })
    ]);
  } catch (error) {
    console.error('Error seeding Supabase:', error);
  }
}

export async function clearTripsAndPatientsFirestore() {
  try {
    const { error: errorTrips } = await supabase.from('trips').delete().neq('id', 'dummy-unmatched-id');
    const { error: errorPatients } = await supabase.from('patients').delete().neq('id', 'dummy-unmatched-id');
    if (errorTrips) throw errorTrips;
    if (errorPatients) throw errorPatients;
  } catch (error: any) {
    console.error('Error clearing data in Supabase:', error);
    throw error;
  }
}

export function subscribeToPatients(callback: (patients: Patient[]) => void) {
  const fetchPatients = async () => {
    const { data, error } = await supabase.from('patients').select('*');
    if (error) {
      console.warn('Supabase patients error, using local storage:', error);
      callback(getStoredPatients());
    } else {
      callback(data || []);
    }
  };

  fetchPatients();

  const channel = supabase
    .channel('patients-changes-' + Math.random().toString(36).substring(2))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
      fetchPatients();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function upsertPatientFirestore(patient: Patient) {
  const { error } = await supabase.from('patients').upsert(patient);
  if (error) throw error;
}

export async function deletePatientFirestore(patientId: string) {
  const { error } = await supabase.from('patients').delete().eq('id', patientId);
  if (error) throw error;
}

export function subscribeToVehicles(callback: (vehicles: Vehicle[]) => void) {
  const fetchVehicles = async () => {
    const { data, error } = await supabase.from('vehicles').select('*');
    if (error) {
      callback(getStoredVehicles());
    } else {
      saveVehicles(data || []);
      callback(data || []);
    }
  };

  fetchVehicles();

  const channel = supabase
    .channel('vehicles-changes-' + Math.random().toString(36).substring(2))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
      fetchVehicles();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function upsertVehicleFirestore(vehicle: Vehicle) {
  const { error } = await supabase.from('vehicles').upsert(vehicle);
  if (error) throw error;
}

export async function deleteVehicleFirestore(vehicleId: string) {
  const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
  if (error) throw error;
}

export function subscribeToDrivers(callback: (drivers: Driver[]) => void) {
  const fetchDrivers = async () => {
    const { data, error } = await supabase.from('drivers').select('*');
    if (error) {
      callback(getStoredDrivers());
    } else {
      saveDrivers(data || []);
      callback(data || []);
    }
  };

  fetchDrivers();

  const channel = supabase
    .channel('drivers-changes-' + Math.random().toString(36).substring(2))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => {
      fetchDrivers();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function upsertDriverFirestore(driver: Driver) {
  const { error } = await supabase.from('drivers').upsert(driver);
  if (error) throw error;
}

export async function deleteDriverFirestore(driverId: string) {
  const { error } = await supabase.from('drivers').delete().eq('id', driverId);
  if (error) throw error;
}

export function subscribeToDestinations(callback: (destinations: DestinationHospital[]) => void) {
  const fetchDestinations = async () => {
    const { data, error } = await supabase.from('destinations').select('*');
    if (error) {
      callback(getStoredDestinations());
    } else {
      callback(data || []);
    }
  };

  fetchDestinations();

  const channel = supabase
    .channel('destinations-changes-' + Math.random().toString(36).substring(2))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'destinations' }, () => {
      fetchDestinations();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function upsertDestinationFirestore(dest: DestinationHospital) {
  const { error } = await supabase.from('destinations').upsert(dest);
  if (error) throw error;
}

export function subscribeToTrips(callback: (trips: Trip[]) => void) {
  const fetchTrips = async () => {
    const { data, error } = await supabase.from('trips').select('*');
    const deletedIds = getDeletedTripIds();
    if (error) {
      callback(getStoredTrips().filter(t => !deletedIds.includes(t.id)));
    } else {
      const list = (data || [])
        .map(item => ({
          ...item,
          passengers: ensurePassengerArray(item.passengers),
        }))
        .filter(t => !deletedIds.includes(t.id));
      saveTrips(list);
      callback(list);
    }
  };

  fetchTrips();

  const channel = supabase
    .channel('trips-changes-' + Math.random().toString(36).substring(2))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
      fetchTrips();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function upsertTripFirestore(trip: Trip) {
  const { error } = await supabase.from('trips').upsert(trip);
  if (error) throw error;
}

export async function deleteTripFirestore(tripId: string) {
  markTripAsDeleted(tripId);
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) throw error;
}

export function subscribeToConfig(callback: (config: MunicipalConfig) => void) {
  const fetchConfig = async () => {
    const { data, error } = await supabase.from('config').select('*').eq('id', 'municipal').single();
    if (error || !data) {
      callback(getStoredConfig());
    } else {
      callback(data.data as MunicipalConfig);
    }
  };

  fetchConfig();

  const channel = supabase
    .channel('config-changes-' + Math.random().toString(36).substring(2))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'config' }, () => {
      fetchConfig();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function updateConfigFirestore(cfg: MunicipalConfig) {
  const { error } = await supabase.from('config').upsert({ id: 'municipal', data: cfg });
  if (error) throw error;
}

export function subscribeToDestinationCities(callback: (cities: DestinationCity[]) => void) {
  const fetchCities = async () => {
    const { data, error } = await supabase.from('config').select('*').eq('id', 'destination-cities').single();
    if (error || !data) {
      callback(getStoredDestinationCities());
    } else {
      callback(data.data as DestinationCity[]);
    }
  };

  fetchCities();

  const channel = supabase
    .channel('cities-changes-' + Math.random().toString(36).substring(2))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'config' }, () => {
      fetchCities();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function updateDestinationCitiesFirestore(cities: DestinationCity[]) {
  const { error } = await supabase.from('config').upsert({ id: 'destination-cities', data: cities });
  if (error) throw error;
}

export function subscribeToUsers(callback: (users: SystemUser[]) => void) {
  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      callback([{
        id: 'admin-digitalpersonal',
        email: 'digitalpersonal@gmail.com',
        name: 'Administrador TFD',
        role: 'admin',
        createdAt: new Date().toISOString(),
      }]);
    } else {
      callback(data || []);
    }
  };

  fetchUsers();

  const channel = supabase
    .channel('users-changes-' + Math.random().toString(36).substring(2))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
      fetchUsers();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function upsertUserFirestore(user: SystemUser) {
  const { error } = await supabase.from('users').upsert(user);
  if (error) throw error;
}

export async function deleteUserFirestore(userId: string) {
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) throw error;
}

export async function performBatchWrite(
  itemsToUpsert: { collectionName: string; id: string; data: any }[],
  itemsToDelete: { collectionName: string; id: string }[]
) {
  // Group by collectionName (table)
  const upsertGroups: Record<string, any[]> = {};
  itemsToUpsert.forEach(item => {
    if (!upsertGroups[item.collectionName]) {
      upsertGroups[item.collectionName] = [];
    }
    upsertGroups[item.collectionName].push(item.data);
  });

  const deleteGroups: Record<string, string[]> = {};
  itemsToDelete.forEach(item => {
    if (!deleteGroups[item.collectionName]) {
      deleteGroups[item.collectionName] = [];
    }
    deleteGroups[item.collectionName].push(item.id);
  });

  // Execute upserts in parallel
  const upsertPromises = Object.entries(upsertGroups).map(async ([table, rows]) => {
    const { error } = await supabase.from(table).upsert(rows);
    if (error) throw error;
  });

  // Execute deletes in parallel
  const deletePromises = Object.entries(deleteGroups).map(async ([table, ids]) => {
    const { error } = await supabase.from(table).delete().in('id', ids);
    if (error) throw error;
  });

  await Promise.all([...upsertPromises, ...deletePromises]);
}
