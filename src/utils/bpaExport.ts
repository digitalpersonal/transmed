export interface BpaItem {
  cnes: string;           // 7 digits
  competencia: string;    // YYYYMM (6 digits)
  cnsProfissional: string;// 15 digits
  cboProfissional: string;// 6 chars
  dataAtendimento: string;// YYYYMMDD (8 digits)
  codigoProcedimento: string; // 10 digits (SIGTAP)
  cnsPaciente: string;    // 15 digits
  sexoPaciente: 'M' | 'F' | string; // 1 char
  ibgeMunicipio: string;  // 6 digits
  cid10?: string;         // 4 chars (optional)
  idadePaciente: number | string; // 3 digits
}

/**
 * Função Auxiliar de Formatação (Padding) para layout posicional do BPA
 * - 'N' (Numérico): Alinhado à direita, preenchido com zeros à esquerda, truncado no tamanho max.
 * - 'A' (Alfanumérico): Alinhado à esquerda, preenchido com espaços à direita, truncado no tamanho max.
 */
export function formatField(value: string | number | undefined | null, size: number, type: 'N' | 'A'): string {
  const cleanVal = value !== undefined && value !== null ? String(value).trim() : '';

  if (type === 'N') {
    // Remove tudo que não for dígito para campos numéricos
    const numericStr = cleanVal.replace(/\D/g, '');
    const truncated = numericStr.slice(-size); // Trunca à esquerda mantendo os mais significativos ou direita conforme regra SUS (aqui slice rigido)
    return truncated.padStart(size, '0');
  } else {
    // Alfanumérico
    const truncated = cleanVal.slice(0, size);
    return truncated.padEnd(size, ' ');
  }
}

/**
 * Gera o conteúdo do arquivo BPA magnético em formato texto de largura fixa (.txt)
 */
export function generateBpaContent(cnesUnidade: string, competencia: string, items: BpaItem[]): string {
  const compClean = competencia.replace(/\D/g, '').slice(0, 6);
  const cnesClean = cnesUnidade.replace(/\D/g, '').slice(0, 7);
  const totalDetails = items.length;

  // HEADER (Linha 1) - Tamanho total rigoroso
  // Pos 1-3: "01B" (3)
  // Pos 4-9: Competência AAAAMM (6)
  // Pos 10-16: CNES da Unidade (7)
  // Pos 17-22: Total de Detalhes (6)
  const header = [
    formatField('01B', 3, 'A'),
    formatField(compClean, 6, 'N'),
    formatField(cnesClean, 7, 'N'),
    formatField(totalDetails, 6, 'N')
  ].join('');

  // DETALHES BPA-I
  const detailLines = items.map(item => {
    // Pos 1-2: "03" (2)
    // Pos 3-9: CNES (7)
    // Pos 10-15: Competência AAAAMM (6)
    // Pos 16-30: CNS Profissional (15)
    // Pos 31-36: CBO Profissional (6)
    // Pos 37-44: Data Atendimento AAAAMMDD (8)
    // Pos 45-54: Código Procedimento SIGTAP (10)
    // Pos 55-69: CNS Paciente (15)
    // Pos 70: Sexo Paciente M/F (1)
    // Pos 71-76: IBGE Município (6)
    // Pos 77-80: CID-10 (4) - se vazio, 4 espaços
    // Pos 81-83: Idade Paciente (3)
    // Pos 84-89: Quantidade Fixo "000001" (6)

    const itemCnes = formatField(item.cnes || cnesClean, 7, 'N');
    const itemComp = formatField(item.competencia || compClean, 6, 'N');
    const cnsProf = formatField(item.cnsProfissional, 15, 'N');
    const cboProf = formatField(item.cboProfissional, 6, 'A');
    const dataAtend = formatField(item.dataAtendimento, 8, 'N');
    const proc = formatField(item.codigoProcedimento, 10, 'N');
    const cnsPac = formatField(item.cnsPaciente, 15, 'N');
    const sexo = formatField(item.sexoPaciente || 'M', 1, 'A');
    const ibge = formatField(item.ibgeMunicipio, 6, 'N');
    const cid = formatField(item.cid10 || '', 4, 'A');
    const idade = formatField(item.idadePaciente, 3, 'N');
    const qtd = formatField('000001', 6, 'N');

    return [
      '03',
      itemCnes,
      itemComp,
      cnsProf,
      cboProf,
      dataAtend,
      proc,
      cnsPac,
      sexo,
      ibge,
      cid,
      idade,
      qtd
    ].join('');
  });

  // Une o cabeçalho e os detalhes com quebra de linha do Windows (\r\n) padrão SIA-SUS
  const allLines = [header, ...detailLines];
  return allLines.join('\r\n');
}

/**
 * Força o download do arquivo BPA (.txt) no navegador do usuário (Compatível com Vite)
 */
export function downloadBpaFile(cnesUnidade: string, competencia: string, items: BpaItem[]): void {
  const content = generateBpaContent(cnesUnidade, competencia, items);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const compClean = competencia.replace(/\D/g, '').slice(0, 6) || '202609';
  const cnesClean = cnesUnidade.replace(/\D/g, '').slice(0, 7) || '0000000';
  const filename = `BPA_${compClean}_${cnesClean}.txt`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
