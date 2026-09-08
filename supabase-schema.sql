-- SCHEMA DE BANCO DE DADOS TRANS-MED TFD MUNICIPAL (SUPABASE)
-- Copie este script SQL e cole-o no SQL Editor do seu projeto Supabase para criar as tabelas necessárias.

-- 1. TABELA DE MOTORISTAS (drivers)
CREATE TABLE IF NOT EXISTS drivers (
  id text PRIMARY KEY,
  name text NOT NULL,
  cpf text,
  cnh text,
  "cnhCategory" text,
  "cnhExpiration" text,
  phone text,
  whatsapp text,
  status text DEFAULT 'active',
  notes text,
  "createdAt" text,
  cns text,
  cbo text
);

-- 2. TABELA DE VEÍCULOS (vehicles)
CREATE TABLE IF NOT EXISTS vehicles (
  id text PRIMARY KEY,
  plate text NOT NULL,
  model text NOT NULL,
  brand text NOT NULL,
  year integer,
  type text,
  "maxCapacity" integer DEFAULT 0,
  "wheelchairCapacity" integer DEFAULT 0,
  "currentDriver" text,
  "driverPhone" text,
  status text DEFAULT 'available',
  "currentKm" integer DEFAULT 0,
  "fuelType" text,
  notes text,
  "createdAt" text
);

-- 3. TABELA DE PACIENTES (patients)
CREATE TABLE IF NOT EXISTS patients (
  id text PRIMARY KEY,
  name text NOT NULL,
  cpf text NOT NULL,
  "susCard" text NOT NULL,
  rg text,
  "birthDate" text,
  phone text,
  whatsapp text,
  "emergencyPhone" text,
  address text,
  "boardingAddress" text,
  neighborhood text,
  city text,
  "ibgeCode" text,
  condition text,
  mobility text,
  "procedureTime" text,
  "companionRequired" boolean DEFAULT false,
  "companionName" text,
  "companionBirthDate" text,
  "companionCpf" text,
  "companionAddress" text,
  "companionKinship" text,
  "companionPhone" text,
  "companionReason" text,
  "bloodType" text,
  allergies text,
  notes text,
  "createdAt" text
);

-- 4. TABELA DE DESTINOS / HOSPITAIS (destinations)
CREATE TABLE IF NOT EXISTS destinations (
  id text PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  address text,
  phone text,
  specialties text[]
);

-- 5. TABELA DE CIDADES DE DESTINO (destination_cities)
CREATE TABLE IF NOT EXISTS destination_cities (
  id text PRIMARY KEY,
  "cityName" text NOT NULL,
  state text NOT NULL,
  "distanceKm" integer DEFAULT 0,
  "estimatedTravelTime" text,
  "mainHospitals" text[],
  specialties text[],
  "contactPhone" text,
  notes text
);

-- 6. TABELA DE VIAGENS (trips)
CREATE TABLE IF NOT EXISTS trips (
  id text PRIMARY KEY,
  code text NOT NULL,
  "departureDate" text NOT NULL,
  "departureTime" text NOT NULL,
  "estimatedReturnDate" text,
  "estimatedReturnTime" text,
  "originCity" text,
  "destinationCity" text,
  "departureLocation" text,
  "vehicleId" text,
  "driverId" text,
  "driverName" text,
  "driverPhone" text,
  status text DEFAULT 'scheduled',
  passengers jsonb DEFAULT '[]'::jsonb,
  "destinationIds" text[],
  closure jsonb,
  notes text,
  "createdAt" text
);

-- 7. TABELA DE CONFIGURAÇÃO MUNICIPAL (config)
CREATE TABLE IF NOT EXISTS config (
  id text PRIMARY KEY,
  data jsonb NOT NULL
);

-- 8. TABELA DE USUÁRIOS DO SISTEMA (users)
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text DEFAULT 'operator',
  "createdAt" text
);

-- Desabilitar RLS ou criar política pública de acesso para desenvolvimento/simplificação de testes
-- (Isso garante que o app consiga ler/escrever diretamente sem requisições bloqueadas de início)
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE destinations DISABLE ROW LEVEL SECURITY;
ALTER TABLE destination_cities DISABLE ROW LEVEL SECURITY;
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE config DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
