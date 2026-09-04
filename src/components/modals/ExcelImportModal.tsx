import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, Trash2, ArrowRight, Clock, User, Phone, MapPin, Bus, Check, Info } from 'lucide-react';
import { Patient } from '../../types';
import { downloadSamplePatientTemplate, parseExcelCapturedRows, ExcelCapturedRow } from '../../utils/excel';
import { formatCPF, formatSUS, formatPhone, formatDateBR } from '../../utils/formatters';

interface ExcelImportModalProps {
  onImportPatients: (newPatients: Patient[], capturedRows?: ExcelCapturedRow[]) => void;
  onClose: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  onImportPatients,
  onClose,
}) => {
  const [parsedList, setParsedList] = useState<Patient[]>([]);
  const [capturedRows, setCapturedRows] = useState<ExcelCapturedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'columns_info'>('preview');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const captureColumns = [
    { num: '01', name: 'DATA_VIAGEM', desc: 'Data da viagem (DD/MM/AAAA) - Apenas datas futuras/hoje serão importadas' },
    { num: '02', name: 'HORARIO_PROCEDIMENTO', desc: 'Horário da consulta ou procedimento no hospital' },
    { num: '03', name: 'NOME_PACIENTE', desc: 'Nome completo do paciente' },
    { num: '04', name: 'DATA_NASCIMENTO_PACIENTE', desc: 'Data de nascimento (DD/MM/AAAA)' },
    { num: '05', name: 'CPF_PACIENTE', desc: 'CPF do paciente' },
    { num: '06', name: 'CARTÃO_SUS_PACIENTE', desc: 'Cartão Nacional de Saúde (CNS - 15 dígitos)' },
    { num: '07', name: 'ENDEREÇO_EMBARQUE_PACIENTE', desc: 'Endereço residencial / ponto de embarque' },
    { num: '08', name: 'POSSUI_ACOMPANHANTE', desc: 'SIM ou NÃO' },
    { num: '09', name: 'NOME_ACOMPANHANTE', desc: 'Nome do acompanhante autorizado' },
    { num: '10', name: 'DATA_NASCIMENTO_ACOMPANHANTE', desc: 'Data de nascimento do acompanhante' },
    { num: '11', name: 'CPF_ACOMPANHANTE', desc: 'CPF do acompanhante' },
    { num: '12', name: 'ENDEREÇO_EMBARQUE_ACOMPANHANTE', desc: 'Endereço de embarque do acompanhante' },
    { num: '13', name: 'WHATSAPP_PACIENTE', desc: 'Telefone / WhatsApp com DDD' },
    { num: '14', name: 'ENDEREÇO_DESTINO', desc: 'Hospital de referência, clínica ou endereço no município de destino' },
    { num: '15', name: 'VEICULO', desc: 'Veículo atribuído (opcional para agendamento direto)' },
    { num: '16', name: 'MOTORISTA', desc: 'Motorista responsável (opcional)' },
    { num: '17', name: 'HORARIO_SAIDA', desc: 'Horário de saída da viagem' },
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMsg('');
    setFileName(file.name);

    try {
      const result = await parseExcelCapturedRows(file);
      if (result.patients.length === 0) {
        setErrorMsg('Nenhum registro de paciente válido encontrado na planilha. Verifique os cabeçalhos das colunas.');
      } else {
        setParsedList(result.patients);
        setCapturedRows(result.rows);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao ler a planilha. Certifique-se de que é um arquivo Excel (.xlsx, .xls) ou CSV válido com os cabeçalhos corretos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedList.length === 0) return;
    onImportPatients(parsedList, capturedRows);
    onClose();
  };

  const handleRemoveRow = (index: number) => {
    setParsedList((prev) => prev.filter((_, i) => i !== index));
    setCapturedRows((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-xs">
      <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-lg text-white">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Captura e Importação de Planilha Excel (TFD)</h3>
              <p className="text-xs text-slate-400">
                Padrão oficial com 16 colunas: dados do paciente, acompanhante, endereço, WhatsApp e viagem
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-100 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Importação & Preview ({parsedList.length} registros)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('columns_info')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                activeTab === 'columns_info'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ordem Oficial das 16 Colunas
            </button>
          </div>

          <button
            type="button"
            id="btn-download-sample-template"
            onClick={downloadSamplePatientTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Baixar Modelo Padrão (.xlsx)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-slate-800 max-h-[75vh] overflow-y-auto space-y-4 text-xs">
          {activeTab === 'columns_info' ? (
            /* Columns Guide Tab */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950">
                  <p className="font-bold">Estrutura e Ordem de Captura da Planilha do Excel:</p>
                  <p className="text-emerald-800 mt-1">
                    O sistema reconhece automaticamente os nomes das colunas e variações de acentuação. A ordem recomendada segue a sequência abaixo:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {captureColumns.map((col) => (
                  <div key={col.num} className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px] rounded">
                        Coluna {col.num}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 text-xs font-mono break-all">{col.name}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{col.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Upload & Preview Tab */
            <div>
              {parsedList.length === 0 ? (
                <div className="space-y-4">
                  {/* Visual Preview of the Sequence */}
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="font-bold text-slate-800 text-xs mb-2">Ordem de Captura Esperada na Planilha:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {captureColumns.map((c) => (
                        <span
                          key={c.num}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 text-slate-700 text-[11px] font-mono rounded"
                        >
                          <strong className="text-emerald-700">{c.num}.</strong> {c.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Upload Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 rounded-xl p-8 text-center cursor-pointer transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Upload className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                    <p className="font-bold text-slate-800 text-sm">
                      Clique para selecionar sua planilha Excel (.xlsx, .xls ou .csv)
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                      Ou arraste e solte o arquivo diretamente nesta área
                    </p>

                    {isLoading && (
                      <div className="mt-4 flex items-center justify-center gap-2 text-emerald-700 font-bold">
                        <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                        Lendo e mapeando colunas da planilha...
                      </div>
                    )}

                    {errorMsg && (
                      <div className="mt-4 p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-lg flex items-center justify-center gap-2 text-xs">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>{errorMsg}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Preview Status Bar */}
                  <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="font-bold text-emerald-950 text-xs">
                        {parsedList.length} registro(s) capturado(s) com sucesso
                      </span>
                      <span className="text-emerald-700 text-xs">({fileName})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setParsedList([]);
                        setCapturedRows([]);
                        setFileName('');
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                    >
                      Carregar Outro Arquivo
                    </button>
                  </div>

                  {/* Complete 16 Columns Preview Table */}
                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-[11px] border-collapse min-w-[1200px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 sticky top-0">
                          <th className="py-2.5 px-2 text-center w-8">#</th>
                          <th className="py-2.5 px-2 w-24">1. Data Viagem</th>
                          <th className="py-2.5 px-2 w-20">2. Horário Proc.</th>
                          <th className="py-2.5 px-3 min-w-[180px]">3. Nome Paciente</th>
                          <th className="py-2.5 px-2 w-24">4. Data Nasc.</th>
                          <th className="py-2.5 px-2 w-28">5. CPF</th>
                          <th className="py-2.5 px-2 w-32">6. Cartão SUS</th>
                          <th className="py-2.5 px-3 min-w-[180px]">7. Endereço Embarque</th>
                          <th className="py-2.5 px-2 w-16 text-center">8. Acomp?</th>
                          <th className="py-2.5 px-3 min-w-[160px]">9. Nome Acomp.</th>
                          <th className="py-2.5 px-2 w-24">10. Nasc. Acomp.</th>
                          <th className="py-2.5 px-2 w-28">11. CPF Acomp.</th>
                          <th className="py-2.5 px-3 min-w-[160px]">12. End. Acomp.</th>
                          <th className="py-2.5 px-2 w-28">13. WhatsApp</th>
                          <th className="py-2.5 px-3 min-w-[150px]">14. Destino</th>
                          <th className="py-2.5 px-2 w-28">15. Veículo</th>
                          <th className="py-2.5 px-2 w-28">16. Motorista</th>
                          <th className="py-2.5 px-2 w-20">17. Hor. Saída</th>
                          <th className="py-2.5 px-2 text-center w-10">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {capturedRows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                            <td className="py-2 px-2 font-bold text-emerald-700">{formatDateBR(r.dataViagem)}</td>
                            <td className="py-2 px-2 font-bold text-slate-900">{r.horarioProcedimento}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">{r.nomePaciente}</td>
                            <td className="py-2 px-2 text-slate-700">{formatDateBR(r.dataNascimentoPaciente)}</td>
                            <td className="py-2 px-2 font-mono text-slate-700">{formatCPF(r.cpfPaciente)}</td>
                            <td className="py-2 px-2 font-mono text-slate-700">{formatSUS(r.cartaoSusPaciente)}</td>
                            <td className="py-2 px-3 text-slate-700 truncate max-w-xs" title={r.enderecoEmbarquePaciente}>
                              {r.enderecoEmbarquePaciente}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {r.possuiAcompanhante ? (
                                <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                                  SIM
                                </span>
                              ) : (
                                <span className="text-slate-400">NÃO</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-700">{r.nomeAcompanhante || '-'}</td>
                            <td className="py-2 px-2 text-slate-700">{r.dataNascimentoAcompanhante ? formatDateBR(r.dataNascimentoAcompanhante) : '-'}</td>
                            <td className="py-2 px-2 font-mono text-slate-700">{r.cpfAcompanhante ? formatCPF(r.cpfAcompanhante) : '-'}</td>
                            <td className="py-2 px-3 text-slate-700 truncate max-w-xs">{r.enderecoEmbarqueAcompanhante || '-'}</td>
                            <td className="py-2 px-2 font-mono text-slate-700">{formatPhone(r.whatsappPaciente)}</td>
                            <td className="py-2 px-3 font-medium text-slate-800">{r.destino}</td>
                            <td className="py-2 px-2 text-slate-600">{r.veiculo}</td>
                            <td className="py-2 px-2 text-slate-600">{r.motorista}</td>
                            <td className="py-2 px-2 font-bold text-emerald-700">{r.horarioSaida}</td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                title="Remover linha"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-medium text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>

            {parsedList.length > 0 && (
              <button
                type="button"
                id="btn-confirm-import-patients"
                onClick={handleConfirmImport}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar Importação de {parsedList.length} Pacientes & Agendamentos
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
