import React, { useState } from 'react';
import { MapPin, Search, Save, User } from 'lucide-react';
import { Patient } from '../types';
import { upsertPatientFirestore } from '../lib/supabaseSync';

interface BoardingAddressesViewProps {
  patients: Patient[];
}

export const BoardingAddressesView: React.FC<BoardingAddressesViewProps> = ({ patients }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatient, setEditingPatient] = useState<Record<string, Partial<Patient>>>({});

  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.trim().toLowerCase();
    if (term.length < 3) return true;
    return (
      p.name.toLowerCase().includes(term) ||
      (p.boardingAddress || p.address || '').toLowerCase().includes(term) ||
      (p.companionAddress || '').toLowerCase().includes(term)
    );
  });

  const handleUpdate = async (p: Patient) => {
    const changes = editingPatient[p.id];
    if (!changes) return;
    const updatedPatient = { ...p, ...changes };
    await upsertPatientFirestore(updatedPatient);
    setEditingPatient((prev) => {
        const next = {...prev};
        delete next[p.id];
        return next;
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">Locais de Embarque (Pacientes e Acompanhantes)</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-700 uppercase bg-slate-100">
            <tr>
              <th className="px-6 py-3">Paciente</th>
              <th className="px-6 py-3">Endereço de Embarque (Paciente)</th>
              <th className="px-6 py-3">Endereço de Embarque (Acompanhante)</th>
              <th className="px-6 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map((p) => (
              <tr key={p.id} className="border-b hover:bg-slate-50">
                <td className="px-6 py-4 font-medium">{p.name}</td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    defaultValue={p.boardingAddress || p.address}
                    onChange={(e) => setEditingPatient({ ...editingPatient, [p.id]: { ...(editingPatient[p.id] || {}), boardingAddress: e.target.value } })}
                    className="w-full p-2 border rounded"
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    defaultValue={p.companionAddress || ''}
                    onChange={(e) => setEditingPatient({ ...editingPatient, [p.id]: { ...(editingPatient[p.id] || {}), companionAddress: e.target.value } })}
                    className="w-full p-2 border rounded"
                  />
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleUpdate(p)}
                    className="text-emerald-600 hover:text-emerald-800"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
