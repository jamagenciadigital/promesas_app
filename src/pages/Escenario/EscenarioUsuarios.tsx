import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import { Search, Plus, Trash2, Edit2, Users, Shield, Mail, Trophy } from 'lucide-react';

const ROLES = [
  { value: 'liga', label: 'Liga', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  { value: 'admin_club', label: 'Club', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { value: 'padre', label: 'Padre', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { value: 'admin_escenario', label: 'AdminEscenario', color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
];

export default function EscenarioUsuarios() {
  const [users, setUsers] = useState<any[]>([]);
  const [ligas, setLigas] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'liga',
    liga_id: '',
  });

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('perfiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  const fetchLigas = async () => {
    const { data } = await supabase.from('ligas').select('id, nombre').order('nombre');
    setLigas(data || []);
  };

  useEffect(() => { fetchUsers(); fetchLigas(); }, []);

  const handleOpenModal = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setFormData({ nombre: user.nombre || '', email: user.email || '', password: '', rol: user.rol || 'liga', liga_id: user.liga_id || '' });
    } else {
      setEditingUser(null);
      setFormData({ nombre: '', email: '', password: '', rol: 'liga', liga_id: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        const payload: any = { nombre: formData.nombre, rol: formData.rol };
        if (formData.rol === 'liga') payload.liga_id = formData.liga_id || null;
        else payload.liga_id = null;
        const { error } = await supabase.from('perfiles').update(payload).eq('id', editingUser.id);
        if (error) throw error;
        setSuccessMsg('Usuario actualizado');
      } else {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
          body: JSON.stringify({
            email: formData.email.toLowerCase().trim(),
            password: formData.password,
            data: { nombre: formData.nombre, rol: formData.rol, liga_id: formData.rol === 'liga' ? (formData.liga_id || null) : null },
          }),
        });
        const result = await res.json();
        if (result.error) throw new Error(result.error.message || result.error);
        setSuccessMsg('Usuario creado');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: any) => {
    if (!window.confirm(`¿Eliminar a ${user.nombre || user.email}?`)) return;
    try {
      await supabase.from('perfiles').delete().eq('id', user.id);
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`, {
        method: 'DELETE',
        headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
      });
      setSuccessMsg('Usuario eliminado');
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = users.filter(u =>
    (u.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl">
          <Users className="w-5 h-5 text-[var(--primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Gestión Usuarios</h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{users.length} usuarios registrados</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--primary)] transition-colors" size={16} />
          <input type="text" placeholder="Buscar por nombre o email..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 bg-white dark:bg-[#16171b] border border-gray-200 dark:border-white/10 rounded-xl pl-11 pr-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[var(--primary)] transition-all placeholder:text-gray-400" />
        </div>
        <Button onClick={() => handleOpenModal()} className="h-11 px-5 bg-[var(--primary)] text-black font-black uppercase italic tracking-widest text-[10px] rounded-xl hover:scale-105 active:scale-95 transition-all">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Nuevo Usuario
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-gray-50 dark:bg-black/20 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-[32px]">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest italic">{search ? 'No hay resultados' : 'No hay usuarios registrados'}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(user => {
            const roleInfo = ROLES.find(r => r.value === user.rol);
            const ligaNombre = ligas.find(l => l.id === user.liga_id)?.nombre;
            return (
              <div key={user.id} className="group flex items-center gap-3 p-3.5 bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-xl hover:border-gray-200 dark:hover:border-white/10 transition-all">
                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-xs font-black text-gray-500 dark:text-gray-300 shrink-0">
                  {(user.nombre || user.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 dark:text-white truncate">{user.nombre || 'Sin nombre'}</p>
                  <p className="text-[9px] text-gray-500 truncate">
                    <Mail className="w-2.5 h-2.5 inline mr-1" />{user.email || '—'}
                    {ligaNombre && <span className="ml-2 inline-flex items-center gap-1 text-indigo-500"><Trophy className="w-2.5 h-2.5" />{ligaNombre}</span>}
                  </p>
                </div>
                <Badge className={`${roleInfo?.color || 'bg-gray-500/10 text-gray-500'} text-[7px] px-2.5 py-1 border-none uppercase font-black italic shrink-0`}>
                  <Shield className="w-2.5 h-2.5 mr-1 inline" />{roleInfo?.label || user.rol}
                </Badge>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button onClick={() => handleOpenModal(user)} variant="ghost" size="icon" className="rounded-lg text-gray-500 hover:text-[var(--primary)]"><Edit2 size={12} /></Button>
                  <Button onClick={() => handleDelete(user)} variant="ghost" size="icon" className="rounded-lg text-gray-500 hover:text-red-500"><Trash2 size={12} /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}>
        <form onSubmit={handleSubmit} className="p-2 space-y-4">
          <Input label="Nombre" required value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} placeholder="Nombre completo" className="bg-gray-50 dark:bg-black/40 h-11" />
          <Input label="Email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="usuario@ejemplo.com" className="bg-gray-50 dark:bg-black/40 h-11" disabled={!!editingUser} />
          {!editingUser && <Input label="Contraseña" type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Mínimo 6 caracteres" className="bg-gray-50 dark:bg-black/40 h-11" />}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1 italic">Rol</label>
            <select value={formData.rol} onChange={(e) => setFormData({ ...formData, rol: e.target.value, liga_id: '' })}
              className="w-full h-11 px-4 bg-gray-50 dark:bg-black/40 rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none border border-transparent focus:border-[var(--primary)] transition-all appearance-none">
              {ROLES.map(r => <option key={r.value + r.label} value={r.value} className="bg-white dark:bg-[#16171b]">{r.label}</option>)}
            </select>
          </div>
          {formData.rol === 'liga' && (
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1 italic">Liga Asignada</label>
              <select value={formData.liga_id} onChange={(e) => setFormData({ ...formData, liga_id: e.target.value })}
                className="w-full h-11 px-4 bg-gray-50 dark:bg-black/40 rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none border border-transparent focus:border-[var(--primary)] transition-all appearance-none">
                <option value="" className="bg-white dark:bg-[#16171b]">Seleccionar liga...</option>
                {ligas.map(l => <option key={l.id} value={l.id} className="bg-white dark:bg-[#16171b]">{l.nombre}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 h-11 rounded-xl text-gray-500 font-black uppercase italic tracking-widest text-[9px]">Cancelar</Button>
            <Button type="submit" isLoading={saving} className="flex-[2] h-11 bg-[var(--primary)] text-black font-black uppercase italic tracking-widest text-[10px] rounded-xl">{editingUser ? 'Guardar' : 'Crear Usuario'}</Button>
          </div>
        </form>
      </Modal>

      {successMsg && <Toast message={successMsg} onClose={() => setSuccessMsg(null)} />}
    </div>
  );
}
