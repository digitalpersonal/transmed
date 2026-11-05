import React, { useState } from 'react';
import { 
  FileText, Download, ShieldCheck, Building2, UserCheck, 
  Calendar, CheckCircle, AlertCircle, HelpCircle, ArrowRight, Database,
  RotateCcw, Trash2, Printer
} from 'lucide-react';
import { Trip, Driver, MunicipalConfig, Patient } from '../types';
import { downloadBpaFile, BpaItem } from '../utils/bpaExport';
import { generateBpaPdfReport } from '../utils/bpaPdfReport';

interface BpaExportViewProps {
  trips: Trip[];
  drivers: Driver[];
  patients: Patient[];
  config: MunicipalConfig;
  onUpdateDriver: (driver: Driver) => void;
  onUpdateConfig: (newConfig: MunicipalConfig) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onClearTripsOnly: () => void;
  onClearSystem: () => void;
  isAdmin?: boolean;
}

export const BpaExportView: React.FC<BpaExportViewProps> = ({
  trips,
  drivers,
  patients,
  config,
  onUpdateDriver,
  onUpdateConfig,
  showToast,
  onClearTripsOnly,
  onClearSystem,
  isAdmin
}) => {
  const [exportMode, setExportMode] = useState<'monthly' | 'daily'>('monthly');
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [cnes, setCnes] = useState(config.cnesUnit || '2531482');
  const [defaultProcedure, setDefaultProcedure] = useState('0401010010'); // Transporte Sanitário / Atendimento
  const [defaultCbo, setDefaultCbo] = useState('515125'); // Motorista
  const [selectedDriverCnsMap, setSelectedDriverCnsMap] = useState<Record<string, { cns: string; cbo: string }>>(() => {
    const map: Record<string, { cns: string; cbo: string }> = {};
    drivers.forEach(d => {
      map[d.id] = {
        cns: d.cns || '700000000000000',
        cbo: d.cbo || '515125'
      };
    });
    return map;
  });

  // Sync state if drivers prop updates
  React.useEffect(() => {
    const map: Record<string, { cns: string; cbo: string }> = {};
    drivers.forEach(d => {
      map[d.id] = {
        cns: d.cns || '700000000000000',
        cbo: d.cbo || '515125'
      };
    });
    setSelectedDriverCnsMap(map);
  }, [drivers]);

  const handleDriverChange = (driverId: string, field: 'cns' | 'cbo', val: string) => {
    setSelectedDriverCnsMap(prev => ({
      ...prev,
      [driverId]: {
        ...(prev[driverId] || { cns: '700000000000000', cbo: '515125' }),
        [field]: val
      }
    }));
  };

  const saveDriverToSystem = (driver: Driver) => {
    const current = selectedDriverCnsMap[driver.id];
    if (current) {
      const updated: Driver = {
        ...driver,
        cns: current.cns,
        cbo: current.cbo
      };
      onUpdateDriver(updated);
      showToast(`Dados de CNS/CBO do motorista ${driver.name} salvos com sucesso!`, 'success');
    }
  };

  // Filter trips for selected competencia (YYYY-MM) or date (YYYY-MM-DD)
  const cleanComp = competencia.replace('-', '');
  const year = competencia.split('-')[0];
  const month = competencia.split('-')[1];

  const filteredTrips = trips.filter(trip => {
    if (!trip.departureDate) return false;
    if (trip.status !== 'completed') return false;

    if (exportMode === 'daily') {
      return trip.departureDate === selectedDate;
    } else {
      const [tYear, tMonth] = trip.departureDate.split('-');
      return tYear === year && tMonth === month;
    }
  });

  // Extract all boarded passengers from completed trips in this period
  const bpaItems: BpaItem[] = [];
  filteredTrips.forEach(trip => {
    const driverInfo = selectedDriverCnsMap[trip.driverId || ''] || { cns: '700000000000000', cbo: defaultCbo };
    const passengers = Array.isArray(trip.passengers) ? trip.passengers : Object.values(trip.passengers || {});
    
    passengers.forEach(p => {
      if (p.status === 'boarded' || p.status === 'confirmed') {
        const patientRecord = patients.find(pt => pt.id === p.patientId);
        const ibge = patientRecord?.ibgeCode || '355030'; // Default SP or patient IBGE
        const cnsPac = p.patientSus || patientRecord?.susCard || '898000000000000';
        const birthDate = p.patientBirthDate || patientRecord?.birthDate || '1980-01-01';
        
        // Calculate age
        const birthYear = parseInt(birthDate.split('-')[0]) || 1980;
        const currentYear = parseInt(year) || new Date().getFullYear();
        const age = Math.max(0, currentYear - birthYear);

        bpaItems.push({
          cnes: cnes,
          competencia: cleanComp,
          cnsProfissional: driverInfo.cns,
          cboProfissional: driverInfo.cbo || defaultCbo,
          dataAtendimento: trip.departureDate.replace(/-/g, ''),
          codigoProcedimento: defaultProcedure,
          cnsPaciente: cnsPac,
          sexoPaciente: 'M',
          ibgeMunicipio: ibge,
          cid10: 'Z753', // Transporte sanitário / TFD
          idadePaciente: age
        });
      }
    });
  });

  const handleExport = () => {
    if (!cnes || cnes.length !== 7) {
      showToast('O CNES da unidade deve conter exatamente 7 dígitos numéricos.', 'error');
      return;
    }
    if (bpaItems.length === 0) {
      showToast(`Nenhum atendimento encontrado para exportar na ${exportMode === 'daily' ? 'data' : 'competência'} selecionada.`, 'error');
      return;
    }
    downloadBpaFile(cnes, cleanComp, bpaItems, exportMode === 'daily' ? selectedDate : undefined);
    const label = exportMode === 'daily' ? `BPA_DIA_${selectedDate.replace(/-/g, '')}` : `BPA_${cleanComp}`;
    showToast(`Arquivo ${label}_${cnes}.txt gerado e baixado com sucesso!`, 'success');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-xl border border-slate-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30">
              SIA-SUS / DATASUS
            </span>
            <span className="text-xs text-slate-400 font-medium">BPA Magnético (Boletim de Produção Ambulatorial)</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Faturamento e Exportação BPA-I</h1>
          <p className="text-slate-300 text-sm mt-1">
            Gere o arquivo texto oficial para o faturamento do TFD por mês ou por dia.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <>
              <button
                onClick={() => {
                  if (confirm('Deseja excluir APENAS as viagens e faturamento BPA? O cadastro de pacientes será mantido.')) {
                    onClearTripsOnly();
                  }
                }}
                className="flex items-center gap-2 px-3.5 py-3 bg-amber-900/20 hover:bg-amber-900/30 text-amber-200 rounded-xl text-xs font-bold border border-amber-500/30 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Zerar Viagens e BPA
              </button>

              <button
                onClick={() => {
                  if (confirm('ATENÇÃO: Deseja realmente ZERAR todo o sistema (viagens e pacientes) para iniciar o uso em produção? Esta ação não pode ser desfeita.')) {
                    onClearSystem();
                  }
                }}
                className="flex items-center gap-2 px-3.5 py-3 bg-rose-900/20 hover:bg-rose-900/30 text-rose-200 rounded-xl text-xs font-bold border border-rose-500/30 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Zerar p/ Produção
              </button>
            </>
          )}
          <button
            onClick={() => {
              if (filteredTrips.length === 0) {
                showToast(`Nenhuma viagem encontrada para gerar o relatório em PDF na ${exportMode === 'daily' ? 'data' : 'competência'} selecionada.`, 'error');
                return;
              }
              generateBpaPdfReport(
                competencia,
                cnes,
                config,
                filteredTrips,
                patients,
                exportMode === 'daily' ? selectedDate : undefined
              );
              showToast('Relatório Oficial de Faturamento BPA (PDF) gerado com sucesso!', 'success');
            }}
            disabled={filteredTrips.length === 0}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold shadow-md transition-all cursor-pointer ${
              filteredTrips.length > 0
                ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/30'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
            title="Emitir documento PDF com consolidação por procedimento e relação nominal para prestação de contas do SUS"
          >
            <Printer className="w-5 h-5" />
            <span>Emitir Relatório em PDF</span>
          </button>

          <button
            onClick={handleExport}
            disabled={bpaItems.length === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg transition-all cursor-pointer ${
              bpaItems.length > 0 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30' 
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Download className="w-5 h-5" />
            <span>Gerar e Baixar BPA.txt ({bpaItems.length} reg)</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setExportMode('monthly')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            exportMode === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Exportação Mensal
        </button>
        <button
          onClick={() => setExportMode('daily')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            exportMode === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Exportação por Dia
        </button>
      </div>

      {/* Configuration & Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>CNES da Unidade Emitente (7 Dígitos)</span>
          </label>
          <input
            type="text"
            maxLength={7}
            value={cnes}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setCnes(val);
              onUpdateConfig({ ...config, cnesUnit: val });
            }}
            placeholder="Ex: 2531482"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <p className="text-[11px] text-slate-400 mt-1">Preenchido com zeros à esquerda se menor que 7.</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>{exportMode === 'daily' ? 'Data do Atendimento' : 'Competência (AAAAMM)'}</span>
          </label>
          {exportMode === 'daily' ? (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold text-base focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          ) : (
            <input
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold text-base focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          )}
          <p className="text-[11px] text-slate-400 mt-1">
            {exportMode === 'daily' ? 'Filtra viagens concluídas nesta data.' : 'Filtra viagens concluídas no mês selecionado.'}
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Procedimento SIGTAP Padrão & CBO</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">Procedimento (10d)</span>
              <input
                type="text"
                maxLength={10}
                value={defaultProcedure}
                onChange={(e) => setDefaultProcedure(e.target.value.replace(/\D/g, ''))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">CBO Motorista (6d)</span>
              <input
                type="text"
                maxLength={6}
                value={defaultCbo}
                onChange={(e) => setDefaultCbo(e.target.value.replace(/\D/g, ''))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Driver CNS & CBO Configuration Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800">Vínculo de CNS e CBO dos Motoristas</h3>
          </div>
          <span className="text-xs text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-xs">
            {drivers.length} motoristas cadastrados
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Motorista</th>
                <th className="py-3 px-4">CPF / CNH</th>
                <th className="py-3 px-4">CNS do Profissional (15 Dígitos)</th>
                <th className="py-3 px-4">CBO (6 Dígitos)</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {drivers.map(driver => {
                const mapEntry = selectedDriverCnsMap[driver.id] || { cns: driver.cns || '700000000000000', cbo: driver.cbo || defaultCbo };
                return (
                  <tr key={driver.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">{driver.name}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono">{driver.cpf}</td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        maxLength={15}
                        value={mapEntry.cns}
                        onChange={(e) => handleDriverChange(driver.id, 'cns', e.target.value.replace(/\D/g, ''))}
                        placeholder="700000000000000"
                        className="w-full max-w-xs px-2.5 py-1 bg-white border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        maxLength={6}
                        value={mapEntry.cbo}
                        onChange={(e) => handleDriverChange(driver.id, 'cbo', e.target.value.replace(/\D/g, ''))}
                        placeholder="515125"
                        className="w-full max-w-[120px] px-2.5 py-1 bg-white border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => saveDriverToSystem(driver)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded font-medium text-[11px] shadow-xs transition-colors cursor-pointer"
                      >
                        Salvar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary & Production Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-slate-800">Resumo da Produção para o BPA ({filteredTrips.length} viagens concluídas)</h3>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-sky-50 text-sky-700 rounded-full border border-sky-200">
            {bpaItems.length} registros (linhas 03) gerados
          </span>
        </div>

        {bpaItems.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhuma viagem concluída encontrada para a competência {competencia}.</p>
            <p className="text-xs text-slate-500 mt-1">Conclua viagens na aba "Viagens & Lotação" para gerar a produção ambulatorial do SUS.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-sans font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Paciente</th>
                  <th className="py-2.5 px-3">CNS Paciente</th>
                  <th className="py-2.5 px-3">Procedimento</th>
                  <th className="py-2.5 px-3">CNS Profissional</th>
                  <th className="py-2.5 px-3">CBO</th>
                  <th className="py-2.5 px-3">IBGE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {bpaItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-3">{item.dataAtendimento}</td>
                    <td className="py-2 px-3 font-sans font-medium">Paciente ID {item.cnsPaciente.slice(-4)}</td>
                    <td className="py-2 px-3">{item.cnsPaciente}</td>
                    <td className="py-2 px-3 text-emerald-700 font-bold">{item.codigoProcedimento}</td>
                    <td className="py-2 px-3">{item.cnsProfissional}</td>
                    <td className="py-2 px-3">{item.cboProfissional}</td>
                    <td className="py-2 px-3">{item.ibgeMunicipio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
