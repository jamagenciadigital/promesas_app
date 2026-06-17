import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import {
  Search, Trophy, Plus, Pencil, User, GraduationCap, Mail, MapPin,
  Building2, Users, UserPlus, TrendingUp, Eye, XCircle, Shield, Phone
} from 'lucide-react';

interface Liga {
  id: string;
  nombre: string;
  deporte_id: string;
  presidente: string;
  secretario: string;
  direccion: string;
  correo: string;
  telefono: string;
}

interface LigaDetail {
  liga: Liga;
  deporte_nombre: string;
  clubes: number;
  jugadores: number;
  entrenadores: number;
  equipos: number;
  clubes_list: { id: string; nombre: string; pais?: string; ciudad?: string; estado?: string }[];
}

interface GlobalStats {
  clubes: number;
  jugadores: number;
  equipos: number;
  entrenadores: number;
  escenarios: number;
}

export default function EscenarioLigas() {
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [deportes, setDeportes] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<GlobalStats | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form, setForm] = useState({ nombre: '', deporte_id: '', presidente: '', secretario: '', direccion: '', correo: '', telefono: '' });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ nombre: '', deporte_id: '', presidente: '', secretario: '', direccion: '', correo: '', telefono: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const [detailLiga, setDetailLiga] = useState<LigaDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchLigas();
    fetchGlobalStats();
    supabase.from('deportes').select('id, nombre').order('nombre').then(({ data }) => setDeportes(data || []));
  }, []);

  const fetchGlobalStats = async () => {
    const [{ count: clubes }, { count: jugadores }, { count: equipos }, { count: entrenadores }, { count: escenarios }] = await Promise.all([
      supabase.from('clubes').select('*', { count: 'exact', head: true }),
      supabase.from('deportistas').select('*', { count: 'exact', head: true }),
      supabase.from('equipos').select('*', { count: 'exact', head: true }),
      supabase.from('perfiles').select('*', { count: 'exact', head: true }).eq('rol', 'entrenador'),
      supabase.from('escenarios').select('*', { count: 'exact', head: true }),
    ]);
    setStats({
      clubes: clubes ?? 0,
      jugadores: jugadores ?? 0,
      equipos: equipos ?? 0,
      entrenadores: entrenadores ?? 0,
      escenarios: escenarios ?? 0,
    });
  };

  const fetchLigas = async () => {
    setLoading(true);
    const { data } = await supabase.from('ligas').select('*').order('nombre');
    setLigas(data || []);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.deporte_id) return;
    const { error } = await supabase.from('ligas').insert([{
      nombre: form.nombre.trim(), deporte_id: form.deporte_id,
      presidente: form.presidente.trim() || null, secretario: form.secretario.trim() || null,
      direccion: form.direccion.trim() || null, correo: form.correo.trim() || null, telefono: form.telefono.trim() || null,
    }]);
    if (error) { alert(error.message); return; }
    setSuccessMsg(`Liga "${form.nombre}" creada`);
    setIsCreateModalOpen(false);
    setForm({ nombre: '', deporte_id: '', presidente: '', secretario: '', direccion: '', correo: '', telefono: '' });
    fetchLigas();
  };

  const openEdit = (liga: Liga) => {
    setEditForm({ nombre: liga.nombre, deporte_id: liga.deporte_id, presidente: liga.presidente || '', secretario: liga.secretario || '', direccion: liga.direccion || '', correo: liga.correo || '', telefono: liga.telefono || '' });
    setEditingId(liga.id);
    setIsEditModalOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.nombre.trim() || !editForm.deporte_id || !editingId) return;
    const { error } = await supabase.from('ligas').update({
      nombre: editForm.nombre.trim(), deporte_id: editForm.deporte_id,
      presidente: editForm.presidente.trim() || null, secretario: editForm.secretario.trim() || null,
      direccion: editForm.direccion.trim() || null, correo: editForm.correo.trim() || null, telefono: editForm.telefono.trim() || null,
    }).eq('id', editingId);
    if (error) { alert(error.message); return; }
    setSuccessMsg(`Liga "${editForm.nombre}" actualizada`);
    setIsEditModalOpen(false);
    setEditingId(null);
    fetchLigas();
  };

  const openDetail = async (liga: Liga) => {
    setLoadingDetail(true);
    setIsDetailModalOpen(true);
    try {
      const deporteNombre = getDeporteName(liga.deporte_id);

      const { data: clubesData } = await supabase
        .from('clubes')
        .select('id, nombre, pais, ciudad, estado')
        .eq('deporte_id', liga.deporte_id)
        .order('nombre');

      const clubs = clubesData || [];
      const clubIds = clubs.map(c => c.id);

      const [{ count: jugadores }, { count: equipos }, { count: entrenadores }] = await Promise.all([
        clubIds.length > 0
          ? supabase.from('deportistas').select('*', { count: 'exact', head: true }).in('club_id', clubIds)
          : { count: 0 },
        clubIds.length > 0
          ? supabase.from('equipos').select('*', { count: 'exact', head: true }).in('club_id', clubIds)
          : { count: 0 },
        clubIds.length > 0
          ? supabase.from('perfiles').select('*', { count: 'exact', head: true }).in('club_id', clubIds).eq('rol', 'entrenador')
          : { count: 0 },
      ]);

      setDetailLiga({
        liga,
        deporte_nombre: deporteNombre,
        clubes: clubs.length,
        jugadores: jugadores ?? 0,
        entrenadores: entrenadores ?? 0,
        equipos: equipos ?? 0,
        clubes_list: clubs,
      });
    } catch (err) {
      console.error('Error fetching liga detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getDeporteName = (id: string) => deportes.find(d => d.id === id)?.nombre || '—';

  const filtered = ligas.filter(l => l.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-[#182332] to-[#bd0f10] text-white rounded-xl shadow-sm">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#182332] dark:text-white tracking-tight">Ligas</h2>
            <p className="text-xs text-gray-500">Gestiona las ligas registradas en la plataforma.</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-[var(--primary)] text-black hover:brightness-90 font-bold px-5">
          <Plus className="w-4 h-4" />
          <span>NUEVA LIGA</span>
        </Button>
      </div>

      {successMsg && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-xs border border-emerald-100">{successMsg}</div>}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Building2 size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#182332] dark:text-white">{stats.clubes}</p>
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Clubes</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-blue-500">
              <TrendingUp size={11} />
              <span className="text-[8px] font-bold uppercase tracking-wider">registrados</span>
            </div>
          </div>
          <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Users size={18} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#182332] dark:text-white">{stats.jugadores}</p>
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Jugadores</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-purple-500">
              <TrendingUp size={11} />
              <span className="text-[8px] font-bold uppercase tracking-wider">totales</span>
            </div>
          </div>
          <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                <Trophy size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#182332] dark:text-white">{stats.equipos}</p>
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Equipos</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-emerald-500">
              <TrendingUp size={11} />
              <span className="text-[8px] font-bold uppercase tracking-wider">totales</span>
            </div>
          </div>
          <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <UserPlus size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#182332] dark:text-white">{stats.entrenadores}</p>
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Entrenadores</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-amber-500">
              <TrendingUp size={11} />
              <span className="text-[8px] font-bold uppercase tracking-wider">totales</span>
            </div>
          </div>
          <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center">
                <MapPin size={18} className="text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#182332] dark:text-white">{stats.escenarios}</p>
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Escenarios</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-rose-500">
              <TrendingUp size={11} />
              <span className="text-[8px] font-bold uppercase tracking-wider">totales</span>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input type="text" placeholder="Buscar liga..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full h-11 bg-white dark:bg-[#16171b] border border-gray-200 dark:border-white/10 rounded-xl pl-11 pr-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[var(--primary)] transition-all placeholder:text-gray-400" />
      </div>

      {/* Ligas List */}
      {loading ? (
        <div className="grid gap-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-white/5 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
            {search ? 'No hay resultados' : 'No hay ligas registradas'}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {search ? 'Intenta con otro nombre.' : 'Crea la primera liga usando el botón superior.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(liga => (
            <div key={liga.id} className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-5 hover:border-gray-200 dark:hover:border-white/10 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[#182332] dark:text-white">{liga.nombre}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300">
                      {getDeporteName(liga.deporte_id)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
                    {liga.presidente && <span className="flex items-center gap-1"><User className="w-3 h-3" />{liga.presidente}</span>}
                    {liga.secretario && <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{liga.secretario}</span>}
                    {liga.correo && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{liga.correo}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openDetail(liga)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#182332] hover:bg-[#202f43] text-white rounded-xl text-xs font-bold transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver
                  </button>
                  <Button onClick={() => openEdit(liga)} variant="ghost" className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                    <Pencil className="w-3 h-3" /> Editar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detalle Liga */}
      <Modal isOpen={isDetailModalOpen} onClose={() => { setIsDetailModalOpen(false); setDetailLiga(null); }} title={detailLiga?.liga.nombre || 'Liga'} maxWidth="max-w-2xl">
        {loadingDetail ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-wider italic">Cargando detalle...</p>
          </div>
        ) : detailLiga ? (
          <div className="space-y-6">
            {/* Liga Info */}
            <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-5 border border-gray-100 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#182332] to-[#bd0f10] flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {detailLiga.liga.nombre?.charAt(0) || 'L'}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#182332] dark:text-white text-lg">{detailLiga.liga.nombre}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300">
                      {detailLiga.deporte_nombre}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {detailLiga.liga.presidente && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><User className="w-4 h-4 text-gray-400" />{detailLiga.liga.presidente}</div>
                )}
                {detailLiga.liga.secretario && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><GraduationCap className="w-4 h-4 text-gray-400" />{detailLiga.liga.secretario}</div>
                )}
                {detailLiga.liga.correo && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><Mail className="w-4 h-4 text-gray-400" />{detailLiga.liga.correo}</div>
                )}
                {detailLiga.liga.telefono && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><Phone className="w-4 h-4 text-gray-400" />{detailLiga.liga.telefono}</div>
                )}
                {detailLiga.liga.direccion && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><MapPin className="w-4 h-4 text-gray-400" />{detailLiga.liga.direccion}</div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Estadísticas</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 text-center hover:shadow-md transition-shadow">
                  <Building2 className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold text-[#182332] dark:text-white">{detailLiga.clubes}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Clubes</p>
                </div>
                <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 text-center hover:shadow-md transition-shadow">
                  <Users className="w-5 h-5 mx-auto mb-2 text-purple-500" />
                  <p className="text-2xl font-bold text-[#182332] dark:text-white">{detailLiga.jugadores}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Jugadores</p>
                </div>
                <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 text-center hover:shadow-md transition-shadow">
                  <Trophy className="w-5 h-5 mx-auto mb-2 text-emerald-500" />
                  <p className="text-2xl font-bold text-[#182332] dark:text-white">{detailLiga.equipos}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Equipos</p>
                </div>
                <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 text-center hover:shadow-md transition-shadow">
                  <UserPlus className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                  <p className="text-2xl font-bold text-[#182332] dark:text-white">{detailLiga.entrenadores}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Entrenadores</p>
                </div>
              </div>
            </div>

            {/* Clubes List */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Clubes Vinculados</h4>
              {detailLiga.clubes_list.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                  <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-gray-400">No hay clubes vinculados a esta liga</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {detailLiga.clubes_list.map(club => (
                    <div key={club.id} className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 rounded-xl p-3 border border-gray-100 dark:border-white/5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#182332] to-[#bd0f10] flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {club.nombre?.charAt(0) || 'C'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#182332] dark:text-white truncate">{club.nombre}</p>
                        <div className="flex items-center gap-2 text-[9px] text-gray-400">
                          {(club.pais || club.ciudad) && (
                            <span>{[club.ciudad, club.pais].filter(Boolean).join(', ')}</span>
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider ${
                            club.estado === 'activo' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                          }`}>
                            {club.estado || 'activo'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Modal Crear */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Nueva Liga">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider px-1">Deporte</label>
            <select value={form.deporte_id} onChange={(e) => setForm({ ...form, deporte_id: e.target.value })}
              className="w-full h-11 px-4 bg-gray-50 dark:bg-black/40 rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none border border-transparent focus:border-[var(--primary)] transition-all appearance-none" required>
              <option value="" className="bg-white dark:bg-[#16171b]">Seleccionar deporte...</option>
              {deportes.map(d => <option key={d.id} value={d.id} className="bg-white dark:bg-[#16171b]">{d.nombre}</option>)}
            </select>
          </div>
          <Input label="Nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Liga de Baloncesto de Bogotá" className="bg-gray-50 dark:bg-black/40 h-11" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Presidente" value={form.presidente} onChange={(e) => setForm({ ...form, presidente: e.target.value })} placeholder="Nombre" className="bg-gray-50 dark:bg-black/40 h-11" />
            <Input label="Secretario" value={form.secretario} onChange={(e) => setForm({ ...form, secretario: e.target.value })} placeholder="Nombre" className="bg-gray-50 dark:bg-black/40 h-11" />
          </div>
          <Input label="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Calle 123 #45-67" className="bg-gray-50 dark:bg-black/40 h-11" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Correo" type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} placeholder="contacto@liga.com" className="bg-gray-50 dark:bg-black/40 h-11" />
            <Input label="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+57 300 123 4567" className="bg-gray-50 dark:bg-black/40 h-11" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="flex-1 h-11 rounded-xl text-gray-500 font-bold uppercase tracking-wider text-[9px]">Cancelar</Button>
            <Button type="submit" className="flex-[2] h-11 bg-[var(--primary)] text-black font-bold uppercase tracking-wider text-[10px] rounded-xl">Crear Liga</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar */}
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingId(null); }} title="Editar Liga">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider px-1">Deporte</label>
            <select value={editForm.deporte_id} onChange={(e) => setEditForm({ ...editForm, deporte_id: e.target.value })}
              className="w-full h-11 px-4 bg-gray-50 dark:bg-black/40 rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none border border-transparent focus:border-[var(--primary)] transition-all appearance-none" required>
              <option value="" className="bg-white dark:bg-[#16171b]">Seleccionar deporte...</option>
              {deportes.map(d => <option key={d.id} value={d.id} className="bg-white dark:bg-[#16171b]">{d.nombre}</option>)}
            </select>
          </div>
          <Input label="Nombre" required value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} placeholder="Nombre de la liga" className="bg-gray-50 dark:bg-black/40 h-11" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Presidente" value={editForm.presidente} onChange={(e) => setEditForm({ ...editForm, presidente: e.target.value })} placeholder="Nombre" className="bg-gray-50 dark:bg-black/40 h-11" />
            <Input label="Secretario" value={editForm.secretario} onChange={(e) => setEditForm({ ...editForm, secretario: e.target.value })} placeholder="Nombre" className="bg-gray-50 dark:bg-black/40 h-11" />
          </div>
          <Input label="Dirección" value={editForm.direccion} onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })} placeholder="Calle 123 #45-67" className="bg-gray-50 dark:bg-black/40 h-11" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Correo" type="email" value={editForm.correo} onChange={(e) => setEditForm({ ...editForm, correo: e.target.value })} placeholder="contacto@liga.com" className="bg-gray-50 dark:bg-black/40 h-11" />
            <Input label="Teléfono" value={editForm.telefono} onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })} placeholder="+57 300 123 4567" className="bg-gray-50 dark:bg-black/40 h-11" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setIsEditModalOpen(false); setEditingId(null); }} className="flex-1 h-11 rounded-xl text-gray-500 font-bold uppercase tracking-wider text-[9px]">Cancelar</Button>
            <Button type="submit" className="flex-[2] h-11 bg-[var(--primary)] text-black font-bold uppercase tracking-wider text-[10px] rounded-xl">Guardar Cambios</Button>
          </div>
        </form>
      </Modal>

      {successMsg && <Toast message={successMsg} onClose={() => setSuccessMsg(null)} />}
    </div>
  );
}
