import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { FileUpload } from '../../components/ui/FileUpload';
import {
  Search, Building2, Plus, RefreshCw, Globe, MapPin, Mail, Phone, Shield,
  Eye, Users, Trophy, UserPlus, Calendar, FileText, ExternalLink, Pencil,
  BarChart3, TrendingUp, FileSpreadsheet, XCircle, CheckCircle2, Settings,
  Award, ShieldAlert, Check, X
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
  plan_id?: string;
  planes_suscripcion?: { nombre: string; modulos_activos: string[] } | null;
  modulos_personalizados?: string[] | null;
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

interface GlobalStats {
  activos: number;
  inactivos: number;
  jugadores: number;
  equipos: number;
  entrenadores: number;
}

const ALL_MODULES = [
  { id: 'admin_club', label: 'Admin Club' },
  { id: 'equipos', label: 'Equipos & Roster' },
  { id: 'entrenadores', label: 'Entrenadores' },
  { id: 'cartera', label: 'Cartera & Finanzas' },
  { id: 'padre_hijo', label: 'Portal Padre/Hijo' },
  { id: 'comunicaciones', label: 'Comunicaciones' },
  { id: 'admin_equipo', label: 'Admin Equipo' },
  { id: 'pqrs', label: 'PQRS' },
  { id: 'reserva_escenarios', label: 'Reserva Escenarios' },
  { id: 'juegos_amistosos', label: 'Gestión de Juegos' },
  { id: 'compras_nomina_pagos', label: 'Compras / Pagos / Nómina' },
  { id: 'direccion_deportiva', label: 'Dirección Deportiva' },
  { id: 'asistencia_juegos', label: 'Asistencia y Eventos' },
  { id: 'nomina_deportiva', label: 'Nómina Deportiva' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'logistica', label: 'Logística' },
];

export default function EscenarioClubes() {
  const [clubes, setClubes] = useState<ClubRow[]>([]);
  const [filtered, setFiltered] = useState<ClubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<GlobalStats | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deportes, setDeportes] = useState<{ id: string; nombre: string }[]>([]);
  const [form, setForm] = useState({
    nombre: '', deporte_id: '', pais: '', ciudad: '', direccion: '',
    telefono: '', email_corporativo: '', website: '',
    reconocimiento_deportivo_url: '', documento_representante_url: '',
  });

  const [detailClub, setDetailClub] = useState<ClubDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre: '', deporte_id: '', pais: '', ciudad: '', direccion: '',
    telefono: '', email_corporativo: '', website: '',
  });
  const [editingClubId, setEditingClubId] = useState<string | null>(null);

  const [permisosClub, setPermisosClub] = useState<ClubRow | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isPermisosModalOpen, setIsPermisosModalOpen] = useState(false);
  const [allPlans, setAllPlans] = useState<{ id: string; nombre: string; modulos_activos: string[] }[]>([]);
  const [toggledModules, setToggledModules] = useState<string[]>([]);
  const [savingPermisos, setSavingPermisos] = useState(false);

  useEffect(() => { fetchData(); fetchDeportes(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(clubes.filter(c => c.nombre.toLowerCase().includes(q)));
  }, [search, clubes]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [clubResult, statsResult, plansResult] = await Promise.all([
        supabase
          .from('clubes')
          .select('id, nombre, pais, ciudad, direccion, email_corporativo, telefono, website, estado, deporte_id, reconocimiento_deportivo_url, documento_representante_url, deportes(nombre), plan_id, modulos_personalizados, planes_suscripcion(nombre, modulos_activos)')
          .order('nombre'),
        fetchGlobalStats(),
        supabase.from('planes_suscripcion').select('id, nombre, modulos_activos').order('nombre'),
      ]);

      if (clubResult.error) throw clubResult.error;
      setClubes(clubResult.data || []);
      setStats(statsResult);
      setAllPlans(plansResult.data || []);
    } catch (err: any) {
      console.error('Error fetching clubes:', err);
      setError(err.message || 'Error al cargar clubes.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalStats = async (): Promise<GlobalStats> => {
    const [
      { count: activos },
      { count: inactivos },
      { count: jugadores },
      { count: equipos },
      { count: entrenadores },
    ] = await Promise.all([
      supabase.from('clubes').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
      supabase.from('clubes').select('*', { count: 'exact', head: true }).eq('estado', 'inactivo'),
      supabase.from('deportistas').select('*', { count: 'exact', head: true }),
      supabase.from('equipos').select('*', { count: 'exact', head: true }),
      supabase.from('perfiles').select('*', { count: 'exact', head: true }).eq('rol', 'entrenador'),
    ]);

    return {
      activos: activos ?? 0,
      inactivos: inactivos ?? 0,
      jugadores: jugadores ?? 0,
      equipos: equipos ?? 0,
      entrenadores: entrenadores ?? 0,
    };
  };

  const fetchClubes = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('clubes')
        .select('id, nombre, pais, ciudad, direccion, email_corporativo, telefono, website, estado, deporte_id, reconocimiento_deportivo_url, documento_representante_url, deportes(nombre), plan_id, modulos_personalizados, planes_suscripcion(nombre, modulos_activos)')
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

  const fetchDeportes = async () => {
    const { data } = await supabase.from('deportes').select('id, nombre').order('nombre');
    setDeportes(data || []);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.deporte_id) return;

    try {
      const { error } = await supabase.from('clubes').insert([{
        nombre: form.nombre.trim(),
        deporte_id: form.deporte_id,
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
      setForm({ nombre: '', deporte_id: '', pais: '', ciudad: '', direccion: '', telefono: '', email_corporativo: '', website: '', reconocimiento_deportivo_url: '', documento_representante_url: '' });
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
      deporte_id: club.deporte_id || '',
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

  const openPermisos = (club: ClubRow) => {
    setPermisosClub(club);
    setSelectedPlanId(club.plan_id || '');
    setIsPermisosModalOpen(true);
    if (allPlans.length === 0) {
      supabase.from('planes_suscripcion').select('id, nombre, modulos_activos').order('nombre').then(({ data }) => {
        if (data) setAllPlans(data);
      });
    }
    const baseModules = club.modulos_personalizados || club.planes_suscripcion?.modulos_activos || [];
    setToggledModules([...baseModules]);
  };

  const toggleModule = (modId: string) => {
    if (modId === 'admin_club') return;
    setToggledModules(prev =>
      prev.includes(modId) ? prev.filter(m => m !== modId) : [...prev, modId]
    );
  };

  const handleSavePermisos = async () => {
    if (!permisosClub) return;
    setSavingPermisos(true);
    try {
      const { error } = await supabase
        .from('clubes')
        .update({
          plan_id: selectedPlanId || null,
          modulos_personalizados: toggledModules,
        })
        .eq('id', permisosClub.id);
      if (error) throw error;
      setSuccessMsg(`Permisos actualizados para "${permisosClub.nombre}".`);
      setIsPermisosModalOpen(false);
      setPermisosClub(null);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Error updating club permisos:', err);
      const msg = err.message || '';
      if (msg.includes('modulos_personalizados')) {
        setError('La columna modulos_personalizados no existe. Ejecuta add_club_modulos_personalizados.sql en Supabase.');
      } else {
        setError(msg || 'Error al actualizar permisos.');
      }
      setTimeout(() => setError(null), 8000);
    } finally {
      setSavingPermisos(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.nombre.trim() || !editingClubId) return;

    try {
      const { error } = await supabase.from('clubes').update({
        nombre: editForm.nombre.trim(),
        deporte_id: editForm.deporte_id || null,
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

  const downloadExcel = () => {
    const BOM = '\uFEFF';
    const headers = ['Nombre', 'Estado', 'Deporte', 'País', 'Ciudad', 'Dirección', 'Email', 'Teléfono', 'Website'];
    const rows = filtered.map(c => [
      c.nombre,
      c.estado || 'activo',
      getDeporteName(c) || '',
      c.pais || '',
      c.ciudad || '',
      c.direccion || '',
      c.email_corporativo || '',
      c.telefono || '',
      c.website || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clubes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-[#182332] to-[#bd0f10] text-white rounded-xl shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#182332] tracking-tight">Clubes</h2>
            <p className="text-xs text-gray-500">Gestiona los clubes registrados en la plataforma.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4">
            <FileSpreadsheet className="h-4 w-4" />
            <span>EXCEL</span>
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-[var(--primary)] text-black hover:brightness-90 font-bold px-5">
            <Plus className="h-4 w-4" />
            <span>AGREGAR CLUB</span>
          </Button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs border border-red-100">{error}</div>}
      {successMsg && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-xs border border-emerald-100">{successMsg}</div>}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#182332]">{stats.activos}</p>
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Activos</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-emerald-500">
              <TrendingUp size={11} />
              <span className="text-[8px] font-bold uppercase tracking-wider">clubes</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                <XCircle size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#182332]">{stats.inactivos}</p>
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Inactivos</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-red-400">
              <TrendingUp size={11} />
              <span className="text-[8px] font-bold uppercase tracking-wider">clubes</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#182332]">{stats.jugadores}</p>
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Jugadores</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-blue-500">
              <TrendingUp size={11} />
              <span className="text-[8px] font-bold uppercase tracking-wider">total</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                <Trophy size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#182332]">{stats.equipos}</p>
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Equipos</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-amber-500">
              <TrendingUp size={11} />
              <span className="text-[8px] font-bold uppercase tracking-wider">total</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
                <UserPlus size={18} className="text-orange-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#182332]">{stats.entrenadores}</p>
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Entrenadores</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-orange-500">
              <TrendingUp size={11} />
              <span className="text-[8px] font-bold uppercase tracking-wider">total</span>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar club por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182332] transition-all"
        />
      </div>

      {/* Club List */}
      {loading ? (
        <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#182332]" />
          <p className="italic">Cargando clubes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-2xl">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-400">{search ? 'No se encontraron clubes con ese nombre.' : 'No hay clubes registrados.'}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(club => (
            <div key={club.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
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
                    {club.planes_suscripcion?.nombre && (
                      <span className="flex items-center gap-1 text-indigo-500 font-semibold"><Award className="w-3 h-3" />{club.planes_suscripcion.nombre}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openPermisos(club)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Permisos
                  </button>
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

      {/* Modal Permisos */}
      <Modal isOpen={isPermisosModalOpen} onClose={() => { setIsPermisosModalOpen(false); setPermisosClub(null); }} title="Gestión de Permisos" maxWidth="max-w-3xl">
        {permisosClub && (
          <div className="space-y-6">
            {/* Club Header */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#182332] to-[#bd0f10] flex items-center justify-center text-white font-bold text-lg shrink-0">
                {permisosClub.nombre?.charAt(0) || 'C'}
              </div>
              <div>
                <h3 className="font-bold text-[#182332] text-lg">{permisosClub.nombre}</h3>
                <p className="text-xs text-gray-500">
                  Plan actual: <span className="font-bold text-indigo-600">{permisosClub.planes_suscripcion?.nombre || 'Sin plan asignado'}</span>
                </p>
              </div>
            </div>

            {/* Plan Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cambiar Plan</label>
              <select
                value={selectedPlanId}
                onChange={(e) => {
                  const newPlanId = e.target.value;
                  setSelectedPlanId(newPlanId);
                  const plan = allPlans.find(p => p.id === newPlanId);
                  if (plan) {
                    setToggledModules([...plan.modulos_activos]);
                  } else {
                    setToggledModules([]);
                  }
                }}
                className="w-full h-12 px-4 bg-gray-50 rounded-xl text-sm font-medium border border-gray-200 text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
              >
                <option value="">Sin plan</option>
                {allPlans.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              {selectedPlanId && (
                <p className="text-[10px] text-indigo-500 mt-1 italic">
                  Al seleccionar un plan se cargan sus módulos. Puedes personalizarlos abajo.
                </p>
              )}
            </div>

            {/* Editable Toggles */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-black text-sm uppercase tracking-widest text-gray-900 flex items-center gap-2">
                  <ShieldAlert size={16} /> Módulos y Permisos
                </h4>
                <span className="text-[10px] font-bold text-gray-400">
                  {toggledModules.length} / {ALL_MODULES.length} activos
                </span>
              </div>

              {/* Plan info */}
              {permisosClub.planes_suscripcion && !permisosClub.modulos_personalizados && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-4 flex items-center gap-2">
                  <ShieldAlert size={14} className="text-indigo-500 shrink-0" />
                  <p className="text-[10px] text-indigo-700 font-medium">
                    Mostrando módulos del plan <strong>{permisosClub.planes_suscripcion.nombre}</strong>.
                    Activa/desactiva para personalizar este club.
                  </p>
                </div>
              )}
              {permisosClub.modulos_personalizados && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 flex items-center gap-2">
                  <Settings size={14} className="text-amber-500 shrink-0" />
                  <p className="text-[10px] text-amber-700 font-medium">
                    Este club tiene módulos personalizados que sobrescriben los del plan.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_MODULES.map(mod => {
                  const active = toggledModules.includes(mod.id);
                  return (
                    <div
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        active
                          ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                          active ? 'bg-emerald-500' : 'bg-gray-200'
                        }`}
                      >
                        {active ? <Check className="w-3 h-3 text-white" /> : null}
                      </div>
                      <span className={`text-xs font-bold ${active ? 'text-emerald-800' : 'text-gray-500'}`}>
                        {mod.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                variant="ghost"
                onClick={() => { setIsPermisosModalOpen(false); setPermisosClub(null); }}
                className="rounded-xl px-5"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSavePermisos}
                isLoading={savingPermisos}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-xl"
              >
                Guardar Permisos
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Crear */}
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

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Documentos del Club</p>
            <FileUpload
              bucket="club-documentos"
              path={`reconocimiento/${form.nombre || 'club'}`}
              label="Reconocimiento Deportivo"
              value={form.reconocimiento_deportivo_url}
              onChange={(url) => setForm({ ...form, reconocimiento_deportivo_url: url })}
            />
            <div className="mt-4">
              <FileUpload
                bucket="club-documentos"
                path={`representante/${form.nombre || 'club'}`}
                label="Documento Representante Legal"
                value={form.documento_representante_url}
                onChange={(url) => setForm({ ...form, documento_representante_url: url })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="bg-[var(--primary)] text-black hover:brightness-90 font-bold px-5">Crear Club</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar */}
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingClubId(null); }} title="EDITAR CLUB" maxWidth="max-w-xl">
        <form onSubmit={handleEdit} className="space-y-5">
          <Input label="Nombre del Club *" placeholder="Ej. Club Deportivo Estrella" value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} required />

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
