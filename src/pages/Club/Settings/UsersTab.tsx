import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { Users, Plus, Mail, Shield, ShieldCheck, UserPlus, Search, Trash2, Power, PowerOff, CheckCircle2, Edit3 } from 'lucide-react';
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
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('perfiles')
            .upsert({
              id: authData.user.id,
              email: userForm.email.toLowerCase().trim(),
              nombre: userForm.nombre,
              rol: userForm.rol,
              club_id: profile.club_id,
              deportista_id: userForm.rol === 'padre' ? userForm.deportista_id : null,
              estado: 'activo'
            });

          if (profileError) throw profileError;

          setSuccessMsg('Usuario creado correctamente. Se ha enviado un correo de confirmación.');
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

  const filteredUsers = users.filter(u => 
    u.nombre?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (rol: string) => {
    const roleLabels: any = {
      admin_club: { label: 'Admin Club', class: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200/50' },
      direccion_deportiva: { label: 'Dirección Deportiva', class: 'bg-lime-50 text-lime-700 dark:bg-[#daff01]/10 dark:text-[#daff01] border-lime-200/50' },
      cartera: { label: 'Cartera', class: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200/50' },
      comunicaciones: { label: 'Comunicaciones', class: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200/50' },
      admin_equipo: { label: 'Admin Equipo', class: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200/50' },
      entrenador: { label: 'Entrenador', class: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 border-green-200/50' },
      padre: { label: 'Padre/Hijo', class: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200/50' }
    };
    const role = roleLabels[rol] || { label: rol, class: 'bg-gray-50 text-gray-700' };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${role.class}`}>
        {role.label}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight font-outfit">Gestión de Usuarios</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Administra el personal y sus roles dentro del club.</p>
          </div>
        </div>
        
        <Button 
          onClick={handleOpenModal}
          disabled={atUserLimit}
          className={`${atUserLimit ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-900 dark:bg-[#daff01] dark:text-gray-900 shadow-lg shadow-black/5 hover:scale-105 active:scale-95'} font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 border-0 transition-all`}
          title={atUserLimit ? `Límite de usuarios alcanzado (${planLimits?.usuarios})` : 'Añadir nuevo usuario'}
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </Button>
      </div>

      {successMsg && (
        <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-4 flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">{successMsg}</p>
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
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#1e293b]/50 border border-gray-200 dark:border-[#334155] rounded-xl text-sm focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all dark:text-white"
        />
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white dark:bg-[#16171b] border border-gray-200 dark:border-[#26282e] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-[#26282e]">
            <thead className="bg-gray-50 dark:bg-[#111215]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#26282e]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">Cargando usuarios...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">No se encontraron usuarios.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-900 dark:bg-[#daff01] flex items-center justify-center text-white dark:text-gray-900 font-bold">
                          {user.nombre?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{user.nombre}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.rol)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold ${user.estado === 'activo' ? 'text-green-600' : 'text-red-500'}`}>
                        {user.estado === 'activo' ? <CheckCircle2 className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                        {user.estado === 'activo' ? 'Activo' : 'Suspendido'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => toggleUserStatus(user)}
                          className={`p-2 rounded-lg transition-colors ${user.estado === 'activo' ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                          title={user.estado === 'activo' ? 'Suspender' : 'Activar'}
                        >
                          {user.estado === 'activo' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => deleteUser(user.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          <div className="bg-white dark:bg-[#16171b] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 dark:border-[#26282e] bg-gray-50/50 dark:bg-[#111215]">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white font-outfit uppercase tracking-tight">{isEditMode ? 'Actualizar Personal' : 'Nuevo Personal'}</h3>
              <p className="text-sm text-gray-500 mt-1">{isEditMode ? 'Modifica los datos del colaborador.' : 'Ingresa los datos para autorizar a un nuevo colaborador.'}</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <Input
                label="Nombre Completo"
                placeholder="Ej: Juan Pérez"
                required
                value={userForm.nombre}
                onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
              />

              <Input
                label="Correo Electrónico"
                type="email"
                placeholder="juan@ejemplo.com"
                required
                disabled={isEditMode}
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                icon={<Mail className="w-4 h-4" />}
              />

              {!isEditMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                    label="Contraseña"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    />
                    <Input
                    label="Confirmar Contraseña"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={userForm.confirmPassword}
                    onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                    />
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-900 dark:text-gray-200 uppercase tracking-wider">Asignar Rol</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                  {ROLES.filter(role => !activeModules || activeModules.includes(role.moduleKey)).map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setUserForm({ ...userForm, rol: role.value })}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        userForm.rol === role.value
                          ? 'bg-[#CCFF00]/5 border-[#CCFF00] shadow-sm'
                          : 'bg-white dark:bg-[#1e293b]/30 border-gray-100 dark:border-[#334155] hover:border-gray-200 dark:hover:border-[#475569]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-bold ${
                          userForm.rol === role.value ? 'text-gray-900 dark:text-[#daff01]' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {role.label}
                        </span>
                        {userForm.rol === role.value && <ShieldCheck className="w-4 h-4 text-[#CCFF00]" />}
                      </div>
                      <p className="text-[10px] font-medium leading-relaxed text-gray-500 dark:text-gray-400">
                        {role.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {userForm.rol === 'padre' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-sm font-bold text-gray-900 dark:text-gray-200 uppercase tracking-wider">Vincular Deportista</label>
                  <select
                    required
                    value={userForm.deportista_id}
                    onChange={(e) => setUserForm({ ...userForm, deportista_id: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-[#1e293b]/50 border border-gray-200 dark:border-[#334155] rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#CCFF00] dark:text-white"
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
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  className="flex-1 font-bold rounded-2xl h-12"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  isLoading={saving}
                  className="flex-1 bg-gray-900 dark:bg-[#daff01] dark:text-gray-900 font-bold rounded-2xl h-12 border-0 shadow-lg shadow-black/5"
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
