import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MunicipalConfig, Trip, Patient, ensurePassengerArray } from '../types';
import { formatDateBR } from './formatters';

export interface BpaProcedureSummary {
  procedureCode: string;
  procedureName: string;
  totalPatients: number;
  totalTrips: number;
  destinationsCount: Record<string, number>;
}

export function generateBpaPdfReport(
  competencia: string,
  cnes: string,
  config: MunicipalConfig,
  trips: Trip[],
  patients: Patient[],
  selectedDate?: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const [year, month] = competencia.split('-');
  const periodLabel = selectedDate 
    ? `Data Específica: ${formatDateBR(selectedDate)}`
    : `Competência Mensal: ${month}/${year}`;

  // Process data: aggregate procedures and passengers
  const procedureSummaryMap = new Map<string, BpaProcedureSummary>();
  const detailedPassengers: Array<{
    date: string;
    patientName: string;
    cns: string;
    procedure: string;
    destination: string;
    city: string;
    driver: string;
  }> = [];

  let totalPassengersAttended = 0;

  trips.forEach((trip) => {
    const passengers = ensurePassengerArray(trip.passengers);
    passengers.forEach((p) => {
      if (p.status === 'boarded' || p.status === 'confirmed') {
        totalPassengersAttended++;
        const procCode = '04.01.01.001-0';
        const procName = p.appointmentType || 'Transporte Sanitário Eletivo (TFD)';

        if (!procedureSummaryMap.has(procName)) {
          procedureSummaryMap.set(procName, {
            procedureCode: procCode,
            procedureName: procName,
            totalPatients: 0,
            totalTrips: 0,
            destinationsCount: {},
          });
        }

        const summary = procedureSummaryMap.get(procName)!;
        summary.totalPatients++;
        const destCity = p.destinationCity || trip.destinationCity || 'Outro';
        summary.destinationsCount[destCity] = (summary.destinationsCount[destCity] || 0) + 1;

        const patientRecord = patients.find((pt) => pt.id === p.patientId || (p.patientCpf && pt.cpf === p.patientCpf));

        detailedPassengers.push({
          date: formatDateBR(trip.departureDate),
          patientName: p.patientName,
          cns: p.patientSus || patientRecord?.susCard || 'Não informado',
          procedure: procName,
          destination: p.destinationName || trip.destinationCity,
          city: destCity,
          driver: trip.driverName || 'Motorista da Escala',
        });
      }
    });
  });

  const procedureSummaries = Array.from(procedureSummaryMap.values());

  // CABEÇALHO OFICIAL SUS
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(14, 12, 182, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text((config.municipalityName || 'PREFEITURA MUNICIPAL').toUpperCase(), 20, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(config.departmentName || 'SECRETARIA MUNICIPAL DE SAÚDE - TFD', 20, 26);
  doc.text(`CNES Unidade: ${cnes} • ${periodLabel}`, 20, 32);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text('RELATÓRIO DE FATURAMENTO BPA', 190, 22, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text('Boletim de Produção Ambulatorial (SIA/SUS)', 190, 28, { align: 'right' });

  // QUADRO DE RESUMO E INDICADORES
  autoTable(doc, {
    startY: 42,
    head: [['INDICADOR OPERACIONAL DO TFD', 'QUANTITATIVO APURADO']],
    body: [
      ['Total de Viagens Concluídas no Período', `${trips.length} viagens oficiais realizadas`],
      ['Total de Pacientes Transportados (Atendimentos BPA)', `${totalPassengersAttended} atendimentos registrados`],
      ['Procedimento Geral SIA/SUS', '04.01.01.001-0 (Transporte de Pacientes p/ Tratamento Fora do Domicílio)'],
      ['Unidade Faturadora / Emissora', `${config.departmentName || 'Secretaria de Saúde'} (CNES: ${cnes})`],
      ['Data de Emissão deste Relatório', `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 105 },
      1: { cellWidth: 77 },
    },
  });

  // TABELA 1: CONSOLIDAÇÃO POR PROCEDIMENTO / ESPECIALIDADE
  const lastY = (doc as any).lastAutoTable.finalY + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. CONSOLIDAÇÃO DA PRODUÇÃO POR ESPECIALIDADE / PROCEDIMENTO', 14, lastY);

  const summaryTableRows = procedureSummaries.map((s, idx) => [
    idx + 1,
    s.procedureCode,
    s.procedureName,
    Object.entries(s.destinationsCount)
      .map(([city, count]) => `${city}: ${count}`)
      .join(', '),
    s.totalPatients,
  ]);

  autoTable(doc, {
    startY: lastY + 3,
    head: [['#', 'CÓD. SIGTAP', 'ESPECIALIDADE / TIPO DE ATENDIMENTO', 'CIDADES DE DESTINO ATENDIDAS', 'QTD. PACIENTES']],
    body: summaryTableRows.length > 0 ? summaryTableRows : [['-', '-', 'Nenhum atendimento apurado', '-', '0']],
    theme: 'striped',
    headStyles: {
      fillColor: [4, 120, 87], // emerald-700
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 62 },
      3: { cellWidth: 60 },
      4: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
    },
  });

  // TABELA 2: RELAÇÃO NOMINAL DE PACIENTES PARA PRESTAÇÃO DE CONTAS
  const lastY2 = (doc as any).lastAutoTable.finalY + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. RELAÇÃO NOMINAL DOS ATENDIMENTOS E BENEFICIÁRIOS (AMOSTRA DE AUDITORIA)', 14, lastY2);

  const passengerTableRows = detailedPassengers.slice(0, 150).map((p, idx) => [
    idx + 1,
    p.date,
    p.patientName,
    p.cns,
    p.procedure,
    `${p.destination} (${p.city})`,
  ]);

  autoTable(doc, {
    startY: lastY2 + 3,
    head: [['#', 'DATA', 'NOME DO PACIENTE BENEFICIÁRIO', 'CARTÃO SUS (CNS)', 'PROCEDIMENTO', 'DESTINO / HOSPITAL']],
    body: passengerTableRows.length > 0 ? passengerTableRows : [['-', '-', 'Sem passageiros no período', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [51, 65, 85], // slate-700
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 18 },
      2: { cellWidth: 55, fontStyle: 'bold' },
      3: { cellWidth: 32 },
      4: { cellWidth: 35 },
      5: { cellWidth: 34 },
    },
  });

  // ASSINATURAS E TERMO DE HOMOLOGAÇÃO
  const pageHeight = doc.internal.pageSize.getHeight();
  const currentY = (doc as any).lastAutoTable.finalY;

  // Add new page if not enough space for signatures
  if (currentY + 45 > pageHeight) {
    doc.addPage();
  }

  const signY = (currentY + 45 > pageHeight) ? 35 : currentY + 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Declaramos para os devidos fins de comprovação e auditoria do Sistema Único de Saúde (SUS) que os pacientes acima listados foram devidamente transportados e atendidos.',
    14,
    signY
  );

  const lineY = signY + 16;
  doc.setDrawColor(148, 163, 184);
  doc.line(25, lineY, 95, lineY);
  doc.line(115, lineY, 185, lineY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Coordenação Municipal de Transporte / TFD', 60, lineY + 4, { align: 'center' });
  doc.text(config.tfdCoordinator || 'Responsável pelo TFD', 60, lineY + 8, { align: 'center' });

  doc.text('Secretaria Municipal de Saúde', 150, lineY + 4, { align: 'center' });
  doc.text('Gestor / Ordenador de Despesas', 150, lineY + 8, { align: 'center' });

  // Rodapé em todas as páginas
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Documento Oficial TFD / SUS • ${config.municipalityName} • Página ${i} de ${pageCount}`,
      105,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const cleanFileName = `Relatorio_Faturamento_BPA_${competencia.replace('-', '')}_CNES_${cnes}.pdf`;
  doc.save(cleanFileName);
}
