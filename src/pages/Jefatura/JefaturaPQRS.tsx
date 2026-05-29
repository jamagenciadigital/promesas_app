import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  MessageSquare, Search, Building2, RefreshCw,
  AlertCircle, Clock, CheckCircle2, XCircle, Send,
  HelpCircle, ThumbsDown, AlertTriangle, Lightbulb, BarChart3, Trophy
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';

interface PQRSRecord {
  id: string;
  codigo: string;
  solicitante_nombre: string;
  solicitante_email: string;
  tipo: string;
  descripcion: string;
  estado: string;
  destino_id: string;
  respuesta: string | null;
  created_at: string;
  escenarios: { nombre: string } | null;
}

interface Escenario {
  id: string;
  nombre: string;
  deporte_id: string;
}
interface Liga {
  id: string;
  nombre: string;
  deporte_id: string;
}

const ESTADOS = ['pendiente', 'en_revision', 'respondida', 'cerrada'] as const;
const TIPOS = ['pregunta', 'queja', 'reclamo', 'sugerencia'] as const;

export default function JefaturaPQRS() {
  const { user } = useAuth();
  const [pqrsList, setPqrsList] = useState<PQRSRecord[]>([]);
  const [escenarios, setEscenarios] = useState<Escenario[]>([]);
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEscenario, setFilterEscenario] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [filterLiga, setFilterLiga] = useState<string>('all');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Response modal
  const [selectedPqrs, setSelectedPqrs] = useState<PQRSRecord | null>(null);
  const [pqrsResponse, setPqrsResponse] = useState('');
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [responding, setResponding] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: escList } = await supabase.from('escenarios').select('id, nombre, deporte_id').order('nombre');
      setEscenarios(escList || []);

      const { data: ligaList } = await supabase.from('ligas').select('id, nombre, deporte_id').order('nombre');
      setLigas(ligaList || []);

      const { data: pqrs } = await supabase
        .from('pqrs')
        .select('*, escenarios!left(nombre)')
        .eq('destino_tipo', 'escenario')
        .order('created_at', { ascending: false });

      setPqrsList(pqrs || []);
    } catch (err: any) {
      console.error('Error fetching PQRS:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!selectedPqrs || !pqrsResponse.trim() || !user?.id) return;
    setResponding(true);
    try {
      const { error } = await supabase
        .from('pqrs')
        .update({
          respuesta: pqrsResponse,
          estado: 'respondida',
          fecha_respuesta: new Date().toISOString(),
          respondido_por: user.id,
        })
        .eq('id', selectedPqrs.id);

      if (error) throw error;
      setSuccessMsg('PQRS respondida correctamente');
      setIsResponseModalOpen(false);
      setSelectedPqrs(null);
      setPqrsResponse('');
      fetchData();
    } catch (err: any) {
      console.error('Error responding:', err);
      setSuccessMsg('Error al responder: ' + err.message);
    } finally {
      setResponding(false);
    }
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Filter + group (before stats)
  const escenariosWithLigaFilter = filterLiga === 'all'
    ? escenarios
    : escenarios.filter(e => e.deporte_id === ligas.find(l => l.id === filterLiga)?.deporte_id);

  const filtered = pqrsList.filter(p => {
    const matchesSearch = p.codigo.toLowerCase().includes(search.toLowerCase()) ||
                         p.descripcion.toLowerCase().includes(search.toLowerCase()) ||
                         p.solicitante_nombre.toLowerCase().includes(search.toLowerCase());
    const matchesEscenario = filterEscenario === 'all' || p.destino_id === filterEscenario;
    const matchesEstado = filterEstado === 'all' || p.estado === filterEstado;
    const matchesLiga = filterLiga === 'all' || escenariosWithLigaFilter.some(e => e.id === p.destino_id);
    return matchesSearch && matchesEscenario && matchesEstado && matchesLiga;
  });

  // Stats (filtered)
  const total = filtered.length;
  const stats = {
    pendiente: filtered.filter(p => p.estado === 'pendiente').length,
    en_revision: filtered.filter(p => p.estado === 'en_revision').length,
    respondida: filtered.filter(p => p.estado === 'respondida').length,
    cerrada: filtered.filter(p => p.estado === 'cerrada').length,
  };
  const statsByTipo = {
    pregunta: filtered.filter(p => p.tipo === 'pregunta').length,
    queja: filtered.filter(p => p.tipo === 'queja').length,
    reclamo: filtered.filter(p => p.tipo === 'reclamo').length,
    sugerencia: filtered.filter(p => p.tipo === 'sugerencia').length,
  };
  const responseRate = total > 0 ? Math.round(((stats.respondida + stats.cerrada) / total) * 100) : 0;

  const groupedByEscenario: Record<string, PQRSRecord[]> = {};
  filtered.forEach(p => {
    const key = p.destino_id;
    if (!groupedByEscenario[key]) groupedByEscenario[key] = [];
    groupedByEscenario[key].push(p);
  });

  const statCards = [
    { label: 'Total', value: total, color: 'bg-gray-500/10 text-gray-700', icon: MessageSquare },
    { label: 'Pendiente', value: stats.pendiente, color: 'bg-amber-500/10 text-amber-600', icon: AlertCircle },
    { label: 'En Revisión', value: stats.en_revision, color: 'bg-blue-500/10 text-blue-600', icon: Clock },
    { label: 'Respondida', value: stats.respondida, color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle2 },
    { label: 'Cerrada', value: stats.cerrada, color: 'bg-gray-400/10 text-gray-500', icon: XCircle },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      {successMsg && (
        <div className={`p-4 rounded-2xl text-xs border font-bold ${successMsg.includes('Error') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
          {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-[#182332] to-[#bd0f10] text-white rounded-xl shadow-sm">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#182332] tracking-tight">PQRS</h2>
            <p className="text-xs text-gray-500">Peticiones, Quejas, Reclamos y Sugerencias recibidas.</p>
          </div>
        </div>
        <Button onClick={fetchData} className="h-10 px-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</span>
                <div className={`p-1.5 rounded-lg ${s.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-2xl font-black text-[#182332]">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Tipo Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Preguntas', value: statsByTipo.pregunta, color: 'bg-sky-500/10 text-sky-600', icon: HelpCircle },
          { label: 'Quejas', value: statsByTipo.queja, color: 'bg-red-500/10 text-red-600', icon: ThumbsDown },
          { label: 'Reclamos', value: statsByTipo.reclamo, color: 'bg-orange-500/10 text-orange-600', icon: AlertTriangle },
          { label: 'Sugerencias', value: statsByTipo.sugerencia, color: 'bg-violet-500/10 text-violet-600', icon: Lightbulb },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</span>
                <div className={`p-1.5 rounded-lg ${s.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl font-black text-[#182332]">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Per-escenario breakdown table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-[#182332]" />
          <h3 className="text-xs font-bold text-[#182332] uppercase tracking-wider">Resumen por escenario</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-4 font-bold text-gray-400 uppercase tracking-wider">Escenario</th>
                <th className="text-center py-2 px-2 font-bold text-amber-600 uppercase tracking-wider">Pte.</th>
                <th className="text-center py-2 px-2 font-bold text-blue-600 uppercase tracking-wider">Rev.</th>
                <th className="text-center py-2 px-2 font-bold text-emerald-600 uppercase tracking-wider">Resp.</th>
                <th className="text-center py-2 px-2 font-bold text-gray-500 uppercase tracking-wider">Cerr.</th>
                <th className="text-center py-2 pl-2 font-bold text-[#182332] uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              {escenarios.filter(e => filterLiga === 'all' || e.deporte_id === ligas.find(l => l.id === filterLiga)?.deporte_id).map(esc => {
                const escPqrs = pqrsList.filter(p => p.destino_id === esc.id);
                if (escPqrs.length === 0) return null;
                return (
                  <tr key={esc.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-all">
                    <td className="py-2 pr-4 font-bold text-[#182332]">{esc.nombre}</td>
                    <td className="text-center py-2 px-2 font-bold text-amber-600">{escPqrs.filter(p => p.estado === 'pendiente').length}</td>
                    <td className="text-center py-2 px-2 font-bold text-blue-600">{escPqrs.filter(p => p.estado === 'en_revision').length}</td>
                    <td className="text-center py-2 px-2 font-bold text-emerald-600">{escPqrs.filter(p => p.estado === 'respondida').length}</td>
                    <td className="text-center py-2 px-2 font-bold text-gray-500">{escPqrs.filter(p => p.estado === 'cerrada').length}</td>
                    <td className="text-center py-2 pl-2 font-bold text-[#182332]">{escPqrs.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, descripción o solicitante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182332] transition-all"
          />
        </div>
        <div className="relative min-w-[180px]">
          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <select
            value={filterEscenario}
            onChange={(e) => setFilterEscenario(e.target.value)}
            className="w-full h-[46px] bg-white border border-gray-200 rounded-2xl pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#182332] appearance-none cursor-pointer"
          >
            <option value="all">Todos los escenarios</option>
            {escenarios.map(e => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>
        <div className="relative min-w-[150px]">
          <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <select
            value={filterLiga}
            onChange={(e) => { setFilterLiga(e.target.value); setFilterEscenario('all'); }}
            className="w-full h-[46px] bg-white border border-gray-200 rounded-2xl pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#182332] appearance-none cursor-pointer"
          >
            <option value="all">Todas las ligas</option>
            {ligas.map(l => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>
        </div>
        <div className="relative min-w-[150px]">
          <AlertCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="w-full h-[46px] bg-white border border-gray-200 rounded-2xl pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#182332] appearance-none cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            {ESTADOS.map(e => (
              <option key={e} value={e}>{e.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* PQRS grouped by escenario */}
      {loading ? (
        <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#182332]" />
          <p className="italic">Cargando PQRS...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-2xl">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-400">No hay PQRS con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByEscenario).map(([escId, items]) => {
            const escName = escenarios.find(e => e.id === escId)?.nombre || 'Escenario';
            return (
              <div key={escId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#182332]" />
                    <h3 className="font-bold text-[#182332]">{escName}</h3>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">{items.length} PQRS</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {items.map(p => (
                    <div key={p.id} className="px-5 py-4 hover:bg-gray-50/50 transition-all">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{p.codigo}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                              p.estado === 'pendiente' ? 'bg-amber-500/10 text-amber-600' :
                              p.estado === 'en_revision' ? 'bg-blue-500/10 text-blue-600' :
                              p.estado === 'respondida' ? 'bg-emerald-500/10 text-emerald-600' :
                              'bg-gray-500/10 text-gray-500'
                            }`}>
                              {p.estado.replace('_', ' ')}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600">
                              {p.tipo}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-[#182332] truncate">"{p.descripcion}"</p>
                          <div className="flex items-center gap-3 text-[10px] text-gray-400">
                            <span>{p.solicitante_nombre}</span>
                            <span>{new Date(p.created_at).toLocaleDateString()}</span>
                          </div>
                          {p.respuesta && (
                            <div className="mt-1.5 pl-3 border-l-2 border-emerald-300">
                              <p className="text-[11px] text-gray-500 italic">Respuesta: {p.respuesta}</p>
                            </div>
                          )}
                        </div>
                        {p.estado !== 'respondida' && p.estado !== 'cerrada' && (
                          <button
                            onClick={() => { setSelectedPqrs(p); setPqrsResponse(p.respuesta || ''); setIsResponseModalOpen(true); }}
                            className="shrink-0 px-4 py-2 bg-[#182332] hover:bg-[#E30613] text-white rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5"
                          >
                            <Send className="w-3 h-3" />
                            Responder
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Response Modal */}
      <Modal isOpen={isResponseModalOpen} onClose={() => { setIsResponseModalOpen(false); setSelectedPqrs(null); }} title="Responder PQRS" maxWidth="max-w-lg">
        {selectedPqrs && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <span>{selectedPqrs.codigo}</span>
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${
                  selectedPqrs.estado === 'pendiente' ? 'bg-amber-500/10 text-amber-600' :
                  selectedPqrs.estado === 'en_revision' ? 'bg-blue-500/10 text-blue-600' : ''
                }`}>
                  {selectedPqrs.estado.replace('_', ' ')}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">{selectedPqrs.tipo}</span>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Solicitante</p>
                <p className="text-sm font-bold text-[#182332]">{selectedPqrs.solicitante_nombre}</p>
                {selectedPqrs.solicitante_email && (
                  <p className="text-[11px] text-gray-500">{selectedPqrs.solicitante_email}</p>
                )}
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Descripción</p>
                <p className="text-sm text-gray-700 italic">"{selectedPqrs.descripcion}"</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">Tu Respuesta</label>
              <textarea
                value={pqrsResponse}
                onChange={(e) => setPqrsResponse(e.target.value)}
                className="w-full h-32 p-4 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#182332] transition-all resize-none"
                placeholder="Escribe aquí la respuesta..."
              />
            </div>

            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <Button type="button" variant="ghost" onClick={() => { setIsResponseModalOpen(false); setSelectedPqrs(null); }} className="flex-1 h-12 rounded-xl font-bold text-gray-500">
                Cancelar
              </Button>
              <Button
                isLoading={responding}
                disabled={!pqrsResponse.trim()}
                onClick={handleRespond}
                className="flex-[2] h-12 bg-black text-white font-bold rounded-xl hover:bg-black/90 transition-all"
              >
                Enviar Respuesta
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
