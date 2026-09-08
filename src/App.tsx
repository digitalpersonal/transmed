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
  clearTrips
} from './utils/storage';
import { ExcelCapturedRow } from './utils/excel';
import { 
  subscribeToPatients, upsertPatientFirestore, deletePatientFirestore,
  subscribeToVehicles, upsertVehicleFirestore, deleteVehicleFirestore,
  subscribeToDrivers, upsertDriverFirestore, deleteDriverFirestore,
  subscribeToDestinations, upsertDestinationFirestore,
  subscribeToTrips, upsertTripFirestore, deleteTripFirestore, performBatchWrite,
  subscribeToConfig, updateConfigFirestore,
  subscribeToDestinationCities, updateDestinationCitiesFirestore,
  seedAllFirestore, clearTripsAndPatientsFirestore,
  subscribeToUsers
} from './lib/supabaseSync';
import { auth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User, sendPasswordResetEmail } from './lib/supabase';
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

  // Core Data State (initialized instantly from local storage for maximum performance)
  const [trips, setTrips] = useState<Trip[]>(getTrips());
  const [patients, setPatients] = useState<Patient[]>(getPatients());
  const [vehicles, setVehicles] = useState<Vehicle[]>(getVehicles());
  const [drivers, setDrivers] = useState<Driver[]>(getDrivers());
  const [destinations, setDestinations] = useState<DestinationHospital[]>(getDestinations());
  const [config, setConfig] = useState<MunicipalConfig>(getMunicipalConfig());

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
      await signInWithEmailAndPassword(auth, emailToUse, loginPassword);
      showToast('Login realizado com sucesso!', 'success');
    } catch (err: any) {
      console.error('Login error:', err);
      
      // If the email is the default admin email, let's try to automatically create the account!
      if (emailToUse.toLowerCase() === 'digitalpersonal@gmail.com') {
        try {
          await createUserWithEmailAndPassword(auth, emailToUse, loginPassword);
          showToast('Conta administrativa criada e logada com sucesso!', 'success');
          return;
        } catch (createErr: any) {
          console.error('Auto admin creation failed:', createErr);
          if (createErr?.code === 'auth/email-already-in-use') {
            setLoginError('Esta conta de administrador (digitalpersonal@gmail.com) já existe, mas a senha atual na nuvem é diferente de Mld3602#?+. Você precisa redefinir sua senha para acessar.');
          } else {
            setLoginError(`Erro ao inicializar conta: ${createErr.message || 'Verifique sua conexão ou se as credenciais de e-mail/senha estão ativadas no console do Firebase.'}`);
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

  // Load from storage and Firestore on mount
  useEffect(() => {
    const unsubPatients = subscribeToPatients(setPatients);
    const unsubVehicles = subscribeToVehicles((vList) => {
      setVehicles(vList);
      saveVehicles(vList);
    });
    const unsubDrivers = subscribeToDrivers((dList) => {
      setDrivers(dList);
      saveDrivers(dList);
    });
    const unsubDestinations = subscribeToDestinations(setDestinations);
    const unsubTrips = subscribeToTrips(setTrips);
    const unsubConfig = subscribeToConfig(setConfig);
    const unsubCities = subscribeToDestinationCities((citiesList) => {
      setDestinationCities(citiesList);
      saveDestinationCities(citiesList);
    });

    return () => {
      unsubPatients();
      unsubVehicles();
      unsubDrivers();
      unsubDestinations();
      unsubTrips();
      unsubConfig();
      unsubCities();
    };
  }, []);

  // Modal Visibility States
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const [destinationCities, setDestinationCities] = useState<DestinationCity[]>(() => {
    const stored = getStoredDestinationCities();
    if (stored.length < INITIAL_DESTINATION_CITIES.length) {
      const existingNames = new Set(stored.map(c => c.cityName.toUpperCase()));
      const missing = INITIAL_DESTINATION_CITIES.filter(c => !existingNames.has(c.cityName.toUpperCase()));
      const merged = [...stored, ...missing];
      saveDestinationCities(merged);
      return merged;
    }
    return stored;
  });
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
    let updated: Patient[];
    const exists = patients.some((p) => p.id === patientToSave.id);
    if (exists) {
      updated = patients.map((p) => (p.id === patientToSave.id ? patientToSave : p));
      showToast(`Paciente ${patientToSave.name} atualizado com sucesso!`);
    } else {
      updated = [patientToSave, ...patients];
      showToast(`Paciente ${patientToSave.name} cadastrado com sucesso!`);
    }
    setPatients(updated);
    savePatients(updated);
    upsertPatientFirestore(patientToSave).catch(() => {});
    setIsPatientModalOpen(false);
    setEditingPatient(null);
  };

  const handleDeletePatient = (patientId: string) => {
    const updated = patients.filter((p) => p.id !== patientId);
    setPatients(updated);
    savePatients(updated);
    deletePatientFirestore(patientId).catch(() => {});
    showToast('Paciente removido do cadastro.', 'info');
  };

  const handleImportPatientsFromExcel = async (newPatients: Patient[], capturedRows?: ExcelCapturedRow[]) => {
    if (!capturedRows || capturedRows.length === 0) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    
    // Arrays representing updated states
    let localPatients = [...patients];
    let localVehicles = [...vehicles];
    let localDrivers = [...drivers];
    let localDestinations = [...destinations];
    let localCities = [...destinationCities];

    // Track database writes
    const patientsToUpsert: Patient[] = [];
    const vehiclesToUpsert: Vehicle[] = [];
    const driversToUpsert: Driver[] = [];
    const destinationsToUpsert: DestinationHospital[] = [];
    const citiesToUpsert: DestinationCity[] = [];

    // Helper functions for lookup or auto-creation
    const getOrAddVehicle = (vehicleStr: string): Vehicle => {
      const cleanVeh = vehicleStr.trim();
      if (!cleanVeh) {
        if (localVehicles.length > 0) return localVehicles[0];
        // Create default fallback vehicle
        const defVeh: Vehicle = {
          id: 'v-default',
          model: 'Van Escala TFD',
          brand: 'Municipal',
          plate: 'TFD-0000',
          maxCapacity: 15,
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
        vehiclesToUpsert.push(defVeh);
        return defVeh;
      }

      // Check if matches model or plate
      let found = localVehicles.find(v => 
        v.model.toLowerCase().includes(cleanVeh.toLowerCase()) ||
        v.plate.toLowerCase().includes(cleanVeh.toLowerCase()) ||
        cleanVeh.toLowerCase().includes(v.plate.toLowerCase())
      );

      if (!found) {
        // Parse plate if in parenthesis (e.g. "Master (SAU-4A12)")
        const plateMatch = cleanVeh.match(/\(([^)]+)\)/);
        const plate = plateMatch ? plateMatch[1].toUpperCase() : `TFD-${Math.floor(1000 + Math.random() * 9000)}`;
        const model = cleanVeh.replace(/\([^)]+\)/, '').trim() || 'Veículo Adicional';
        
        found = {
          id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          model,
          brand: 'Municipal',
          plate,
          maxCapacity: 15,
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
        vehiclesToUpsert.push(found);
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
        driversToUpsert.push(found);
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
        citiesToUpsert.push(newCity);
      }
    };

    const getOrAddDestination = (destName: string, cityName: string) => {
      const cleanDest = destName.trim();
      const cleanCity = cityName.trim() || 'Campinas';
      if (!cleanDest) return;

      getOrAddCity(cleanCity);

      const found = localDestinations.find(d => 
        d.name.toLowerCase() === cleanDest.toLowerCase() && 
        d.city.toLowerCase() === cleanCity.toLowerCase()
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
        destinationsToUpsert.push(newDest);
      }
    };

    // Process all spreadsheet rows (merge with existing trips, preserving manually registered data)
    let updatedTrips: Trip[] = [...trips];

    capturedRows.forEach((row, idx) => {
      const parsedPat = newPatients[idx];
      if (!parsedPat) return;

      const destCity = row.cidadeDestino || row.destino || 'Campinas';
      const destHospital = row.destino || destCity;

      // Ensure Destination & City exists (runs for all rows)
      getOrAddDestination(destHospital, destCity);

      // Find or register vehicle & driver (runs for all rows)
      const targetVehicle = getOrAddVehicle(row.veiculo || '');
      const driverName = getOrAddDriver(row.motorista || '');

      // Upsert/Merge patient (runs for all rows)
      let existingPat = localPatients.find(p => p.cpf === parsedPat.cpf);
      if (existingPat) {
        // Merge & update missing/modified fields
        existingPat = {
          ...existingPat,
          susCard: parsedPat.susCard || existingPat.susCard,
          birthDate: parsedPat.birthDate || existingPat.birthDate,
          phone: parsedPat.phone || existingPat.phone,
          whatsapp: parsedPat.whatsapp || existingPat.whatsapp,
          address: parsedPat.address || existingPat.address,
          boardingAddress: parsedPat.boardingAddress || existingPat.boardingAddress,
          procedureTime: parsedPat.procedureTime || existingPat.procedureTime,
          companionRequired: parsedPat.companionRequired !== undefined ? parsedPat.companionRequired : existingPat.companionRequired,
          companionName: parsedPat.companionName || existingPat.companionName,
          companionBirthDate: parsedPat.companionBirthDate || existingPat.companionBirthDate,
          companionCpf: parsedPat.companionCpf || existingPat.companionCpf,
          companionAddress: parsedPat.companionAddress || existingPat.companionAddress,
          companionKinship: parsedPat.companionKinship || existingPat.companionKinship,
          condition: parsedPat.condition || existingPat.condition,
        };
        localPatients = localPatients.map(p => p.id === existingPat!.id ? existingPat! : p);
        if (!patientsToUpsert.some(p => p.id === existingPat!.id)) {
          patientsToUpsert.push(existingPat);
        }
      } else {
        existingPat = {
          ...parsedPat,
          id: parsedPat.id || `pat-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          createdAt: todayStr
        };
        localPatients.push(existingPat);
        patientsToUpsert.push(existingPat);
      }

      const tripDate = row.dataViagem || todayStr;
      
      // Manter a importação das viagens somente da data da importação para frente
      if (tripDate < todayStr) return;
      
      // Check if trip already exists for this destination + date + vehicle
      let targetTrip = updatedTrips.find(t => 
        t.destinationCity.toLowerCase().includes(destCity.toLowerCase()) &&
        t.status === 'scheduled' &&
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
        destinationName: destHospital,
        destinationCity: destCity,
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
          destinationCity: destCity,
          destinationHospital: destHospital,
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
        updatedTrips = [targetTrip, ...updatedTrips];
      } else {
        const existingPass = ensurePassengerArray(targetTrip.passengers);
        if (!existingPass.some(p => p.patientId === existingPat!.id)) {
          const updatedTripPassengers = [...existingPass, passengerItem];
          
          targetTrip = {
            ...targetTrip,
            passengers: updatedTripPassengers,
            destinationHospital: targetTrip.destinationHospital || destHospital,
            status: 'scheduled', // Keep it active if newly imported passenger is added
          };
          updatedTrips = updatedTrips.map(t => t.id === targetTrip!.id ? targetTrip! : t);
        }
      }
    });

    // Save states locally
    setPatients(localPatients);
    savePatients(localPatients);
    
    setVehicles(localVehicles);
    saveVehicles(localVehicles);

    setDrivers(localDrivers);
    saveDrivers(localDrivers);

    setDestinations(localDestinations);
    saveDestinations(localDestinations);

    setDestinationCities(localCities);
    saveDestinationCities(localCities);

    setTrips(updatedTrips);
    saveTrips(updatedTrips);

    // Sync everything to Supabase using high-speed bulk writes to avoid browser request limits
    try {
      const itemsToUpsert: { collectionName: string; id: string; data: any }[] = [];

      // Ensure absolutely everything processed is registered on Supabase
      localPatients.forEach(p => {
        itemsToUpsert.push({ collectionName: 'patients', id: p.id, data: p });
      });

      localVehicles.forEach(v => {
        itemsToUpsert.push({ collectionName: 'vehicles', id: v.id, data: v });
      });

      localDrivers.forEach(d => {
        itemsToUpsert.push({ collectionName: 'drivers', id: d.id, data: d });
      });

      localDestinations.forEach(d => {
        itemsToUpsert.push({ collectionName: 'destinations', id: d.id, data: d });
      });

      updatedTrips.forEach(t => {
        itemsToUpsert.push({ collectionName: 'trips', id: t.id, data: t });
      });

      await Promise.all([
        performBatchWrite(itemsToUpsert, []),
        localCities.length > 0 ? updateDestinationCitiesFirestore(localCities) : Promise.resolve()
      ]);

      showToast(`Planilha importada! ${localPatients.length} pacientes, ${updatedTrips.length} viagens, ${localVehicles.length} veículos e ${localDrivers.length} motoristas sincronizados com sucesso no Supabase!`, 'success');
    } catch (err) {
      console.error('Error synchronizing spreadsheet data to Supabase:', err);
      showToast('Importação concluída localmente. Algumas sincronizações com a nuvem podem levar alguns segundos.', 'info');
    }
  };

  // ==========================================
  // Vehicle CRUD
  // ==========================================
  const handleSaveVehicle = (vehicleToSave: Vehicle) => {
    let updated: Vehicle[];
    const exists = vehicles.some((v) => v.id === vehicleToSave.id);
    if (exists) {
      updated = vehicles.map((v) => (v.id === vehicleToSave.id ? vehicleToSave : v));
      showToast(`Veículo ${vehicleToSave.model} atualizado com sucesso!`);
    } else {
      updated = [vehicleToSave, ...vehicles];
      showToast(`Veículo ${vehicleToSave.model} cadastrado na frota!`);
    }
    setVehicles(updated);
    saveVehicles(updated);
    upsertVehicleFirestore(vehicleToSave).catch(() => {});
    setIsVehicleModalOpen(false);
    setEditingVehicle(null);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    const updated = vehicles.filter((v) => v.id !== vehicleId);
    setVehicles(updated);
    saveVehicles(updated);
    deleteVehicleFirestore(vehicleId).catch(() => {});
    showToast('Veículo removido da frota.', 'info');
  };

  // ==========================================
  // Driver CRUD
  // ==========================================
  const handleSaveDriver = (driverToSave: Driver | Omit<Driver, 'id' | 'createdAt'>) => {
    let updated: Driver[];
    let targetDriver: Driver;
    if ('id' in driverToSave) {
      targetDriver = driverToSave as Driver;
      updated = drivers.map((d) => (d.id === targetDriver.id ? targetDriver : d));
      showToast(`Motorista ${targetDriver.name} atualizado com sucesso!`);
    } else {
      targetDriver = {
        ...driverToSave,
        id: `drv-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      updated = [targetDriver, ...drivers];
      showToast(`Motorista ${targetDriver.name} cadastrado com sucesso!`);
    }
    setDrivers(updated);
    saveDrivers(updated);
    upsertDriverFirestore(targetDriver).catch(() => {});
    setIsDriverModalOpen(false);
    setEditingDriver(null);
  };

  const handleDeleteDriver = (driverId: string) => {
    const updated = drivers.filter((d) => d.id !== driverId);
    setDrivers(updated);
    saveDrivers(updated);
    deleteDriverFirestore(driverId).catch(() => {});
    showToast('Motorista removido.', 'info');
  };

  // ==========================================
  // Trip CRUD
  // ==========================================
  const handleSaveTrip = (tripToSave: Trip) => {
    let updated: Trip[];
    const exists = trips.some((t) => t.id === tripToSave.id);
    if (exists) {
      updated = trips.map((t) => (t.id === tripToSave.id ? tripToSave : t));
      showToast(`Viagem ${tripToSave.code} atualizada com sucesso!`);
    } else {
      updated = [tripToSave, ...trips];
      showToast(`Viagem para ${tripToSave.destinationCity} agendada com sucesso!`);
    }
    setTrips(updated);
    saveTrips(updated);
    upsertTripFirestore(tripToSave).catch(() => {});
    setIsTripModalOpen(false);
    setEditingTrip(null);
  };

  const handleDeleteTrip = (tripId: string) => {
    const updated = trips.filter((t) => t.id !== tripId);
    setTrips(updated);
    saveTrips(updated);
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
    saveTrips(updatedTrips);
    upsertTripFirestore(updatedTrip).catch(() => {});
    showToast('Acompanhante removido com sucesso!');
  };

  // ==========================================
  // Booking Creation
  // ==========================================
  const handleSaveBooking = (tripId: string, newPassenger: TripPassenger) => {
    const targetTrip = trips.find((t) => t.id === tripId);
    if (!targetTrip) return;

    const updatedTrip: Trip = {
      ...targetTrip,
      passengers: [...ensurePassengerArray(targetTrip.passengers), newPassenger],
    };

    const updatedTrips = trips.map((t) => (t.id === tripId ? updatedTrip : t));
    setTrips(updatedTrips);
    saveTrips(updatedTrips);
    upsertTripFirestore(updatedTrip).catch(() => {});

    setIsBookingModalOpen(false);
    setPreselectedTripId(undefined);
    setPreselectedPatientId(undefined);

    showToast(`Agendamento realizado! Código: ${newPassenger.bookingCode}`);

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

    const updatedTrips = trips.map((t) => (t.id === tripId ? updatedTrip : t));
    setTrips(updatedTrips);
    saveTrips(updatedTrips);
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
    saveTrips(updatedTrips);
    upsertTripFirestore(updatedTrip).catch(() => {});

    const targetVehicle = vehicles.find((v) => v.id === targetTrip.vehicleId);
    if (targetVehicle && closure.endKm > targetVehicle.currentKm) {
      const updatedVehicles = vehicles.map((v) =>
        v.id === targetVehicle.id ? { ...v, currentKm: closure.endKm, status: 'available' as const } : v
      );
      setVehicles(updatedVehicles);
      saveVehicles(updatedVehicles);
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
    saveMunicipalConfig(newConfig);
    updateConfigFirestore(newConfig).catch(() => {});
    showToast('Configurações da Secretaria de Saúde salvas com sucesso!');
  };

  const handleResetData = async () => {
    resetToInitialData();
    await seedAllFirestore();
    setTrips(getTrips());
    setPatients(getPatients());
    setVehicles(getVehicles());
    setDestinations(getDestinations());
    setConfig(getMunicipalConfig());
    showToast('Todos os dados da planilha e do sistema foram restaurados com sucesso!', 'success');
  };

  const handleClearAllData = async () => {
    try {
      setTrips([]);
      saveTrips([]);
      setPatients([]);
      savePatients([]);
      await clearTripsAndPatientsFirestore();
      showToast('Todas as viagens e pacientes foram apagados com sucesso!', 'success');
    } catch (error: any) {
      if (error?.message === 'QUOTA_EXCEEDED') {
        showToast('Limite diário gratuito do banco de dados (Firestore) atingido. Os dados foram limpos localmente, mas a nuvem só resetará amanhã.', 'error');
      } else {
        showToast('Erro ao limpar nuvem. Dados locais foram limpos.', 'error');
      }
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
  if (isAuthLoading) {
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
              disabled={isLoggingIn}
              className="w-full bg-emerald-850 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-800/10 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Entrando...</span>
                </>
              ) : (
                <span>Entrar no Sistema</span>
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
            onClick={() => signOut(auth)}
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
          onLogout={() => signOut(auth)}
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
            onEditTrip={(trip) => {
              setEditingTrip(trip);
              setIsTripModalOpen(true);
            }}
            onCancelBooking={handleCancelBooking}
          />
        )}

        {activeTab === 'trips' && (
          <TripsView
            trips={trips}
            vehicles={vehicles}
            destinations={destinations}
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
          />
        )}

        {activeTab === 'bookings' && (
          <BookingsView
            trips={trips}
            vehicles={vehicles}
            onOpenNewBookingModal={() => {
              setPreselectedTripId(undefined);
              setPreselectedPatientId(undefined);
              setIsBookingModalOpen(true);
            }}
            onPrintTicket={triggerPrintPassengerTicket}
            onCancelBooking={handleCancelBooking}
          />
        )}

        {activeTab === 'patients' && (
          <PatientsView
            patients={patients}
            onOpenNewPatientModal={() => {
              setEditingPatient(null);
              setIsPatientModalOpen(true);
            }}
            onEditPatient={(patient) => {
              setEditingPatient(patient);
              setIsPatientModalOpen(true);
            }}
            onDeletePatient={handleDeletePatient}
            onOpenNewBookingModalWithPatient={(patientId) => {
              setPreselectedPatientId(patientId);
              setPreselectedTripId(undefined);
              setIsBookingModalOpen(true);
            }}
            onOpenImportExcelModal={() => setIsExcelImportModalOpen(true)}
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
          />
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
          onSaveConfig={handleSaveConfig}
          onResetData={handleResetData}
          onClearAllData={handleClearAllData}
          onExportBackup={exportDatabaseBackup}
          onImportBackup={handleImportBackup}
          onClose={() => setIsConfigModalOpen(false)}
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
