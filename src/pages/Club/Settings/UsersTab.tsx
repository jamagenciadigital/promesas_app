import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { Users, Plus, Mail, Shield, ShieldCheck, UserPlus, Search, Trash2, Power, PowerOff, CheckCircle2, Edit3, KeyRound } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

interface UserMember {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  estado: 'activo' | 'suspendido';
  created_at: string;
  deportista_id?: string;
}

const ROLES = [
  { value: 'admin_club', label: 'Admin Club', description: 'Acceso total a la configuración del club', moduleKey: 'admin_club' },
  { value: 'direccion_deportiva', label: 'Dirección Deportiva', description: 'Dashboard técnico, rendimiento y scouting', moduleKey: 'direccion_deportiva' },
  { value: 'cartera', label: 'Cartera', description: 'Gestión de cobros y reportes financieros', moduleKey: 'cartera' },
  { value: 'comunicaciones', label: 'Comunicaciones', description: 'Gestión de noticias y mensajería', moduleKey: 'comunicaciones' },
  { value: 'admin_equipo', label: 'Admin Equipo', description: 'Gestión de equipos y delegados', moduleKey: 'admin_equipo' },
  { value: 'entrenador', label: 'Entrenador', description: 'Gestión de entrenamientos y partidos', moduleKey: 'entrenadores' },
  { value: 'padre', label: 'Padre/Hijo', description: 'Acceso para padres y jugadores a su información', moduleKey: 'padre_hijo' }
];

export default function UsersTab() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
   // Form state
  const [userForm, setUserForm] = useState({
    nombre: '',
    email: '',
    rol: 'entrenador',
    password: '',
    confirmPassword: '',
    deportista_id: ''
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [deportistas, setDeportistas] = useState<{ id: string; nombre_completo: string; apellidos: string }[]>([]);
  const [activeModules, setActiveModules] = useState<string[] | null>(null);
  const [planLimits, setPlanLimits] = useState<{ usuarios: number } | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchDeportistas();
    loadPlanModules();
  }, [profile?.club_id]);

  async function loadPlanModules() {
    if (!profile?.club_id) return;
    try {
      const { data: club } = await supabase.from('clubes').select('plan_id').eq('id', profile.club_id).single();
      if (club?.plan_id) {
        const { data: plan } = await supabase.from('planes_suscripcion').select('modulos_activos, limite_usuarios').eq('id', club.plan_id).single();
        if (plan) {
          const actives = plan.modulos_activos || [];
          setActiveModules(actives);
          setPlanLimits({ usuarios: plan.limite_usuarios });
          
          // Ajustar rol por defecto si el actual no está permitido
          if (!actives.includes('entrenadores')) {
            const firstValidRole = ROLES.find(r => actives.includes(r.moduleKey));
            if (firstValidRole) {
              setUserForm(prev => ({ ...prev, rol: firstValidRole.value }));
            }
          }
        }
      }
    } catch(e) {
      console.error(e);
    }
  }

  async function fetchDeportistas() {
    if (!profile?.club_id) return;
    try {
      const { data, error } = await supabase
        .from('deportistas')
        .select('id, nombre_completo, apellidos')
        .eq('club_id', profile.club_id)
        .order('nombre_completo');
      if (error) throw error;
      setDeportistas(data || []);
    } catch (err) {
      console.error("Error fetching deportistas:", err);
    }
  }

  async function fetchUsers() {
    if (!profile?.club_id) return;
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('perfiles')
        .select('*')
        .eq('club_id', profile.club_id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setUsers(data || []);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const atUserLimit = planLimits?.usuarios !== undefined && planLimits.usuarios !== -1 && users.length >= planLimits.usuarios;

  const handleOpenModal = () => {
    if (atUserLimit) {
      alert(`Has alcanzado el límite de usuarios (${planLimits.usuarios}) para tu plan actual. Mejora tu plan para añadir más.`);
      return;
    }
    setIsEditMode(false);
    setEditingUserId(null);
    setUserForm({ nombre: '', email: '', rol: 'entrenador', password: '', confirmPassword: '', deportista_id: '' });
    setError(null);
    setShowModal(true);
  };

  const handleEditUser = (user: UserMember) => {
    setIsEditMode(true);
    setEditingUserId(user.id);
    setUserForm({
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      password: '',
      confirmPassword: '',
      deportista_id: user.deportista_id || ''
    });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.club_id) return;
    
    if (!isEditMode && atUserLimit) {
      setError(`Límite de usuarios alcanzado (${planLimits!.usuarios}). No puedes crear más usuarios.`);
      return;
    }

    if (!isEditMode) {
        if (userForm.password !== userForm.confirmPassword) {
          setError('Las contraseñas no coinciden.');
          return;
        }

        if (userForm.password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres.');
          return;
        }
    }

    const selectedRole = ROLES.find(r => r.value === userForm.rol);
    if (activeModules && selectedRole && !activeModules.includes(selectedRole.moduleKey)) {
      setError('El rol seleccionado no está incluido en el Plan B2B de este club.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditMode && editingUserId) {
        // Actualizar perfil existente
        const { error: profileError } = await supabase
          .from('perfiles')
          .update({
            nombre: userForm.nombre,
            rol: userForm.rol,
            deportista_id: userForm.rol === 'padre' ? userForm.deportista_id : null,
          })
          .eq('id', editingUserId);

        if (profileError) throw profileError;

        setSuccessMsg('Usuario actualizado correctamente.');
        setShowModal(false);
        fetchUsers();
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        // Crear nuevo usuario
        const { createClient } = await import('@supabase/supabase-js');
        const tempClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { persistSession: false } }
        );

        const { data: authData, error: authError } = await tempClient.auth.signUp({
          email: userForm.email.toLowerCase().trim(),
          password: userForm.password,
          options: {
            data: {
              nombre: userForm.nombre,
              rol: userForm.rol,
              club_id: profile.club_id,
              deportista_id: userForm.rol === 'padre' ? userForm.deportista_id : null,
              estado: 'activo',
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/api/notifications/welcome`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: userForm.email.toLowerCase().trim(),
              nombre: userForm.nombre,
              club_id: profile.club_id,
            })
          }).catch(err => console.error('Error sending welcome email:', err));

          setSuccessMsg('Usuario creado correctamente. Se ha enviado un correo de bienvenida.');
          setShowModal(false);
          fetchUsers();
          setTimeout(() => setSuccessMsg(null), 8000);
        }
      }
    } catch (err: any) {
      console.error("Error saving user:", err);
      setError(err.message || 'Error al guardar el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const toggleUserStatus = async (user: UserMember) => {
    const nuevoEstado = user.estado === 'activo' ? 'suspendido' : 'activo';
    try {
      const { error: updateError } = await supabase
        .from('perfiles')
        .update({ estado: nuevoEstado })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      setUsers(users.map(u => u.id === user.id ? { ...u, estado: nuevoEstado } : u));
      setSuccessMsg(`Usuario ${nuevoEstado === 'activo' ? 'activado' : 'suspendido'} correctamente.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      const { error: deleteError } = await supabase
        .from('perfiles')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      setUsers(users.filter(u => u.id !== id));
      setSuccessMsg('Usuario eliminado correctamente.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSendRecovery = async (user: UserMember) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al enviar recuperación');
      }

      setSuccessMsg(`Correo de recuperación enviado a ${user.email}`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredUsers = users.filter(u => 
    u.nombre?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (rol: string) => {
    const roleLabels: any = {
      admin_club: { label: 'Admin Club', class: 'bg-red-50 text-red-700 border-red-200/50' },
      direccion_deportiva: { label: 'Dirección Deportiva', class: 'bg-lime-50 text-lime-700 border-lime-200/50' },
      cartera: { label: 'Cartera', class: 'bg-blue-50 text-blue-700 border-blue-200/50' },
      comunicaciones: { label: 'Comunicaciones', class: 'bg-indigo-50 text-indigo-700 border-indigo-200/50' },
      admin_equipo: { label: 'Admin Equipo', class: 'bg-amber-50 text-amber-700 border-amber-200/50' },
      entrenador: { label: 'Entrenador', class: 'bg-green-50 text-green-700 border-green-200/50' },
      padre: { label: 'Padre/Hijo', class: 'bg-purple-50 text-purple-700 border-purple-200/50' }
    };
    const role = roleLabels[rol] || { label: rol, class: 'bg-gray-50 text-gray-700' };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${role.class}`}>
        {role.label}
      </span>
    );
  };

  return (
    <div className="p-[1.2rem] space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#182332] tracking-tight">Gestión de Usuarios</h2>
          <p className="text-sm text-gray-400 mt-1">Administra el personal y sus roles dentro del club.</p>
        </div>
        <Button
          onClick={handleOpenModal}
          disabled={atUserLimit}
          className={`${atUserLimit ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-black text-white hover:bg-black/90'} font-bold px-5 h-11 rounded-2xl flex items-center gap-2 border-0 shadow-sm transition-all`}
          title={atUserLimit ? `Límite de usuarios alcanzado (${planLimits?.usuarios})` : 'Añadir nuevo usuario'}
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </Button>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
          <p className="text-sm font-medium text-green-700">{successMsg}</p>
        </div>
      )}

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-11 bg-white border border-gray-200 rounded-2xl pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent outline-none text-gray-900 placeholder-gray-400 transition-all"
        />
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-4 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-4 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">Cargando usuarios...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">No se encontraron usuarios.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-[#182332] flex items-center justify-center text-white font-bold text-sm">
                          {user.nombre?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{user.nombre}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.rol)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${user.estado === 'activo' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {user.estado === 'activo' ? <CheckCircle2 className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                        {user.estado === 'activo' ? 'Activo' : 'Suspendido'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSendRecovery(user)}
                          className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:scale-110 transition-all hover:bg-yellow-50 hover:text-yellow-500"
                          title="Restaurar contraseña"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:scale-110 transition-all hover:bg-blue-50 hover:text-blue-500"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleUserStatus(user)}
                          className={`p-2 bg-gray-50 text-gray-400 rounded-lg hover:scale-110 transition-all ${user.estado === 'activo' ? 'hover:bg-amber-50 hover:text-amber-500' : 'hover:bg-emerald-50 hover:text-emerald-500'}`}
                          title={user.estado === 'activo' ? 'Suspender' : 'Activar'}
                        >
                          {user.estado === 'activo' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:scale-110 transition-all hover:bg-red-50 hover:text-red-500"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Usuario */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-[#182332]">{isEditMode ? 'Actualizar Personal' : 'Nuevo Personal'}</h3>
              <p className="text-sm text-gray-400 mt-1">{isEditMode ? 'Modifica los datos del colaborador.' : 'Ingresa los datos para autorizar a un nuevo colaborador.'}</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 modal-form space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nombre Completo</label>
                <input
                  placeholder="Ej: Juan Pérez"
                  required
                  value={userForm.nombre}
                  onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="juan@ejemplo.com"
                  required
                  disabled={isEditMode}
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>

              {!isEditMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Contraseña</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      required
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirmar Contraseña</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      required
                      value={userForm.confirmPassword}
                      onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                      className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-700">Asignar Rol</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                  {ROLES.filter(role => !activeModules || activeModules.includes(role.moduleKey)).map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setUserForm({ ...userForm, rol: role.value })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        userForm.rol === role.value
                          ? 'bg-[#CCFF00]/5 border-[#CCFF00] shadow-sm'
                          : 'bg-white border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-semibold ${userForm.rol === role.value ? 'text-gray-900' : 'text-gray-700'}`}>
                          {role.label}
                        </span>
                        {userForm.rol === role.value && <ShieldCheck className="w-4 h-4 text-[#CCFF00]" />}
                      </div>
                      <p className="text-[10px] font-medium leading-relaxed text-gray-400">
                        {role.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {userForm.rol === 'padre' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-xs font-semibold text-gray-700">Vincular Deportista</label>
                  <select
                    required
                    value={userForm.deportista_id}
                    onChange={(e) => setUserForm({ ...userForm, deportista_id: e.target.value })}
                    className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent text-gray-900 appearance-none cursor-pointer"
                  >
                    <option value="">Selecciona un deportista...</option>
                    {deportistas.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre_completo} {d.apellidos}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold border border-red-100">
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-12 rounded-xl font-bold text-gray-500"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  isLoading={saving}
                  className="flex-[2] h-12 bg-black text-white font-bold rounded-xl shadow-sm hover:bg-black/90 transition-all"
                >
                  {isEditMode ? 'Actualizar' : 'Crear Usuario'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
