import * as XLSX from 'xlsx';
import { Patient, Trip, Vehicle, DestinationHospital, TripPassenger, ensurePassengerArray } from '../types';
import { formatDateBR, formatCPF, formatSUS, formatPhone } from './formatters';

/**
 * Ordem oficial de colunas de captura da planilha Excel (conforme imagem padrão):
 * 1. HORARIO_PROCEDIMENTO
 * 2. NOME_PACIENTE
 * 3. DATA_NASCIMENTO_PACIENTE
 * 4. CPF_PACIENTE
 * 5. CARTÃO_SUS_PACIENTE
 * 6. ENDEREÇO_EMBARQUE_PACIENTE
 * 7. POSSUI_ACOMPANHANTE
 * 8. NOME_ACOMPANHANTE
 * 9. DATA_NASCIMENTO_ACOMPANHANTE
 * 10. CPF_ACOMPANHANTE
 * 11. ENDEREÇO_EMBARQUE_ACOMPANHANTE
 * 12. WHATSAPP_PACIENTE
 * 13. DESTINO
 * 14. VEICULO
 * 15. MOTORISTA
 * 16. HORARIO_SAIDA
 */

export interface ExcelCapturedRow {
  dataViagem: string;
  horarioProcedimento: string;
  nomePaciente: string;
  dataNascimentoPaciente: string;
  cpfPaciente: string;
  cartaoSusPaciente: string;
  enderecoEmbarquePaciente: string;
  possuiAcompanhante: boolean;
  nomeAcompanhante: string;
  dataNascimentoAcompanhante: string;
  cpfAcompanhante: string;
  enderecoEmbarqueAcompanhante: string;
  whatsappPaciente: string;
  destino: string;
  veiculo: string;
  motorista: string;
  horarioSaida: string;
  rawRow: Record<string, any>;
}

export function exportPatientsToExcel(patients: Patient[]): void {
  // Exportar na ordem oficial de captura
  const data = patients.map((p) => ({
    'HORARIO_PROCEDIMENTO': p.procedureTime || '08:00',
    'NOME_PACIENTE': p.name,
    'DATA_NASCIMENTO_PACIENTE': formatDateBR(p.birthDate),
    'CPF_PACIENTE': formatCPF(p.cpf),
    'CARTÃO_SUS_PACIENTE': formatSUS(p.susCard),
    'ENDEREÇO_EMBARQUE_PACIENTE': p.boardingAddress || p.address,
    'POSSUI_ACOMPANHANTE': p.companionRequired ? 'SIM' : 'NÃO',
    'NOME_ACOMPANHANTE': p.companionName || '',
    'DATA_NASCIMENTO_ACOMPANHANTE': p.companionBirthDate ? formatDateBR(p.companionBirthDate) : '',
    'CPF_ACOMPANHANTE': p.companionCpf ? formatCPF(p.companionCpf) : '',
    'ENDEREÇO_EMBARQUE_ACOMPANHANTE': p.companionAddress || (p.companionRequired ? (p.boardingAddress || p.address) : ''),
    'WHATSAPP_PACIENTE': formatPhone(p.whatsapp || p.phone),
    'ENDEREÇO_DESTINO': p.condition || 'Hospital de Referência',
    'VEICULO': '',
    'MOTORISTA': '',
    'HORARIO_SAIDA': '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pacientes_TFD');
  XLSX.writeFile(workbook, `TFD_Captura_Pacientes_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportTripManifestToExcel(trip: Trip, vehicle?: Vehicle): void {
  // Planilha de Manifesto na ordem oficial de captura para a viagem
  const passengersData = ensurePassengerArray(trip.passengers).map((p) => ({
    'HORARIO_PROCEDIMENTO': p.appointmentTime || '08:00',
    'NOME_PACIENTE': p.patientName,
    'DATA_NASCIMENTO_PACIENTE': p.patientBirthDate ? formatDateBR(p.patientBirthDate) : '',
    'CPF_PACIENTE': formatCPF(p.patientCpf),
    'CARTÃO_SUS_PACIENTE': formatSUS(p.patientSus),
    'ENDEREÇO_EMBARQUE_PACIENTE': p.patientAddress || trip.departureLocation,
    'POSSUI_ACOMPANHANTE': p.companionIncluded ? 'SIM' : 'NÃO',
    'NOME_ACOMPANHANTE': p.companionName || '',
    'DATA_NASCIMENTO_ACOMPANHANTE': p.companionBirthDate ? formatDateBR(p.companionBirthDate) : '',
    'CPF_ACOMPANHANTE': p.companionCpf ? formatCPF(p.companionCpf) : '',
    'ENDEREÇO_EMBARQUE_ACOMPANHANTE': p.companionAddress || (p.companionIncluded ? (p.patientAddress || trip.departureLocation) : ''),
    'WHATSAPP_PACIENTE': formatPhone(p.patientWhatsapp || p.patientPhone),
    'ENDEREÇO_DESTINO': p.destinationName || trip.destinationCity,
    'VEICULO': vehicle ? `${vehicle.model} (${vehicle.plate})` : 'Veículo Escala',
    'MOTORISTA': trip.driverName,
    'HORARIO_SAIDA': trip.departureTime,
  }));

  const workbook = XLSX.utils.book_new();
  const passSheet = XLSX.utils.json_to_sheet(passengersData);
  XLSX.utils.book_append_sheet(workbook, passSheet, 'Ordem_Captura_Manifesto');

  XLSX.writeFile(workbook, `Manifesto_${trip.code}_${trip.departureDate}.xlsx`);
}

export function exportClosuresReportToExcel(trips: Trip[], vehicles: Vehicle[]): void {
  const completedTrips = trips.filter((t) => t.status === 'completed' && t.closure);

  const data = completedTrips.map((t) => {
    const v = vehicles.find((veh) => veh.id === t.vehicleId);
    const c = t.closure!;

    return {
      'Código da Viagem': t.code,
      'Data Saída': formatDateBR(t.departureDate),
      'Cidade Destino': t.destinationCity,
      'Veículo': v ? `${v.model} (${v.plate})` : 'N/A',
      'Motorista': t.driverName,
      'Horário Saída Real': c.departureTimeActual || t.departureTime,
      'Horário Retorno Real': c.returnTimeActual,
      'Km Inicial': c.startKm,
      'Km Final': c.endKm,
      'Km Total Percorrido': c.totalKm,
      'Total Pacientes': c.totalPatientsCount || 0,
      'Total Acompanhantes': c.totalCompanionsCount || 0,
      'Total Lugares Agendados': c.totalPassengers,
      'Embarcados (Compareceram)': c.boardedCount,
      'Faltas (No-Show)': c.missedCount,
      'Taxa Efetividade (%)': c.totalPassengers > 0 ? `${Math.round((c.boardedCount / c.totalPassengers) * 100)}%` : '100%',
      'Combustível (Litros)': c.fuelLitres || 0,
      'Nível Combustível Retorno': c.fuelLevelReturn || 'Cheio',
      'Higienização Veículo': c.vehicleCleanliness || 'Bom',
      'Alerta Manutenção': c.vehicleMaintenanceAlert ? 'SIM' : 'NÃO',
      'Responsável Fechamento': c.closedBy,
      'Cargo / Matrícula': `${c.closedByRole || 'Coordenador'} ${c.closedByRegistration ? `(${c.closedByRegistration})` : ''}`,
      'Relatório de Ocorrências': c.incidents || 'Sem ocorrências',
      'Observações do Motorista': c.driverNotes || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Fechamento_Viagens');
  XLSX.writeFile(workbook, `TFD_Fechamento_Viagens_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function downloadSamplePatientTemplate(): void {
  // Modelo exatamente na ordem de captura da planilha solicitada
  const sampleData = [
    {
      'HORARIO_PROCEDIMENTO': '08:30',
      'NOME_PACIENTE': 'Maria Aparecida da Silva Souza',
      'DATA_NASCIMENTO_PACIENTE': '12/04/1958',
      'CPF_PACIENTE': '234.567.890-12',
      'CARTÃO_SUS_PACIENTE': '789 1234 5678 0001',
      'ENDEREÇO_EMBARQUE_PACIENTE': 'Rua das Palmeiras, 145 - Jardim Alvorada',
      'POSSUI_ACOMPANHANTE': 'SIM',
      'NOME_ACOMPANHANTE': 'Luciana da Silva Souza',
      'DATA_NASCIMENTO_ACOMPANHANTE': '15/08/1985',
      'CPF_ACOMPANHANTE': '456.789.012-34',
      'ENDEREÇO_EMBARQUE_ACOMPANHANTE': 'Rua das Palmeiras, 145 - Jardim Alvorada',
      'WHATSAPP_PACIENTE': '(19) 99123-4567',
      'DESTINO': 'Hospital das Clínicas Unicamp - Campinas',
      'VEICULO': 'Master Minibus (SAU-4A12)',
      'MOTORISTA': 'Carlos Eduardo Silveira',
      'HORARIO_SAIDA': '05:30',
    },
    {
      'HORARIO_PROCEDIMENTO': '07:30',
      'NOME_PACIENTE': 'José Benedito de Oliveira',
      'DATA_NASCIMENTO_PACIENTE': '03/11/1952',
      'CPF_PACIENTE': '345.678.901-23',
      'CARTÃO_SUS_PACIENTE': '890 1234 5678 0002',
      'ENDEREÇO_EMBARQUE_PACIENTE': 'Av. Brasil, 820 - Vila Nova',
      'POSSUI_ACOMPANHANTE': 'NÃO',
      'NOME_ACOMPANHANTE': '',
      'DATA_NASCIMENTO_ACOMPANHANTE': '',
      'CPF_ACOMPANHANTE': '',
      'ENDEREÇO_EMBARQUE_ACOMPANHANTE': '',
      'WHATSAPP_PACIENTE': '(19) 98234-5678',
      'DESTINO': 'Centro Integrado de Hemodiálise - Campinas',
      'VEICULO': 'Master Minibus (SAU-4A12)',
      'MOTORISTA': 'Carlos Eduardo Silveira',
      'HORARIO_SAIDA': '05:30',
    },
    {
      'HORARIO_PROCEDIMENTO': '09:30',
      'NOME_PACIENTE': 'Enzo Gabriel dos Santos Ferreira',
      'DATA_NASCIMENTO_PACIENTE': '22/07/2018',
      'CPF_PACIENTE': '567.890.123-45',
      'CARTÃO_SUS_PACIENTE': '901 1234 5678 0003',
      'ENDEREÇO_EMBARQUE_PACIENTE': 'Rua São Paulo, 310 - Parque das Flores',
      'POSSUI_ACOMPANHANTE': 'SIM',
      'NOME_ACOMPANHANTE': 'Patrícia Ferreira dos Santos',
      'DATA_NASCIMENTO_ACOMPANHANTE': '10/05/1990',
      'CPF_ACOMPANHANTE': '678.901.234-56',
      'ENDEREÇO_EMBARQUE_ACOMPANHANTE': 'Rua São Paulo, 310 - Parque das Flores',
      'WHATSAPP_PACIENTE': '(19) 99654-3210',
      'DESTINO': 'AACD - São Paulo',
      'VEICULO': 'Micro-ônibus Volare (SAU-2C90)',
      'MOTORISTA': 'Antônio José dos Santos',
      'HORARIO_SAIDA': '04:00',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ordem_Captura_Planilha');
  XLSX.writeFile(workbook, 'Modelo_Captura_Planilha_TFD.xlsx');
}

/**
 * Parser inteligente de data (DD/MM/YYYY, YYYY-MM-DD, números seriais do Excel)
 */
function parseDateValue(rawVal: any): string {
  if (!rawVal) return '';
  if (rawVal instanceof Date) {
    if (isNaN(rawVal.getTime())) return '';
    return rawVal.toISOString().slice(0, 10);
  }
  try {
    const str = String(rawVal).trim();
    if (!str) return '';
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) year = `20${year}`;
        return `${year}-${month}-${day}`;
      }
    } else if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) return str; // YYYY-MM-DD
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } else if (!isNaN(Number(str)) && Number(str) > 20000 && Number(str) < 100000) {
      // Excel date serial number
      const jsDate = new Date((Number(str) - (25567 + 2)) * 86400 * 1000);
      if (!isNaN(jsDate.getTime())) {
        return jsDate.toISOString().slice(0, 10);
      }
    }
  } catch {
    return '';
  }
  return '';
}

/**
 * Parser inteligente de horário (HH:mm ou serial do Excel)
 */
function parseTimeValue(rawVal: any): string {
  if (!rawVal) return '08:00';
  if (rawVal instanceof Date) {
    if (isNaN(rawVal.getTime())) return '08:00';
    return `${String(rawVal.getHours()).padStart(2, '0')}:${String(rawVal.getMinutes()).padStart(2, '0')}`;
  }
  const str = String(rawVal).trim();
  if (str.includes(':')) {
    const parts = str.split(':');
    return `${parts[0].padStart(2, '0')}:${(parts[1] || '00').slice(0, 2).padStart(2, '0')}`;
  }
  if (!isNaN(Number(str)) && Number(str) > 0 && Number(str) < 1) {
    // Fraction of a day in Excel
    const totalMinutes = Math.round(Number(str) * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  return str.length >= 4 ? str : '08:00';
}

/**
 * Parser inteligente de número de WhatsApp / Telefone
 */
export function parsePhoneValue(rawVal: any): string {
  if (rawVal === undefined || rawVal === null) return '';
  let str = String(rawVal).trim();
  if (!str) return '';

  // Se for número com ponto decimal do Excel (ex: 19998877665.0)
  if (str.endsWith('.0')) {
    str = str.slice(0, -2);
  }

  // Se for número científico do Excel (ex: 1.1998765432e+10 ou 1.99988E+10)
  if ((str.toLowerCase().includes('e+') || str.toLowerCase().includes('e-') || /^[0-9\.]+e\+[0-9]+$/i.test(str)) && !isNaN(Number(str))) {
    try {
      const num = Number(str);
      if (!isNaN(num) && isFinite(num) && num > 0) {
        str = BigInt(Math.floor(num)).toString();
      }
    } catch {
      str = Math.floor(Number(str)).toString();
    }
  }

  let digits = str.replace(/\D/g, '');

  // Se for apenas zeros (ex: '00000000000' ou '0')
  if (!digits || /^0+$/.test(digits)) {
    return '';
  }

  // Se vier com DDI 55 (ex: 5519991234567 -> 19991234567 ou 551998765432 -> 1998765432)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  // Se for menor que 8 dígitos (ex: números soltos 1, 2, etc.), não é telefone
  if (digits.length < 8) {
    return '';
  }

  return digits;
}

export function isValidPhoneNumber(phone?: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 && !/^0+$/.test(digits);
}

export async function parseExcelCapturedRows(file: File): Promise<{
  patients: Patient[];
  rows: ExcelCapturedRow[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Lê as linhas em formato de matriz 2D para identificar o cabeçalho real
        const rawGrid = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
        
        if (!rawGrid || rawGrid.length === 0) {
          resolve({ patients: [], rows: [] });
          return;
        }

        // Localiza a linha do cabeçalho (procura termos como NOME, PACIENTE, HORARIO, CPF, SUS, WHATSAPP, etc.)
        let headerRowIndex = 0;
        let foundHeader = false;
        for (let i = 0; i < Math.min(rawGrid.length, 15); i++) {
          const rowStr = (rawGrid[i] || []).map((c) => String(c).toLowerCase()).join(' ');
          if (
            rowStr.includes('nome') ||
            rowStr.includes('paciente') ||
            rowStr.includes('cpf') ||
            rowStr.includes('sus') ||
            rowStr.includes('whatsapp') ||
            rowStr.includes('telefone') ||
            rowStr.includes('procedimento') ||
            rowStr.includes('destino')
          ) {
            headerRowIndex = i;
            foundHeader = true;
            break;
          }
        }

        // Se não achou nenhuma palavra-chave de cabeçalho nas primeiras 15 linhas, assume que a linha 0 é dados e não há cabeçalho
        if (!foundHeader && rawGrid.length > 0) {
          headerRowIndex = -1; // dados começam na linha 0
        }

        const headerRow = headerRowIndex >= 0 ? (rawGrid[headerRowIndex] || []) : [];
        const normalizedHeaders = headerRow.map((h) => 
          String(h).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
        );

        // Mapeamento flexível das colunas
        const findColIdx = (keywords: string[], defaultColIdx: number): number => {
          for (const kw of keywords) {
            const cleanKw = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
            const exactMatch = normalizedHeaders.findIndex((h) => h === cleanKw);
            if (exactMatch !== -1) return exactMatch;
          }
          for (const kw of keywords) {
            const cleanKw = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
            const partialMatch = normalizedHeaders.findIndex((h) => h.includes(cleanKw) || cleanKw.includes(h));
            if (partialMatch !== -1) return partialMatch;
          }
          return defaultColIdx;
        };

        const colIdxMap = {
          dataViagem: findColIdx(['data_viagem', 'dataviagem', 'data', 'data_da_viagem'], 0),
          horarioProcedimento: findColIdx(['horario_procedimento', 'horarioprocedimento', 'horario_consulta', 'hora_procedimento', 'horario'], 1),
          nomePaciente: findColIdx(['nome_paciente', 'nomepaciente', 'nome_completo', 'nome', 'paciente'], 2),
          dataNascimentoPaciente: findColIdx(['data_nascimento_paciente', 'datanascimentopaciente', 'data_nascimento', 'nascimento_paciente', 'data_nasc', 'nascimento'], 3),
          cpfPaciente: findColIdx(['cpf_paciente', 'cpfpaciente', 'cpf_pac', 'cpf'], 4),
          cartaoSusPaciente: findColIdx(['cartao_sus_paciente', 'cartaosuspaciente', 'cartao_sus', 'cns_paciente', 'sus_paciente', 'sus', 'cns'], 5),
          enderecoEmbarquePaciente: findColIdx(['endereco_embarque_paciente', 'enderecoembarquepaciente', 'endereco_embarque', 'endereco_paciente', 'endereco', 'embarque'], 6),
          possuiAcompanhante: findColIdx(['possui_acompanhante', 'possuiacompanhante', 'acompanhante', 'tem_acompanhante'], 7),
          nomeAcompanhante: findColIdx(['nome_acompanhante', 'nomeacompanhante', 'nome_acomp', 'acompanhante_nome'], 8),
          dataNascimentoAcompanhante: findColIdx(['data_nascimento_acompanhante', 'datanascimentoacompanhante', 'nascimento_acompanhante', 'data_nasc_acomp'], 9),
          cpfAcompanhante: findColIdx(['cpf_acompanhante', 'cpfacompanhante', 'cpf_acomp'], 10),
          enderecoEmbarqueAcompanhante: findColIdx(['endereco_embarque_acompanhante', 'enderecoembarqueacompanhante', 'endereco_acomp', 'embarque_acomp'], 11),
          whatsappPaciente: findColIdx([
            'whatsapp_paciente',
            'whatsapppaciente',
            'whatsapp_do_paciente',
            'whatsapp_tel',
            'telefone_whatsapp',
            'whatsapp',
            'whats_paciente',
            'whats',
            'wpp_paciente',
            'wpp',
            'zap_paciente',
            'zap',
            'celular_paciente',
            'telefone_paciente',
            'contato_paciente',
            'contato',
            'celular',
            'telefone',
            'fone'
          ], 12),
          destino: findColIdx(['endereco_destino', 'enderecodestino', 'endereco_do_destino', 'hospital_destino', 'hospital_referencia', 'hospital', 'destino', 'clinica', 'especialidade', 'condicao'], 13),
          veiculo: findColIdx(['veiculo', 'veicul', 'veiculo_placa', 'placa', 'frota'], 14),
          motorista: findColIdx(['motorista', 'motor', 'nome_motorista', 'condutor'], 15),
          horarioSaida: findColIdx(['horario_saida', 'horariosaida', 'horarios_saida', 'hora_saida', 'saida'], 16),
        };

        const capturedRows: ExcelCapturedRow[] = [];
        const parsedPatients: Patient[] = [];

        const startIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

        // Itera sobre as linhas de dados
        for (let rowIdx = startIndex; rowIdx < rawGrid.length; rowIdx++) {
          const rowData = rawGrid[rowIdx] || [];
          if (!rowData || rowData.length === 0) continue;

          const getCell = (idx: number): any => {
            return rowData[idx] !== undefined && rowData[idx] !== null ? rowData[idx] : '';
          };

          // Tenta pegar o nome do paciente na coluna mapeada
          let rawNome = getCell(colIdxMap.nomePaciente);
          let nomePaciente = String(rawNome || '').trim();

          // Se a coluna mapeada estiver vazia ou for igual a cabeçalho, procura em outras colunas por um nome provável
          if (!nomePaciente || nomePaciente.toLowerCase() === 'nome_paciente' || nomePaciente.toLowerCase() === 'nome' || nomePaciente.toLowerCase() === 'paciente') {
            for (let c = 0; c < rowData.length; c++) {
              const val = String(rowData[c] || '').trim();
              // Se tiver espaço, mais de 3 letras, não for número nem data
              if (val.length >= 3 && val.includes(' ') && !/^\d+[\/\-]\d+/.test(val) && isNaN(Number(val))) {
                nomePaciente = val;
                break;
              }
            }
          }

          // Se ainda não encontrou um nome válido, pula a linha
          if (!nomePaciente || nomePaciente.toLowerCase() === 'nome_paciente' || nomePaciente.toLowerCase() === 'nome') {
            continue;
          }

          // 0. DATA_VIAGEM
          const rawDataViagem = getCell(colIdxMap.dataViagem);
          let dataViagem = parseDateValue(rawDataViagem);
          
          if (!dataViagem) {
            // Se não encontrou uma data de viagem válida, assume a data atual
            dataViagem = new Date().toISOString().slice(0, 10);
          }

          // 1. HORARIO_PROCEDIMENTO
          const rawHorarioProcedimento = getCell(colIdxMap.horarioProcedimento);
          const horarioProcedimento = parseTimeValue(rawHorarioProcedimento);

          // 3. DATA_NASCIMENTO_PACIENTE
          const rawDataNascPac = getCell(colIdxMap.dataNascimentoPaciente);
          const dataNascimentoPaciente = parseDateValue(rawDataNascPac) || '1980-01-01';

          // 4. CPF_PACIENTE
          const rawCpfPac = String(getCell(colIdxMap.cpfPaciente) || '');
          let cpfPaciente = rawCpfPac.replace(/\D/g, '');
          if (!cpfPaciente) {
            // Tenta achar qualquer célula que pareça CPF na linha
            for (let c = 0; c < rowData.length; c++) {
              const clean = String(rowData[c] || '').replace(/\D/g, '');
              if (clean.length === 11) {
                cpfPaciente = clean;
                break;
              }
            }
          }

          // 5. CARTÃO_SUS_PACIENTE
          const rawSusPac = String(getCell(colIdxMap.cartaoSusPaciente) || '');
          let cartaoSusPaciente = rawSusPac.replace(/\D/g, '');
          if (!cartaoSusPaciente) {
            for (let c = 0; c < rowData.length; c++) {
              const clean = String(rowData[c] || '').replace(/\D/g, '');
              if (clean.length >= 14 && clean.length <= 16) {
                cartaoSusPaciente = clean;
                break;
              }
            }
          }

          // 6. ENDEREÇO_EMBARQUE_PACIENTE
          const rawEndPac = String(getCell(colIdxMap.enderecoEmbarquePaciente) || '').trim();
          const enderecoEmbarquePaciente = rawEndPac || 'Município de Origem';

          // 7. POSSUI_ACOMPANHANTE
          const rawPossuiAcomp = String(getCell(colIdxMap.possuiAcompanhante) || '').trim().toUpperCase();

          // 8. NOME_ACOMPANHANTE
          const rawNomeAcomp = String(getCell(colIdxMap.nomeAcompanhante) || '').trim();
          const nomeAcompanhante = rawNomeAcomp;

          const possuiAcompanhante =
            rawPossuiAcomp === 'SIM' ||
            rawPossuiAcomp === 'S' ||
            rawPossuiAcomp === '1' ||
            rawPossuiAcomp === 'TRUE' ||
            (Boolean(nomeAcompanhante) && rawPossuiAcomp !== 'NÃO' && rawPossuiAcomp !== 'NAO' && rawPossuiAcomp !== 'N');

          // 9. DATA_NASCIMENTO_ACOMPANHANTE
          const rawDataNascAcomp = getCell(colIdxMap.dataNascimentoAcompanhante);
          const dataNascimentoAcompanhante = parseDateValue(rawDataNascAcomp);

          // 10. CPF_ACOMPANHANTE
          const rawCpfAcomp = String(getCell(colIdxMap.cpfAcompanhante) || '');
          const cpfAcompanhante = rawCpfAcomp.replace(/\D/g, '');

          // 11. ENDEREÇO_EMBARQUE_ACOMPANHANTE
          const rawEndAcomp = String(getCell(colIdxMap.enderecoEmbarqueAcompanhante) || '').trim();
          const enderecoEmbarqueAcompanhante = rawEndAcomp || (possuiAcompanhante ? enderecoEmbarquePaciente : '');

          // 12. WHATSAPP_PACIENTE
          let rawWhatsapp = getCell(colIdxMap.whatsappPaciente);
          let whatsappPaciente = parsePhoneValue(rawWhatsapp);

          if (!whatsappPaciente) {
            for (let c = 0; c < rowData.length; c++) {
              const candidate = parsePhoneValue(rowData[c]);
              if (candidate && candidate.length >= 8 && candidate.length <= 13) {
                whatsappPaciente = candidate;
                break;
              }
            }
          }

          // 13. DESTINO
          const rawDestino = String(getCell(colIdxMap.destino) || '').trim();
          const destino = rawDestino || 'Hospital de Destino';

          // 14. VEICULO
          const rawVeiculo = String(getCell(colIdxMap.veiculo) || '').trim();
          const veiculo = rawVeiculo || 'Veículo Municipal';

          // 15. MOTORISTA
          const rawMotorista = String(getCell(colIdxMap.motorista) || '').trim();
          const motorista = rawMotorista || 'Motorista da Escala';

          // 16. HORARIO_SAIDA
          const rawHorarioSaida = getCell(colIdxMap.horarioSaida);
          const horarioSaida = rawHorarioSaida ? parseTimeValue(rawHorarioSaida) : '05:30';

          capturedRows.push({
            dataViagem,
            horarioProcedimento,
            nomePaciente,
            dataNascimentoPaciente,
            cpfPaciente,
            cartaoSusPaciente,
            enderecoEmbarquePaciente,
            possuiAcompanhante,
            nomeAcompanhante,
            dataNascimentoAcompanhante,
            cpfAcompanhante,
            enderecoEmbarqueAcompanhante,
            whatsappPaciente,
            destino,
            veiculo,
            motorista,
            horarioSaida,
            rawRow: rowData,
          });

          const patientObj: Patient = {
            id: `pat-${Date.now()}-${rowIdx}-${Math.random().toString(36).substr(2, 4)}`,
            name: nomePaciente,
            cpf: cpfPaciente || `${Math.floor(10000000000 + Math.random() * 90000000000)}`,
            susCard: cartaoSusPaciente || `${Math.floor(700000000000000 + Math.random() * 90000000000000)}`,
            birthDate: dataNascimentoPaciente,
            phone: whatsappPaciente || '',
            whatsapp: whatsappPaciente || '',
            address: enderecoEmbarquePaciente,
            boardingAddress: enderecoEmbarquePaciente,
            neighborhood: 'Centro',
            city: 'Município de Origem',
            condition: (destino as any) || 'Consulta Médica',
            mobility: 'Ambulante',
            procedureTime: horarioProcedimento,
            companionRequired: possuiAcompanhante,
            ...(possuiAcompanhante || nomeAcompanhante ? { companionName: nomeAcompanhante || 'Acompanhante Autorizado' } : {}),
            ...(dataNascimentoAcompanhante ? { companionBirthDate: dataNascimentoAcompanhante } : {}),
            ...(cpfAcompanhante ? { companionCpf: cpfAcompanhante } : {}),
            ...(enderecoEmbarqueAcompanhante ? { companionAddress: enderecoEmbarqueAcompanhante } : {}),
            ...(possuiAcompanhante ? { companionKinship: 'Familiar / Cuidador' } : {}),
            createdAt: new Date().toISOString().slice(0, 10),
          };

          parsedPatients.push(patientObj);
        }

        resolve({ patients: parsedPatients, rows: capturedRows });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// Backward compatibility alias
export async function parseExcelPatientsFile(file: File): Promise<Partial<Patient>[]> {
  const result = await parseExcelCapturedRows(file);
  return result.patients;
}

