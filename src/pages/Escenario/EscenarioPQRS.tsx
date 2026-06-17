import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { PQRS, TipoPQRS, EstadoPQRS } from '../../types';
import PQRSList from '../../components/PQRS/PQRSList';
import PQRSDetail from '../../components/PQRS/PQRSDetail';
import { MessageSquare, AlertCircle, CheckCircle2, Clock, XCircle, HelpCircle, ThumbsDown, ThumbsUp, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';

const TIPO_CONFIG: Record<TipoPQRS, { label: string; icon: React.ElementType; color: string }> = {
  pregunta: { label: 'Preguntas', icon: HelpCircle, color: 'text-blue-500' },
  queja: { label: 'Quejas', icon: ThumbsDown, color: 'text-orange-500' },
  reclamo: { label: 'Reclamos', icon: AlertCircle, color: 'text-red-500' },
  sugerencia: { label: 'Sugerencias', icon: ThumbsUp, color: 'text-emerald-500' }
};

const ESTADO_CONFIG: Record<EstadoPQRS, { label: string; icon: React.ElementType; color: string }> = {
  pendiente: { label: 'Pendientes', icon: Clock, color: 'text-yellow-500' },
  en_revision: { label: 'En Revisión', icon: AlertCircle, color: 'text-blue-500' },
  respondida: { label: 'Respondidas', icon: CheckCircle2, color: 'text-emerald-500' },
  cerrada: { label: 'Cerradas', icon: XCircle, color: 'text-gray-500' }
};

export default function EscenarioPQRS() {
  const { profile } = useAuth();
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedPQRS, setSelectedPQRS] = useState<PQRS | null>(null);
  const [stats, setStats] = useState<{ tipo: Record<string, number>; estado: Record<string, number> }>({
    tipo: { pregunta: 0, queja: 0, reclamo: 0, sugerencia: 0 },
    estado: { pendiente: 0, en_revision: 0, respondida: 0, cerrada: 0 }
  });
  const [key, setKey] = useState(0);

  useEffect(() => {
    fetchStats();
  }, [profile]);

  const getEscenarioIds = async () => {
    if (!profile || (profile.rol !== 'admin_escenario' && profile.rol !== 'escenario_deportivo')) return [];
    const { data } = await supabase.from('escenarios').select('id')
      .or(`administrador_id.eq.${profile.id},gestor_id.eq.${profile.id}`);
    return (data || []).map(e => e.id);
  };

  const fetchStats = async () => {
    const ids = await getEscenarioIds();
    if (ids.length === 0) return;

    const { data } = await supabase
      .from('pqrs')
      .select('tipo, estado')
      .eq('destino_tipo', 'escenario')
      .in('destino_id', ids);

    if (!data) return;

    const tipo: Record<string, number> = { pregunta: 0, queja: 0, reclamo: 0, sugerencia: 0 };
    const estado: Record<string, number> = { pendiente: 0, en_revision: 0, respondida: 0, cerrada: 0 };

    for (const row of data) {
      if (row.tipo in tipo) tipo[row.tipo as string]++;
      if (row.estado in estado) estado[row.estado as string]++;
    }

    setStats({ tipo, estado });
  };

  const handleSelect = (pqrs: PQRS) => {
    setSelectedPQRS(pqrs);
    setView('detail');
  };

  const handleBack = () => {
    setView('list');
    setKey(k => k + 1);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-[#182332] to-[#bd0f10] text-white rounded-xl shadow-sm">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#182332] tracking-tight">PQRS</h2>
            <p className="text-xs text-gray-500">Solicitudes de equipos y deportistas.</p>
          </div>
        </div>
        {view === 'list' && (
          <Button onClick={fetchStats} className="h-10 px-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </Button>
        )}
      </div>

      {view === 'list' ? (
        <>
          {/* Stats by Tipo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(TIPO_CONFIG) as TipoPQRS[]).map((key) => {
              const cfg = TIPO_CONFIG[key];
              const Icon = cfg.icon;
              return (
                <div key={key} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl bg-gray-50 ${cfg.color}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className={`text-lg font-black ${cfg.color}`}>{stats.tipo[key]}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{cfg.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats by Estado */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(ESTADO_CONFIG) as EstadoPQRS[]).map((key) => {
              const cfg = ESTADO_CONFIG[key];
              const Icon = cfg.icon;
              return (
                <div key={key} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl bg-gray-50 ${cfg.color}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className={`text-lg font-black ${cfg.color}`}>{stats.estado[key]}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{cfg.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div key={key}>
            <PQRSList view="received" onSelect={handleSelect} />
          </div>
        </>
      ) : selectedPQRS ? (
        <PQRSDetail 
          pqrs={selectedPQRS} 
          onBack={handleBack} 
          onUpdate={handleBack}
        />
      ) : null}
    </div>
  );
}
