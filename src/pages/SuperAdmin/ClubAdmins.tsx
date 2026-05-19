import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Users, ShieldAlert, Search, UserPlus,
  Trash2, Edit3, Mail, ArrowLeft,
  ShieldCheck, Key, Building2, RefreshCw
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

interface AdminClubProfile {
  id: string;
  nombre: string;
  email: string;
  club_nombre: string;
  estado: 'activo' | 'suspendido';
  created_at: string;
  club_id: string;
  rol: string;
}

const ROLES_DISPONIBLES = [
  { id: 'admin_club', label: 'Administrador de Club' },
  { id: 'jefatura', label: 'Jefatura de Escenarios' },
  { id: 'escenario_deportivo', label: 'Gestor de Escenario' },
  { id: 'direccion_deportiva', label: 'Director Deportivo' },
  { id: 'cartera', label: 'Gestor de Cartera' }
];

export default function ClubAdmins() {
  const [admins, setAdmins] = useState<AdminClubProfile[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [allEscenarios, setAllEscenarios] = useState<any[]>([]);
  const [selectedEscenarios, setSelectedEscenarios] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [newUser, setNewUser] = useState({ nombre: '', email: '', password: '', rol: 'escenario_deportivo', club_id: '' });
  const [resetError, setResetError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const askConfirmation = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  }) => {
    setConfirmConfig({ isOpen: true, ...config });
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: profiles, error: pError } = await supabase
        .from('perfiles')
        .select('*, clubes(nombre)')
        .order('created_at', { ascending: false });
      if (pError) throw pError;

      const { data: clubsList } = await supabase.from('clubes').select('id, nombre').order('nombre');
      setClubs(clubsList || []);

      const { data: escList } = await supabase.from('escenarios').select('id, nombre, deporte, gestor_id');
      setAllEscenarios(escList || []);

      setAdmins(profiles?.map((p: any) => ({
        id: p.id,
        nombre: p.nombre || 'N/A',
        email: p.email || 'N/A',
        club_nombre: p.clubes?.nombre || 'CENTRAL',
        estado: p.estado || 'activo',
        created_at: p.created_at,
        club_id: p.club_id,
        rol: p.rol || 'unassigned'
      })) || []);
    } catch (err: any) {
      console.error(err);
      showToast("Error al cargar usuarios: " + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setResetError(null);

    try {
      if (isEditMode && editingAdminId) {
        const { error } = await supabase
          .from('perfiles')
          .update({ nombre: newUser.nombre, rol: newUser.rol, club_id: newUser.club_id || null })
          .eq('id', editingAdminId);
        if (error) throw error;

        await supabase.from('escenarios').update({ gestor_id: null }).eq('gestor_id', editingAdminId);
        if (newUser.rol === 'escenario_deportivo' && selectedEscenarios.length > 0) {
          await supabase.from('escenarios').update({ gestor_id: editingAdminId }).in('id', selectedEscenarios);
        }
        showToast('Usuario actualizado exitosamente', 'success');
      } else {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: newUser.email,
            password: newUser.password,
            data: {
              nombre: newUser.nombre,
              rol: newUser.rol,
              club_id: newUser.club_id || null
            }
          })
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Error al crear usuario');

        const uid = result.user?.id;
        if (!uid) throw new Error('No se pudo obtener el ID del nuevo usuario');

        if (newUser.rol === 'escenario_deportivo' && selectedEscenarios.length > 0) {
          const { error: escError } = await supabase
            .from('escenarios')
            .update({ gestor_id: uid })
            .in('id', selectedEscenarios);
          if (escError) console.error("Error vinculando escenarios:", escError);
        }
        showToast('Usuario creado exitosamente', 'success');
      }

      await fetchData();
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (admin: AdminClubProfile) => {
    askConfirmation({
      title: 'Eliminar Usuario',
      message: `¿Estás seguro de eliminar permanentemente a "${admin.nombre}" (${admin.email})?\n\nSe eliminarán todos sus datos de acceso y se desvincularán sus escenarios asignados.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: async () => {
        try {
          setActionLoading(true);

          await supabase.from('escenarios').update({ gestor_id: null }).eq('gestor_id', admin.id);
          await supabase.from('perfiles').delete().eq('id', admin.id);

          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?id=eq.${admin.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });
          if (!res.ok) {
            const text = await res.text();
            console.warn("Error al eliminar de auth.users:", text);
          }

          showToast(`Usuario "${admin.nombre}" eliminado`, 'success');
          await fetchData();
        } catch (err: any) {
          showToast("Error al eliminar: " + err.message, 'error');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleSendRecovery = async (admin: AdminClubProfile) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: admin.email })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al enviar recuperación');
      }

      showToast(`Correo de recuperación enviado a ${admin.email}`, 'success');
    } catch (err: any) {
      showToast("Error: " + err.message, 'error');
    }
  };

  const openEditModal = (admin: AdminClubProfile) => {
    setIsEditMode(true);
    setEditingAdminId(admin.id);
    setNewUser({ nombre: admin.nombre, email: admin.email, password: '', rol: admin.rol, club_id: admin.club_id || '' });
    const vinculados = allEscenarios.filter(e => e.gestor_id === admin.id).map(e => e.id);
    setSelectedEscenarios(vinculados);
    setIsCreateModalOpen(true);
  };

  const resetForm = () => {
    setIsEditMode(false);
    setEditingAdminId(null);
    setNewUser({ nombre: '', email: '', password: '', rol: 'escenario_deportivo', club_id: '' });
    setSelectedEscenarios([]);
    setResetError(null);
  };

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.nombre.toLowerCase().includes(search.toLowerCase()) ||
                         admin.email.toLowerCase().includes(search.toLowerCase());
    const matchesClub = selectedClub === 'all' ||
                       (selectedClub === 'central' && !admin.club_id) ||
                       (admin.club_id === selectedClub);
    return matchesSearch && matchesClub;
  });

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#182332] tracking-tight">Accesos Administrativos</h1>
          <p className="text-sm text-gray-400 mt-1">Control de Personal y Rango de Autorización</p>
        </div>
        <div className="flex items-center gap-2 bg-[#182332] px-4 py-2 rounded-full">
          <Users size={14} className="text-[#CCFF00]" />
          <span className="text-[11px] font-semibold text-[#CCFF00]">{admins.length} Usuarios</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Buscar usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 bg-white border border-gray-200 rounded-2xl pl-11 pr-4 text-sm focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent outline-none text-gray-900 placeholder-gray-400 transition-all"
          />
        </div>
        <div className="relative min-w-[200px]">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
            <Building2 size={16} />
          </div>
          <select
            value={selectedClub}
            onChange={(e) => setSelectedClub(e.target.value)}
            className="w-full h-11 bg-white border border-gray-200 rounded-2xl pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent outline-none text-gray-900 appearance-none cursor-pointer"
          >
            <option value="all">Todos los clubes</option>
            <option value="central">Sistema Central</option>
            {clubs.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <Button
          onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
          className="h-11 px-5 bg-black text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-black/90 transition-all shadow-sm"
        >
          <UserPlus size={16} />
          Nuevo Acceso
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-3 border-gray-100 border-t-[#182332] rounded-full animate-spin"></div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Cargando usuarios...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/80 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Sujeto / Identidad</th>
                  <th className="px-6 py-4">Rango de Operación</th>
                  <th className="px-6 py-4">Organización</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#182332] flex items-center justify-center text-white font-bold text-sm">
                          {admin.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#182332]">{admin.nombre}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                            <Mail size={10} /> {admin.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide",
                        admin.rol === 'escenario_deportivo'
                          ? 'bg-blue-50 text-blue-600'
                          : admin.rol === 'admin_club'
                          ? 'bg-emerald-50 text-emerald-600'
                          : admin.rol === 'jefatura'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-purple-50 text-purple-600'
                      )}>
                        {ROLES_DISPONIBLES.find(r => r.id === admin.rol)?.label || admin.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={12} className="text-gray-400" />
                        <p className="text-sm font-medium text-gray-600">{admin.club_nombre}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleSendRecovery(admin)}
                          className="p-2 bg-gray-50 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg hover:scale-110 transition-all"
                          title="Enviar recuperación de contraseña"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={() => openEditModal(admin)}
                          className="p-2 bg-gray-50 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg hover:scale-110 transition-all"
                          title="Editar Perfil"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(admin)}
                          className="p-2 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg hover:scale-110 transition-all"
                          title="Eliminar Usuario"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); resetForm(); }}
        title={isEditMode ? "Actualizar Credenciales" : "Emisión de Nuevo Acceso"}
      >
        <form onSubmit={handleCreateOrUpdate} className="modal-form space-y-6">
          {resetError && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
              <ShieldAlert size={20} className="text-red-500 shrink-0" />
              <p className="text-sm font-medium text-red-700">{resetError}</p>
            </div>
          )}

          <div>
            <h4 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Información General</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Nombre Completo</label>
                <input
                  required
                  value={newUser.nombre}
                  onChange={e => setNewUser({...newUser, nombre: e.target.value})}
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent transition-all"
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
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-400"
                  placeholder="email@dominio.com"
                />
              </div>
            </div>
          </div>

          {!isEditMode && (
            <div className="border-t border-gray-100 pt-2">
              <h4 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Credenciales Iniciales</h4>
              <div className="max-w-md">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Clave de Acceso Temporal</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-2">
            <h4 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Asignación</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Club / Organización</label>
                <select
                  value={newUser.club_id}
                  onChange={e => setNewUser({...newUser, club_id: e.target.value})}
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent text-gray-900 appearance-none cursor-pointer"
                >
                  <option value="">Sistema Central</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Rango de Autorización</label>
                <select
                  value={newUser.rol}
                  onChange={e => setNewUser({...newUser, rol: e.target.value})}
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent text-gray-900 appearance-none cursor-pointer"
                >
                  {ROLES_DISPONIBLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {newUser.rol === 'escenario_deportivo' && (
            <div className="border-t border-gray-100 pt-2">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-black text-sm uppercase tracking-widest text-gray-400">Activos Asignados ({selectedEscenarios.length})</h4>
                <ShieldCheck size={16} className="text-emerald-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto custom-scrollbar">
                {allEscenarios.map(esc => (
                  <button
                    key={esc.id}
                    type="button"
                    onClick={() => setSelectedEscenarios(prev => prev.includes(esc.id) ? prev.filter(i => i !== esc.id) : [...prev, esc.id])}
                    className={`flex flex-col text-left p-4 rounded-2xl border-2 transition-all ${
                      selectedEscenarios.includes(esc.id)
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <span className={`text-sm font-bold ${selectedEscenarios.includes(esc.id) ? 'text-emerald-700' : 'text-gray-900'}`}>{esc.nombre}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider mt-1 ${selectedEscenarios.includes(esc.id) ? 'text-emerald-600' : 'text-gray-400'}`}>{esc.deporte}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="flex-1 h-12 rounded-xl font-bold text-gray-500">
              Cancelar
            </Button>
            <Button
              isLoading={actionLoading}
              type="submit"
              className="flex-[2] h-12 bg-black text-white font-bold rounded-xl shadow-sm hover:bg-black/90 transition-all"
            >
              {isEditMode ? 'Guardar Cambios' : 'Crear Acceso'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      {confirmConfig?.isOpen && (
        <Modal
          isOpen={confirmConfig.isOpen}
          onClose={() => setConfirmConfig(prev => prev ? { ...prev, isOpen: false } : null)}
          title={confirmConfig.title}
          maxWidth="max-w-md"
        >
          <div className="modal-form space-y-6">
            <p className="text-sm font-medium text-gray-600 leading-relaxed whitespace-pre-line">
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                variant="ghost"
                onClick={() => setConfirmConfig(prev => prev ? { ...prev, isOpen: false } : null)}
                className="rounded-xl px-5 text-gray-500"
              >
                {confirmConfig.cancelText || 'Cancelar'}
              </Button>
              <Button
                isLoading={actionLoading}
                onClick={() => {
                  confirmConfig.onConfirm();
                }}
                className={cn(
                  "rounded-xl px-5 font-bold transition-all border-none",
                  confirmConfig.isDanger
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-sm"
                    : "bg-black text-white hover:bg-black/90 shadow-sm"
                )}
              >
                {confirmConfig.confirmText || 'Confirmar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
