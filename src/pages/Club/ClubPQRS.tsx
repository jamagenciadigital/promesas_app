import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { PQRS } from '../../types';
import PQRSList from '../../components/PQRS/PQRSList';
import PQRSForm from '../../components/PQRS/PQRSForm';
import PQRSDetail from '../../components/PQRS/PQRSDetail';
import { Button } from '../../components/ui/Button';
import { MessageSquare, Plus, ArrowLeft, MapPin } from 'lucide-react';

export default function ClubPQRS() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedPQRS, setSelectedPQRS] = useState<PQRS | null>(null);
  const [destino, setDestino] = useState<{ tipo: 'escenario', id: string, nombre: string } | null>(null);
  const [escenarios, setEscenarios] = useState<any[]>([]);
  const [loadingEscenarios, setLoadingEscenarios] = useState(false);

  useEffect(() => {
    if (view === 'create' && !destino) {
      fetchEscenarios();
    }
  }, [view, destino]);

  async function fetchEscenarios() {
    if (!profile?.club_id) return;
    setLoadingEscenarios(true);
    try {
      const { data: club } = await supabase
        .from('clubes')
        .select('*, deporte:deporte_id(nombre)')
        .eq('id', profile.club_id)
        .single();
      
      const sportName = (club as any)?.deporte?.nombre;

      let query = supabase.from('escenarios').select('*');
      if (sportName) {
        query = query.ilike('deporte', `%${sportName}%`);
      }
      
      const { data } = await query;
      setEscenarios(data || []);
    } finally {
      setLoadingEscenarios(false);
    }
  }

  const handleSelect = (pqrs: PQRS) => {
    setSelectedPQRS(pqrs);
    setView('detail');
  };

  const handleCreate = (id: string, nombre: string) => {
    setDestino({ tipo: 'escenario', id, nombre });
    setView('create');
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-[#182332] to-[#bd0f10] text-white rounded-xl shadow-sm">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#182332] dark:text-white tracking-tight">Gestión de PQRS</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {activeTab === 'received' ? 'Solicitudes recibidas de miembros' : 'Mis solicitudes a escenarios'}
            </p>
          </div>
        </div>

        {view === 'list' && activeTab === 'sent' && (
          <Button 
            onClick={() => setView('create')}
            className="bg-[#182332] dark:bg-[var(--primary)] text-white dark:text-black font-bold px-4 h-10 rounded-xl flex items-center gap-2 border-0 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nueva Solicitud
          </Button>
        )}
      </div>

      {view === 'list' && (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('received')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'received' 
                  ? 'bg-white dark:bg-[#182332] text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Recibidos
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'sent' 
                  ? 'bg-white dark:bg-[#182332] text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Enviados (Escenarios)
            </button>
          </div>

          <PQRSList view={activeTab} onSelect={handleSelect} />
        </div>
      )}

      {view === 'create' && !destino && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <button 
            onClick={() => setView('list')} 
            className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Volver
          </button>
          
          <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 p-6 rounded-2xl space-y-6">
            <div className="flex items-center gap-3">
              <MapPin className="text-[var(--primary)]" size={24} />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Seleccionar Escenario (De tu Deporte)</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingEscenarios ? (
                [1,2,3].map(i => <div key={i} className="h-16 bg-gray-50 dark:bg-white/5 rounded-2xl animate-pulse" />)
              ) : escenarios.length > 0 ? (
                escenarios.map(esc => (
                  <button
                    key={esc.id}
                    onClick={() => handleCreate(esc.id, esc.nombre)}
                    className="text-left p-6 bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl transition-all group"
                  >
                    <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[var(--primary)] transition-colors">{esc.nombre}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{esc.deporte || 'Deporte no especificado'}</p>
                  </button>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400 italic text-sm">
                  No se encontraron escenarios con el deporte de tu club.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'create' && destino && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95">
          <button 
            onClick={() => setDestino(null)} 
            className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Cambiar Escenario
          </button>
          <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 p-6 rounded-2xl shadow-sm">
            <PQRSForm destinoTipo="escenario" destinoId={destino.id} onSuccess={() => setView('list')} onCancel={() => setDestino(null)} />
          </div>
        </div>
      )}

      {view === 'detail' && selectedPQRS && (
        <PQRSDetail pqrs={selectedPQRS} onBack={() => setView('list')} onUpdate={() => setView('list')} />
      )}
    </div>
  );
}
