import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { PQRS, TipoPQRS, EstadoPQRS } from '../../types';
import { Badge } from '../ui/Badge';
import { Search, MessageSquare, Clock, FileText, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PQRSListProps {
  view: 'sent' | 'received';
  onSelect: (pqrs: PQRS) => void;
}

const TIPO_LABELS: Record<TipoPQRS, string> = {
  pregunta: 'Pregunta',
  queja: 'Queja',
  reclamo: 'Reclamo',
  sugerencia: 'Sugerencia'
};

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
          const { data: escenarios } = await supabase.from('escenarios').select('id')
            .or(`administrador_id.eq.${profile.id},gestor_id.eq.${profile.id}`);
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
          <div key={i} className="h-24 bg-gray-50 dark:bg-white/5 rounded-2xl animate-pulse border border-gray-100 dark:border-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, descripción o nombre..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182332] transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter.tipo}
            onChange={(e) => setFilter({ ...filter, tipo: e.target.value as any })}
            className="w-full h-[46px] bg-white border border-gray-200 rounded-2xl pl-4 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#182332] appearance-none cursor-pointer"
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
            className="w-full h-[46px] bg-white border border-gray-200 rounded-2xl pl-4 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#182332] appearance-none cursor-pointer"
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
              className="w-full text-left bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-all"
            >
              <div className="p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-gray-50 shrink-0 ${TIPO_COLORS[item.tipo]}`}>
                  <MessageSquare size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.codigo}</span>
                    <Badge variant={ESTADO_BADGES[item.estado].variant} className="text-[8px] px-2 py-0.5 font-bold uppercase">
                      {ESTADO_BADGES[item.estado].label}
                    </Badge>
                  </div>
                  <p className="text-sm font-bold text-[#182332] truncate">
                    {TIPO_LABELS[item.tipo]}: {item.descripcion}
                  </p>
                  <div className="flex items-center gap-4 mt-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {format(new Date(item.created_at), 'dd MMM yyyy, HH:mm', { locale: es })}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText size={10} />
                      {view === 'received' ? item.solicitante_nombre : `Para: ${item.destino_tipo === 'club' ? 'Club' : 'Escenario'}`}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </div>
            </button>
          ))
        ) : (
          <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-16 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">No se encontraron solicitudes</p>
          </div>
        )}
      </div>
    </div>
  );
}
