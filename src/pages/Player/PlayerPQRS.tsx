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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#CCFF00]/10 rounded-2xl">
            <MessageSquare className="w-6 h-6 text-[#CCFF00]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tight">PQRS y Solicitudes</h1>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Preguntas, Quejas, Reclamos y Sugerencias</p>
          </div>
        </div>

        {view === 'list' && (
          <Button 
            onClick={() => setView('create')}
            className="bg-[#CCFF00] text-black font-black px-6 h-12 rounded-2xl flex items-center gap-2 border-0 shadow-lg shadow-[#CCFF00]/10 hover:scale-[1.02] transition-transform"
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
            className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-white transition-colors italic"
          >
            <ArrowLeft size={14} /> Volver
          </button>
          
          <div className="text-center space-y-2 py-4">
            <h2 className="text-xl font-black text-white uppercase italic">¿A quién diriges tu solicitud?</h2>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Selecciona el destinatario de tu PQRS</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mi Club */}
            {profile?.club_id && (
              <button
                onClick={() => handleCreate('club', profile.club_id!, 'Mi Club')}
                className="group bg-white/5 hover:bg-[#CCFF00]/10 border border-white/5 hover:border-[#CCFF00]/40 p-8 rounded-[40px] transition-all text-left space-y-4"
              >
                <div className="w-16 h-16 bg-black rounded-[24px] border border-white/10 flex items-center justify-center text-gray-500 group-hover:text-[#CCFF00] group-hover:scale-110 transition-all">
                  <Building2 size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase italic">Mi Club</h3>
                  <p className="text-xs text-gray-400 font-medium">Envía una solicitud administrativa a tu club deportivo.</p>
                </div>
              </button>
            )}

            {/* Escenarios Deportivos */}
            <div className="bg-white/5 border border-white/5 p-8 rounded-[40px] space-y-6">
              <div className="flex items-center gap-3">
                <MapPin className="text-[#CCFF00]" size={24} />
                <h3 className="text-lg font-black text-white uppercase italic">Escenarios</h3>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                {loadingEscenarios ? (
                  [1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)
                ) : (
                  escenarios.map(esc => (
                    <button
                      key={esc.id}
                      onClick={() => handleCreate('escenario', esc.id, esc.nombre)}
                      className="w-full text-left p-4 bg-black/40 hover:bg-[#CCFF00]/10 border border-white/5 hover:border-[#CCFF00]/40 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest italic transition-all flex items-center justify-between group"
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
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between">
             <button 
                onClick={() => setDestino(null)}
                className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-white transition-colors italic"
              >
                <ArrowLeft size={14} /> Cambiar Destinatario
              </button>
              <div className="px-4 py-1.5 bg-[#CCFF00]/10 border border-[#CCFF00]/20 rounded-full">
                <span className="text-[10px] font-black text-[#CCFF00] uppercase italic">Para: {destino.nombre}</span>
              </div>
          </div>

          <div className="bg-white/5 border border-white/5 p-8 rounded-[40px] shadow-2xl">
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
            // Refrescar datos
            setView('list');
          }}
        />
      )}
    </div>
  );
}
