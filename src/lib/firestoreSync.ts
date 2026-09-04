import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Patient, Vehicle, Driver, DestinationHospital, Trip, MunicipalConfig, SystemUser, ensurePassengerArray } from '../types';
import { INITIAL_PATIENTS, INITIAL_VEHICLES, INITIAL_DRIVERS, INITIAL_DESTINATIONS, INITIAL_TRIPS, INITIAL_MUNICIPAL_CONFIG } from '../data/initialData';
import { 
  getStoredPatients, savePatients, 
  getStoredVehicles, saveVehicles, 
  getStoredDrivers, saveDrivers, 
  getStoredDestinations, saveDestinations, 
  getStoredTrips, saveTrips, 
  getStoredConfig, saveConfig,
  markTripAsDeleted, getDeletedTripIds
} from '../utils/storage';

/**
 * Recursively removes any property with an 'undefined' value so Firestore setDoc/updateDoc calls don't fail.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export async function seedAllFirestore() {
  try {
    await Promise.all([
      ...INITIAL_PATIENTS.map(p => setDoc(doc(db, 'patients', p.id), sanitizeForFirestore(p))),
      ...INITIAL_VEHICLES.map(v => setDoc(doc(db, 'vehicles', v.id), sanitizeForFirestore(v))),
      ...INITIAL_DRIVERS.map(d => setDoc(doc(db, 'drivers', d.id), sanitizeForFirestore(d))),
      ...INITIAL_DESTINATIONS.map(dest => setDoc(doc(db, 'destinations', dest.id), sanitizeForFirestore(dest))),
      ...INITIAL_TRIPS.map(t => setDoc(doc(db, 'trips', t.id), sanitizeForFirestore(t))),
      setDoc(doc(db, 'config', 'municipal'), sanitizeForFirestore(INITIAL_MUNICIPAL_CONFIG)),
    ]);
  } catch (error) {
    console.error('Error seeding Firestore:', error);
  }
}

export async function clearTripsAndPatientsFirestore() {
  try {
    const patientsSnap = await getDocs(collection(db, 'patients'));
    const tripsSnap = await getDocs(collection(db, 'trips'));
    
    const deletePromises = [
      ...patientsSnap.docs.map(d => deleteDoc(doc(db, 'patients', d.id))),
      ...tripsSnap.docs.map(d => deleteDoc(doc(db, 'trips', d.id)))
    ];
    
    await Promise.all(deletePromises);
  } catch (error: any) {
    console.error('Error clearing data in Firestore:', error);
    if (error?.message?.includes('Quota') || error?.message?.includes('quota')) {
      throw new Error('QUOTA_EXCEEDED');
    }
    throw error;
  }
}

export function subscribeToPatients(callback: (patients: Patient[]) => void) {
  try {
    const colRef = collection(db, 'patients');
    return onSnapshot(colRef, (snapshot) => {
      if (snapshot.empty) {
        callback(getStoredPatients());
      } else {
        const list = snapshot.docs.map(doc => doc.data() as Patient);
        callback(list);
      }
    }, (error) => {
      console.warn('Firestore patients sync error, using local storage:', error);
      callback(getStoredPatients());
    });
  } catch (e) {
    callback(getStoredPatients());
    return () => {};
  }
}

export async function upsertPatientFirestore(patient: Patient) {
  try {
    const cleaned = sanitizeForFirestore(patient);
    await setDoc(doc(db, 'patients', patient.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `patients/${patient.id}`);
  }
}

export async function deletePatientFirestore(patientId: string) {
  try {
    await deleteDoc(doc(db, 'patients', patientId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `patients/${patientId}`);
  }
}

export function subscribeToVehicles(callback: (vehicles: Vehicle[]) => void) {
  try {
    const colRef = collection(db, 'vehicles');
    return onSnapshot(colRef, (snapshot) => {
      if (snapshot.empty) {
        callback(getStoredVehicles());
      } else {
        const list = snapshot.docs.map(doc => doc.data() as Vehicle);
        saveVehicles(list);
        callback(list);
      }
    }, (error) => {
      callback(getStoredVehicles());
    });
  } catch (e) {
    callback(getStoredVehicles());
    return () => {};
  }
}

export async function upsertVehicleFirestore(vehicle: Vehicle) {
  try {
    const cleaned = sanitizeForFirestore(vehicle);
    await setDoc(doc(db, 'vehicles', vehicle.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `vehicles/${vehicle.id}`);
  }
}

export async function deleteVehicleFirestore(vehicleId: string) {
  try {
    await deleteDoc(doc(db, 'vehicles', vehicleId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `vehicles/${vehicleId}`);
  }
}

export function subscribeToDrivers(callback: (drivers: Driver[]) => void) {
  try {
    const colRef = collection(db, 'drivers');
    return onSnapshot(colRef, (snapshot) => {
      if (snapshot.empty) {
        callback(getStoredDrivers());
      } else {
        const list = snapshot.docs.map(doc => doc.data() as Driver);
        saveDrivers(list);
        callback(list);
      }
    }, (error) => {
      callback(getStoredDrivers());
    });
  } catch (e) {
    callback(getStoredDrivers());
    return () => {};
  }
}

export async function upsertDriverFirestore(driver: Driver) {
  try {
    const cleaned = sanitizeForFirestore(driver);
    await setDoc(doc(db, 'drivers', driver.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `drivers/${driver.id}`);
  }
}

export async function deleteDriverFirestore(driverId: string) {
  try {
    await deleteDoc(doc(db, 'drivers', driverId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `drivers/${driverId}`);
  }
}

export function subscribeToDestinations(callback: (destinations: DestinationHospital[]) => void) {
  try {
    const colRef = collection(db, 'destinations');
    return onSnapshot(colRef, (snapshot) => {
      if (snapshot.empty) {
        callback(getStoredDestinations());
      } else {
        const list = snapshot.docs.map(doc => doc.data() as DestinationHospital);
        callback(list);
      }
    }, (error) => {
      callback(getStoredDestinations());
    });
  } catch (e) {
    callback(getStoredDestinations());
    return () => {};
  }
}

export async function upsertDestinationFirestore(dest: DestinationHospital) {
  try {
    const cleaned = sanitizeForFirestore(dest);
    await setDoc(doc(db, 'destinations', dest.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `destinations/${dest.id}`);
  }
}

export function subscribeToTrips(callback: (trips: Trip[]) => void) {
  try {
    const colRef = collection(db, 'trips');
    return onSnapshot(colRef, (snapshot) => {
      const deletedIds = getDeletedTripIds();
      if (snapshot.empty) {
        callback(getStoredTrips().filter(t => !deletedIds.includes(t.id)));
      } else {
        const list = snapshot.docs
          .map(doc => {
            const data = doc.data() as Trip;
            return {
              ...data,
              passengers: ensurePassengerArray(data.passengers),
            };
          })
          .filter(t => !deletedIds.includes(t.id));
        saveTrips(list);
        callback(list);
      }
    }, (error) => {
      const deletedIds = getDeletedTripIds();
      callback(getStoredTrips().filter(t => !deletedIds.includes(t.id)));
    });
  } catch (e) {
    const deletedIds = getDeletedTripIds();
    callback(getStoredTrips().filter(t => !deletedIds.includes(t.id)));
    return () => {};
  }
}

export async function upsertTripFirestore(trip: Trip) {
  try {
    const cleaned = sanitizeForFirestore(trip);
    await setDoc(doc(db, 'trips', trip.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `trips/${trip.id}`);
  }
}

export async function deleteTripFirestore(tripId: string) {
  try {
    markTripAsDeleted(tripId);
    await deleteDoc(doc(db, 'trips', tripId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `trips/${tripId}`);
  }
}

export function subscribeToConfig(callback: (config: MunicipalConfig) => void) {
  try {
    const docRef = doc(db, 'config', 'municipal');
    return onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(getStoredConfig());
      } else {
        callback(snapshot.data() as MunicipalConfig);
      }
    }, (error) => {
      callback(getStoredConfig());
    });
  } catch (e) {
    callback(getStoredConfig());
    return () => {};
  }
}

export async function updateConfigFirestore(cfg: MunicipalConfig) {
  try {
    const cleaned = sanitizeForFirestore(cfg);
    await setDoc(doc(db, 'config', 'municipal'), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'config/municipal');
  }
}

export function subscribeToUsers(callback: (users: SystemUser[]) => void) {
  try {
    const colRef = collection(db, 'users');
    return onSnapshot(colRef, (snapshot) => {
      if (snapshot.empty) {
        callback([{
          id: 'admin-digitalpersonal',
          email: 'digitalpersonal@gmail.com',
          name: 'Administrador TFD',
          role: 'admin',
          createdAt: new Date().toISOString(),
        }]);
      } else {
        const list = snapshot.docs.map(doc => doc.data() as SystemUser);
        callback(list);
      }
    }, (error) => {
      callback([{
        id: 'admin-digitalpersonal',
        email: 'digitalpersonal@gmail.com',
        name: 'Administrador TFD',
        role: 'admin',
        createdAt: new Date().toISOString(),
      }]);
    });
  } catch (e) {
    callback([]);
    return () => {};
  }
}

export async function upsertUserFirestore(user: SystemUser) {
  try {
    const cleaned = sanitizeForFirestore(user);
    await setDoc(doc(db, 'users', user.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
  }
}

export async function deleteUserFirestore(userId: string) {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
  }
}
