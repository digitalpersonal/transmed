import { MobilityType, PatientCondition, TripStatus, VehicleStatus, VehicleType } from '../types';

export function formatCPF(value?: string | null): string {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatSUS(value?: string | null): string {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '').slice(0, 15);
  if (!digits) return '';
  return digits
    .replace(/(\d{3})(\d)/, '$1 $2')
    .replace(/(\d{4})(\d)/, '$1 $2')
    .replace(/(\d{4})(\d)/, '$1 $2');
}

export function formatPhone(value?: string | null): string {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}

export function formatPlate(value?: string | null): string {
  if (!value) return '';
  const clean = String(value).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  if (clean.length > 3) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
}

export function formatCurrency(value: number | undefined): string {
  if (value === undefined || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (!str) return '';
  if (str.includes('/')) return str;
  const parts = str.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year && month && day) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }
  return str;
}

export function formatDateTimeBR(dateStr?: string | null, timeStr?: string | null): string {
  if (!dateStr) return '';
  const formattedDate = formatDateBR(dateStr);
  return timeStr ? `${formattedDate} às ${timeStr}` : formattedDate;
}

export function calculateAge(birthDateStr?: string | null): string {
  if (!birthDateStr) return '';
  try {
    let dateToParse = String(birthDateStr).trim();
    if (dateToParse.includes('/')) {
      const [d, m, y] = dateToParse.split('/');
      if (d && m && y) {
        dateToParse = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
    const birth = new Date(dateToParse);
    if (isNaN(birth.getTime())) return '';
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 && age < 130 ? `${age} anos` : '';
  } catch {
    return '';
  }
}

export function getVehicleTypeLabel(type: VehicleType): string {
  const map: Record<VehicleType, string> = {
    van: 'Van de Passageiros',
    ambulance_basic: 'Ambulância Simples / Suporte Básico',
    ambulance_icu: 'Ambulância UTI Móvel',
    minibus: 'Micro-ônibus',
    bus: 'Ônibus Rodoviário',
    car: 'Carro de Apoio / Spin',
  };
  return map[type] || type;
}

export function getVehicleStatusLabel(status: VehicleStatus): { label: string; bg: string; text: string } {
  switch (status) {
    case 'available':
      return { label: 'Disponível', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700' };
    case 'in_trip':
      return { label: 'Em Viagem', bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700' };
    case 'maintenance':
      return { label: 'Em Manutenção', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700' };
    default:
      return { label: status, bg: 'bg-gray-50 text-gray-700 border-gray-200', text: 'text-gray-700' };
  }
}

export function getTripStatusLabel(status: TripStatus): { label: string; bg: string; text: string; dot: string } {
  switch (status) {
    case 'scheduled':
      return { label: 'Agendada', bg: 'bg-sky-50 text-sky-700 border-sky-200', text: 'text-sky-700', dot: 'bg-sky-500' };
    case 'in_route':
      return { label: 'Em Rota', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' };
    case 'completed':
      return { label: 'Concluída / Fechada', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' };
    case 'cancelled':
      return { label: 'Cancelada', bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' };
    default:
      return { label: status, bg: 'bg-gray-50 text-gray-700 border-gray-200', text: 'text-gray-700', dot: 'bg-gray-500' };
  }
}

export function getPassengerStatusLabel(status: string): { label: string; bg: string } {
  switch (status) {
    case 'confirmed':
      return { label: 'Confirmado', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'boarded':
      return { label: 'Embarcado', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'missed':
      return { label: 'Não compareceu (Falta)', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'cancelled':
      return { label: 'Cancelado', bg: 'bg-gray-100 text-gray-700 border-gray-300' };
    default:
      return { label: status, bg: 'bg-gray-50 text-gray-600 border-gray-200' };
  }
}

export function generateBookingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TFD-${code}`;
}

export function generateTripCode(dateStr: string, seq: number): string {
  const cleanDate = (dateStr || '').replace(/-/g, '').slice(2);
  return `V-${cleanDate}-${String(seq).padStart(2, '0')}`;
}
