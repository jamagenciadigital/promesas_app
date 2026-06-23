import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, ShieldAlert, Search, UserPlus, Power, 
  Trash2, Edit3, Mail, Activity, ArrowLeft,
  ShieldCheck, Key, Building2, MapPin
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
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

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: profiles, error: pError } = await supabase.from('perfiles').select('*, clubes(nombre)').order('created_at', { ascending: false });
      if (pError) throw pError;
      const { data: clubsList } = await supabase.from('clubes').select('id, nombre').order('nombre');
      setClubs(clubsList || []);
      const { data: escList } = await supabase.from('escenarios').select('id, nombre, deporte');
      setAllEscenarios(escList || []);
      setAdmins(profiles?.map((p: any) => ({
        id: p.id, nombre: p.nombre || 'N/A', email: p.email || 'N/A', club_nombre: p.clubes?.nombre || 'CENTRAL', estado: p.estado || 'activo', created_at: p.created_at, club_id: p.club_id, rol: p.rol || 'unassigned'
      })) || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setResetError(null);

    try {
      if (isEditMode && editingAdminId) {
        const { error } = await supabase.from('perfiles').update({ nombre: newUser.nombre, rol: newUser.rol, club_id: newUser.club_id || null }).eq('id', editingAdminId);
        if (error) throw error;
        if (newUser.rol === 'escenario_deportivo') {
            await supabase.from('escenarios').update({ gestor_id: null }).eq('gestor_id', editingAdminId);
            if (selectedEscenarios.length > 0) await supabase.from('escenarios').update({ gestor_id: editingAdminId }).in('id', selectedEscenarios);
        }
      } else {
        const signupRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
          body: JSON.stringify({
            email: newUser.email,
            password: newUser.password,
            data: { 
              full_name: newUser.nombre,
              nombre: newUser.nombre,
              rol: newUser.rol
            }
          })
        });

        const authData = await signupRes.json();
        if (!signupRes.ok) throw new Error(`Paso 1 (Auth) Falló: ${authData.error || authData.msg || 'Error'}`);
        const uid = authData.user?.id;
        if (!uid) throw new Error("No se pudo obtener el UID del nuevo usuario.");

        await new Promise(resolve => setTimeout(resolve, 1500));

        const { error: profileError } = await supabase.from('perfiles').upsert({ 
          id: uid, 
          nombre: newUser.nombre, 
          email: newUser.email, 
          rol: newUser.rol, 
          club_id: newUser.club_id || null, 
          estado: 'activo' 
        }, { onConflict: 'id' });

        if (profileError) throw new Error(`Paso 2 (Perfil) Falló: ${profileError.message}`);
        
        if (newUser.rol === 'escenario_deportivo' && selectedEscenarios.length > 0) {
            const { error: escError } = await supabase.from('escenarios').update({ gestor_id: uid }).in('id', selectedEscenarios);
            if (escError) console.error("Error vinculación escenarios:", escError);
        }
      }

      await fetchData();
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err: any) { 
        setResetError(err.message);
    } finally { setActionLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("🚨 ¿Eliminar este acceso permanentemente?")) return;
    try {
      const { error } = await supabase.from('perfiles').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err: any) { alert(err.message); }
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
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] -m-8 p-8">
      <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
        {/* Header Premium */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/superadmin')}
                className="p-2 hover:bg-white dark:hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-black dark:hover:text-white"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="h-10 w-1 bg-[#CCFF00] rounded-full"></div>
              <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
                Accesos <span className="text-[#CCFF00]">Administrativos</span>
              </h1>
            </div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] ml-14">
              Control de Personal y Rango de Autorización • {admins.length} Usuarios
            </p>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
            <div className="relative group min-w-[300px]">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#CCFF00] transition-colors">
                <Search size={18} />
              </div>
              <input 
                type="text"
                placeholder="BUSCAR USUARIO..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-14 bg-white dark:bg-[#1e293b] border-0 rounded-2xl pl-12 pr-6 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-[#CCFF00] shadow-sm transition-all outline-none text-gray-900 dark:text-white"
              />
            </div>
            <div className="relative group min-w-[200px]">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#CCFF00] transition-colors">
                <Building2 size={18} />
              </div>
              <select 
                value={selectedClub}
                onChange={(e) => setSelectedClub(e.target.value)}
                className="w-full h-14 bg-white dark:bg-[#1e293b] border-0 rounded-2xl pl-12 pr-10 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#CCFF00] shadow-sm transition-all outline-none text-gray-900 dark:text-white appearance-none cursor-pointer"
              >
                <option value="all">TODOS LOS CLUBES</option>
                <option value="central">SISTEMA CENTRAL</option>
                {clubs.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <Button 
              onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
              className="h-14 px-8 bg-black text-[#CCFF00] font-black uppercase italic tracking-widest rounded-2xl shadow-xl flex items-center gap-2"
            >
              <UserPlus size={18} />
              Nuevo Acceso
            </Button>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white dark:bg-[#1e293b] rounded-[40px] shadow-2xl shadow-black/5 overflow-hidden border border-gray-100 dark:border-white/5">
          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-gray-100 dark:border-white/5 border-t-[#CCFF00] rounded-full animate-spin"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Verificando Credenciales...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-black/20 border-b border-gray-100 dark:border-white/5">
                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Sujeto / Identidad</th>
                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Rango de Operación</th>
                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Organización</th>
                    <th className="px-8 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all duration-300">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-black dark:bg-white/10 flex items-center justify-center text-[#CCFF00] font-black italic text-xl shadow-lg border border-white/5">
                            {admin.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic leading-none group-hover:text-[#CCFF00] transition-colors">{admin.nombre}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-1.5 lowercase flex items-center gap-1">
                              <Mail size={10} /> {admin.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <Badge className={`uppercase text-[9px] font-black italic tracking-widest py-1.5 px-4 rounded-xl border-none ${
                          admin.rol === 'escenario_deportivo' 
                          ? 'bg-blue-500 text-white' 
                          : admin.rol === 'admin_club'
                          ? 'bg-[#CCFF00] text-black'
                          : admin.rol === 'jefatura'
                          ? 'bg-amber-500 text-white'
                          : 'bg-purple-500 text-white'
                        }`}>
                          {ROLES_DISPONIBLES.find(r => r.id === admin.rol)?.label || admin.rol}
                        </Badge>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <Building2 size={12} className="text-[#CCFF00]" />
                          <p className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase italic">
                            {admin.club_nombre}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => openEditModal(admin)} 
                            className="p-3 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-blue-500 rounded-2xl hover:scale-110 transition-all"
                            title="Editar Perfil"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(admin.id)} 
                            className="p-3 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-red-500 rounded-2xl hover:scale-110 transition-all"
                            title="Revocar Acceso"
                          >
                            <Trash2 size={18} />
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
      </div>

      {/* Modal modernizado */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        title={isEditMode ? "ACTUALIZAR CREDENCIALES" : "EMISIÓN DE NUEVO ACCESO"}
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-6 p-2">
          {resetError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
              <ShieldAlert size={20} className="text-red-500 shrink-0" />
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest italic">{resetError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="NOMBRE COMPLETO" 
              required 
              value={newUser.nombre} 
              onChange={e => setNewUser({...newUser, nombre: e.target.value})} 
              className="h-14 bg-gray-50 dark:bg-white/5 border-0 font-black italic uppercase"
              icon={<Users size={16} />}
            />
            <Input 
              label="CORREO ELECTRÓNICO" 
              type="email" 
              required 
              disabled={isEditMode} 
              value={newUser.email} 
              onChange={e => setNewUser({...newUser, email: e.target.value})} 
              className="h-14 bg-gray-50 dark:bg-white/5 border-0 font-black"
              icon={<Mail size={16} />}
            />
          </div>

          {!isEditMode && (
            <Input 
              label="CLAVE DE ACCESO TEMPORAL" 
              type="password" 
              required 
              value={newUser.password} 
              onChange={e => setNewUser({...newUser, password: e.target.value})} 
              className="h-14 bg-gray-50 dark:bg-white/5 border-0"
              icon={<Key size={16} />}
            />
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-white/5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Club / Organización</label>
              <select 
                className="w-full h-14 bg-gray-50 dark:bg-white/5 border-0 rounded-2xl px-5 text-xs font-black uppercase italic tracking-widest outline-none focus:ring-2 focus:ring-[#CCFF00] text-gray-900 dark:text-white" 
                value={newUser.club_id} 
                onChange={e => setNewUser({...newUser, club_id: e.target.value})}
              >
                <option value="" className="bg-white dark:bg-[#1e293b]">SISTEMA CENTRAL</option>
                {clubs.map(c => <option key={c.id} value={c.id} className="bg-white dark:bg-[#1e293b]">{c.nombre.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rango de Autorización</label>
              <select 
                className="w-full h-14 bg-gray-50 dark:bg-white/5 border-0 rounded-2xl px-5 text-xs font-black uppercase italic tracking-widest outline-none focus:ring-2 focus:ring-[#CCFF00] text-gray-900 dark:text-white" 
                value={newUser.rol} 
                onChange={e => setNewUser({...newUser, rol: e.target.value})}
              >
                {ROLES_DISPONIBLES.map(r => <option key={r.id} value={r.id} className="bg-white dark:bg-[#1e293b]">{r.label.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          {newUser.rol === 'escenario_deportivo' && (
            <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Activos Asignados ({selectedEscenarios.length})</label>
                <ShieldCheck size={14} className="text-[#CCFF00]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[180px] overflow-y-auto p-1 custom-scrollbar">
                {allEscenarios.map(esc => (
                  <button 
                    key={esc.id} 
                    type="button" 
                    onClick={() => (setSelectedEscenarios(prev => prev.includes(esc.id) ? prev.filter(i => i !== esc.id) : [...prev, esc.id]))} 
                    className={`flex flex-col text-left p-4 rounded-2xl border-2 transition-all ${
                      selectedEscenarios.includes(esc.id) 
                      ? 'bg-[#CCFF00] border-[#CCFF00] text-black' 
                      : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase italic leading-none">{esc.nombre}</span>
                    <span className={`text-[8px] font-bold uppercase mt-1.5 tracking-widest ${selectedEscenarios.includes(esc.id) ? 'text-black/50' : 'text-gray-500'}`}>{esc.deporte}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-6">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="flex-1 h-14 rounded-3xl uppercase font-black">
              Cancelar
            </Button>
            <Button 
              isLoading={actionLoading} 
              type="submit" 
              className="flex-[2] h-14 bg-black text-[#CCFF00] font-black uppercase italic tracking-widest rounded-3xl shadow-xl"
            >
              Confirmar Acceso
            </Button>
          </div>
        </form>
      </Modal>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #CCFF00; border-radius: 10px; }
      `}</style>
    </div>
  );
}
