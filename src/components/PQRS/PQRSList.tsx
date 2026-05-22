import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { PQRS, TipoPQRS, EstadoPQRS } from '../../types';
import { Badge } from '../ui/Badge';
import { Search, Filter, MessageSquare, Clock, CheckCircle2, XCircle, FileText, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PQRSListProps {
  view: 'sent' | 'received';
  onSelect: (pqrs: PQRS) => void;
}

const ESTADO_BADGES: Record<EstadoPQRS, { variant: any, label: string }> = {
  pendiente: { variant: 'warning', label: 'Pendiente' },
  en_revision: { variant: 'info', label: 'En Revisión' },
  respondida: { variant: 'success', label: 'Respondida' },
  cerrada: { variant: 'default', label: 'Cerrada' }
};

const TIPO_COLORS: Record<TipoPQRS, string> = {
  pregunta: 'text-blue-500',
  queja: 'text-orange-500',
  reclamo: 'text-red-500',
  sugerencia: 'text-emerald-500'
};

export default function PQRSList({ view, onSelect }: PQRSListProps) {
  const { profile } = useAuth();
  const [items, setItems] = useState<PQRS[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    search: '',
    tipo: '' as TipoPQRS | '',
    estado: '' as EstadoPQRS | ''
  });

  useEffect(() => {
    fetchPQRS();
  }, [profile, view, filter.tipo, filter.estado]);

  async function fetchPQRS() {
    if (!profile) return;
    try {
      setLoading(true);
      let query = supabase.from('pqrs').select('*').order('created_at', { ascending: false });

      if (view === 'sent') {
        query = query.eq('solicitante_id', profile.id);
      } else {
        if (profile.rol === 'admin_club' || profile.rol === 'superadmin') {
          query = query.eq('destino_tipo', 'club').eq('destino_id', profile.club_id);
        } else if (profile.rol === 'admin_escenario' || profile.rol === 'escenario_deportivo') {
          // Necesitaríamos el ID del escenario asociado al usuario. 
          // Asumiremos que el administrador_id del escenario es auth.uid()
          const { data: escenarios } = await supabase.from('escenarios').select('id').eq('administrador_id', profile.id);
          const ids = escenarios?.map(e => e.id) || [];
          query = query.eq('destino_tipo', 'escenario').in('destino_id', ids);
        }
      }

      if (filter.tipo) query = query.eq('tipo', filter.tipo);
      if (filter.estado) query = query.eq('estado', filter.estado);

      const { data, error } = await query;
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching PQRS:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = items.filter(item => 
    item.codigo.toLowerCase().includes(filter.search.toLowerCase()) ||
    item.descripcion.toLowerCase().includes(filter.search.toLowerCase()) ||
    item.solicitante_nombre.toLowerCase().includes(filter.search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-white/5 rounded-3xl animate-pulse border border-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por código, descripción o nombre..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-club-primary/40 transition-all font-medium"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter.tipo}
            onChange={(e) => setFilter({ ...filter, tipo: e.target.value as any })}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest outline-none"
          >
            <option value="">Todos los Tipos</option>
            <option value="pregunta">Preguntas</option>
            <option value="queja">Quejas</option>
            <option value="reclamo">Reclamos</option>
            <option value="sugerencia">Sugerencias</option>
          </select>
          <select
            value={filter.estado}
            onChange={(e) => setFilter({ ...filter, estado: e.target.value as any })}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest outline-none"
          >
            <option value="">Todos los Estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="en_revision">En Revisión</option>
            <option value="respondida">Respondidas</option>
            <option value="cerrada">Cerradas</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full text-left group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-club-primary/20 p-5 rounded-[32px] transition-all flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`p-3 rounded-2xl bg-black border border-white/10 ${TIPO_COLORS[item.tipo]}`}>
                  <MessageSquare size={20} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">{item.codigo}</span>
                    <Badge variant={ESTADO_BADGES[item.estado].variant} className="text-[8px] px-2 py-0.5">
                      {ESTADO_BADGES[item.estado].label}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-club-primary transition-colors uppercase italic">
                    {item.tipo}: {item.descripcion}
                  </h4>
                  <div className="flex items-center gap-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {format(new Date(item.created_at), 'dd MMM yyyy, HH:mm', { locale: es })}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText size={10} />
                      {view === 'received' ? item.solicitante_nombre : `Para: ${item.destino_tipo}`}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="text-gray-600 group-hover:text-club-primary group-hover:translate-x-1 transition-all" />
            </button>
          ))
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-6 bg-white/5 rounded-full">
              <MessageSquare className="w-10 h-10 text-gray-700" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">No se encontraron solicitudes</p>
              <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-1">Intenta ajustar los filtros de búsqueda</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
