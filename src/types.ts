export type VehicleType = 'van' | 'ambulance_basic' | 'ambulance_icu' | 'minibus' | 'bus' | 'car';

export type VehicleStatus = 'available' | 'in_trip' | 'maintenance';

export interface Driver {
  id: string;
  name: string;
  cpf: string;
  cnh: string;
  cnhCategory: string; // A, B, C, D, E, AB, AC, AD, AE
  cnhExpiration: string; // YYYY-MM-DD
  phone: string;
  whatsapp?: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  cns?: string; // Cartão Nacional de Saúde (15 dígitos)
  cbo?: string; // CBO do Motorista (6 dígitos, ex: 515125)
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  brand: string;
  year: number;
  type: VehicleType;
  maxCapacity: number; // Lotação máxima de passageiros
  wheelchairCapacity: number;
  currentDriver: string;
  driverPhone: string;
  status: VehicleStatus;
  currentKm: number;
  fuelType: string;
  notes?: string;
  createdAt: string;
}

export type PatientCondition = 
  | 'Consulta Médica'
  | 'Hemodiálise'
  | 'Quimioterapia / Oncologia'
  | 'Radioterapia'
  | 'Cirurgia / Procedimento'
  | 'Exames Especializados'
  | 'Fisioterapia / Reabilitação'
  | 'Avaliação Pré-operatória'
  | 'Outro';

export type MobilityType = 'Ambulante' | 'Cadeirante' | 'Maca' | 'Oxigênio / Suporte';

export interface Patient {
  id: string;
  name: string;
  cpf: string;
  susCard: string; // Cartão Nacional de Saúde (CNS)
  rg?: string;
  birthDate: string;
  phone: string;
  whatsapp?: string;
  emergencyPhone?: string;
  address: string;
  boardingAddress?: string;
  neighborhood: string;
  city: string;
  ibgeCode?: string; // Código IBGE do município (6 dígitos)
  condition: PatientCondition;
  mobility: MobilityType;
  procedureTime?: string;
  companionRequired: boolean;
  companionName?: string;
  companionBirthDate?: string;
  companionCpf?: string;
  companionAddress?: string;
  companionKinship?: string; // Grau de parentesco
  companionPhone?: string;
  companionReason?: string; // Justificativa legal / laudo
  bloodType?: string;
  allergies?: string;
  notes?: string;
  createdAt: string;
}

export interface DestinationHospital {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  specialties: string[];
}

export interface DestinationCity {
  id: string;
  cityName: string;
  state: string;
  distanceKm: number;
  estimatedTravelTime: string;
  mainHospitals: string[];
  specialties: string[];
  contactPhone?: string;
  notes?: string;
}

export type TripStatus = 'scheduled' | 'in_route' | 'completed' | 'cancelled';

export interface TripPassenger {
  id: string;
  bookingCode: string;
  patientId: string;
  patientName: string;
  patientBirthDate?: string;
  patientCpf: string;
  patientSus: string;
  patientPhone: string;
  patientWhatsapp?: string;
  patientAddress?: string;
  mobility: MobilityType;
  
  // Acompanhante
  companionIncluded: boolean;
  companionName?: string;
  companionBirthDate?: string;
  companionCpf?: string;
  companionAddress?: string;
  companionKinship?: string;
  
  // Destino
  destinationId: string;
  destinationName: string;
  destinationCity: string;
  appointmentTime: string;
  appointmentType: PatientCondition | string;
  
  seatNumber?: number;
  companionSeatNumber?: number;
  
  status: 'confirmed' | 'boarded' | 'missed' | 'cancelled';
  notes?: string;
  bookedAt: string;
}

export interface TripClosure {
  id: string;
  tripId: string;
  closedAt: string;
  closedBy: string;
  closedByRole?: string;
  closedByRegistration?: string;
  
  // Quilometragem e Horários Efetivos
  startKm: number;
  endKm: number;
  totalKm: number;
  departureTimeActual?: string;
  returnTimeActual: string;
  
  // Passageiros e Frequência Detalhada
  totalPassengers: number;
  totalPatientsCount?: number;
  totalCompanionsCount?: number;
  boardedCount: number;
  boardedPatientsCount?: number;
  boardedCompanionsCount?: number;
  missedCount: number;
  cancelledCount: number;
  
  // Abastecimento e Vistoria do Veículo
  fuelLitres?: number;
  fuelLevelReturn?: string;
  vehicleCleanliness?: string;
  vehicleMaintenanceAlert?: boolean;
  vehicleMaintenanceNotes?: string;

  // Ocorrências e Observações
  incidents: string;
  driverNotes?: string;
}

export interface Trip {
  id: string;
  code: string;
  departureDate: string; // YYYY-MM-DD
  departureTime: string; // HH:mm
  estimatedReturnDate: string;
  estimatedReturnTime: string;
  originCity: string;
  destinationCity: string;
  destinationHospital?: string; // Clinica/Hospital de referencia da viagem
  departureLocation: string; // Ex: Praça da Matriz / Garagem da Saúde
  
  vehicleId: string;
  driverId?: string;
  driverName: string;
  driverPhone: string;
  
  status: TripStatus;
  passengers: TripPassenger[];
  destinationIds: string[]; // Lista de hospitais da rota
  
  closure?: TripClosure;
  notes?: string;
  createdAt: string;
}

export function ensurePassengerArray(passengers: any): TripPassenger[] {
  if (!passengers) return [];
  if (Array.isArray(passengers)) return passengers;
  if (typeof passengers === 'object') {
    return Object.values(passengers);
  }
  return [];
}

export interface MunicipalConfig {
  municipalityName: string;
  departmentName: string;
  state: string;
  phone: string;
  email: string;
  address: string;
  tfdCoordinator: string;
  instructionsPatient: string[];
  cnesUnit?: string; // CNES da Unidade (7 dígitos)
}

export interface SystemUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator';
  createdAt: string;
}

