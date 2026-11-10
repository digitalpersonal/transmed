import React, { useState } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  MapPin, 
  Calendar,
  Search,
  Check
} from 'lucide-react';
import { Trip, TripPassenger, ensurePassengerArray, Vehicle } from '../../types';
import { formatDateBR, formatPlate } from '../../utils/formatters';

interface MovePassengerModalProps {
  passenger: TripPassenger;
  currentTrip: Trip;
  availableTrips: Trip[];
  vehicles: Vehicle[];
  onMove: (sourceTripId: string, targetTripId: string, passengerId: string) => void;
  onClose: () => void;
}

export const MovePassengerModal: React.FC<MovePassengerModalProps> = ({
  passenger,
  currentTrip,
  availableTrips,
  vehicles,
  onMove,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredTrips = availableTrips.filter(t => 
    t.id !== currentTrip.id &&
    (t.destinationCity.toLowerCase().includes(searchTerm.toLowerCase()) ||
     t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
     t.departureDate.includes(searchTerm))
  ).sort((a, b) => a.departureDate.localeCompare(b.departureDate));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold">Mover Passageiro</h3>
          </div>
          <button onClick={onClose} className="hover:bg-slate-800 p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-sky-50 border border-sky-100 p-3 rounded-lg">
            <p className="text-[10px] text-sky-600 uppercase font-bold mb-1">Passageiro a ser movido:</p>
            <strong className="text-slate-900 block">{passenger.patientName}</strong>
            <p className="text-[11px] text-slate-500">
              Viagem atual: {currentTrip.code} ({currentTrip.destinationCity})
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar viagem de destino (cidade, código ou data)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-sky-600"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-100 p-1 rounded-lg">
            {filteredTrips.length === 0 ? (
              <p className="text-center py-4 text-slate-400 text-xs italic">Nenhuma viagem alternativa encontrada.</p>
            ) : (
              filteredTrips.map(t => {
                const passList = ensurePassengerArray(t.passengers);
                const occupied = passList.reduce((acc, p) => acc + 1 + (p.companionIncluded ? 1 : 0), 0);
                const vehicle = vehicles.find(v => v.id === t.vehicleId);
                const maxCap = vehicle?.maxCapacity || 0;
                const isFull = maxCap > 0 && occupied >= maxCap;

                return (
                  <button
                    key={t.id}
                    onClick={() => onMove(currentTrip.id, t.id, passenger.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all group flex items-center justify-between ${
                      isFull 
                        ? 'border-rose-200 bg-rose-50/30 hover:border-rose-400' 
                        : 'border-slate-200 hover:border-sky-400 hover:bg-sky-50'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{t.destinationCity}</span>
                        <span className="text-[10px] bg-slate-100 px-1.5 rounded font-mono font-bold text-slate-500">{t.code}</span>
                        {!t.vehicleId && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 rounded font-bold uppercase">Sem Carro</span>}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDateBR(t.departureDate)} às {t.departureTime}</span>
                        <span className="font-semibold text-slate-700">
                          {vehicle ? `${vehicle.model} (${formatPlate(vehicle.plate)})` : 'Veículo não escalado'} • {t.driverName || 'Sem motorista'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        <span className={`font-bold ${isFull ? 'text-rose-600' : 'text-slate-600'}`}>
                          Capacidade: {occupied}{maxCap > 0 ? ` / ${maxCap}` : ''} 
                          {isFull && ' (Lotado)'}
                        </span>
                      </div>
                    </div>
                    <ArrowRightLeft className={`w-4 h-4 transition-colors ${isFull ? 'text-rose-300 group-hover:text-rose-600' : 'text-slate-300 group-hover:text-sky-600'}`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-bold text-xs hover:underline"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
