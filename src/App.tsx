import React, { useState, useEffect } from 'react';
import { 
  DestinationHospital, 
  DestinationCity,
  MunicipalConfig, 
  Patient, 
  Trip, 
  TripClosure, 
  TripPassenger, 
  Vehicle,
  Driver,
  SystemUser,
  BackupSnapshot,
  ensurePassengerArray
} from './types';
import { 
  INITIAL_VEHICLES, 
  INITIAL_DRIVERS,
  INITIAL_DESTINATION_CITIES
} from './data/initialData';
import { 
  getTrips, 
  saveTrips, 
  getPatients, 
  savePatients, 
  getVehicles, 
  saveVehicles, 
  getDestinations, 
  getDestinationCities,
  getStoredDestinationCities,
  saveDestinationCities,
  getMunicipalConfig, 
  saveMunicipalConfig, 
  resetToInitialData, 
  exportDatabaseBackup, 
  importDatabaseBackup,
  getDrivers,
  saveDrivers,
  saveDestinations,
  clearTrips,
  clearAllPersistentData
} from './utils/storage';
import { ExcelCapturedRow } from './utils/excel';
import { 
  formatCPF, 
  formatSUS, 
  formatPhone, 
  formatDateBR,
  normalizeHospitalName 
} from './utils/formatters';
import { 
  subscribeToPatients, upsertPatientFirestore, deletePatientFirestore,
  subscribeToVehicles, upsertVehicleFirestore, deleteVehicleFirestore,
  subscribeToDrivers, upsertDriverFirestore, deleteDriverFirestore,
  subscribeToDestinations, upsertDestinationFirestore,
  subscribeToTrips, upsertTripFirestore, deleteTripFirestore, performBatchWrite,
  subscribeToConfig, updateConfigFirestore,
  subscribeToDestinationCities, updateDestinationCitiesFirestore,
  subscribeToBackupSnapshots, saveBackupSnapshotFirestore, deleteBackupSnapshotFirestore,
  seedAllFirestore, clearTripsAndPatientsFirestore,
  subscribeToUsers, deleteDestinationFirestore
} from './lib/supabaseSync';
import { auth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User, sendPasswordResetEmail, supabase } from './lib/supabase';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { TripsView } from './components/TripsView';
import { BookingsView } from './components/BookingsView';
import { PatientsView } from './components/PatientsView';
import { VehiclesView } from './components/VehiclesView';
import { DriversView } from './components/DriversView';
import { DestinationCitiesView } from './components/DestinationCitiesView';
import { ClosuresAndReportsView } from './components/ClosuresAndReportsView';
import { BpaExportView } from './components/BpaExportView';
import { BoardingAddressesView } from './components/BoardingAddressesView';
import { BackupsView } from './components/BackupsView';

// Modals
import { PatientFormModal } from './components/modals/PatientFormModal';
import { VehicleFormModal } from './components/modals/VehicleFormModal';
import { DriverFormModal } from './components/modals/DriverFormModal';
import { TripFormModal } from './components/modals/TripFormModal';
import { BookingFormModal } from './components/modals/BookingFormModal';
import { TripClosureModal } from './components/modals/TripClosureModal';
import { ExcelImportModal } from './components/modals/ExcelImportModal';
import { DestinationCityModal } from './components/modals/DestinationCityModal';
import { ConfigModal } from './components/modals/ConfigModal';
import { UserManagementModal } from './components/modals/UserManagementModal';

// Print Modals
import { PrintTicketModal } from './components/print/PrintTicketModal';
import { PrintManifestModal } from './components/print/PrintManifestModal';
import { PrintClosureModal } from './components/print/PrintClosureModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Core Data State (initialized as empty, will be populated by Supabase sync)
  const [trips, setTrips] = useState<Trip[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [destinations, setDestinations] = useState<DestinationHospital[]>([]);
  const [config, setConfig] = useState<MunicipalConfig>(getMunicipalConfig());
  const [backupSnapshots, setBackupSnapshots] = useState<BackupSnapshot[]>([]);
  const [destinationCities, setDestinationCities] = useState<DestinationCity[]>(() => {
    const stored = getStoredDestinationCities();
    const existingNames = new Set<string>();
    const merged: DestinationCity[] = [];

    INITIAL_DESTINATION_CITIES.forEach(c => {
      const name = c.cityName.toUpperCase().trim();
      if (!existingNames.has(name)) {
        merged.push(c);
        existingNames.add(name);
      }
    });

    stored.forEach(c => {
      const name = c.cityName.toUpperCase().trim();
      if (!existingNames.has(name)) {
        merged.push(c);
        existingNames.add(name);
      }
    });
    
    if (merged.length !== stored.length) {
      saveDestinationCities(merged);
    }
    
    return merged;
  });

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    const emailToUse = loginEmail.trim();
    
    try {
      const loggedUser = await signInWithEmailAndPassword(auth, emailToUse, loginPassword);
      if (loggedUser) {
        setCurrentUser(loggedUser);
      }
      showToast('Login realizado com sucesso!', 'success');
    } catch (err: any) {
      console.error('Login error:', err);
      
      // If the email is the default admin email, let's try to automatically create the account!
      if (emailToUse.toLowerCase() === 'digitalpersonal@gmail.com') {
        try {
          const newAdmin = await createUserWithEmailAndPassword(auth, emailToUse, loginPassword);
          if (newAdmin) {
            setCurrentUser(newAdmin);
          }
          showToast('Conta administrativa criada e logada com sucesso!', 'success');
          return;
        } catch (createErr: any) {
          console.error('Auto admin creation failed:', createErr);
          if (createErr?.code === 'auth/email-already-in-use') {
            setLoginError('Esta conta de administrador (digitalpersonal@gmail.com) já existe. Se esqueceu sua senha, use a opção "Esqueci a senha" ou contate o suporte.');
          } else {
            setLoginError(`Erro ao inicializar conta: ${createErr.message || 'Verifique sua conexão.'}`);
          }
          showToast('Erro de login.', 'error');
          return;
        }
      }
      
      // For any other email
      setLoginError('E-mail ou senha incorretos. Caso seja um operador, certifique-se de que o Administrador já cadastrou seu acesso.');
      showToast('Erro de login.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailToUse = loginEmail.trim();
    if (!emailToUse) {
      setLoginError('Por favor, digite seu e-mail no campo "E-mail de Acesso" antes de clicar em recuperar senha.');
      return;
    }
    setIsSendingReset(true);
    setLoginError(null);
    try {
      await sendPasswordResetEmail(auth, emailToUse);
      showToast(`E-mail de redefinição enviado para ${emailToUse}! Verifique sua caixa de entrada e spam.`, 'info');
    } catch (err: any) {
      console.error('Password reset error:', err);
      setLoginError(`Erro ao enviar redefinição: ${err.message || 'Verifique o e-mail digitado.'}`);
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } finally {
      setCurrentUser(null);
      showToast('Sessão encerrada com sucesso.', 'info');
    }
  };

  // Auth Subscription
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });
    const unsubUsers = subscribeToUsers(setSystemUsers);

    return () => {
      unsubAuth();
      unsubUsers();
    };
  }, []);

  // Load from Supabase on mount
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    const loadedCategories = new Set<string>();
    const requiredCategories = ['patients', 'vehicles', 'drivers', 'destinations', 'trips', 'config', 'cities'];

    const markLoaded = (category: string) => {
      loadedCategories.add(category);
      if (requiredCategories.every(c => loadedCategories.has(c))) {
        setIsDataLoading(false);
      }
    };

    // Safety fallback: never keep user stuck on loading spinner for more than 3.5 seconds
    const safetyTimeout = setTimeout(() => {
      setIsDataLoading(false);
    }, 3500);

    const unsubPatients = subscribeToPatients((p) => {
      console.log('[App] Received patients from Supabase:', p.length);
      setPatients(p);
      markLoaded('patients');
    });
    const unsubVehicles = subscribeToVehicles((v) => {
      console.log('[App] Received vehicles from Supabase:', v.length);
      setVehicles(v);
      markLoaded('vehicles');
    });
    const unsubDrivers = subscribeToDrivers((d) => {
      console.log('[App] Received drivers from Supabase:', d.length);
      setDrivers(d);
      markLoaded('drivers');
    });
    const unsubDestinations = subscribeToDestinations((d) => {
      console.log('[App] Received destinations from Supabase:', d.length);
      setDestinations(d);
      markLoaded('destinations');
    });
    const unsubTrips = subscribeToTrips((t) => {
      console.log('[App] Received trips from Supabase:', t.length);
      setTrips(t);
      markLoaded('trips');
    });
    const unsubConfig = subscribeToConfig((c) => {
      console.log('[App] Received config from Supabase');
      setConfig(c);
      markLoaded('config');
    });
    const unsubCities = subscribeToDestinationCities((citiesList) => {
      console.log('[App] Received cities from Supabase:', citiesList.length);
      setDestinationCities(citiesList);
      markLoaded('cities');
    });
    const unsubSnapshots = subscribeToBackupSnapshots((snaps) => {
      console.log('[App] Received backup snapshots from Supabase:', snaps.length);
      setBackupSnapshots(snaps);
    });

    return () => {
      clearTimeout(safetyTimeout);
      unsubPatients();
      unsubVehicles();
      unsubDrivers();
      unsubDestinations();
      unsubTrips();
      unsubConfig();
      unsubCities();
      unsubSnapshots();
    };
  }, []);

  // Backup Snapshot Management
  const handleCreateSnapshot = async (trigger: 'automatic' | 'manual' = 'manual') => {
    try {
      const fullBackupObj = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        patients,
        vehicles,
        trips,
        destinations,
        destinationCities,
        config,
        drivers,
        users: systemUsers,
      };

      const newSnap: BackupSnapshot = {
        id: `snap-${trigger}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        trigger,
        patientsCount: patients.length,
        tripsCount: trips.length,
        vehiclesCount: vehicles.length,
        driversCount: drivers.length,
        fullDataJSON: JSON.stringify(fullBackupObj, null, 2),
      };

      await saveBackupSnapshotFirestore(newSnap);
      if (trigger === 'manual') {
        showToast('Backup manual registrado e salvo na nuvem com sucesso!', 'success');
      }
    } catch (err) {
      console.error('Error creating backup snapshot:', err);
      showToast('Erro ao criar backup na nuvem.', 'error');
    }
  };

  const handleRestoreSnapshot = async (snap: BackupSnapshot) => {
    try {
      handleImportBackup(snap.fullDataJSON);
      showToast(`Backup de ${new Date(snap.createdAt).toLocaleString('pt-BR')} restaurado com sucesso!`, 'success');
    } catch (err) {
      console.error('Error restoring snapshot:', err);
      showToast('Erro ao restaurar o backup.', 'error');
    }
  };

  const handleDeleteSnapshot = async (snapId: string) => {
    try {
      await deleteBackupSnapshotFirestore(snapId);
      showToast('Registro de backup removido.', 'info');
    } catch (err) {
      console.error('Error deleting snapshot:', err);
    }
  };

  // Automatic Scheduled Backup Engine
  useEffect(() => {
    if (config.autoBackupEnabled === false) return;
    const targetTime = config.autoBackupTime || '23:00';

    const checkAutoBackup = async () => {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      if (currentHHMM >= targetTime && config.lastAutoBackupDate !== todayStr) {
        console.log(`[AutoBackup] Running daily automated backup for ${todayStr} at ${currentHHMM}`);
        
        const updatedConfig = { ...config, lastAutoBackupDate: todayStr };
        setConfig(updatedConfig);
        updateConfigFirestore(updatedConfig).catch(() => {});

        await handleCreateSnapshot('automatic');
        showToast(`Backup automático diário (${targetTime}) salvo na nuvem com sucesso!`, 'success');
      }
    };

    checkAutoBackup();
    const interval = setInterval(checkAutoBackup, 30000);
    return () => clearInterval(interval);
  }, [config, patients, trips, vehicles, drivers, destinations, destinationCities, systemUsers]);

  // Modal Visibility States
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isDestinationCityModalOpen, setIsDestinationCityModalOpen] = useState(false);
  const [editingDestinationCity, setEditingDestinationCity] = useState<DestinationCity | null>(null);

  const handleSaveDestinationCity = async (cityToSave: DestinationCity) => {
    let updated: DestinationCity[];
    const exists = destinationCities.some((c) => c.id === cityToSave.id);
    if (exists) {
      updated = destinationCities.map((c) => (c.id === cityToSave.id ? cityToSave : c));
      showToast(`Cidade ${cityToSave.cityName} atualizada com sucesso!`);
    } else {
      updated = [cityToSave, ...destinationCities];
      showToast(`Cidade ${cityToSave.cityName} cadastrada com sucesso!`);
    }
    setDestinationCities(updated);
    saveDestinationCities(updated);
    try {
      await updateDestinationCitiesFirestore(updated);
    } catch (err) {
      console.error('Error saving destination cities to Supabase:', err);
    }
    setIsDestinationCityModalOpen(false);
    setEditingDestinationCity(null);
  };

  const handleDeleteDestinationCity = async (cityId: string) => {
    const updated = destinationCities.filter((c) => c.id !== cityId);
    setDestinationCities(updated);
    saveDestinationCities(updated);
    try {
      await updateDestinationCitiesFirestore(updated);
      showToast('Cidade de destino removida.', 'info');
    } catch (err) {
      console.error('Error deleting destination city from Supabase:', err);
    }
  };

  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [preselectedTripId, setPreselectedTripId] = useState<string | undefined>(undefined);
  const [preselectedPatientId, setPreselectedPatientId] = useState<string | undefined>(undefined);

  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [tripForClosure, setTripForClosure] = useState<Trip | null>(null);

  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Print Modals
  const [ticketToPrint, setTicketToPrint] = useState<{ trip: Trip; passenger: TripPassenger } | null>(null);
  const [manifestToPrint, setManifestToPrint] = useState<Trip | null>(null);
  const [closureToPrint, setClosureToPrint] = useState<Trip | null>(null);

  // ==========================================
  // Patient CRUD
  // ==========================================
  const handleSavePatient = (patientToSave: Patient) => {
    const exists = patients.some((p) => p.id === patientToSave.id);
    if (exists) {
      setPatients(patients.map((p) => (p.id === patientToSave.id ? patientToSave : p)));
      showToast(`Paciente ${patientToSave.name} atualizado com sucesso!`);
    } else {
      setPatients([patientToSave, ...patients]);
      showToast(`Paciente ${patientToSave.name} cadastrado com sucesso!`);
    }
    upsertPatientFirestore(patientToSave).catch(() => {});
    setIsPatientModalOpen(false);
    setEditingPatient(null);
  };

  const handleDeletePatient = (patientId: string) => {
    setPatients(patients.filter((p) => p.id !== patientId));
    deletePatientFirestore(patientId).catch(() => {});
    showToast('Paciente removido do cadastro.', 'info');
  };

  const handleImportPatientsFromExcel = async (newPatients: Patient[], capturedRows?: ExcelCapturedRow[]) => {
    if (!capturedRows || capturedRows.length === 0) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    
    // Process ALL rows for patient registration, but only future/today for trips
    const rowsToProcess = capturedRows;
    const patientsFromRows = newPatients;

    // Arrays representing updated states
    let localPatients = [...patients];
    let localVehicles = [...vehicles];
    let localDrivers = [...drivers];
    let localDestinations = [...destinations];
    let localCities = [...destinationCities];
    let localTrips = [...trips];

    // Track database writes (Only items that are truly NEW or MODIFIED)
    const patientsToUpsert = new Map<string, Patient>();
    const vehiclesToUpsert = new Map<string, Vehicle>();
    const driversToUpsert = new Map<string, Driver>();
    const destinationsToUpsert = new Map<string, DestinationHospital>();
    const citiesToUpsert = new Map<string, DestinationCity>();
    const tripsToUpsert = new Map<string, Trip>();

    // Helper functions for lookup or auto-creation
    const getOrAddVehicle = (vehicleStr: string): Vehicle => {
      const cleanVeh = vehicleStr.trim();
      if (!cleanVeh) {
        if (localVehicles.length > 0) return localVehicles[0];
        const defVeh: Vehicle = {
          id: 'v-default',
          model: 'Van Escala TFD',
          brand: 'Municipal',
          plate: 'TFD-0000',
          maxCapacity: 100,
          wheelchairCapacity: 0,
          year: 2024,
          type: 'van',
          currentDriver: '',
          driverPhone: '',
          status: 'available',
          currentKm: 120000,
          fuelType: 'Diesel',
          createdAt: todayStr
        };
        localVehicles.push(defVeh);
        vehiclesToUpsert.set(defVeh.id, defVeh);
        return defVeh;
      }

      let found = localVehicles.find(v => 
        v.model.toLowerCase().includes(cleanVeh.toLowerCase()) ||
        v.plate.toLowerCase().includes(cleanVeh.toLowerCase()) ||
        cleanVeh.toLowerCase().includes(v.plate.toLowerCase())
      );

      if (!found) {
        const plateMatch = cleanVeh.match(/\(([^)]+)\)/);
        const plate = plateMatch ? plateMatch[1].toUpperCase() : `TFD-${Math.floor(1000 + Math.random() * 9000)}`;
        const model = cleanVeh.replace(/\([^)]+\)/, '').trim() || 'Veículo Adicional';
        
        found = {
          id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          model,
          brand: 'Municipal',
          plate,
          maxCapacity: 100,
          wheelchairCapacity: 0,
          year: 2024,
          type: 'van',
          currentDriver: '',
          driverPhone: '',
          status: 'available',
          currentKm: 120000,
          fuelType: 'Diesel',
          createdAt: todayStr
        };
        localVehicles.push(found);
        vehiclesToUpsert.set(found.id, found);
      }
      return found;
    };

    const getOrAddDriver = (driverStr: string): string => {
      const cleanDrv = driverStr.trim();
      if (!cleanDrv || cleanDrv.toLowerCase() === 'motorista da escala' || cleanDrv.toLowerCase() === 'motorista padrao tfd') {
        return cleanDrv || 'Motorista da Escala';
      }

      let found = localDrivers.find(d => d.name.toLowerCase() === cleanDrv.toLowerCase());
      if (!found) {
        found = {
          id: `drv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: cleanDrv,
          cpf: `${Math.floor(10000000000 + Math.random() * 90000000000)}`,
          cnh: `${Math.floor(10000000000 + Math.random() * 90000000000)}`,
          cnhCategory: 'D',
          cnhExpiration: '2029-12-31',
          phone: '(19) 99999-9999',
          status: 'active',
          createdAt: todayStr
        };
        localDrivers.push(found);
        driversToUpsert.set(found.id, found);
      }
      return found.name;
    };

    const getOrAddCity = (cityStr: string) => {
      const cleanCity = cityStr.trim();
      if (!cleanCity) return;

      const found = localCities.find(c => c.cityName.toLowerCase() === cleanCity.toLowerCase());
      if (!found) {
        const newCity: DestinationCity = {
          id: `city-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          cityName: cleanCity,
          state: 'SP',
          distanceKm: 80,
          estimatedTravelTime: '01:20',
          mainHospitals: [cleanCity],
          specialties: ['TFD Geral'],
          contactPhone: '(19) 3855-4000'
        };
        localCities.push(newCity);
        citiesToUpsert.set(newCity.id, newCity);
      }
    };

    const getOrAddDestination = (destName: string, cityName: string) => {
      const cleanDest = destName.trim();
      const cleanCity = cityName.trim() || 'Campinas';
      if (!cleanDest) return;

      getOrAddCity(cleanCity);

      const found = localDestinations.find(d => 
        normalizeHospitalName(d.name) === normalizeHospitalName(cleanDest) && 
        d.city.toLowerCase().trim() === cleanCity.toLowerCase().trim()
      );

      if (!found) {
        const newDest: DestinationHospital = {
          id: `dest-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: cleanDest,
          city: cleanCity,
          state: 'SP',
          address: `Endereço Importado - ${cleanDest}`,
          phone: '(19) 3855-4000',
          specialties: ['TFD Geral']
        };
        localDestinations.push(newDest);
        destinationsToUpsert.set(newDest.id, newDest);
      }
    };

    // Process all spreadsheet rows (merge with existing trips, preserving manually registered data)
    let totalRowsProcessed = rowsToProcess.length;
    let totalPatientsAdded = 0;
    let totalPatientsUpdated = 0;
    let totalCompanionsAdded = 0;
    let totalNewBookings = 0;

    rowsToProcess.forEach((row, idx) => {
      const parsedPat = patientsFromRows[idx];
      if (!parsedPat) return;

      const destCity = (row.cidadeDestino || row.destino || 'Campinas').trim();
      const destHospital = (row.destino || destCity).trim();

      const officialCity = localCities.find(c => 
        c.cityName.toUpperCase().trim() === destCity.toUpperCase().trim() || 
        destCity.toUpperCase().trim().includes(c.cityName.toUpperCase().trim()) ||
        c.cityName.toUpperCase().trim().includes(destCity.toUpperCase().trim())
      );
      
      const validatedCityName = officialCity ? officialCity.cityName : destCity;
      const validatedHospitalName = destHospital;

      getOrAddDestination(validatedHospitalName, validatedCityName);
      const targetVehicle = getOrAddVehicle(row.veiculo || '');
      const driverName = getOrAddDriver(row.motorista || '');

      // Upsert/Merge patient
      let existingPat = localPatients.find(p => 
        (parsedPat.cpf && p.cpf === parsedPat.cpf) || 
        (p.name.toLowerCase().trim() === parsedPat.name.toLowerCase().trim())
      );

      if (existingPat) {
        let changed = false;
        const mergedPat = { ...existingPat };
        
        // Merge missing fields or update if spreadsheet has content
        if (parsedPat.susCard && parsedPat.susCard !== existingPat.susCard) { mergedPat.susCard = parsedPat.susCard; changed = true; }
        if (parsedPat.birthDate && parsedPat.birthDate !== existingPat.birthDate) { mergedPat.birthDate = parsedPat.birthDate; changed = true; }
        if (parsedPat.phone && parsedPat.phone !== existingPat.phone) { mergedPat.phone = parsedPat.phone; changed = true; }
        if (parsedPat.address && parsedPat.address !== existingPat.address) { mergedPat.address = parsedPat.address; changed = true; }
        
        if (changed) {
          existingPat = mergedPat;
          localPatients = localPatients.map(p => p.id === mergedPat.id ? mergedPat : p);
          patientsToUpsert.set(mergedPat.id, mergedPat);
          totalPatientsUpdated++;
        }
      } else {
        existingPat = {
          ...parsedPat,
          id: parsedPat.id || `pat-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          createdAt: todayStr
        };
        localPatients.push(existingPat);
        patientsToUpsert.set(existingPat.id, existingPat);
        totalPatientsAdded++;
      }

      // REGISTER COMPANION AS STANDALONE PATIENT
      if (parsedPat.companionName && parsedPat.companionName.trim().length > 3) {
        const compName = parsedPat.companionName.trim();
        const compCpf = parsedPat.companionCpf || '';
        
        let existingComp = localPatients.find(p => 
          (compCpf && p.cpf === compCpf) || 
          (p.name.toLowerCase().trim() === compName.toLowerCase())
        );

        if (existingComp) {
          // Merge companion data if needed
          if (!existingComp.cpf && compCpf) {
            existingComp = { ...existingComp, cpf: compCpf };
            localPatients = localPatients.map(p => p.id === existingComp!.id ? existingComp! : p);
            patientsToUpsert.set(existingComp.id, existingComp);
          }
        } else {
          const newComp: Patient = {
            id: `pat-comp-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
            name: compName,
            cpf: compCpf || `${Math.floor(10000000000 + Math.random() * 90000000000)}`,
            susCard: `COMP-${Math.floor(100000000000000 + Math.random() * 90000000000000)}`,
            birthDate: parsedPat.companionBirthDate || '1980-01-01',
            phone: '',
            address: parsedPat.companionAddress || parsedPat.address || '',
            boardingAddress: parsedPat.companionAddress || parsedPat.boardingAddress || parsedPat.address || '',
            neighborhood: 'Centro',
            city: 'Município de Origem',
            condition: 'Outro',
            mobility: 'Ambulante',
            companionRequired: false,
            createdAt: todayStr
          };
          localPatients.push(newComp);
          patientsToUpsert.set(newComp.id, newComp);
          totalCompanionsAdded++;
        }
      }

      // PROCESS TRIPS
      const tripDate = row.dataViagem || todayStr;
      if (tripDate >= todayStr) {
        let targetTrip = localTrips.find(t => 
          t.destinationCity.toLowerCase().includes(validatedCityName.toLowerCase()) &&
          (t.status === 'scheduled' || t.status === 'in_route') &&
          t.departureDate === tripDate &&
          t.vehicleId === targetVehicle.id
        );

        const passengerItem: TripPassenger = {
          id: `pass-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          bookingCode: `BKG-${Math.floor(1000 + Math.random() * 9000)}`,
          patientId: existingPat.id,
          patientName: existingPat.name,
          patientBirthDate: existingPat.birthDate,
          patientCpf: existingPat.cpf,
          patientSus: existingPat.susCard,
          patientPhone: existingPat.phone || existingPat.whatsapp || '',
          patientAddress: existingPat.boardingAddress || existingPat.address,
          mobility: existingPat.mobility || 'Ambulante',
          companionIncluded: existingPat.companionRequired || false,
          companionName: existingPat.companionName,
          companionBirthDate: existingPat.companionBirthDate,
          companionCpf: existingPat.companionCpf,
          companionAddress: existingPat.companionAddress,
          companionKinship: existingPat.companionKinship,
          destinationId: 'dest-auto',
          destinationName: validatedHospitalName,
          destinationCity: validatedCityName,
          appointmentTime: row.horarioProcedimento || existingPat.procedureTime || '08:00',
          appointmentType: existingPat.condition || 'Consulta Médica',
          status: 'confirmed',
          bookedAt: todayStr,
        };

        if (!targetTrip) {
          const newTripId = `trip-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`;
          const newTripCode = `TRIP-${Math.floor(1000 + Math.random() * 9000)}`;
          targetTrip = {
            id: newTripId,
            code: newTripCode,
            destinationCity: validatedCityName,
            destinationHospital: validatedHospitalName,
            departureDate: tripDate,
            departureTime: row.horarioSaida || '05:30',
            estimatedReturnDate: tripDate,
            estimatedReturnTime: '17:00',
            originCity: 'Município de Origem',
            vehicleId: targetVehicle.id,
            driverName: driverName,
            driverPhone: '(19) 99999-9999',
            departureLocation: 'Secretaria Municipal de Saúde - Terminal TFD',
            status: 'scheduled',
            passengers: [passengerItem],
            destinationIds: ['dest-auto'],
            createdAt: todayStr,
          };
          localTrips.push(targetTrip);
          tripsToUpsert.set(targetTrip.id, targetTrip);
          totalNewBookings++;
        } else {
          const existingPass = ensurePassengerArray(targetTrip.passengers);
          const cleanPatCpf = (existingPat.cpf || '').replace(/\D/g, '');
          const cleanPatSus = (existingPat.susCard || '').replace(/\D/g, '');
          const normPatName = (existingPat.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

          const isAlreadyBooked = existingPass.some(p => {
            if (p.patientId && p.patientId === existingPat!.id) return true;
            const pCpf = (p.patientCpf || '').replace(/\D/g, '');
            if (cleanPatCpf.length === 11 && pCpf === cleanPatCpf) return true;
            const pSus = (p.patientSus || '').replace(/\D/g, '');
            if (cleanPatSus.length >= 14 && pSus === cleanPatSus) return true;
            const pName = (p.patientName || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            if (normPatName.length >= 2 && pName === normPatName) return true;
            return false;
          });

          if (!isAlreadyBooked) {
            const updatedTrip = {
              ...targetTrip,
              passengers: [...existingPass, passengerItem],
              destinationHospital: targetTrip.destinationHospital || validatedHospitalName,
            };
            localTrips = localTrips.map(t => t.id === targetTrip!.id ? updatedTrip : t);
            tripsToUpsert.set(updatedTrip.id, updatedTrip);
            totalNewBookings++;
          }
        }
      }
    });

    // Final sorting
    localPatients.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    localTrips.sort((a, b) => a.departureDate.localeCompare(b.departureDate));

    // Update React states
    setPatients(localPatients);
    setVehicles(localVehicles);
    setDrivers(localDrivers);
    setDestinations(localDestinations);
    setDestinationCities(localCities);
    setTrips(localTrips);

    // Sync ONLY CHANGED items to Supabase
    try {
      const itemsToSync: { collectionName: string; id: string; data: any }[] = [];
      patientsToUpsert.forEach(p => itemsToSync.push({ collectionName: 'patients', id: p.id, data: p }));
      vehiclesToUpsert.forEach(v => itemsToSync.push({ collectionName: 'vehicles', id: v.id, data: v }));
      driversToUpsert.forEach(d => itemsToSync.push({ collectionName: 'drivers', id: d.id, data: d }));
      destinationsToUpsert.forEach(d => itemsToSync.push({ collectionName: 'destinations', id: d.id, data: d }));
      tripsToUpsert.forEach(t => itemsToSync.push({ collectionName: 'trips', id: t.id, data: t }));

      await performBatchWrite(itemsToSync, []);
      if (citiesToUpsert.size > 0) {
        await updateDestinationCitiesFirestore(localCities);
      }

      showToast(`Importação incremental concluída! ${totalRowsProcessed} linhas analisadas. Adicionados: ${totalPatientsAdded} pacientes e ${totalNewBookings} agendamentos. Atualizados: ${totalPatientsUpdated} pacientes.`, 'success');
    } catch (err) {
      console.error('Error in incremental sync:', err);
      showToast('Importação concluída localmente. Erro ao sincronizar novos dados.', 'error');
    }
  };

  // ==========================================
  // Vehicle CRUD
  // ==========================================
  const handleSaveVehicle = (vehicleToSave: Vehicle) => {
    const exists = vehicles.some((v) => v.id === vehicleToSave.id);
    if (exists) {
      setVehicles(vehicles.map((v) => (v.id === vehicleToSave.id ? vehicleToSave : v)));
      showToast(`Veículo ${vehicleToSave.model} atualizado com sucesso!`);
    } else {
      setVehicles([vehicleToSave, ...vehicles]);
      showToast(`Veículo ${vehicleToSave.model} cadastrado na frota!`);
    }
    upsertVehicleFirestore(vehicleToSave).catch(() => {});
    setIsVehicleModalOpen(false);
    setEditingVehicle(null);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicles(vehicles.filter((v) => v.id !== vehicleId));
    deleteVehicleFirestore(vehicleId).catch(() => {});
    showToast('Veículo removido da frota.', 'info');
  };

  // ==========================================
  // Driver CRUD
  // ==========================================
  const handleSaveDriver = (driverToSave: Driver | Omit<Driver, 'id' | 'createdAt'>) => {
    let targetDriver: Driver;
    if ('id' in driverToSave) {
      targetDriver = driverToSave as Driver;
      setDrivers(drivers.map((d) => (d.id === targetDriver.id ? targetDriver : d)));
      showToast(`Motorista ${targetDriver.name} atualizado com sucesso!`);
    } else {
      targetDriver = {
        ...driverToSave,
        id: `drv-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setDrivers([targetDriver, ...drivers]);
      showToast(`Motorista ${targetDriver.name} cadastrado com sucesso!`);
    }
    upsertDriverFirestore(targetDriver).catch(() => {});
    setIsDriverModalOpen(false);
    setEditingDriver(null);
  };

  const handleDeleteDriver = (driverId: string) => {
    setDrivers(drivers.filter((d) => d.id !== driverId));
    deleteDriverFirestore(driverId).catch(() => {});
    showToast('Motorista removido.', 'info');
  };

  // ==========================================
  // Trip CRUD
  // ==========================================
  const handleSaveTrip = (tripToSave: Trip) => {
    const exists = trips.some((t) => t.id === tripToSave.id);
    if (exists) {
      setTrips(trips.map((t) => (t.id === tripToSave.id ? tripToSave : t)));
      showToast(`Viagem ${tripToSave.code} atualizada com sucesso!`);
    } else {
      setTrips([tripToSave, ...trips]);
      showToast(`Viagem para ${tripToSave.destinationCity} agendada com sucesso!`);
    }
    upsertTripFirestore(tripToSave).catch(() => {});
    setIsTripModalOpen(false);
    setEditingTrip(null);
  };

  const handleDeleteTrip = (tripId: string) => {
    setTrips(trips.filter((t) => t.id !== tripId));
    deleteTripFirestore(tripId).catch(() => {});
    showToast('Viagem excluída com sucesso.', 'info');
  };

  const handleRemoveCompanion = (tripId: string, passengerId: string) => {
    const tripToUpdate = trips.find(t => t.id === tripId);
    if (!tripToUpdate) return;
    
    const updatedPassengers = ensurePassengerArray(tripToUpdate.passengers).map(p => {
      if (p.id === passengerId || p.patientId === passengerId) {
        return {
          ...p,
          companionIncluded: false,
          companionName: '',
          companionKinship: '',
          companionCpf: '',
          companionPhone: ''
        };
      }
      return p;
    });

    const updatedTrip = {
      ...tripToUpdate,
      passengers: updatedPassengers
    };

    const updatedTrips = trips.map(t => t.id === tripId ? updatedTrip : t);
    setTrips(updatedTrips);
    upsertTripFirestore(updatedTrip).catch(() => {});
    showToast('Acompanhante removido com sucesso!');
  };

  // ==========================================
  // Booking Creation
  // ==========================================
  const handleSaveBooking = (tripId: string, newPassenger: TripPassenger) => {
    const targetTrip = trips.find((t) => t.id === tripId);
    if (!targetTrip) return;

    const currentPassengers = ensurePassengerArray(targetTrip.passengers);
    const cleanNewCpf = (newPassenger.patientCpf || '').replace(/\D/g, '');
    const cleanNewSus = (newPassenger.patientSus || '').replace(/\D/g, '');
    const normNewName = (newPassenger.patientName || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    // Check if passenger is already booked on this trip
    const existingIndex = currentPassengers.findIndex((p) => {
      if (p.patientId && p.patientId === newPassenger.patientId) return true;
      const pCpf = (p.patientCpf || '').replace(/\D/g, '');
      if (cleanNewCpf.length === 11 && pCpf === cleanNewCpf) return true;
      const pSus = (p.patientSus || '').replace(/\D/g, '');
      if (cleanNewSus.length >= 14 && pSus === cleanNewSus) return true;
      const pName = (p.patientName || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
      if (normNewName.length >= 2 && pName === normNewName) return true;
      return false;
    });

    let updatedPassengers: TripPassenger[];
    if (existingIndex >= 0) {
      updatedPassengers = [...currentPassengers];
      updatedPassengers[existingIndex] = {
        ...updatedPassengers[existingIndex],
        ...newPassenger,
        id: updatedPassengers[existingIndex].id,
        bookingCode: updatedPassengers[existingIndex].bookingCode || newPassenger.bookingCode,
      };
      showToast(`Agendamento do paciente ${newPassenger.patientName} atualizado nesta viagem!`);
    } else {
      updatedPassengers = [...currentPassengers, newPassenger];
      showToast(`Agendamento realizado! Código: ${newPassenger.bookingCode}`);
    }

    const updatedTrip: Trip = {
      ...targetTrip,
      passengers: updatedPassengers,
    };

    setTrips(trips.map((t) => (t.id === tripId ? updatedTrip : t)));
    upsertTripFirestore(updatedTrip).catch(() => {});

    setIsBookingModalOpen(false);
    setPreselectedTripId(undefined);
    setPreselectedPatientId(undefined);

    setTicketToPrint({
      trip: updatedTrip,
      passenger: newPassenger,
    });
  };

  const handleCancelBooking = (tripId: string, passengerId: string) => {
    const targetTrip = trips.find((t) => t.id === tripId);
    if (!targetTrip) return;

    const updatedTrip: Trip = {
      ...targetTrip,
      passengers: ensurePassengerArray(targetTrip.passengers).filter((p) => p.id !== passengerId),
    };

    setTrips(trips.map((t) => (t.id === tripId ? updatedTrip : t)));
    upsertTripFirestore(updatedTrip).catch(() => {});
    showToast('Agendamento cancelado. Vagas liberadas no veículo.', 'info');
  };

  // ==========================================
  // Trip Closure
  // ==========================================
  const handleSaveClosure = (
    tripId: string, 
    closure: TripClosure, 
    updatedPassengerStatuses: { id: string; status: 'confirmed' | 'boarded' | 'missed' | 'cancelled' }[]
  ) => {
    const targetTrip = trips.find((t) => t.id === tripId);
    if (!targetTrip) return;

    const currentPassengers = ensurePassengerArray(targetTrip.passengers);
    const updatedPassengers = currentPassengers.map((p) => {
      const match = updatedPassengerStatuses.find((s) => s.id === p.id);
      return match ? { ...p, status: match.status } : p;
    });

    const updatedTrip: Trip = {
      ...targetTrip,
      status: 'completed',
      passengers: updatedPassengers,
      closure,
    };

    const updatedTrips = trips.map((t) => (t.id === tripId ? updatedTrip : t));
    setTrips(updatedTrips);
    upsertTripFirestore(updatedTrip).catch(() => {});

    const targetVehicle = vehicles.find((v) => v.id === targetTrip.vehicleId);
    if (targetVehicle && closure.endKm > targetVehicle.currentKm) {
      const updatedVehicles = vehicles.map((v) =>
        v.id === targetVehicle.id ? { ...v, currentKm: closure.endKm, status: 'available' as const } : v
      );
      setVehicles(updatedVehicles);
      const vToUpdate = updatedVehicles.find(v => v.id === targetVehicle.id);
      if (vToUpdate) upsertVehicleFirestore(vToUpdate).catch(() => {});
    }

    setIsClosureModalOpen(false);
    setTripForClosure(null);

    showToast(`Fechamento da viagem ${targetTrip.code} registrado com sucesso!`);
    setClosureToPrint(updatedTrip);
  };

  // ==========================================
  // Config & Database
  // ==========================================
  const handleSaveConfig = (newConfig: MunicipalConfig) => {
    setConfig(newConfig);
    updateConfigFirestore(newConfig).catch(() => {});
    showToast('Configurações da Secretaria de Saúde salvas com sucesso!');
  };

  const handleResetData = async () => {
    await seedAllFirestore();
    // Re-fetch all data to reset state from Supabase
    showToast('Todos os dados foram restaurados para o estado inicial com sucesso!', 'success');
  };

  const handleClearAllData = async () => {
    try {
      setTrips([]);
      setPatients([]);
      await clearTripsAndPatientsFirestore(false);
      showToast('Sistema resetado! Todas as viagens e pacientes foram apagados com sucesso.', 'success');
    } catch (error: any) {
      console.error('Clear data error:', error);
      showToast('Erro ao limpar dados na nuvem.', 'error');
    }
  };

  const handleClearTripsOnly = async () => {
    try {
      setTrips([]);
      await clearTripsAndPatientsFirestore(true);
      showToast('Todas as viagens e agendamentos (BPAs) foram removidos. O cadastro de pacientes foi mantido.', 'success');
    } catch (error: any) {
      console.error('Clear trips error:', error);
      showToast('Erro ao limpar viagens na nuvem.', 'error');
    }
  };

  const handleCleanupPatients = async () => {
    if (patients.length === 0) {
      showToast('Nenhum paciente cadastrado.', 'info');
      return;
    }

    const normalizeString = (str: string) => 
      (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    const groups = new Map<string, Patient[]>();

    patients.forEach(p => {
      const cleanCpf = (p.cpf || '').replace(/\D/g, '');
      const cleanSus = (p.susCard || '').replace(/\D/g, '');
      const normName = normalizeString(p.name);

      let key = '';
      if (cleanCpf.length === 11) {
        key = `cpf_${cleanCpf}`;
      } else if (cleanSus.length >= 14) {
        key = `sus_${cleanSus}`;
      } else if (normName.length >= 2) {
        key = `name_${normName}`;
      } else {
        key = `id_${p.id}`;
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(p);
    });

    const canonicalPatients: Patient[] = [];
    const duplicatesToRemove: string[] = [];
    const idRemap = new Map<string, string>();

    groups.forEach((group) => {
      if (group.length === 1) {
        canonicalPatients.push(group[0]);
      } else {
        // Sort group to pick canonical candidate with most filled fields
        group.sort((a, b) => {
          const scoreA = (a.cpf ? 2 : 0) + (a.susCard ? 2 : 0) + (a.phone ? 1 : 0) + (a.address ? 1 : 0) + (a.companionName ? 1 : 0);
          const scoreB = (b.cpf ? 2 : 0) + (b.susCard ? 2 : 0) + (b.phone ? 1 : 0) + (b.address ? 1 : 0) + (b.companionName ? 1 : 0);
          return scoreB - scoreA;
        });

        const canonical = { ...group[0] };
        
        // Merge missing fields from duplicates
        for (let i = 1; i < group.length; i++) {
          const dup = group[i];
          duplicatesToRemove.push(dup.id);
          idRemap.set(dup.id, canonical.id);

          if (!canonical.cpf && dup.cpf) canonical.cpf = dup.cpf;
          if (!canonical.susCard && dup.susCard) canonical.susCard = dup.susCard;
          if (!canonical.birthDate && dup.birthDate) canonical.birthDate = dup.birthDate;
          if (!canonical.phone && dup.phone) canonical.phone = dup.phone;
          if (!canonical.whatsapp && dup.whatsapp) canonical.whatsapp = dup.whatsapp;
          if (!canonical.address && dup.address) canonical.address = dup.address;
          if (!canonical.boardingAddress && dup.boardingAddress) canonical.boardingAddress = dup.boardingAddress;
          if (!canonical.companionName && dup.companionName) {
            canonical.companionName = dup.companionName;
            canonical.companionRequired = dup.companionRequired;
            canonical.companionCpf = dup.companionCpf;
            canonical.companionBirthDate = dup.companionBirthDate;
          }
        }

        canonicalPatients.push(canonical);
      }
    });

    if (duplicatesToRemove.length === 0) {
      showToast('Nenhum paciente duplicado foi encontrado no cadastro.', 'info');
      return;
    }

    // Sort canonical patients alphabetically by name
    canonicalPatients.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    // Update trips if any passenger referenced a deleted duplicate ID
    let updatedTrips = trips;
    if (idRemap.size > 0) {
      updatedTrips = trips.map(t => {
        const passList = ensurePassengerArray(t.passengers);
        let changed = false;
        const newPassList = passList.map(p => {
          if (idRemap.has(p.patientId)) {
            changed = true;
            return { ...p, patientId: idRemap.get(p.patientId)! };
          }
          return p;
        });
        return changed ? { ...t, passengers: newPassList } : t;
      });
    }

    // Update React state
    setPatients(canonicalPatients);
    setTrips(updatedTrips);

    // Sync to Supabase
    try {
      const itemsToUpsert = canonicalPatients.map(p => ({ collectionName: 'patients', id: p.id, data: p }));
      const itemsToDelete = duplicatesToRemove.map(id => ({ collectionName: 'patients', id }));

      await performBatchWrite(itemsToUpsert, itemsToDelete);

      showToast(`Limpeza concluída! ${duplicatesToRemove.length} registros repetidos foram removidos. Cadastro unificado com ${canonicalPatients.length} pacientes.`, 'success');
    } catch (err) {
      console.error('Error during patient deduplication:', err);
      showToast('Pacientes limpos localmente. Erro ao sincronizar com a nuvem.', 'error');
    }
  };

  const handleCleanupTrips = async () => {
    if (trips.length === 0) {
      showToast('Nenhuma viagem cadastrada para analisar.', 'info');
      return;
    }

    const normalizeStr = (str: string) => 
      (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    const cleanDigits = (str: string) => (str || '').replace(/\D/g, '');

    const cleanCityName = (cityStr: string) => {
      const base = (cityStr || '').split('-')[0].trim();
      return normalizeStr(base);
    };

    let totalPassengersRemoved = 0;
    let totalDuplicateTripsMerged = 0;
    const tripsToUpsert: Trip[] = [];
    const tripIdsToDelete: string[] = [];

    // ==========================================
    // STAGE 1: Group and Merge Duplicate Trips
    // (Trips on same departure date with same base destination city & vehicle/time)
    // ==========================================
    const tripGroupMap = new Map<string, Trip[]>();

    trips.forEach(t => {
      const date = t.departureDate || '';
      const cityKey = cleanCityName(t.destinationCity);
      const vehicleKey = (t.vehicleId || '').trim();
      const timeKey = (t.departureTime || '').trim().slice(0, 5);
      
      const key = `${date}_${cityKey}_${vehicleKey || timeKey}`;

      if (!tripGroupMap.has(key)) {
        tripGroupMap.set(key, []);
      }
      tripGroupMap.get(key)!.push(t);
    });

    const mergedTrips: Trip[] = [];

    tripGroupMap.forEach((group) => {
      if (group.length === 1) {
        mergedTrips.push(group[0]);
      } else {
        // Sort group: scheduled or in_route first, then most passengers
        group.sort((a, b) => {
          const passA = ensurePassengerArray(a.passengers).length;
          const passB = ensurePassengerArray(b.passengers).length;
          return passB - passA;
        });

        const canonicalTrip = { ...group[0] };
        const combinedPass = [...ensurePassengerArray(canonicalTrip.passengers)];

        for (let i = 1; i < group.length; i++) {
          const dupTrip = group[i];
          tripIdsToDelete.push(dupTrip.id);
          totalDuplicateTripsMerged++;

          const dupPassengers = ensurePassengerArray(dupTrip.passengers);
          dupPassengers.forEach(dp => {
            combinedPass.push(dp);
          });
        }

        canonicalTrip.passengers = combinedPass;
        mergedTrips.push(canonicalTrip);
      }
    });

    // ==========================================
    // STAGE 2: Deduplicate passengers inside each trip using Disjoint Set (Union-Find)
    // ==========================================
    const tripsAfterInternalDeduplication = mergedTrips.map(t => {
      const passList = ensurePassengerArray(t.passengers);
      if (passList.length <= 1) return t;

      const N = passList.length;
      const parent = Array.from({ length: N }, (_, i) => i);

      const find = (i: number): number => {
        if (parent[i] === i) return i;
        parent[i] = find(parent[i]);
        return parent[i];
      };

      const union = (i: number, j: number) => {
        const rootI = find(i);
        const rootJ = find(j);
        if (rootI !== rootJ) {
          parent[rootI] = rootJ;
        }
      };

      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const p1 = passList[i];
          const p2 = passList[j];

          const cpf1 = cleanDigits(p1.patientCpf);
          const cpf2 = cleanDigits(p2.patientCpf);

          const sus1 = cleanDigits(p1.patientSus);
          const sus2 = cleanDigits(p2.patientSus);

          const name1 = normalizeStr(p1.patientName);
          const name2 = normalizeStr(p2.patientName);

          const id1 = p1.patientId || '';
          const id2 = p2.patientId || '';

          let isSamePerson = false;

          if (id1 && id2 && id1 === id2) {
            isSamePerson = true;
          } else if (cpf1.length === 11 && cpf2.length === 11 && cpf1 === cpf2) {
            isSamePerson = true;
          } else if (sus1.length >= 10 && sus2.length >= 10 && sus1 === sus2) {
            isSamePerson = true;
          } else if (
            name1.length >= 3 && 
            name2.length >= 3 && 
            !['paciente', 'n/a', 'sem nome', 'desconhecido'].includes(name1)
          ) {
            if (name1 === name2) {
              isSamePerson = true;
            } else if (name1.length >= 6 && name2.length >= 6 && (name1.includes(name2) || name2.includes(name1))) {
              isSamePerson = true;
            } else {
              const words1 = name1.split(/\s+/).filter(w => w.length > 2);
              const words2 = name2.split(/\s+/).filter(w => w.length > 2);
              if (words1.length >= 2 && words2.length >= 2) {
                const firstLast1 = `${words1[0]}_${words1[words1.length - 1]}`;
                const firstLast2 = `${words2[0]}_${words2[words2.length - 1]}`;
                if (firstLast1 === firstLast2) {
                  isSamePerson = true;
                }
              }
            }
          }

          if (isSamePerson) {
            union(i, j);
          }
        }
      }

      // Group passengers by disjoint set root
      const groupsMap = new Map<number, TripPassenger[]>();
      for (let i = 0; i < N; i++) {
        const root = find(i);
        if (!groupsMap.has(root)) {
          groupsMap.set(root, []);
        }
        groupsMap.get(root)!.push(passList[i]);
      }

      const deduplicatedPass: TripPassenger[] = [];

      groupsMap.forEach((group) => {
        if (group.length === 1) {
          deduplicatedPass.push(group[0]);
        } else {
          totalPassengersRemoved += (group.length - 1);

          // Sort group to pick canonical passenger (preferring complete data)
          group.sort((a, b) => {
            const scoreA = (a.companionIncluded ? 4 : 0) + (a.notes ? 2 : 0) + (a.bookingCode ? 1 : 0) + (a.patientCpf ? 1 : 0);
            const scoreB = (b.companionIncluded ? 4 : 0) + (b.notes ? 2 : 0) + (b.bookingCode ? 1 : 0) + (b.patientCpf ? 1 : 0);
            return scoreB - scoreA;
          });

          const canonical = { ...group[0] };

          // Merge missing properties from other duplicates
          for (let k = 1; k < group.length; k++) {
            const dup = group[k];
            if (!canonical.patientCpf && dup.patientCpf) canonical.patientCpf = dup.patientCpf;
            if (!canonical.patientSus && dup.patientSus) canonical.patientSus = dup.patientSus;
            if (!canonical.patientPhone && dup.patientPhone) canonical.patientPhone = dup.patientPhone;
            if (!canonical.patientAddress && dup.patientAddress) canonical.patientAddress = dup.patientAddress;
            if (!canonical.appointmentTime && dup.appointmentTime) canonical.appointmentTime = dup.appointmentTime;
            if (!canonical.appointmentType && dup.appointmentType) canonical.appointmentType = dup.appointmentType;
            if (!canonical.notes && dup.notes) canonical.notes = dup.notes;
            if (!canonical.companionIncluded && dup.companionIncluded) {
              canonical.companionIncluded = true;
              canonical.companionName = dup.companionName;
              canonical.companionCpf = dup.companionCpf;
              canonical.companionBirthDate = dup.companionBirthDate;
              canonical.companionKinship = dup.companionKinship;
              canonical.companionAddress = dup.companionAddress;
            }
          }

          deduplicatedPass.push(canonical);
        }
      });

      return {
        ...t,
        passengers: deduplicatedPass
      };
    });

    // ==========================================
    // STAGE 3: Remove duplicate passenger bookings across DIFFERENT trips on the SAME departure date
    // ==========================================
    const seenPassengersPerDate = new Map<string, Set<string>>();

    const finalTrips = tripsAfterInternalDeduplication.map(t => {
      const date = t.departureDate || '';
      if (!seenPassengersPerDate.has(date)) {
        seenPassengersPerDate.set(date, new Set<string>());
      }
      const seenSet = seenPassengersPerDate.get(date)!;

      const currentPass = ensurePassengerArray(t.passengers);
      const filteredPass: TripPassenger[] = [];

      currentPass.forEach(p => {
        const cpf = cleanDigits(p.patientCpf);
        const sus = cleanDigits(p.patientSus);
        const normName = normalizeStr(p.patientName);
        const patId = p.patientId || '';

        // Form unique identity keys for date level check
        const keys: string[] = [];
        if (patId) keys.push(`id_${patId}`);
        if (cpf.length === 11) keys.push(`cpf_${cpf}`);
        if (sus.length >= 10) keys.push(`sus_${sus}`);
        if (normName.length >= 3 && !['paciente', 'n/a', 'sem nome', 'desconhecido'].includes(normName)) {
          keys.push(`name_${normName}`);
        }

        const isDuplicateDateBooking = keys.some(k => seenSet.has(k));

        if (isDuplicateDateBooking) {
          totalPassengersRemoved++;
        } else {
          // Add keys to seenSet
          keys.forEach(k => seenSet.add(k));
          filteredPass.push(p);
        }
      });

      // Reassign seat numbers for remaining passengers
      let currentSeat = 1;
      const reindexed = filteredPass.map(p => {
        const seatNumber = currentSeat;
        currentSeat++;
        let companionSeatNumber = undefined;
        if (p.companionIncluded) {
          companionSeatNumber = currentSeat;
          currentSeat++;
        }
        return {
          ...p,
          seatNumber,
          companionSeatNumber
        };
      });

      const updatedTrip = {
        ...t,
        passengers: reindexed
      };

      if (currentPass.length !== reindexed.length || tripIdsToDelete.includes(t.id)) {
        tripsToUpsert.push(updatedTrip);
      }

      return updatedTrip;
    });

    if (totalPassengersRemoved === 0 && totalDuplicateTripsMerged === 0) {
      showToast('Nenhum passageiro ou viagem duplicada foi encontrada nas viagens.', 'info');
      return;
    }

    // Update React State
    setTrips(finalTrips);

    // Sync to Supabase
    try {
      const itemsToUpsert = tripsToUpsert.map(t => ({ collectionName: 'trips', id: t.id, data: t }));
      const itemsToDelete = tripIdsToDelete.map(id => ({ collectionName: 'trips', id }));

      await performBatchWrite(itemsToUpsert, itemsToDelete);

      let msg = `Ajuste concluído com sucesso! `;
      if (totalPassengersRemoved > 0) {
        msg += `${totalPassengersRemoved} registro(s) de passageiro repetido removido(s). `;
      }
      if (totalDuplicateTripsMerged > 0) {
        msg += `${totalDuplicateTripsMerged} viagem(ns) duplicada(s) unificada(s).`;
      }

      showToast(msg, 'success');
    } catch (err) {
      console.error('Error during trip deduplication:', err);
      showToast('Viagens ajustadas localmente. Erro ao sincronizar com a nuvem.', 'error');
    }
  };

  const handleCleanupDestinations = async () => {
    const uniqueMap = new Map<string, DestinationHospital>();
    const duplicatesToRemove: string[] = [];

    destinations.forEach(d => {
      const cleanHosp = normalizeHospitalName(d.name);
      const cleanCity = (d.city || '').toLowerCase().trim();
      const key = `${cleanHosp}_${cleanCity}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, d);
      } else {
        duplicatesToRemove.push(d.id);
      }
    });

    if (duplicatesToRemove.length === 0) {
      showToast('Nenhum hospital duplicado encontrado.', 'info');
      return;
    }

    const cleaned = Array.from(uniqueMap.values());
    setDestinations(cleaned);

    try {
      await Promise.all(duplicatesToRemove.map(id => deleteDestinationFirestore(id)));
      showToast(`${duplicatesToRemove.length} hospitais duplicados foram removidos com sucesso!`, 'success');
    } catch (error) {
      console.error('Cleanup error:', error);
      showToast('Hospitais limpos localmente. Alguns erros na nuvem.', 'info');
    }
  };

  const handleCleanupCities = async () => {
    const officialNames = new Set(INITIAL_DESTINATION_CITIES.map(c => c.cityName.toUpperCase().trim()));
    const initialCount = destinationCities.length;
    
    // We keep only the 45 official ones
    const updated = INITIAL_DESTINATION_CITIES;
    
    if (updated.length === initialCount) {
      showToast('A lista de cidades já está limpa e contém apenas as 45 oficiais.', 'info');
      return;
    }

    setDestinationCities(updated);

    try {
      await updateDestinationCitiesFirestore(updated);
      showToast(`Cidades limpas! ${initialCount - updated.length} cidades não oficiais foram removidas.`, 'success');
    } catch (error) {
      console.error('Cleanup cities error:', error);
      showToast('Cidades limpas localmente.', 'info');
    }
  };

  const handleImportBackup = (jsonString: string) => {
    const success = importDatabaseBackup(jsonString);
    if (success) {
      setTrips(getTrips());
      setPatients(getPatients());
      setVehicles(getVehicles());
      setConfig(getMunicipalConfig());
      showToast('Backup restaurado com sucesso!');
    } else {
      showToast('Erro ao restaurar backup. Arquivo JSON inválido.', 'error');
    }
  };

  // Print Triggers
  const triggerPrintPassengerTicket = (trip: Trip, passengerId: string) => {
    const passenger = ensurePassengerArray(trip.passengers).find((p) => p.id === passengerId);
    if (!passenger) return;
    setTicketToPrint({ trip, passenger });
  };

  const triggerPrintManifest = (trip: Trip) => {
    setManifestToPrint(trip);
  };

  const triggerPrintClosure = (trip: Trip) => {
    setClosureToPrint(trip);
  };

  // 1. Loading screen
  if (isAuthLoading || isDataLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-300 font-bold text-sm tracking-wide">Carregando sistema TFD & Transporte...</p>
        </div>
      </div>
    );
  }

  const userRecord = systemUsers.find(u => u.email?.toLowerCase() === currentUser?.email?.toLowerCase());
  const isAdmin = currentUser ? (currentUser.email === 'digitalpersonal@gmail.com' || userRecord?.role === 'admin' || !userRecord) : false;
  const isAuthorized = !!currentUser;

  // 2. Login screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4" style={{ backgroundImage: 'radial-gradient(circle at top, #022c22 0%, #020617 100%)' }}>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-8 border border-slate-200">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center font-black text-white text-2xl tracking-wider shadow-md mb-3">
              SUS
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight text-center">
              TFD & Transporte Municipal
            </h2>
            <p className="text-xs text-slate-500 font-medium text-center mt-1">
              {config.municipalityName} • {config.departmentName}
            </p>
          </div>

          {loginError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs mb-4 space-y-2">
              <div><span className="font-bold">Aviso:</span> {loginError}</div>
              {loginEmail.trim().toLowerCase() === 'digitalpersonal@gmail.com' && (
                <div className="pt-2 border-t border-rose-200/50">
                  <button
                    type="button"
                    disabled={isSendingReset}
                    onClick={handleForgotPassword}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-3 rounded-lg text-center transition-colors cursor-pointer"
                  >
                    {isSendingReset ? 'Enviando link...' : 'Recuperar Senha por E-mail Agora'}
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">E-mail de Acesso</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                placeholder="usuario@saude.gov.br"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Senha de Acesso</label>
                <button
                  type="button"
                  disabled={isSendingReset}
                  onClick={handleForgotPassword}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  {isSendingReset ? 'Enviando link...' : 'Esqueci a senha'}
                </button>
              </div>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              id="btn-submit-login"
              disabled={isLoggingIn}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-bold text-sm">Autenticando...</span>
                </>
              ) : (
                <>
                  <span className="font-bold text-sm tracking-wide">ENTRAR NO SISTEMA</span>
                  <span className="text-lg leading-none">→</span>
                </>
              )}
            </button>
          </form>
        </div>
        
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold bg-slate-900 text-white border border-slate-800 animate-bounce">
            {toast.message}
          </div>
        )}
      </div>
    );
  }

  // 3. Unauthorized screen (registered but no profile link)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-200 text-center">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-2">Acesso Pendente</h3>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Sua conta (<span className="font-bold">{currentUser.email}</span>) foi autenticada, mas ainda não foi registrada como um usuário ativo no sistema pelo Administrador Geral.<br/>
            Por favor, peça ao Administrador para registrar seu e-mail no painel de controle.
          </p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Voltar para o Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans print:min-h-0 print:bg-white print:block">
      {/* Container principal que some por completo na impressao */}
      <div className="flex-1 flex flex-col print:hidden">
        {/* Top Bar Navigation */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          config={config}
          onOpenNewBookingModal={() => {
            setPreselectedTripId(undefined);
            setPreselectedPatientId(undefined);
            setIsBookingModalOpen(true);
          }}
          onOpenNewTripModal={() => {
            setEditingTrip(null);
            setIsTripModalOpen(true);
          }}
          onOpenNewPatientModal={() => {
            setEditingPatient(null);
            setIsPatientModalOpen(true);
          }}
          onOpenImportExcelModal={() => setIsExcelImportModalOpen(true)}
          onOpenConfigModal={() => setIsConfigModalOpen(true)}
          onOpenUserModal={() => setIsUserModalOpen(true)}
          isAdmin={isAdmin}
          currentUserEmail={currentUser.email}
          onLogout={handleLogout}
        />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 print:hidden">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-bold transition-all transform animate-bounce ${
              toast.type === 'success'
                ? 'bg-emerald-800 text-white'
                : toast.type === 'error'
                ? 'bg-rose-800 text-white'
                : 'bg-slate-900 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-300 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <DashboardView
            trips={trips}
            patients={patients}
            vehicles={vehicles}
            destinations={destinations}
            config={config}
            onNavigateTab={setActiveTab}
            onOpenNewBookingModal={(tripId) => {
              setPreselectedTripId(tripId);
              setPreselectedPatientId(undefined);
              setIsBookingModalOpen(true);
            }}
            onOpenNewTripModal={() => {
              setEditingTrip(null);
              setIsTripModalOpen(true);
            }}
            onOpenNewPatientModal={() => {
              setEditingPatient(null);
              setIsPatientModalOpen(true);
            }}
            onOpenImportExcelModal={() => setIsExcelImportModalOpen(true)}
            onPrintManifest={triggerPrintManifest}
            onOpenClosureModal={(trip) => {
              setTripForClosure(trip);
              setIsClosureModalOpen(true);
            }}
            onClearSystem={async () => {
              try {
                await clearTripsAndPatientsFirestore();
                setTrips([]);
                setPatients([]);
                showToast('Todos os dados foram removidos com sucesso!');
              } catch (e) {
                console.error('Error clearing system', e);
                showToast('Erro ao remover dados do banco de dados.', 'error');
              }
            }}
            onClearTripsOnly={handleClearTripsOnly}
            onEditTrip={(trip) => {
              setEditingTrip(trip);
              setIsTripModalOpen(true);
            }}
            onCancelBooking={handleCancelBooking}
            onCleanupTrips={handleCleanupTrips}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === 'trips' && (
          <TripsView
            trips={trips}
            vehicles={vehicles}
            destinations={destinations}
            config={config}
            onOpenNewTripModal={() => {
              setEditingTrip(null);
              setIsTripModalOpen(true);
            }}
            onEditTrip={(trip) => {
              setEditingTrip(trip);
              setIsTripModalOpen(true);
            }}
            onDeleteTrip={handleDeleteTrip}
            onOpenNewBookingModal={(tripId) => {
              setPreselectedTripId(tripId);
              setPreselectedPatientId(undefined);
              setIsBookingModalOpen(true);
            }}
            onPrintManifest={triggerPrintManifest}
            onOpenClosureModal={(trip) => {
              setTripForClosure(trip);
              setIsClosureModalOpen(true);
            }}
            onPrintClosure={triggerPrintClosure}
            onPrintPassengerTicket={triggerPrintPassengerTicket}
            onRemoveCompanion={handleRemoveCompanion}
            onCleanupTrips={handleCleanupTrips}
          />
        )}

        {activeTab === 'bookings' && (
          <BookingsView
            trips={trips}
            vehicles={vehicles}
            config={config}
            onOpenNewBookingModal={() => {
              setPreselectedTripId(undefined);
              setPreselectedPatientId(undefined);
              setIsBookingModalOpen(true);
            }}
            onPrintTicket={triggerPrintPassengerTicket}
            onCancelBooking={handleCancelBooking}
            onCleanupTrips={handleCleanupTrips}
          />
        )}

        {activeTab === 'patients' && (
          <PatientsView
            patients={patients}
            trips={trips}
            vehicles={vehicles}
            onOpenNewPatientModal={() => {
              setEditingPatient(null);
              setIsPatientModalOpen(true);
            }}
            onEditPatient={(patient) => {
              setEditingPatient(patient);
              setIsPatientModalOpen(true);
            }}
            onDeletePatient={handleDeletePatient}
            onOpenNewBookingModalWithPatient={(patientId, tripId) => {
              setPreselectedPatientId(patientId);
              setPreselectedTripId(tripId);
              setIsBookingModalOpen(true);
            }}
            onOpenImportExcelModal={() => setIsExcelImportModalOpen(true)}
            onCleanupPatients={handleCleanupPatients}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === 'vehicles' && (
          <VehiclesView
            vehicles={vehicles}
            onOpenNewVehicleModal={() => {
              setEditingVehicle(null);
              setIsVehicleModalOpen(true);
            }}
            onEditVehicle={(vehicle) => {
              setEditingVehicle(vehicle);
              setIsVehicleModalOpen(true);
            }}
            onDeleteVehicle={handleDeleteVehicle}
          />
        )}

        {activeTab === 'drivers' && (
          <DriversView
            drivers={drivers}
            onOpenNewDriverModal={() => {
              setEditingDriver(null);
              setIsDriverModalOpen(true);
            }}
            onEditDriver={(driver) => {
              setEditingDriver(driver);
              setIsDriverModalOpen(true);
            }}
            onDeleteDriver={handleDeleteDriver}
          />
        )}

        {activeTab === 'destinations' && (
          <DestinationCitiesView
            cities={destinationCities}
            destinations={destinations}
            onOpenNewCityModal={() => {
              setEditingDestinationCity(null);
              setIsDestinationCityModalOpen(true);
            }}
            onEditCity={(city) => {
              setEditingDestinationCity(city);
              setIsDestinationCityModalOpen(true);
            }}
            onDeleteCity={handleDeleteDestinationCity}
            onCleanupCities={handleCleanupCities}
            onCleanupHospitals={handleCleanupDestinations}
            isAdmin={isAdmin}
          />
        )}
        
        {activeTab === 'boarding' && (
          <BoardingAddressesView patients={patients} />
        )}

        {activeTab === 'reports' && (
          <ClosuresAndReportsView
            trips={trips}
            vehicles={vehicles}
            patients={patients}
            destinations={destinations}
            config={config}
            onPrintClosure={triggerPrintClosure}
            onDeleteTrip={handleDeleteTrip}
          />
        )}

        {activeTab === 'bpa' && (
          <BpaExportView
            trips={trips}
            drivers={drivers}
            patients={patients}
            config={config}
            onUpdateDriver={handleSaveDriver}
            onUpdateConfig={(newCfg) => {
              setConfig(newCfg);
              saveMunicipalConfig(newCfg);
              updateConfigFirestore(newCfg).catch(() => {});
            }}
            showToast={showToast}
            onClearTripsOnly={handleClearTripsOnly}
            onClearSystem={handleClearAllData}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === 'backups' && (
          <BackupsView
            config={config}
            snapshots={backupSnapshots}
            onUpdateConfig={handleSaveConfig}
            onCreateSnapshot={handleCreateSnapshot}
            onRestoreSnapshot={handleRestoreSnapshot}
            onDeleteSnapshot={handleDeleteSnapshot}
            onExportBackup={exportDatabaseBackup}
            onImportBackup={handleImportBackup}
            showToast={showToast}
            isAdmin={isAdmin}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-bold text-slate-300">Sistema TFD</span> — Transporte Fora do Domicílio e Pacientes SUS
          </div>
          <div>
            {config.municipalityName} • {config.departmentName}
          </div>
        </div>
      </footer>

      {/* Footer 2 */}
      <footer className="py-6 bg-slate-900 text-slate-400 text-center text-xs border-t border-slate-800">
        <p>desenvolvido por Silvio T. de Sá Filho - Chefe do CPD 2026</p>
      </footer>
      </div>

      {/* ================= MODALS ================= */}

      {/* Patient Add/Edit Modal */}
      {isPatientModalOpen && (
        <PatientFormModal
          patient={editingPatient}
          onSave={handleSavePatient}
          onClose={() => {
            setIsPatientModalOpen(false);
            setEditingPatient(null);
          }}
        />
      )}

      {/* Vehicle Add/Edit Modal */}
      {isVehicleModalOpen && (
        <VehicleFormModal
          vehicle={editingVehicle}
          onSave={handleSaveVehicle}
          onClose={() => {
            setIsVehicleModalOpen(false);
            setEditingVehicle(null);
          }}
        />
      )}

      {/* Driver Add/Edit Modal */}
      {isDriverModalOpen && (
        <DriverFormModal
          driver={editingDriver}
          onSave={handleSaveDriver}
          onClose={() => {
            setIsDriverModalOpen(false);
            setEditingDriver(null);
          }}
        />
      )}

      {/* Trip Add/Edit Modal */}
      {isTripModalOpen && (
        <TripFormModal
          trip={editingTrip}
          vehicles={vehicles}
          drivers={drivers}
          destinations={destinations}
          cities={destinationCities}
          onSave={handleSaveTrip}
          onClose={() => {
            setIsTripModalOpen(false);
            setEditingTrip(null);
          }}
        />
      )}

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <BookingFormModal
          trips={trips}
          patients={patients}
          vehicles={vehicles}
          destinations={destinations}
          preselectedTripId={preselectedTripId}
          preselectedPatientId={preselectedPatientId}
          onSaveBooking={handleSaveBooking}
          onClose={() => {
            setIsBookingModalOpen(false);
            setPreselectedTripId(undefined);
            setPreselectedPatientId(undefined);
          }}
        />
      )}

      {/* Trip Closure Modal */}
      {isClosureModalOpen && tripForClosure && (
        <TripClosureModal
          trip={tripForClosure}
          vehicle={vehicles.find((v) => v.id === tripForClosure.vehicleId)}
          onSaveClosure={(_tripId, closure, updatedPassengers) =>
            handleSaveClosure(tripForClosure.id, closure, updatedPassengers)
          }
          onClose={() => {
            setIsClosureModalOpen(false);
            setTripForClosure(null);
          }}
        />
      )}

      {/* Excel Import Modal */}
      {isExcelImportModalOpen && (
        <ExcelImportModal
          onImportPatients={handleImportPatientsFromExcel}
          onClearAllData={isAdmin ? handleClearAllData : undefined}
          onClearTripsOnly={isAdmin ? handleClearTripsOnly : undefined}
          onCleanupDestinations={handleCleanupDestinations}
          onCleanupCities={handleCleanupCities}
          onCleanupPatients={handleCleanupPatients}
          onClose={() => setIsExcelImportModalOpen(false)}
        />
      )}

      {/* Destination City Modal */}
      {isDestinationCityModalOpen && (
        <DestinationCityModal
          city={editingDestinationCity}
          onSave={handleSaveDestinationCity}
          onClose={() => {
            setIsDestinationCityModalOpen(false);
            setEditingDestinationCity(null);
          }}
        />
      )}

      {/* Municipal Config & Backup Modal */}
      {isConfigModalOpen && (
        <ConfigModal
          config={config}
          snapshots={backupSnapshots}
          onSaveConfig={handleSaveConfig}
          onResetData={handleResetData}
          onClearAllData={handleClearAllData}
          onExportBackup={exportDatabaseBackup}
          onImportBackup={handleImportBackup}
          onCreateSnapshot={handleCreateSnapshot}
          onRestoreSnapshot={handleRestoreSnapshot}
          onDeleteSnapshot={handleDeleteSnapshot}
          onClose={() => setIsConfigModalOpen(false)}
          isAdmin={isAdmin}
        />
      )}

      {/* User Management Modal */}
      {isUserModalOpen && (
        <UserManagementModal
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          showToast={showToast}
        />
      )}

      {/* ================= PRINT MODALS ================= */}

      {/* Print Patient Ticket */}
      {ticketToPrint && (
        <PrintTicketModal
          trip={ticketToPrint.trip}
          passenger={ticketToPrint.passenger}
          vehicle={vehicles.find((v) => v.id === ticketToPrint.trip.vehicleId)}
          config={config}
          onClose={() => setTicketToPrint(null)}
        />
      )}

      {/* Print Trip Manifest */}
      {manifestToPrint && (
        <PrintManifestModal
          trip={manifestToPrint}
          vehicle={vehicles.find((v) => v.id === manifestToPrint.vehicleId)}
          config={config}
          patients={patients}
          onClose={() => setManifestToPrint(null)}
        />
      )}

      {/* Print Trip Closure */}
      {closureToPrint && (
        <PrintClosureModal
          trip={closureToPrint}
          vehicle={vehicles.find((v) => v.id === closureToPrint.vehicleId)}
          config={config}
          onClose={() => setClosureToPrint(null)}
        />
      )}

    </div>
  );
}
