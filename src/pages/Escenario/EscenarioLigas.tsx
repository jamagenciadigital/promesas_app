import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { Search, Trophy, Plus, Pencil, User, GraduationCap, Mail, MapPin } from 'lucide-react';

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

export default function EscenarioLigas() {
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [deportes, setDeportes] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form, setForm] = useState({ nombre: '', deporte_id: '', presidente: '', secretario: '', direccion: '', correo: '', telefono: '' });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ nombre: '', deporte_id: '', presidente: '', secretario: '', direccion: '', correo: '', telefono: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchLigas();
    supabase.from('deportes').select('id, nombre').order('nombre').then(({ data }) => setDeportes(data || []));
  }, []);

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

  const getDeporteName = (id: string) => deportes.find(d => d.id === id)?.nombre || '—';

  const filtered = ligas.filter(l => l.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl">
            <Trophy className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Ligas</h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{ligas.length} ligas registradas</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="h-11 px-5 bg-[var(--primary)] text-black font-black uppercase italic tracking-widest text-[10px] rounded-xl hover:scale-105 active:scale-95 transition-all">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Nueva Liga
        </Button>
      </div>

      <div className="relative max-w-md group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--primary)] transition-colors" size={16} />
        <input type="text" placeholder="Buscar liga..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full h-11 bg-white dark:bg-[#16171b] border border-gray-200 dark:border-white/10 rounded-xl pl-11 pr-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[var(--primary)] transition-all placeholder:text-gray-400" />
      </div>

      {loading ? (
        <div className="grid gap-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-white/5 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-gray-50 dark:bg-black/20 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-[32px]">
          <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest italic">{search ? 'No hay resultados' : 'No hay ligas registradas'}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(liga => (
            <div key={liga.id} className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-5 hover:border-gray-200 dark:hover:border-white/10 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-gray-900 dark:text-white uppercase italic tracking-tighter text-sm">{liga.nombre}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-[var(--primary-10)] text-[var(--primary)]">{getDeporteName(liga.deporte_id)}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
                    {liga.presidente && <span className="flex items-center gap-1"><User className="w-3 h-3" />{liga.presidente}</span>}
                    {liga.secretario && <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{liga.secretario}</span>}
                    {liga.correo && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{liga.correo}</span>}
                  </div>
                </div>
                <Button onClick={() => openEdit(liga)} variant="ghost" className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                  <Pencil className="w-3 h-3" /> Editar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Nueva Liga">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1 italic">Deporte</label>
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
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="flex-1 h-11 rounded-xl text-gray-500 font-black uppercase italic tracking-widest text-[9px]">Cancelar</Button>
            <Button type="submit" className="flex-[2] h-11 bg-[var(--primary)] text-black font-black uppercase italic tracking-widest text-[10px] rounded-xl">Crear Liga</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingId(null); }} title="Editar Liga">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-1 italic">Deporte</label>
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
            <Button type="button" variant="ghost" onClick={() => { setIsEditModalOpen(false); setEditingId(null); }} className="flex-1 h-11 rounded-xl text-gray-500 font-black uppercase italic tracking-widest text-[9px]">Cancelar</Button>
            <Button type="submit" className="flex-[2] h-11 bg-[var(--primary)] text-black font-black uppercase italic tracking-widest text-[10px] rounded-xl">Guardar Cambios</Button>
          </div>
        </form>
      </Modal>

      {successMsg && <Toast message={successMsg} onClose={() => setSuccessMsg(null)} />}
    </div>
  );
}
