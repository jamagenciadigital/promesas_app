import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  Search, Users, Plus, RefreshCw, Pencil, Trash2, Building2, Calendar, Phone, Mail, Eye, FileText, ExternalLink, Camera, ClipboardList, Heart, User, XCircle
} from 'lucide-react';

interface Deportista {
  id: string;
  nombre_completo: string;
  apellidos: string;
  segundo_apellido?: string | null;
  tipo_documento: string;
  numero_documento: string;
  email_deportista: string | null;
  celular_deportista: string | null;
  genero: string | null;
  fecha_nacimiento: string | null;
  club_id: string | null;
  equipo_id: string | null;
  estado: string;
  created_at: string;
  foto_url: string | null;
  registrado_por: string | null;
  club?: { nombre: string } | null;
  equipo?: { nombre: string } | null;
  // Documentos
  url_registro_civil?: string | null;
  url_documento_id?: string | null;
  url_contrato?: string | null;
  url_certificado_salud?: string | null;
  url_carta_traspaso?: string | null;
  // Datos adicionales
  eps?: string | null;
  rh?: string | null;
  tutor_nombre?: string | null;
  tutor_apellidos?: string | null;
  tutor_celular?: string | null;
  tutor_email?: string | null;
  emergencia_nombre?: string | null;
  emergencia_celular?: string | null;
  emergencia_email?: string | null;
  direccion?: string | null;
  barrio?: string | null;
  municipio?: string | null;
  departamento?: string | null;
  pais?: string | null;
  estatura?: number | null;
  peso?: number | null;
  dorsal?: number | null;
}

interface ClubOption { id: string; nombre: string; }
interface EquipoOption { id: string; nombre: string; }

const INITIAL_FORM = {
  nombre_completo: '', apellidos: '', tipo_documento: 'CC', numero_documento: '',
  email_deportista: '', celular_deportista: '', genero: '', fecha_nacimiento: '',
  club_id: '', equipo_id: '', estado: 'activo'
};

export default function EscenarioJugadores() {
  const { profile } = useAuth();
  const [deportistas, setDeportistas] = useState<Deportista[]>([]);
  const [clubes, setClubes] = useState<ClubOption[]>([]);
  const [equipos, setEquipos] = useState<EquipoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClub, setFilterClub] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Deportista | null>(null);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (form.club_id) {
      supabase.from('equipos').select('id, nombre').eq('club_id', form.club_id).order('nombre').then(({ data }) => setEquipos(data || []));
    } else {
      setEquipos([]);
    }
  }, [form.club_id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: d } = await supabase
        .from('deportistas')
        .select('*, club:clubes!deportistas_club_id_fkey(nombre), equipo:equipos!deportistas_equipo_id_fkey(nombre)')
        .order('created_at', { ascending: false });
      setDeportistas(d || []);

      const { data: c } = await supabase.from('clubes').select('id, nombre').order('nombre');
      setClubes(c || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre_completo || !form.apellidos || !form.numero_documento) {
      setFormError('Nombre, apellidos y documento son obligatorios');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: any = {
        nombre_completo: form.nombre_completo,
        apellidos: form.apellidos,
        tipo_documento: form.tipo_documento,
        numero_documento: form.numero_documento,
        email_deportista: form.email_deportista || null,
        celular_deportista: form.celular_deportista || null,
        genero: form.genero || null,
        fecha_nacimiento: form.fecha_nacimiento || null,
        club_id: form.club_id || null,
        equipo_id: form.equipo_id || null,
        estado: form.estado || 'activo'
      };

      if (!editId) {
        payload.registrado_por = 'escenario';
      }

      if (editId) {
        const { error } = await supabase.from('deportistas').update(payload).eq('id', editId);
        if (error) throw error;
        setSuccessMsg('Deportista actualizado correctamente');
      } else {
        const { error } = await supabase.from('deportistas').insert(payload);
        if (error) throw error;
        setSuccessMsg('Deportista creado correctamente');
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
      await supabase.from('deportistas').delete().eq('id', id);
      setSuccessMsg(`"${name}" eliminado`);
      fetchData();
    } catch (err: any) {
      setFormError(err.message);
    }
    setTimeout(() => { setSuccessMsg(null); setFormError(null); }, 3000);
  };

  const openEdit = (d: Deportista) => {
    setEditId(d.id);
    setForm({
      nombre_completo: d.nombre_completo,
      apellidos: d.apellidos,
      tipo_documento: d.tipo_documento,
      numero_documento: d.numero_documento,
      email_deportista: d.email_deportista || '',
      celular_deportista: d.celular_deportista || '',
      genero: d.genero || '',
      fecha_nacimiento: d.fecha_nacimiento || '',
      club_id: d.club_id || '',
      equipo_id: d.equipo_id || '',
      estado: d.estado || 'activo'
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditId(null);
    setFormError(null);
  };

  const filtered = deportistas.filter(j => {
    const q = search.toLowerCase();
    const matchesSearch = j.nombre_completo.toLowerCase().includes(q) ||
                         j.apellidos.toLowerCase().includes(q) ||
                         j.numero_documento.includes(q) ||
                         (j.email_deportista || '').toLowerCase().includes(q);
    const matchesClub = filterClub === 'all' || j.club_id === filterClub;
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
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#182332] tracking-tight">Deportistas</h2>
            <p className="text-xs text-gray-500">Gestión de deportistas registrados en el sistema.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} className="h-10 px-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </Button>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="h-10 px-5 bg-[var(--primary)] text-black font-bold hover:brightness-90 transition-all flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" />
            Nuevo Deportista
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, apellido, documento o email..."
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
          <p className="italic">Cargando deportistas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-2xl">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-400">No hay deportistas registrados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/80 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-5 py-3">Deportista</th>
                  <th className="px-5 py-3">Documento</th>
                  <th className="px-5 py-3">Contacto</th>
                  <th className="px-5 py-3">Club</th>
                  <th className="px-5 py-3">Equipo</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(j => (
                  <tr key={j.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#182332] to-[#bd0f10] flex items-center justify-center text-white font-bold text-xs">
                          {j.nombre_completo.charAt(0)}{j.apellidos.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#182332]">{j.nombre_completo} {j.apellidos}</p>
                          {j.genero && <span className="text-[10px] text-gray-400">{j.genero}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-semibold text-gray-700">{j.tipo_documento}</p>
                      <p className="text-[11px] text-gray-400">{j.numero_documento}</p>
                    </td>
                    <td className="px-5 py-4">
                      {j.email_deportista && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                          <Mail className="w-3 h-3" />{j.email_deportista}
                        </div>
                      )}
                      {j.celular_deportista && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                          <Phone className="w-3 h-3" />{j.celular_deportista}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold text-gray-600">{j.club?.nombre || '-'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold text-gray-600">{j.equipo?.nombre || '-'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        j.estado === 'activo' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                          : j.estado === 'pendiente'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400'
                      }`}>
                        {j.estado || 'activo'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelectedPlayer(j)} className="p-2 text-gray-400 hover:text-[#182332] hover:bg-gray-100 rounded-lg transition-all" title="Ver ficha">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEdit(j)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(j.id, j.nombre_completo + ' ' + j.apellidos)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all" title="Eliminar">
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

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editId ? 'Editar Deportista' : 'Agregar Deportista'} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && <p className="text-xs text-red-500 bg-red-50 p-3 rounded-xl font-bold">{formError}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nombre *</label>
              <input
                value={form.nombre_completo}
                onChange={e => setForm(f => ({ ...f, nombre_completo: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#182332] transition-all"
                placeholder="Nombre del deportista"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Apellidos *</label>
              <input
                value={form.apellidos}
                onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#182332] transition-all"
                placeholder="Apellidos del deportista"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tipo Doc.</label>
              <select
                value={form.tipo_documento}
                onChange={e => setForm(f => ({ ...f, tipo_documento: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#182332]"
              >
                <option value="CC">CC</option>
                <option value="TI">TI</option>
                <option value="CE">CE</option>
                <option value="PA">PA</option>
                <option value="RC">RC</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Número Documento *</label>
              <input
                value={form.numero_documento}
                onChange={e => setForm(f => ({ ...f, numero_documento: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#182332] transition-all"
                placeholder="Número de identificación"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={form.email_deportista}
                onChange={e => setForm(f => ({ ...f, email_deportista: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#182332] transition-all"
                placeholder="email@ejemplo.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Celular</label>
              <input
                value={form.celular_deportista}
                onChange={e => setForm(f => ({ ...f, celular_deportista: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#182332] transition-all"
                placeholder="300 123 4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Género</label>
              <select
                value={form.genero}
                onChange={e => setForm(f => ({ ...f, genero: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#182332]"
              >
                <option value="">Seleccionar</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fecha Nac.</label>
              <input
                type="date"
                value={form.fecha_nacimiento}
                onChange={e => setForm(f => ({ ...f, fecha_nacimiento: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#182332] transition-all"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {form.club_id ? (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Equipo</label>
                <select
                  value={form.equipo_id}
                  onChange={e => setForm(f => ({ ...f, equipo_id: e.target.value }))}
                  className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#182332]"
                >
                  <option value="">Seleccionar equipo...</option>
                  {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
            ) : (
              <div />
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estado *</label>
              <select
                value={form.estado}
                onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                className="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#182332]"
                required
              >
                <option value="activo">Activo</option>
                <option value="pendiente">Pendiente</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 h-12 rounded-xl font-bold text-gray-500">
              Cancelar
            </Button>
            <Button isLoading={saving} disabled={saving} className="flex-[2] h-12 bg-[var(--primary)] text-black font-bold hover:brightness-90 transition-all">
              {editId ? 'Guardar Cambios' : 'Crear Deportista'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL FICHA DEPORTISTA */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPlayer(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#182332] to-[#bd0f10] flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                  {selectedPlayer.foto_url ? (
                    <img src={selectedPlayer.foto_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    `${selectedPlayer.nombre_completo.charAt(0)}${selectedPlayer.apellidos.charAt(0)}`
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#182332]">{selectedPlayer.nombre_completo} {selectedPlayer.apellidos}{selectedPlayer.segundo_apellido ? ` ${selectedPlayer.segundo_apellido}` : ''}</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {selectedPlayer.tipo_documento} {selectedPlayer.numero_documento}
                    {selectedPlayer.club && <span> · {selectedPlayer.club.nombre}</span>}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedPlayer(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                <XCircle size={20} className="text-gray-400 hover:text-red-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Datos Personales */}
              <div>
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User size={12} /> Datos Personales
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Género</p>
                    <p className="text-xs font-bold text-[#182332]">{selectedPlayer.genero || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Fecha Nac.</p>
                    <p className="text-xs font-bold text-[#182332]">{selectedPlayer.fecha_nacimiento ? new Date(selectedPlayer.fecha_nacimiento).toLocaleDateString('es-ES') : 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Edad</p>
                    <p className="text-xs font-bold text-[#182332]">
                      {selectedPlayer.fecha_nacimiento
                        ? Math.floor((new Date().getTime() - new Date(selectedPlayer.fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) + ' años'
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">RH</p>
                    <p className="text-xs font-bold text-[#bd0f10]">{selectedPlayer.rh || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">EPS</p>
                    <p className="text-xs font-bold text-[#182332]">{selectedPlayer.eps || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Dorsal</p>
                    <p className="text-xs font-bold text-[#182332]">{selectedPlayer.dorsal || 'N/A'}</p>
                  </div>
                  {(selectedPlayer.estatura || selectedPlayer.peso) && (
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Físico</p>
                      <p className="text-xs font-bold text-[#182332]">{selectedPlayer.estatura ? `${selectedPlayer.estatura} cm` : ''}{selectedPlayer.estatura && selectedPlayer.peso ? ' · ' : ''}{selectedPlayer.peso ? `${selectedPlayer.peso} kg` : ''}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contacto */}
              <div>
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Phone size={12} /> Contacto
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedPlayer.email_deportista && (
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                      <Mail size={14} className="text-gray-400 shrink-0" />
                      <span className="text-xs font-semibold text-[#182332]">{selectedPlayer.email_deportista}</span>
                    </div>
                  )}
                  {selectedPlayer.celular_deportista && (
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                      <Phone size={14} className="text-gray-400 shrink-0" />
                      <span className="text-xs font-semibold text-[#182332]">{selectedPlayer.celular_deportista}</span>
                    </div>
                  )}
                </div>
                {selectedPlayer.direccion && (
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl mt-3">
                    <Building2 size={14} className="text-gray-400 shrink-0" />
                    <span className="text-xs font-semibold text-[#182332]">
                      {[selectedPlayer.direccion, selectedPlayer.barrio, selectedPlayer.municipio, selectedPlayer.departamento].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Tutor / Emergencia */}
              {(selectedPlayer.tutor_nombre || selectedPlayer.emergencia_nombre) && (
                <div>
                  <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Heart size={12} /> Contacto de Emergencia
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedPlayer.tutor_nombre && (
                      <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Acudiente</p>
                        <p className="text-xs font-bold text-[#182332]">{selectedPlayer.tutor_nombre} {selectedPlayer.tutor_apellidos || ''}</p>
                        {selectedPlayer.tutor_celular && (
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <Phone size={10} /> {selectedPlayer.tutor_celular}
                          </div>
                        )}
                        {selectedPlayer.tutor_email && (
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <Mail size={10} /> {selectedPlayer.tutor_email}
                          </div>
                        )}
                      </div>
                    )}
                    {selectedPlayer.emergencia_nombre && (
                      <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Emergencia</p>
                        <p className="text-xs font-bold text-[#182332]">{selectedPlayer.emergencia_nombre}</p>
                        {selectedPlayer.emergencia_celular && (
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <Phone size={10} /> {selectedPlayer.emergencia_celular}
                          </div>
                        )}
                        {selectedPlayer.emergencia_email && (
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <Mail size={10} /> {selectedPlayer.emergencia_email}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Documentos */}
              <div>
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText size={12} /> Documentos Adjuntos
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Foto', url: selectedPlayer.foto_url, icon: <Camera size={14} /> },
                    { label: 'Registro Civil', url: selectedPlayer.url_registro_civil, icon: <FileText size={14} /> },
                    { label: 'Documento de Identidad', url: selectedPlayer.url_documento_id, icon: <ClipboardList size={14} /> },
                    { label: 'Contrato', url: selectedPlayer.url_contrato, icon: <FileText size={14} /> },
                    { label: 'Certificado de Salud', url: selectedPlayer.url_certificado_salud, icon: <Heart size={14} /> },
                    { label: 'Carta de Traspaso', url: selectedPlayer.url_carta_traspaso, icon: <ExternalLink size={14} /> },
                  ].map(doc => doc.url ? (
                    <a
                      key={doc.label}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl hover:bg-gray-100 transition-all group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-[#182332] transition-colors">
                        {doc.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#182332]">{doc.label}</p>
                        <p className="text-[9px] text-gray-400 truncate">Ver documento</p>
                      </div>
                      <ExternalLink size={12} className="text-gray-300 group-hover:text-[#182332] shrink-0" />
                    </a>
                  ) : null)}
                  {!selectedPlayer.foto_url && !selectedPlayer.url_registro_civil && !selectedPlayer.url_documento_id && !selectedPlayer.url_contrato && !selectedPlayer.url_certificado_salud && !selectedPlayer.url_carta_traspaso && (
                    <div className="col-span-full text-center py-8 text-gray-400">
                      <FileText size={24} className="mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-bold">Sin documentos adjuntos</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
