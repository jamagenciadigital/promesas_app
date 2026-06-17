import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { PQRS } from '../../types';
import PQRSList from '../../components/PQRS/PQRSList';
import PQRSForm from '../../components/PQRS/PQRSForm';
import PQRSDetail from '../../components/PQRS/PQRSDetail';
import { Button } from '../../components/ui/Button';
import { Plus, Building2, MapPin, MessageSquare, ArrowLeft } from 'lucide-react';

export default function PlayerPQRS() {
  const { profile } = useAuth();
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedPQRS, setSelectedPQRS] = useState<PQRS | null>(null);
  const [destino, setDestino] = useState<{ tipo: 'club' | 'escenario', id: string, nombre: string } | null>(null);
  const [escenarios, setEscenarios] = useState<any[]>([]);
  const [loadingEscenarios, setLoadingEscenarios] = useState(false);

  useEffect(() => {
    if (view === 'create' && !destino) {
      fetchEscenarios();
    }
  }, [view, destino]);

  async function fetchEscenarios() {
    setLoadingEscenarios(true);
    try {
      let sportName = null;
      
      if (profile?.club_id) {
        const { data: club } = await supabase
          .from('clubes')
          .select('*, deporte:deporte_id(nombre)')
          .eq('id', profile.club_id)
          .single();
        sportName = (club as any)?.deporte?.nombre;
      }

      let query = supabase.from('escenarios').select('*');
      if (sportName) {
        query = query.ilike('deporte', `%${sportName}%`);
      }
      
      const { data } = await query;
      setEscenarios(data || []);
    } catch (err) {
      console.error('Error fetching scenarios:', err);
    } finally {
      setLoadingEscenarios(false);
    }
  }

  const handleCreate = (type: 'club' | 'escenario', id: string, nombre: string) => {
    setDestino({ tipo: type, id, nombre });
    setView('create');
  };

  const handleSelect = (pqrs: PQRS) => {
    setSelectedPQRS(pqrs);
    setView('detail');
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
            <h1 className="text-xl font-bold text-[#182332] dark:text-white tracking-tight">PQRS y Solicitudes</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Preguntas, Quejas, Reclamos y Sugerencias</p>
          </div>
        </div>

        {view === 'list' && (
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
        <PQRSList view="sent" onSelect={handleSelect} />
      )}

      {view === 'create' && !destino && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <button 
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Volver
          </button>
          
          <div className="text-center space-y-2 py-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">¿A quién diriges tu solicitud?</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">Selecciona el destinatario de tu PQRS</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mi Club */}
            {profile?.club_id && (
              <button
                onClick={() => handleCreate('club', profile.club_id!, 'Mi Club')}
                className="group bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-100 dark:border-white/5 p-6 rounded-2xl transition-all text-left space-y-4"
              >
                <div className="w-12 h-12 bg-white dark:bg-black/40 rounded-xl border border-gray-100 dark:border-white/5 flex items-center justify-center text-gray-400 group-hover:text-[var(--primary)] group-hover:scale-110 transition-all">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="text-md font-bold text-gray-900 dark:text-white">Mi Club</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Envía una solicitud administrativa a tu club deportivo.</p>
                </div>
              </button>
            )}

            {/* Escenarios Deportivos */}
            <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 p-6 rounded-2xl space-y-6">
              <div className="flex items-center gap-3">
                <MapPin className="text-[var(--primary)]" size={24} />
                <h3 className="text-md font-bold text-gray-900 dark:text-white">Escenarios</h3>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                {loadingEscenarios ? (
                  [1,2,3].map(i => <div key={i} className="h-12 bg-gray-50 dark:bg-white/5 rounded-xl animate-pulse" />)
                ) : (
                  escenarios.map(esc => (
                    <button
                      key={esc.id}
                      onClick={() => handleCreate('escenario', esc.id, esc.nombre)}
                      className="w-full text-left p-4 bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white transition-all flex items-center justify-between group"
                    >
                      {esc.nombre}
                      <Plus size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'create' && destino && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between">
             <button 
                onClick={() => setDestino(null)}
                className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft size={14} /> Cambiar Destinatario
              </button>
              <div className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-full">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Para: {destino.nombre}</span>
              </div>
          </div>

          <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 p-6 rounded-2xl shadow-sm">
            <PQRSForm 
              destinoTipo={destino.tipo} 
              destinoId={destino.id} 
              onSuccess={() => setView('list')}
              onCancel={() => setDestino(null)}
            />
          </div>
        </div>
      )}

      {view === 'detail' && selectedPQRS && (
        <PQRSDetail 
          pqrs={selectedPQRS} 
          onBack={() => setView('list')} 
          onUpdate={() => {
            setView('list');
          }}
        />
      )}
    </div>
  );
}
