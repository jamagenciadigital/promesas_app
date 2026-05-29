import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import {
  Search, Trophy, Plus, RefreshCw, Eye, Shield, MapPin, Mail, Phone,
  Users, UserPlus, Building2, User, GraduationCap, ChevronDown, ChevronRight, Pencil
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
  created_at: string;
}

type DetailTab = 'clubes' | 'jugadores' | 'entrenadores' | 'padres' | 'escenarios';

export default function JefaturaLigas() {
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [filtered, setFiltered] = useState<Liga[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deportes, setDeportes] = useState<{ id: string; nombre: string }[]>([]);
  const [form, setForm] = useState({
    nombre: '',
    deporte_id: '',
    presidente: '',
    secretario: '',
    direccion: '',
    correo: '',
    telefono: '',
  });

  const [detailLiga, setDetailLiga] = useState<Liga | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('clubes');
  const [detailData, setDetailData] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [clubNames, setClubNames] = useState<Record<string, string>>({});

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre: '',
    deporte_id: '',
    presidente: '',
    secretario: '',
    direccion: '',
    correo: '',
    telefono: '',
  });
  const [editingLigaId, setEditingLigaId] = useState<string | null>(null);

  useEffect(() => {
    fetchLigas();
    fetchDeportes();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      ligas.filter(l => l.nombre.toLowerCase().includes(q))
    );
  }, [search, ligas]);

  const fetchLigas = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('ligas')
        .select('*')
        .order('nombre');
      if (error) throw error;
      setLigas(data || []);
    } catch (err: any) {
      console.error('Error fetching ligas:', err);
      setError(err.message || 'Error al cargar ligas.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeportes = async () => {
    const { data } = await supabase.from('deportes').select('id, nombre').order('nombre');
    setDeportes(data || []);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.deporte_id) return;

    try {
      const { error } = await supabase.from('ligas').insert([{
        nombre: form.nombre.trim(),
        deporte_id: form.deporte_id,
        presidente: form.presidente.trim() || null,
        secretario: form.secretario.trim() || null,
        direccion: form.direccion.trim() || null,
        correo: form.correo.trim() || null,
        telefono: form.telefono.trim() || null,
      }]);
      if (error) throw error;

      setSuccessMsg(`Liga "${form.nombre}" creada.`);
      setIsCreateModalOpen(false);
      setForm({ nombre: '', deporte_id: '', presidente: '', secretario: '', direccion: '', correo: '', telefono: '' });
      fetchLigas();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Error creating liga:', err);
      setError(err.message || 'Error al crear liga.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const openEdit = (liga: Liga) => {
    setEditForm({
      nombre: liga.nombre,
      deporte_id: liga.deporte_id,
      presidente: liga.presidente || '',
      secretario: liga.secretario || '',
      direccion: liga.direccion || '',
      correo: liga.correo || '',
      telefono: liga.telefono || '',
    });
    setEditingLigaId(liga.id);
    setIsEditModalOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.nombre.trim() || !editForm.deporte_id || !editingLigaId) return;

    try {
      const { error } = await supabase.from('ligas').update({
        nombre: editForm.nombre.trim(),
        deporte_id: editForm.deporte_id,
        presidente: editForm.presidente.trim() || null,
        secretario: editForm.secretario.trim() || null,
        direccion: editForm.direccion.trim() || null,
        correo: editForm.correo.trim() || null,
        telefono: editForm.telefono.trim() || null,
      }).eq('id', editingLigaId);
      if (error) throw error;

      setSuccessMsg(`Liga "${editForm.nombre}" actualizada.`);
      setIsEditModalOpen(false);
      setEditingLigaId(null);
      fetchLigas();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Error updating liga:', err);
      setError(err.message || 'Error al actualizar liga.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const openDetail = async (liga: Liga) => {
    setDetailLiga(liga);
    setIsDetailModalOpen(true);
    setDetailTab('clubes');
    const { data: clubes } = await supabase
      .from('clubes')
      .select('id, nombre')
      .eq('deporte_id', liga.deporte_id);
    const map: Record<string, string> = {};
    (clubes || []).forEach(c => { map[c.id] = c.nombre; });
    setClubNames(map);
    await loadDetailTab('clubes', liga);
  };

  const loadDetailTab = async (tab: DetailTab, liga: Liga) => {
    if (!liga) return;
    setLoadingDetail(true);
    try {
      let data: any[] = [];
      if (tab === 'clubes') {
        const { data: clubes } = await supabase
          .from('clubes')
          .select('id, nombre, pais, ciudad, email_corporativo, telefono, estado')
          .eq('deporte_id', liga.deporte_id)
          .order('nombre');
        data = clubes || [];
      } else if (tab === 'jugadores') {
        const { data: clubes } = await supabase
          .from('clubes')
          .select('id')
          .eq('deporte_id', liga.deporte_id);
        const clubIds = (clubes || []).map(c => c.id);
        if (clubIds.length > 0) {
          const { data: jugadores } = await supabase
            .from('deportistas')
            .select('id, nombre_completo, apellidos, numero_documento, email_deportista, celular_deportista, club_id')
            .in('club_id', clubIds)
            .order('nombre_completo');
          data = jugadores || [];
        }
      } else if (tab === 'entrenadores') {
        const { data: clubes } = await supabase
          .from('clubes')
          .select('id')
          .eq('deporte_id', liga.deporte_id);
        const clubIds = (clubes || []).map(c => c.id);
        if (clubIds.length > 0) {
          const { data: entrenadores } = await supabase
            .from('perfiles')
            .select('id, nombre, apellido, email, telefono, club_id')
            .in('club_id', clubIds)
            .eq('rol', 'entrenador')
            .order('nombre');
          data = entrenadores || [];
        }
      } else if (tab === 'padres') {
        const { data: clubes } = await supabase
          .from('clubes')
          .select('id')
          .eq('deporte_id', liga.deporte_id);
        const clubIds = (clubes || []).map(c => c.id);
        if (clubIds.length > 0) {
          const { data: padres } = await supabase
            .from('perfiles')
            .select('id, nombre, apellido, email, telefono, club_id')
            .in('club_id', clubIds)
            .eq('rol', 'padre')
            .order('nombre');
          data = padres || [];
        }
      } else if (tab === 'escenarios') {
        const { data: escenarios } = await supabase
          .from('escenarios')
          .select('id, nombre, direccion, telefono, correo')
          .eq('deporte_id', liga.deporte_id)
          .order('nombre');
        data = escenarios || [];
      }
      setDetailData(data);
    } catch (err: any) {
      console.error('Error loading detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const switchDetailTab = async (tab: DetailTab) => {
    setDetailTab(tab);
    if (detailLiga) await loadDetailTab(tab, detailLiga);
  };

  const getDeporteName = (deporteId: string) => {
    return deportes.find(d => d.id === deporteId)?.nombre || '—';
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-[#182332] to-[#bd0f10] text-white rounded-xl shadow-sm">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#182332] tracking-tight">Ligas</h2>
            <p className="text-xs text-gray-500">Gestiona las ligas registradas en la plataforma.</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-black text-white hover:bg-black/90 rounded-xl font-bold px-5">
          <Plus className="h-4 w-4" />
          <span>CREAR LIGA</span>
        </Button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs border border-red-100">{error}</div>}
      {successMsg && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-xs border border-emerald-100">{successMsg}</div>}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar liga por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182332] transition-all"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#182332]" />
          <p className="italic">Cargando ligas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-2xl">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-400">{search ? 'No se encontraron ligas con ese nombre.' : 'No hay ligas registradas.'}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(liga => (
            <div key={liga.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[#182332]">{liga.nombre}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">
                      {getDeporteName(liga.deporte_id)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {liga.presidente && (
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />Pres: {liga.presidente}</span>
                    )}
                    {liga.secretario && (
                      <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />Sec: {liga.secretario}</span>
                    )}
                    {liga.correo && (
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{liga.correo}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(liga)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => openDetail(liga)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#182332] hover:bg-[#202f43] text-white rounded-xl text-xs font-bold transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver ficha
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detalle Liga */}
      <Modal isOpen={isDetailModalOpen} onClose={() => { setIsDetailModalOpen(false); setDetailLiga(null); setDetailData([]); }} title={detailLiga?.nombre || 'Liga'} maxWidth="max-w-3xl">
        {detailLiga && (
          <div className="space-y-6">
            {/* Info de la Liga */}
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-5 border border-purple-100 space-y-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-purple-500 text-white">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#182332] text-lg">{detailLiga.nombre}</h3>
                  <span className="text-xs text-purple-600 font-semibold">{getDeporteName(detailLiga.deporte_id)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {detailLiga.presidente && (
                  <div className="flex items-center gap-2 text-gray-600"><User className="w-4 h-4 text-gray-400" /><span className="font-medium text-gray-700">Presidente:</span> {detailLiga.presidente}</div>
                )}
                {detailLiga.secretario && (
                  <div className="flex items-center gap-2 text-gray-600"><GraduationCap className="w-4 h-4 text-gray-400" /><span className="font-medium text-gray-700">Secretario:</span> {detailLiga.secretario}</div>
                )}
                {detailLiga.direccion && (
                  <div className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4 text-gray-400" />{detailLiga.direccion}</div>
                )}
                {detailLiga.correo && (
                  <div className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4 text-gray-400" />{detailLiga.correo}</div>
                )}
                {detailLiga.telefono && (
                  <div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4 text-gray-400" />{detailLiga.telefono}</div>
                )}
              </div>
            </div>

            {/* Tabs: Clubes / Jugadores / Entrenadores / Padres */}
            <div>
              <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
                {([
                  { key: 'clubes', label: 'Clubes', icon: Building2 },
                  { key: 'jugadores', label: 'Jugadores', icon: Users },
                  { key: 'entrenadores', label: 'Entrenadores', icon: UserPlus },
                  { key: 'padres', label: 'Padres', icon: User },
                  { key: 'escenarios', label: 'Escenarios', icon: MapPin },
                ] as { key: DetailTab; label: string; icon: any }[]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => switchDetailTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all rounded-t-lg border-b-2 ${
                      detailTab === tab.key
                        ? 'text-purple-700 border-purple-500 bg-purple-50/50'
                        : 'text-gray-400 border-transparent hover:text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {loadingDetail ? (
                <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#182332]" />
                  <p className="italic text-xs">Cargando...</p>
                </div>
              ) : detailData.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-xs text-gray-400">No hay {detailTab === 'clubes' ? 'clubes' : detailTab === 'jugadores' ? 'jugadores' : detailTab === 'entrenadores' ? 'entrenadores' : detailTab === 'padres' ? 'padres' : 'escenarios'} registrados en este deporte.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {detailData.map((item: any) => (
                    <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-[#182332] text-sm">
                            {detailTab === 'escenarios' ? item.nombre : item.nombre_completo ? `${item.nombre_completo} ${item.apellidos || ''}` : item.nombre ? `${item.nombre} ${item.apellido || ''}` : item.nombre}
                          </p>
                          {detailTab === 'clubes' && (item.pais || item.ciudad) ? (
                            <p className="text-xs text-gray-400">{[item.ciudad, item.pais].filter(Boolean).join(', ')}</p>
                          ) : detailTab === 'escenarios' ? (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-400">
                              {item.direccion && <span>{item.direccion}</span>}
                              {item.correo && <span>{item.correo}</span>}
                              {item.telefono && <span>{item.telefono}</span>}
                            </div>
                          ) : clubNames[item.club_id] ? (
                            <p className="text-xs text-gray-400">{clubNames[item.club_id]}</p>
                          ) : null}
                          {detailTab === 'clubes' && (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-400">
                              {item.email_corporativo && <span>{item.email_corporativo}</span>}
                              {item.telefono && <span>{item.telefono}</span>}
                            </div>
                          )}
                          {(detailTab === 'jugadores' || detailTab === 'entrenadores' || detailTab === 'padres') && (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-400">
                              {item.email && <span>{item.email}</span>}
                              {item.email_deportista && <span>{item.email_deportista}</span>}
                              {item.telefono && <span>{item.telefono}</span>}
                              {item.celular_deportista && <span>{item.celular_deportista}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Crear Liga */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="CREAR LIGA" maxWidth="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deporte *</label>
            <select
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white border px-3 py-2"
              value={form.deporte_id}
              onChange={(e) => setForm({ ...form, deporte_id: e.target.value })}
              required
            >
              <option value="">Seleccione un deporte...</option>
              {deportes.map(d => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
          </div>

          <Input
            label="Nombre de la Liga *"
            placeholder="Ej. Liga de Baloncesto de Bogotá"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre del Presidente"
              placeholder="Nombre completo"
              value={form.presidente}
              onChange={(e) => setForm({ ...form, presidente: e.target.value })}
            />
            <Input
              label="Nombre del Secretario"
              placeholder="Nombre completo"
              value={form.secretario}
              onChange={(e) => setForm({ ...form, secretario: e.target.value })}
            />
          </div>

          <Input
            label="Dirección"
            placeholder="Calle 123 #45-67"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Correo Electrónico"
              placeholder="contacto@liga.com"
              type="email"
              value={form.correo}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
            />
            <Input
              label="Teléfono"
              placeholder="+57 300 123 4567"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="bg-black text-white hover:bg-black/90 rounded-xl font-bold px-5">Crear Liga</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Liga */}
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingLigaId(null); }} title="EDITAR LIGA" maxWidth="max-w-xl">
        <form onSubmit={handleEdit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deporte *</label>
            <select
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white border px-3 py-2"
              value={editForm.deporte_id}
              onChange={(e) => setEditForm({ ...editForm, deporte_id: e.target.value })}
              required
            >
              <option value="">Seleccione un deporte...</option>
              {deportes.map(d => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
          </div>

          <Input
            label="Nombre de la Liga *"
            placeholder="Ej. Liga de Baloncesto de Bogotá"
            value={editForm.nombre}
            onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre del Presidente"
              placeholder="Nombre completo"
              value={editForm.presidente}
              onChange={(e) => setEditForm({ ...editForm, presidente: e.target.value })}
            />
            <Input
              label="Nombre del Secretario"
              placeholder="Nombre completo"
              value={editForm.secretario}
              onChange={(e) => setEditForm({ ...editForm, secretario: e.target.value })}
            />
          </div>

          <Input
            label="Dirección"
            placeholder="Calle 123 #45-67"
            value={editForm.direccion}
            onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Correo Electrónico"
              placeholder="contacto@liga.com"
              type="email"
              value={editForm.correo}
              onChange={(e) => setEditForm({ ...editForm, correo: e.target.value })}
            />
            <Input
              label="Teléfono"
              placeholder="+57 300 123 4567"
              value={editForm.telefono}
              onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => { setIsEditModalOpen(false); setEditingLigaId(null); }}>Cancelar</Button>
            <Button type="submit" className="bg-black text-white hover:bg-black/90 rounded-xl font-bold px-5">Guardar Cambios</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
