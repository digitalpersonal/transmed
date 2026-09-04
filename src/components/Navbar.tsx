import React from 'react';
import { 
  Bus, 
  Users, 
  Calendar, 
  Ticket, 
  FileCheck, 
  Settings, 
  Plus, 
  FileSpreadsheet, 
  ShieldCheck, 
  LayoutDashboard,
  HelpCircle,
  Truck,
  UserCircle2,
  MapPin,
  FileText
} from 'lucide-react';
import { MunicipalConfig } from '../types';

export type ActiveTab = 'dashboard' | 'trips' | 'bookings' | 'patients' | 'vehicles' | 'drivers' | 'destinations' | 'reports' | 'bpa';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  config: MunicipalConfig;
  onOpenNewBookingModal: () => void;
  onOpenNewTripModal: () => void;
  onOpenNewPatientModal: () => void;
  onOpenImportExcelModal: () => void;
  onOpenConfigModal: () => void;
  onOpenUserModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  config,
  onOpenNewBookingModal,
  onOpenNewTripModal,
  onOpenNewPatientModal,
  onOpenImportExcelModal,
  onOpenConfigModal,
  onOpenUserModal,
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'trips', label: 'Viagens & Lotação', icon: Bus },
    { id: 'bookings', label: 'Agendamentos & Vagas', icon: Ticket },
    { id: 'patients', label: 'Pacientes & Acomp.', icon: Users },
    { id: 'vehicles', label: 'Frota de Veículos', icon: Truck },
    { id: 'drivers', label: 'Motoristas', icon: UserCircle2 },
    { id: 'destinations', label: 'Cidades Atendidas', icon: MapPin },
    { id: 'reports', label: 'Fechamentos & Relatórios', icon: FileCheck },
    { id: 'bpa', label: 'Faturamento BPA', icon: FileText },
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center font-black text-white text-lg tracking-wider shadow-sm">
            SUS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">{config.municipalityName}</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded border border-emerald-500/30">
                TFD & TRANSPORTE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">{config.departmentName}</p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            id="btn-nav-import-excel"
            onClick={onOpenImportExcelModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-500/30 transition-colors cursor-pointer"
            title="Importar pacientes por arquivo Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Importar Planilha</span>
          </button>

          <button
            id="btn-nav-new-trip"
            onClick={onOpenNewTripModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-xs font-semibold border border-sky-500/30 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Viagem</span>
          </button>

          <button
            id="btn-nav-new-booking"
            onClick={onOpenNewBookingModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Ticket className="w-4 h-4" />
            <span>Novo Agendamento</span>
          </button>

          <button
            id="btn-nav-users"
            onClick={onOpenUserModal}
            className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-semibold px-2"
            title="Administração e Gestão de Usuários"
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Admin</span>
          </button>

          <button
            id="btn-nav-config"
            onClick={onOpenConfigModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Configurações e Backup"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap items-center gap-1 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
