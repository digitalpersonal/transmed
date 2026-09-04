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
  saveDrivers
} from './utils/storage';
import { ExcelCapturedRow } from './utils/excel';
import { 
  subscribeToPatients, upsertPatientFirestore, deletePatientFirestore,
  subscribeToVehicles, upsertVehicleFirestore, deleteVehicleFirestore,
  subscribeToDrivers, upsertDriverFirestore, deleteDriverFirestore,
  subscribeToDestinations, upsertDestinationFirestore,
  subscribeToTrips, upsertTripFirestore, deleteTripFirestore,
  subscribeToConfig, updateConfigFirestore,
  seedAllFirestore, clearTripsAndPatientsFirestore
} from './lib/firestoreSync';
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

  // Load from storage and Firestore on mount
  useEffect(() => {
    const unsubPatients = subscribeToPatients(setPatients);
    const unsubVehicles = subscribeToVehicles((vList) => {
      if (vList.length < INITIAL_VEHICLES.length) {
        const existingIds = new Set(vList.map(v => v.id));
        const missing = INITIAL_VEHICLES.filter(v => !existingIds.has(v.id));
        const merged = [...vList, ...missing];
        setVehicles(merged);
        saveVehicles(merged);
      } else {
        setVehicles(vList);
      }
    });
    const unsubDrivers = subscribeToDrivers((dList) => {
      if (dList.length < INITIAL_DRIVERS.length) {
        const existingIds = new Set(dList.map(d => d.id));
        const missing = INITIAL_DRIVERS.filter(d => !existingIds.has(d.id));
        const merged = [...dList, ...missing];
        setDrivers(merged);
        saveDrivers(merged);
      } else {
        setDrivers(dList);
      }
    });
    const unsubDestinations = subscribeToDestinations(setDestinations);
    const unsubTrips = subscribeToTrips(setTrips);
    const unsubConfig = subscribeToConfig(setConfig);

    return () => {
      unsubPatients();
      unsubVehicles();
      unsubDrivers();
      unsubDestinations();
      unsubTrips();
      unsubConfig();
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

  const handleSaveDestinationCity = (cityToSave: DestinationCity) => {
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
    setIsDestinationCityModalOpen(false);
    setEditingDestinationCity(null);
  };

  const handleDeleteDestinationCity = (cityId: string) => {
    const updated = destinationCities.filter((c) => c.id !== cityId);
    setDestinationCities(updated);
    saveDestinationCities(updated);
    showToast('Cidade de destino removida.', 'info');
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
    const filteredNew = newPatients.map((p) => ({
      ...p,
      id: p.id || `pat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: p.createdAt || new Date().toISOString().slice(0, 10),
    }));

    const updatedPatients = [...filteredNew, ...patients];
    setPatients(updatedPatients);
    savePatients(updatedPatients);

    // If capturedRows are provided with destination, vehicle, driver, create/group trips automatically!
    let updatedTrips = [...trips];
    if (capturedRows && capturedRows.length > 0) {
      const todayStr = new Date().toISOString().slice(0, 10);
      
      capturedRows.forEach((row, idx) => {
        const pat = filteredNew[idx];
        if (!pat) return;

        const tripDate = row.dataViagem || todayStr;
        
        // Filtra viagens com data anterior à data atual (ou passada como parâmetro)
        if (tripDate < todayStr) return;

        const destCity = row.destino || 'Hospital de Destino';
        const driverName = row.motorista || 'Motorista Padrão TFD';
        const departureTime = row.horarioSaida || '06:00';
        const vehicleName = row.veiculo || '';

        let targetVehicle = vehicles.find(v => 
          (vehicleName && v.model.toLowerCase().includes(vehicleName.toLowerCase())) ||
          (vehicleName && v.plate.toLowerCase().includes(vehicleName.toLowerCase()))
        );
        if (!targetVehicle && vehicles.length > 0) {
          targetVehicle = vehicles[0];
        }

        let targetTrip = updatedTrips.find(t => 
          t.destinationCity.toLowerCase().includes(destCity.toLowerCase()) &&
          t.status === 'scheduled' &&
          t.departureDate === tripDate
        );

        const passengerItem: TripPassenger = {
          id: `pass-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          bookingCode: `BKG-${Math.floor(1000 + Math.random() * 9000)}`,
          patientId: pat.id,
          patientName: pat.name,
          patientBirthDate: pat.birthDate,
          patientCpf: pat.cpf,
          patientSus: pat.susCard,
          patientPhone: pat.phone || pat.whatsapp || '',
          patientAddress: pat.boardingAddress || pat.address,
          mobility: pat.mobility || 'Ambulante',
          companionIncluded: pat.companionRequired || false,
          companionName: pat.companionName,
          companionBirthDate: pat.companionBirthDate,
          companionCpf: pat.companionCpf,
          companionAddress: pat.companionAddress,
          companionKinship: pat.companionKinship,
          destinationId: 'dest-auto',
          destinationName: destCity,
          destinationCity: destCity,
          appointmentTime: row.horarioProcedimento || pat.procedureTime || '08:00',
          appointmentType: pat.condition || 'Consulta Médica',
          status: 'confirmed',
          bookedAt: todayStr,
        };

        if (!targetTrip) {
          const newTripId = `trip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          const newTripCode = `TRIP-${Math.floor(1000 + Math.random() * 9000)}`;
          targetTrip = {
            id: newTripId,
            code: newTripCode,
            destinationCity: destCity,
            destinationHospital: destCity,
            departureDate: tripDate,
            departureTime: departureTime,
            estimatedReturnTime: '17:00',
            vehicleId: targetVehicle ? targetVehicle.id : (vehicles[0]?.id || 'v1'),
            driverName: driverName,
            departureLocation: 'Secretaria Municipal de Saúde - Terminal TFD',
            maxCapacity: targetVehicle ? targetVehicle.capacity : 15,
            status: 'scheduled',
            passengers: [passengerItem],
            createdAt: todayStr,
          };
          updatedTrips = [targetTrip, ...updatedTrips];
        } else {
          const existingPass = ensurePassengerArray(targetTrip.passengers);
          if (!existingPass.some(p => p.patientId === pat.id)) {
            const updatedTripPassengers = [...existingPass, passengerItem];
            targetTrip = {
              ...targetTrip,
              passengers: updatedTripPassengers,
            };
            updatedTrips = updatedTrips.map(t => t.id === targetTrip!.id ? targetTrip! : t);
          }
        }
      });

      setTrips(updatedTrips);
      saveTrips(updatedTrips);
      try {
        await Promise.all(updatedTrips.map(t => upsertTripFirestore(t)));
      } catch (e) {
        console.error('Error syncing imported trips to Firestore', e);
      }
    }

    try {
      await Promise.all(filteredNew.map(p => upsertPatientFirestore(p)));
      showToast(`${filteredNew.length} pacientes e viagens importados e finalizados com sucesso!`);
    } catch (error) {
      console.error('Error importing patients to Firestore:', error);
      showToast(`Importação concluída com sucesso (${filteredNew.length} pacientes).`);
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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
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
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-4 mt-auto print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-bold text-slate-300">Sistema TFD</span> — Transporte Fora do Domicílio e Pacientes SUS
          </div>
          <div>
            {config.municipalityName} • {config.departmentName}
          </div>
        </div>
      </footer>

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
          initialTripId={preselectedTripId}
          initialPatientId={preselectedPatientId}
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

      {/* Footer */}
      <footer className="print:hidden py-6 bg-slate-900 text-slate-400 text-center text-xs border-t border-slate-800 mt-auto">
        <p>desenvolvido por Silvio T. de Sá Filho - Chefe do CPD 2026</p>
      </footer>
    </div>
  );
}
