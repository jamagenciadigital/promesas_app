import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import {
  Search, Building2, Plus, RefreshCw, Globe, MapPin, Mail, Phone, Shield,
  Eye, Users, Trophy, UserPlus, Calendar, FileText, ExternalLink, Pencil
} from 'lucide-react';

interface ClubRow {
  id: string;
  nombre: string;
  pais?: string;
  ciudad?: string;
  direccion?: string;
  email_corporativo?: string;
  telefono?: string;
  website?: string;
  estado?: string;
  deporte_id?: string;
  reconocimiento_deportivo_url?: string;
  documento_representante_url?: string;
  deportes?: { nombre: string } | { nombre: string }[] | null;
}

interface ClubDetail {
  id: string;
  nombre: string;
  pais?: string;
  ciudad?: string;
  direccion?: string;
  email_corporativo?: string;
  telefono?: string;
  website?: string;
  estado?: string;
  deporte_nombre?: string;
  reconocimiento_deportivo_url?: string;
  documento_representante_url?: string;
  jugadores: number;
  equipos: number;
  entrenadores: number;
  reservas: number;
}

export default function LigaClubes() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clubes, setClubes] = useState<ClubRow[]>([]);
  const [filtered, setFiltered] = useState<ClubRow[]>([]);
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [liga, setLiga] = useState<{ nombre: string; deporte_id: string; deportes?: { nombre: string } } | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form, setForm] = useState({
    nombre: '', pais: '', ciudad: '', direccion: '',
    telefono: '', email_corporativo: '', website: '',
    reconocimiento_deportivo_url: '', documento_representante_url: '',
  });

  const [detailClub, setDetailClub] = useState<ClubDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre: '', pais: '', ciudad: '', direccion: '',
    telefono: '', email_corporativo: '', website: '',
  });
  const [editingClubId, setEditingClubId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.liga_id) fetchData();
    else setLoading(false);
  }, [profile?.liga_id]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(clubes.filter(c => c.nombre.toLowerCase().includes(q)));
  }, [search, clubes]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: ligaData } = await supabase
        .from('ligas')
        .select('nombre, deporte_id, deportes(nombre)')
        .eq('id', profile!.liga_id)
        .single();

      if (!ligaData) throw new Error('Liga no encontrada');
      const deporteNombre = (ligaData as any).deportes?.nombre;
      setLiga({ nombre: ligaData.nombre, deporte_id: ligaData.deporte_id, deportes: { nombre: deporteNombre } });

      const { data, error } = await supabase
        .from('clubes')
        .select('id, nombre, pais, ciudad, direccion, email_corporativo, telefono, website, estado, deporte_id, reconocimiento_deportivo_url, documento_representante_url, deportes(nombre)')
        .eq('deporte_id', ligaData.deporte_id)
        .order('nombre');

      if (error) throw error;
      setClubes(data || []);
    } catch (err: any) {
      console.error('Error fetching clubes:', err);
      setError(err.message || 'Error al cargar clubes.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !liga?.deporte_id) return;

    try {
      const { error } = await supabase.from('clubes').insert([{
        nombre: form.nombre.trim(),
        deporte_id: liga.deporte_id,
        pais: form.pais.trim() || null,
        ciudad: form.ciudad.trim() || null,
        direccion: form.direccion.trim() || null,
        telefono: form.telefono.trim() || null,
        email_corporativo: form.email_corporativo.trim() || null,
        website: form.website.trim() || null,
        reconocimiento_deportivo_url: form.reconocimiento_deportivo_url || null,
        documento_representante_url: form.documento_representante_url || null,
      }]);
      if (error) throw error;

      setSuccessMsg(`Club "${form.nombre}" creado.`);
      setIsCreateModalOpen(false);
      setForm({ nombre: '', pais: '', ciudad: '', direccion: '', telefono: '', email_corporativo: '', website: '', reconocimiento_deportivo_url: '', documento_representante_url: '' });
      fetchData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Error creating club:', err);
      setError(err.message || 'Error al crear club.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const openEdit = (club: ClubRow) => {
    setEditForm({
      nombre: club.nombre,
      pais: club.pais || '',
      ciudad: club.ciudad || '',
      direccion: club.direccion || '',
      telefono: club.telefono || '',
      email_corporativo: club.email_corporativo || '',
      website: club.website || '',
    });
    setEditingClubId(club.id);
    setIsEditModalOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.nombre.trim() || !editingClubId) return;

    try {
      const { error } = await supabase.from('clubes').update({
        nombre: editForm.nombre.trim(),
        pais: editForm.pais.trim() || null,
        ciudad: editForm.ciudad.trim() || null,
        direccion: editForm.direccion.trim() || null,
        telefono: editForm.telefono.trim() || null,
        email_corporativo: editForm.email_corporativo.trim() || null,
        website: editForm.website.trim() || null,
      }).eq('id', editingClubId);
      if (error) throw error;

      setSuccessMsg(`Club "${editForm.nombre}" actualizado.`);
      setIsEditModalOpen(false);
      setEditingClubId(null);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Error updating club:', err);
      setError(err.message || 'Error al actualizar club.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const openDetail = async (club: ClubRow) => {
    setLoadingDetail(true);
    setIsDetailModalOpen(true);
    try {
      const deporteNombre = club.deportes
        ? (Array.isArray(club.deportes) ? club.deportes[0]?.nombre : club.deportes.nombre)
        : undefined;

      const [{ count: jugadores }, { count: equipos }, { count: entrenadores }, { data: clubProfiles }] = await Promise.all([
        supabase.from('deportistas').select('*', { count: 'exact', head: true }).eq('club_id', club.id),
        supabase.from('equipos').select('*', { count: 'exact', head: true }).eq('club_id', club.id),
        supabase.from('perfiles').select('*', { count: 'exact', head: true }).eq('club_id', club.id).eq('rol', 'entrenador'),
        supabase.from('perfiles').select('id').eq('club_id', club.id),
      ]);

      const profileIds = (clubProfiles || []).map(p => p.id);
      const { count: reservas } = profileIds.length > 0
        ? await supabase.from('reserva_escenario').select('*', { count: 'exact', head: true }).in('cliente_id', profileIds).eq('estado', 'confirmada')
        : { count: 0 };

      setDetailClub({
        id: club.id, nombre: club.nombre, pais: club.pais, ciudad: club.ciudad,
        direccion: club.direccion, email_corporativo: club.email_corporativo,
        telefono: club.telefono, website: club.website, estado: club.estado,
        deporte_nombre: deporteNombre,
        reconocimiento_deportivo_url: club.reconocimiento_deportivo_url,
        documento_representante_url: club.documento_representante_url,
        jugadores: jugadores ?? 0, equipos: equipos ?? 0,
        entrenadores: entrenadores ?? 0, reservas: reservas ?? 0,
      });
    } catch (err: any) {
      console.error('Error loading club detail:', err);
      setError('Error al cargar detalle del club.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getDeporteName = (club: ClubRow) => {
    if (!club.deportes) return undefined;
    return Array.isArray(club.deportes) ? club.deportes[0]?.nombre : club.deportes.nombre;
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="h-40 bg-gray-100 rounded-[40px]" />
        <div className="h-12 bg-gray-100 rounded-2xl max-w-md" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-200 px-3 py-1 rounded-xl text-[10px] font-black uppercase italic tracking-widest">
              Liga
            </Badge>
            {liga?.deportes?.nombre && (
              <Badge className="bg-[var(--primary-10)] text-[var(--primary)] border-[var(--primary-20)] px-3 py-1 rounded-xl text-[10px] font-black uppercase italic tracking-widest">
                {liga.deportes.nombre}
              </Badge>
            )}
          </div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">
            Clubes
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-2">
            {liga?.nombre} — Gestión de clubes de la liga.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchData}
            className="h-12 px-6 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="h-12 px-6 bg-[var(--primary)] text-black hover:brightness-90 font-bold rounded-xl flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            AGREGAR CLUB
          </Button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs border border-red-100">{error}</div>}
      {successMsg && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-xs border border-emerald-100">{successMsg}</div>}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar club por nombre..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182332] transition-all"
        />
      </div>

      {/* Clubes List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-500">
            {search ? 'No se encontraron clubes' : 'No hay clubes registrados'}
          </h3>
          <p className="text-gray-400 mt-2 text-sm italic">
            {search ? 'Intenta con otro nombre.' : 'Aún no hay clubes vinculados a esta liga.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(club => (
            <div key={club.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#182332] to-[#bd0f10] flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {club.nombre?.charAt(0) || 'C'}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#182332]">{club.nombre}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        club.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {club.estado || 'activo'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      {getDeporteName(club) && (
                        <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{getDeporteName(club)}</span>
                      )}
                      {(club.pais || club.ciudad) && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[club.ciudad, club.pais].filter(Boolean).join(', ')}</span>
                      )}
                      {club.email_corporativo && (
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{club.email_corporativo}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(club)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => openDetail(club)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#182332] hover:bg-[#202f43] text-white rounded-xl text-xs font-bold transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detalle */}
      <Modal isOpen={isDetailModalOpen} onClose={() => { setIsDetailModalOpen(false); setDetailClub(null); }} title={detailClub?.nombre || 'Club'} maxWidth="max-w-2xl">
        {loadingDetail ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#182332]" />
            <p className="italic">Cargando detalle...</p>
          </div>
        ) : detailClub ? (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#182332] text-lg">{detailClub.nombre}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  detailClub.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
                }`}>
                  {detailClub.estado || 'activo'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {detailClub.deporte_nombre && (
                  <div className="flex items-center gap-2 text-gray-600"><Shield className="w-4 h-4 text-gray-400" />{detailClub.deporte_nombre}</div>
                )}
                {(detailClub.pais || detailClub.ciudad) && (
                  <div className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4 text-gray-400" />{[detailClub.ciudad, detailClub.pais].filter(Boolean).join(', ')}</div>
                )}
                {detailClub.direccion && (
                  <div className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4 text-gray-400" />{detailClub.direccion}</div>
                )}
                {detailClub.telefono && (
                  <div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4 text-gray-400" />{detailClub.telefono}</div>
                )}
                {detailClub.email_corporativo && (
                  <div className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4 text-gray-400" />{detailClub.email_corporativo}</div>
                )}
                {detailClub.website && (
                  <div className="flex items-center gap-2 text-gray-600"><Globe className="w-4 h-4 text-gray-400" />{detailClub.website}</div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Documentos</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className={`rounded-2xl border p-4 flex items-center gap-3 ${detailClub.reconocimiento_deportivo_url ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}>
                  <div className={`p-2 rounded-xl ${detailClub.reconocimiento_deportivo_url ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate">Reconocimiento Deportivo</p>
                    {detailClub.reconocimiento_deportivo_url ? (
                      <a href={detailClub.reconocimiento_deportivo_url} target="_blank" rel="noreferrer"
                        className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 mt-0.5">
                        <ExternalLink className="w-3 h-3" /> Ver documento
                      </a>
                    ) : (
                      <p className="text-[10px] text-gray-400 mt-0.5">No cargado</p>
                    )}
                  </div>
                </div>
                <div className={`rounded-2xl border p-4 flex items-center gap-3 ${detailClub.documento_representante_url ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}>
                  <div className={`p-2 rounded-xl ${detailClub.documento_representante_url ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate">Doc. Representante Legal</p>
                    {detailClub.documento_representante_url ? (
                      <a href={detailClub.documento_representante_url} target="_blank" rel="noreferrer"
                        className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 mt-0.5">
                        <ExternalLink className="w-3 h-3" /> Ver documento
                      </a>
                    ) : (
                      <p className="text-[10px] text-gray-400 mt-0.5">No cargado</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Estadísticas</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center hover:shadow-md transition-shadow">
                  <Users className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold text-[#182332]">{detailClub.jugadores}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Jugadores</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center hover:shadow-md transition-shadow">
                  <Trophy className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                  <p className="text-2xl font-bold text-[#182332]">{detailClub.equipos}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Equipos</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center hover:shadow-md transition-shadow">
                  <UserPlus className="w-5 h-5 mx-auto mb-2 text-orange-500" />
                  <p className="text-2xl font-bold text-[#182332]">{detailClub.entrenadores}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Entrenadores</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center hover:shadow-md transition-shadow">
                  <Calendar className="w-5 h-5 mx-auto mb-2 text-purple-500" />
                  <p className="text-2xl font-bold text-[#182332]">{detailClub.reservas}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Reservas</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Modal Crear Club */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="AGREGAR CLUB" maxWidth="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-5">
          <Input
            label="Nombre del Club *"
            placeholder="Ej. Club Deportivo Estrella"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deporte</label>
            <div className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
              {liga?.deportes?.nombre || 'Cargando...'}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">El deporte se asigna automáticamente según la liga.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="País" placeholder="Colombia" value={form.pais} onChange={(e) => setForm({ ...form, pais: e.target.value })} />
            <Input label="Ciudad" placeholder="Bogotá" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
          </div>

          <Input label="Dirección" placeholder="Calle 123 #45-67" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Teléfono" placeholder="+57 300 123 4567" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            <Input label="Email Corporativo" placeholder="contacto@club.com" type="email" value={form.email_corporativo} onChange={(e) => setForm({ ...form, email_corporativo: e.target.value })} />
          </div>

          <Input label="Sitio Web" placeholder="https://club.com" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="bg-[var(--primary)] text-black hover:brightness-90 font-bold px-5">Crear Club</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Club */}
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingClubId(null); }} title="EDITAR CLUB" maxWidth="max-w-xl">
        <form onSubmit={handleEdit} className="space-y-5">
          <Input label="Nombre del Club *" placeholder="Ej. Club Deportivo Estrella" value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} required />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deporte</label>
            <div className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
              {liga?.deportes?.nombre || 'Cargando...'}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">El deporte se asigna automáticamente según la liga.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="País" placeholder="Colombia" value={editForm.pais} onChange={(e) => setEditForm({ ...editForm, pais: e.target.value })} />
            <Input label="Ciudad" placeholder="Bogotá" value={editForm.ciudad} onChange={(e) => setEditForm({ ...editForm, ciudad: e.target.value })} />
          </div>

          <Input label="Dirección" placeholder="Calle 123 #45-67" value={editForm.direccion} onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })} />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Teléfono" placeholder="+57 300 123 4567" value={editForm.telefono} onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })} />
            <Input label="Email Corporativo" placeholder="contacto@club.com" type="email" value={editForm.email_corporativo} onChange={(e) => setEditForm({ ...editForm, email_corporativo: e.target.value })} />
          </div>

          <Input label="Sitio Web" placeholder="https://club.com" value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => { setIsEditModalOpen(false); setEditingClubId(null); }}>Cancelar</Button>
            <Button type="submit" className="bg-[var(--primary)] text-black hover:brightness-90 font-bold px-5">Guardar Cambios</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
