import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  Search, UserPlus, RefreshCw, Pencil, Trash2, Building2, Mail, Phone, Shield, Users
} from 'lucide-react';

interface Entrenador {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  rol: string;
  club_id: string | null;
  estado: string;
  created_at: string;
  clubes?: { nombre: string } | null;
}

interface ClubOption { id: string; nombre: string; }

const INITIAL_FORM = {
  nombre: '', email: '', password: '', telefono: '', club_id: ''
};

export default function JefaturaEntrenadores() {
  const [entrenadores, setEntrenadores] = useState<Entrenador[]>([]);
  const [clubes, setClubes] = useState<ClubOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClub, setFilterClub] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('perfiles')
        .select('*, clubes!left(nombre)')
        .eq('rol', 'entrenador')
        .order('created_at', { ascending: false });
      setEntrenadores(data || []);

      const { data: c } = await supabase.from('clubes').select('id, nombre').order('nombre');
      setClubes(c || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre) {
      setFormError('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editId) {
        const { error } = await supabase
          .from('perfiles')
          .update({ nombre: form.nombre, telefono: form.telefono || null, club_id: form.club_id || null })
          .eq('id', editId);
        if (error) throw error;
        setSuccessMsg('Entrenador actualizado correctamente');
      } else {
        if (!form.email || !form.password) {
          setFormError('Email y contraseña son obligatorios para crear un nuevo entrenador');
          setSaving(false);
          return;
        }
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            data: { nombre: form.nombre, rol: 'entrenador', telefono: form.telefono, club_id: form.club_id || null }
          })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Error al crear entrenador');
        setSuccessMsg('Entrenador creado correctamente');
      }

      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar permanentemente a "${name}"?`)) return;
    try {
      await supabase.from('perfiles').delete().eq('id', id);
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?id=eq.${id}`, {
          method: 'DELETE',
          headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY }
        });
      } catch { /* user may not exist in auth */ }
      setSuccessMsg(`"${name}" eliminado`);
      fetchData();
    } catch (err: any) {
      setFormError(err.message);
    }
    setTimeout(() => { setSuccessMsg(null); setFormError(null); }, 3000);
  };

  const openEdit = (e: Entrenador) => {
    setEditId(e.id);
    setForm({ nombre: e.nombre, email: e.email || '', password: '', telefono: e.telefono || '', club_id: e.club_id || '' });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditId(null);
    setFormError(null);
  };

  const filtered = entrenadores.filter(e => {
    const q = search.toLowerCase();
    const matchesSearch = e.nombre.toLowerCase().includes(q) ||
                         (e.email || '').toLowerCase().includes(q);
    const matchesClub = filterClub === 'all' || e.club_id === filterClub;
    return matchesSearch && matchesClub;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      {successMsg && (
        <div className={`p-4 rounded-2xl text-xs border font-bold ${successMsg.includes('Error') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
          {successMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-[#182332] to-[#bd0f10] text-white rounded-xl shadow-sm">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#182332] tracking-tight">Entrenadores</h2>
            <p className="text-xs text-gray-500">Gestión de entrenadores registrados en el sistema.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} className="h-10 px-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </Button>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="h-10 px-5 bg-[#182332] text-white rounded-xl text-xs font-bold hover:bg-[#bd0f10] transition-all flex items-center gap-2">
            <UserPlus className="w-3.5 h-3.5" />
            Agregar Entrenador
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182332] transition-all"
          />
        </div>
        <div className="relative min-w-[180px]">
          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <select
            value={filterClub}
            onChange={e => setFilterClub(e.target.value)}
            className="w-full h-[46px] bg-white border border-gray-200 rounded-2xl pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#182332] appearance-none cursor-pointer"
          >
            <option value="all">Todos los clubes</option>
            {clubes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#182332]" />
          <p className="italic">Cargando entrenadores...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-2xl">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-400">No hay entrenadores registrados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/80 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-5 py-3">Entrenador</th>
                  <th className="px-5 py-3">Contacto</th>
                  <th className="px-5 py-3">Club</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#182332] to-[#bd0f10] flex items-center justify-center text-white font-bold text-xs">
                          {e.nombre?.charAt(0)?.toUpperCase() || 'E'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#182332]">{e.nombre}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {e.email && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                          <Mail className="w-3 h-3" />{e.email}
                        </div>
                      )}
                      {e.telefono && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                          <Phone className="w-3 h-3" />{e.telefono}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold text-gray-600">{e.clubes?.nombre || '-'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        e.estado === 'activo' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-500/10 text-gray-500'
                      }`}>
                        {e.estado || 'activo'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(e)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(e.id, e.nombre)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all" title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editId ? 'Editar Entrenador' : 'Agregar Entrenador'} maxWidth="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && <p className="text-xs text-red-500 bg-red-50 p-3 rounded-xl font-bold">{formError}</p>}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nombre *</label>
            <input
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#182332] transition-all"
              placeholder="Nombre completo"
            />
          </div>

          {!editId && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#182332] transition-all"
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contraseña *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#182332] transition-all"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Teléfono</label>
              <input
                value={form.telefono}
                onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#182332] transition-all"
                placeholder="300 123 4567"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Club</label>
              <select
                value={form.club_id}
                onChange={e => setForm(f => ({ ...f, club_id: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#182332]"
              >
                <option value="">Sin club</option>
                {clubes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 h-12 rounded-xl font-bold text-gray-500">
              Cancelar
            </Button>
            <Button isLoading={saving} disabled={saving} className="flex-[2] h-12 bg-[#182332] text-white font-bold rounded-xl hover:bg-[#182332]/90 transition-all">
              {editId ? 'Guardar Cambios' : 'Crear Entrenador'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
