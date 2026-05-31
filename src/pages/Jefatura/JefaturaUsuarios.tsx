import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Users, Search, UserPlus, Mail, Building2, RefreshCw,
  Shield, ShieldAlert, Edit3, Trash2, Trophy, Palette, Check, X
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { ClubTheme } from '../../types';

interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  club_id: string | null;
  club_nombre: string;
  rol: string;
  estado: string;
  created_at: string;
  theme: any;
}

interface Liga {
  id: string;
  nombre: string;
  deporte_id: string;
}

interface Club {
  id: string;
  nombre: string;
  deporte_id: string;
}

const THEME_PRESETS: { name: string; theme: ClubTheme; swatch: string }[] = [
  {
    name: 'Tradicional Rojo',
    theme: {
      sidebar_bg: '#bd0f10', sidebar_text: '#ffffff', sidebar_hover_bg: 'rgba(255,255,255,0.1)',
      sidebar_active_bg: '#ffffff', sidebar_active_text: '#bd0f10',
      button_bg: '#182332', button_text: '#ffffff', button_hover: '#202f43',
      login_bg: '#000000', primary_color: '#CCFF00',
    },
    swatch: '#E30613',
  },
  {
    name: 'Oceánico Azul',
    theme: {
      sidebar_bg: '#1e293b', sidebar_text: 'rgba(255,255,255,0.8)', sidebar_hover_bg: 'rgba(255,255,255,0.08)',
      sidebar_active_bg: '#2563eb', sidebar_active_text: '#ffffff',
      button_bg: '#2563eb', button_text: '#ffffff', button_hover: '#1d4ed8',
      login_bg: '#0f172a', primary_color: '#3b82f6',
    },
    swatch: '#2563eb',
  },
  {
    name: 'Bosque Verde',
    theme: {
      sidebar_bg: '#022c22', sidebar_text: 'rgba(255,255,255,0.85)', sidebar_hover_bg: 'rgba(255,255,255,0.1)',
      sidebar_active_bg: '#10b981', sidebar_active_text: '#ffffff',
      button_bg: '#10b981', button_text: '#ffffff', button_hover: '#059669',
      login_bg: '#064e3b', primary_color: '#10b981',
    },
    swatch: '#10b981',
  },
  {
    name: 'Elegancia Dorada',
    theme: {
      sidebar_bg: '#1a1a1a', sidebar_text: 'rgba(255,255,255,0.7)', sidebar_hover_bg: 'rgba(255,255,255,0.05)',
      sidebar_active_bg: '#d97706', sidebar_active_text: '#ffffff',
      button_bg: '#d97706', button_text: '#ffffff', button_hover: '#b45309',
      login_bg: '#111111', primary_color: '#f59e0b',
    },
    swatch: '#d97706',
  },
];

const ROLES_DISPONIBLES = [
  { id: 'admin_club', label: 'Administrador de Club', color: 'bg-emerald-50 text-emerald-600' },
  { id: 'jefatura', label: 'Jefatura de Escenarios', color: 'bg-amber-50 text-amber-600' },
  { id: 'escenario_deportivo', label: 'Gestor de Escenario', color: 'bg-blue-50 text-blue-600' },
  { id: 'direccion_deportiva', label: 'Director Deportivo', color: 'bg-purple-50 text-purple-600' },
  { id: 'cartera', label: 'Gestor de Cartera', color: 'bg-rose-50 text-rose-600' },
  { id: 'comunicaciones', label: 'Comunicaciones', color: 'bg-cyan-50 text-cyan-600' },
  { id: 'entrenador', label: 'Entrenador', color: 'bg-orange-50 text-orange-600' },
  { id: 'admin_equipo', label: 'Admin. de Equipo', color: 'bg-indigo-50 text-indigo-600' },
];

export default function JefaturaUsuarios() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLiga, setSelectedLiga] = useState<string>('all');
  const [selectedClub, setSelectedClub] = useState<string>('all');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [allEscenarios, setAllEscenarios] = useState<any[]>([]);
  const [selectedEscenarios, setSelectedEscenarios] = useState<string[]>([]);

  const [newUser, setNewUser] = useState({
    nombre: '', email: '', password: '', rol: 'jefatura', club_id: '', theme: {} as ClubTheme
  });

  const [selectedThemePreset, setSelectedThemePreset] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: perfiles } = await supabase
        .from('perfiles')
        .select('*, clubes!left(nombre)')
        .order('created_at', { ascending: false });
      if (!perfiles) throw new Error('Error al cargar usuarios');

      const { data: clubsList } = await supabase.from('clubes').select('id, nombre, deporte_id').order('nombre');
      setClubes(clubsList || []);

      const { data: ligasList } = await supabase.from('ligas').select('id, nombre, deporte_id').order('nombre');
      setLigas(ligasList || []);

      const { data: escList } = await supabase.from('escenarios').select('id, nombre, deporte, gestor_id');
      setAllEscenarios(escList || []);

      setUsers((perfiles || []).map((p: any) => ({
        id: p.id,
        nombre: p.nombre || 'N/A',
        email: p.email || 'N/A',
        club_id: p.club_id,
        club_nombre: p.clubes?.nombre || 'Sistema Central',
        rol: p.rol || 'unassigned',
        estado: p.estado || 'activo',
        created_at: p.created_at,
        theme: p.theme || {},
      })));
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError(null);

    try {
      if (isEditMode && editingUserId) {
        const themeJson = selectedThemePreset && selectedThemePreset !== 'custom'
          ? THEME_PRESETS[parseInt(selectedThemePreset)].theme
          : newUser.theme;
        const updateBody: Record<string, any> = {
          nombre: newUser.nombre,
          rol: newUser.rol,
          club_id: newUser.club_id || null,
        };
        if (Object.keys(themeJson).length > 0) {
          updateBody.theme = themeJson;
        } else {
          updateBody.theme = {};
        }
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/perfiles?id=eq.${editingUserId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify(updateBody),
        });
        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(errBody || 'Error al actualizar usuario');
        }

        await supabase.from('escenarios').update({ gestor_id: null }).eq('gestor_id', editingUserId);
        if (newUser.rol === 'escenario_deportivo' && selectedEscenarios.length > 0) {
          await supabase.from('escenarios').update({ gestor_id: editingUserId }).in('id', selectedEscenarios);
        }
        setSuccessMsg('Usuario actualizado exitosamente');
      } else {
        const themeJson = selectedThemePreset && selectedThemePreset !== 'custom'
          ? THEME_PRESETS[parseInt(selectedThemePreset)].theme
          : newUser.theme;
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: newUser.email,
            password: newUser.password,
            data: { nombre: newUser.nombre, rol: newUser.rol, club_id: newUser.club_id || null }
          })
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Error al crear usuario');

        const uid = result.user?.id;
        if (!uid) throw new Error('No se pudo obtener el ID del nuevo usuario');

        const themePatch = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/perfiles?id=eq.${uid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme: Object.keys(themeJson).length > 0 ? themeJson : {} }),
        });
        if (!themePatch.ok) console.error('Error guardando theme:', await themePatch.text());

        if (newUser.rol === 'escenario_deportivo' && selectedEscenarios.length > 0) {
          await supabase.from('escenarios').update({ gestor_id: uid }).in('id', selectedEscenarios);
        }
        setSuccessMsg('Usuario creado exitosamente');
      }

      await fetchData();
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setActionLoading(false);
    }
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDelete = async (user: UserProfile) => {
    if (!confirm(`¿Eliminar permanentemente a "${user.nombre}" (${user.email})?`)) return;
    try {
      await supabase.from('escenarios').update({ gestor_id: null }).eq('gestor_id', user.id);
      await supabase.from('perfiles').delete().eq('id', user.id);
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`, { method: 'DELETE' });
      setSuccessMsg(`Usuario "${user.nombre}" eliminado`);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
    setTimeout(() => { setSuccessMsg(null); setError(null); }, 3000);
  };

  const openEditModal = (user: UserProfile) => {
    setIsEditMode(true);
    setEditingUserId(user.id);
    const userTheme = user.theme || {};
    setNewUser({ nombre: user.nombre, email: user.email, password: '', rol: user.rol, club_id: user.club_id || '', theme: userTheme });
    const vinculados = allEscenarios.filter(e => e.gestor_id === user.id).map(e => e.id);
    setSelectedEscenarios(vinculados);
    const presetIdx = THEME_PRESETS.findIndex(p =>
      p.theme.primary_color === userTheme.primary_color &&
      p.theme.sidebar_bg === userTheme.sidebar_bg &&
      p.theme.button_bg === userTheme.button_bg
    );
    setSelectedThemePreset(presetIdx >= 0 ? String(presetIdx) : 'custom');
    setIsCreateModalOpen(true);
  };

  const resetForm = () => {
    setIsEditMode(false);
    setEditingUserId(null);
    setNewUser({ nombre: '', email: '', password: '', rol: 'jefatura', club_id: '', theme: {} as ClubTheme });
    setSelectedEscenarios([]);
    setSelectedThemePreset(null);
    setFormError(null);
  };

  const clubesDeLiga = selectedLiga === 'all'
    ? clubes
    : clubes.filter(c => c.deporte_id === ligas.find(l => l.id === selectedLiga)?.deporte_id);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.nombre.toLowerCase().includes(search.toLowerCase()) ||
                         u.email.toLowerCase().includes(search.toLowerCase());
    const matchesClub = selectedClub === 'all' || u.club_id === selectedClub;
    const clubInLiga = selectedLiga === 'all' || clubesDeLiga.some(c => c.id === u.club_id);
    return matchesSearch && matchesClub && clubInLiga;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs border border-red-100">{error}</div>}
      {successMsg && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-xs border border-emerald-100">{successMsg}</div>}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-[#182332] to-[#bd0f10] text-white rounded-xl shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#182332] tracking-tight">Gestión Usuarios</h2>
            <p className="text-xs text-gray-500">Administra los usuarios registrados en la plataforma.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#182332] px-4 py-2 rounded-full">
          <Users size={14} className="text-white/60" />
          <span className="text-[11px] font-semibold text-white/80">{filteredUsers.length} Usuarios</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182332] transition-all"
          />
        </div>
        <div className="relative min-w-[180px]">
          <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <select
            value={selectedLiga}
            onChange={(e) => { setSelectedLiga(e.target.value); setSelectedClub('all'); }}
            className="w-full h-[46px] bg-white border border-gray-200 rounded-2xl pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#182332] appearance-none cursor-pointer"
          >
            <option value="all">Todas las ligas</option>
            {ligas.map(l => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>
        </div>
        <div className="relative min-w-[180px]">
          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <select
            value={selectedClub}
            onChange={(e) => setSelectedClub(e.target.value)}
            className="w-full h-[46px] bg-white border border-gray-200 rounded-2xl pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#182332] appearance-none cursor-pointer"
          >
            <option value="all">Todos los clubes</option>
            {clubesDeLiga.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <Button
          onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
          className="h-[46px] px-5 bg-black text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-black/90 transition-all shrink-0"
        >
          <UserPlus size={16} />
          NUEVO USUARIO
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#182332]" />
          <p className="italic">Cargando usuarios...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-2xl">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-400">{search || selectedLiga !== 'all' || selectedClub !== 'all' ? 'No se encontraron usuarios con esos filtros.' : 'No hay usuarios registrados.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map(user => {
            const roleInfo = ROLES_DISPONIBLES.find(r => r.id === user.rol);
            return (
              <div key={user.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#182332] to-gray-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {user.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-[#182332]">{user.nombre}</h3>
                        {roleInfo ? (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${roleInfo.color}`}>
                            {roleInfo.label}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500">
                            {user.rol}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{user.email}</span>
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{user.club_nombre}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => openEditModal(user)}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); resetForm(); }}
        title={isEditMode ? 'EDITAR USUARIO' : 'NUEVO USUARIO'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-6">
          {formError && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
              <ShieldAlert size={20} className="text-red-500 shrink-0" />
              <p className="text-sm font-medium text-red-700">{formError}</p>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Información General</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Nombre Completo</label>
                <input
                  required
                  value={newUser.nombre}
                  onChange={e => setNewUser({...newUser, nombre: e.target.value})}
                  className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#182332] transition-all"
                  placeholder="Nombre del usuario"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  disabled={isEditMode}
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#182332] transition-all disabled:bg-gray-100 disabled:text-gray-400"
                  placeholder="email@dominio.com"
                />
              </div>
            </div>
          </div>

          {!isEditMode && (
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Credenciales Iniciales</h4>
              <div className="max-w-md">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Contraseña</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#182332] transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Asignación</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Club / Organización</label>
                <select
                  value={newUser.club_id}
                  onChange={e => setNewUser({...newUser, club_id: e.target.value})}
                  className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#182332] text-gray-900 appearance-none cursor-pointer"
                >
                  <option value="">Sistema Central</option>
                  {clubes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Rol</label>
                <select
                  value={newUser.rol}
                  onChange={e => setNewUser({...newUser, rol: e.target.value})}
                  className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#182332] text-gray-900 appearance-none cursor-pointer"
                >
                  {ROLES_DISPONIBLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {newUser.rol === 'escenario_deportivo' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Escenarios Asignados ({selectedEscenarios.length})</h4>
                <Shield size={14} className="text-emerald-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto">
                {allEscenarios.map(esc => (
                  <button
                    key={esc.id}
                    type="button"
                    onClick={() => setSelectedEscenarios(prev => prev.includes(esc.id) ? prev.filter(i => i !== esc.id) : [...prev, esc.id])}
                    className={`flex flex-col text-left p-3 rounded-2xl border-2 transition-all ${
                      selectedEscenarios.includes(esc.id)
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <span className={`text-sm font-bold ${selectedEscenarios.includes(esc.id) ? 'text-emerald-700' : 'text-gray-900'}`}>{esc.nombre}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${selectedEscenarios.includes(esc.id) ? 'text-emerald-600' : 'text-gray-400'}`}>{esc.deporte}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Palette size={14} className="text-gray-400" />
              <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Personalización</h4>
              {selectedThemePreset && (
                <button
                  type="button"
                  onClick={() => { setSelectedThemePreset(null); setNewUser(prev => ({ ...prev, theme: {} as ClubTheme })); }}
                  className="ml-auto text-[9px] text-gray-400 hover:text-red-500 font-bold uppercase tracking-wider"
                >
                  <X size={12} className="inline mr-1" />Quitar tema
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {THEME_PRESETS.map((preset, i) => {
                const isActive = selectedThemePreset === String(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSelectedThemePreset(String(i));
                      setNewUser(prev => ({ ...prev, theme: preset.theme }));
                    }}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                      isActive
                        ? 'border-[var(--primary)] bg-[var(--primary-10)]'
                        : 'border-gray-100 hover:border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="w-full h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: preset.swatch }}>
                      {isActive && <Check size={14} className="text-white drop-shadow" />}
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => { setIsCreateModalOpen(false); resetForm(); }} className="flex-1 h-11 rounded-xl font-bold text-gray-500">
              Cancelar
            </Button>
            <Button
              isLoading={actionLoading}
              type="submit"
              className="flex-[2] h-11 bg-black text-white font-bold rounded-xl hover:bg-black/90 transition-all"
            >
              {isEditMode ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
