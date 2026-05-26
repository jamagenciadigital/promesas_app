import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PQRS } from '../../types';
import PQRSList from '../../components/PQRS/PQRSList';
import PQRSDetail from '../../components/PQRS/PQRSDetail';
import { MessageSquare } from 'lucide-react';

export default function EscenarioPQRS() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedPQRS, setSelectedPQRS] = useState<PQRS | null>(null);

  const handleSelect = (pqrs: PQRS) => {
    setSelectedPQRS(pqrs);
    setView('detail');
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-[var(--primary-10)] rounded-2xl">
          <MessageSquare className="w-6 h-6 text-[var(--primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tight">PQRS Escenario</h1>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Solicitudes de equipos y deportistas</p>
        </div>
      </div>

      {view === 'list' ? (
        <PQRSList view="received" onSelect={handleSelect} />
      ) : selectedPQRS ? (
        <PQRSDetail 
          pqrs={selectedPQRS} 
          onBack={() => setView('list')} 
          onUpdate={() => setView('list')}
        />
      ) : null}
    </div>
  );
}
