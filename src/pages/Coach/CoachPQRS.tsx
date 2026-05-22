import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { PQRS } from '../../types';
import PQRSList from '../../components/PQRS/PQRSList';
import PQRSForm from '../../components/PQRS/PQRSForm';
import PQRSDetail from '../../components/PQRS/PQRSDetail';
import { Button } from '../../components/ui/Button';
import { Plus, MapPin, MessageSquare, ArrowLeft } from 'lucide-react';

export default function CoachPQRS() {
  const { profile } = useAuth();
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

  const handleCreate = (id: string, nombre: string) => {
    setDestino({ tipo: 'escenario', id, nombre });
    setView('create');
  };

  const handleSelect = (pqrs: PQRS) => {
    setSelectedPQRS(pqrs);
    setView('detail');
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-club-primary/10 rounded-2xl">
            <MessageSquare className="w-6 h-6 text-club-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tight">PQRS a Escenarios</h1>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Gestiona tus solicitudes a escenarios deportivos</p>
          </div>
        </div>

        {view === 'list' && (
          <Button 
            onClick={() => setView('create')}
            className="bg-club-primary text-black font-black px-6 h-12 rounded-2xl flex items-center gap-2 border-0 shadow-lg"
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
          <button onClick={() => setView('list')} className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-white transition-colors italic">
            <ArrowLeft size={14} /> Volver
          </button>
          
          <div className="bg-white/5 border border-white/5 p-8 rounded-[40px] space-y-6">
            <div className="flex items-center gap-3">
              <MapPin className="text-club-primary" size={24} />
              <h3 className="text-lg font-black text-white uppercase italic">Seleccionar Escenario</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingEscenarios ? (
                [1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />)
              ) : (
                escenarios.map(esc => (
                  <button
                    key={esc.id}
                    onClick={() => handleCreate(esc.id, esc.nombre)}
                    className="text-left p-6 bg-black/40 hover:bg-club-primary/10 border border-white/5 hover:border-club-primary/40 rounded-3xl transition-all group"
                  >
                    <p className="text-sm font-black text-white uppercase italic group-hover:text-club-primary transition-colors">{esc.nombre}</p>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">{esc.deporte || 'Deporte no especificado'}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'create' && destino && (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95">
          <button onClick={() => setDestino(null)} className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-white transition-colors italic">
            <ArrowLeft size={14} /> Cambiar Escenario
          </button>
          <div className="bg-white/5 border border-white/5 p-8 rounded-[40px]">
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
