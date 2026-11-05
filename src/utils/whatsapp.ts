import { Trip, TripPassenger, Vehicle, MunicipalConfig } from '../types';
import { formatDateBR } from './formatters';

export function getWhatsAppConfirmationLink(
  passenger: TripPassenger,
  trip: Trip,
  vehicle?: Vehicle,
  config?: MunicipalConfig
): string {
  const rawPhone = (passenger.patientWhatsapp || passenger.patientPhone || '').replace(/\D/g, '');
  if (rawPhone.length < 8) return '';

  const cleanPhone = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;
  const boardingLoc = passenger.patientAddress?.trim() || trip.departureLocation;
  const munName = config?.municipalityName || 'Secretaria Municipal de Saúde';
  const depName = config?.departmentName || 'Transporte TFD';

  const companionText = passenger.companionIncluded && passenger.companionName
    ? `\n*Acompanhante:* ${passenger.companionName}${passenger.companionAddress && passenger.companionAddress !== boardingLoc ? ` (Embarque: ${passenger.companionAddress})` : ''}`
    : '';

  const vehicleInfo = vehicle ? `${vehicle.model} (${vehicle.plate})` : 'Veículo da Frota Municipal';
  const driverInfo = trip.driverName ? `${trip.driverName}${trip.driverPhone ? ` (${trip.driverPhone})` : ''}` : 'Motorista da Escala';

  const message = `*CONFIRMAÇÃO DE TRANSPORTE - TFD* 🚑
*${munName}*
_${depName}_

Olá, *${passenger.patientName}*!
Confirmamos o seu transporte sanitário eletivo:

📅 *Data da Viagem:* ${formatDateBR(trip.departureDate)}
⏰ *Horário de Saída:* ${trip.departureTime}
📍 *Local de Embarque:* ${boardingLoc}
🏥 *Destino:* ${passenger.destinationName} (${passenger.destinationCity || trip.destinationCity})
🩺 *Procedimento:* ${passenger.appointmentType} às ${passenger.appointmentTime}
🚐 *Veículo:* ${vehicleInfo}
👨‍✈️ *Motorista:* ${driverInfo}${companionText}
🎫 *Cód. Agendamento:* ${passenger.bookingCode}

⚠️ *Orientações importantes:*
- Chegue ao local de embarque com pelo menos *15 minutos de antecedência*.
- Leve documento com foto, Cartão SUS e encaminhamentos médicos.
- Caso haja algum imprevisto ou desistência, avise o setor com urgência para liberarmos a vaga a outro paciente.

_Mensagem automática enviada pelo sistema de Transporte TFD._`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
