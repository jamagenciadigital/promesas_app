import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { FileUpload } from '../../components/ui/FileUpload';
import {
  Search, Building2, Plus, RefreshCw, Globe, MapPin, Mail, Phone, Shield,
  Eye, Users, Trophy, UserPlus, Calendar, FileText, ExternalLink, X
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

export default function JefaturaClubes() {
  const [clubes, setClubes] = useState<ClubRow[]>([]);
  const [filtered, setFiltered] = useState<ClubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deportes, setDeportes] = useState<{ id: string; nombre: string }[]>([]);
  const [form, setForm] = useState({
    nombre: '',
    deporte_id: '',
    pais: '',
    ciudad: '',
    direccion: '',
    telefono: '',
    email_corporativo: '',
    website: '',
    reconocimiento_deportivo_url: '',
    documento_representante_url: '',
  });

  const [detailClub, setDetailClub] = useState<ClubDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchClubes();
    fetchDeportes();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      clubes.filter(c => c.nombre.toLowerCase().includes(q))
    );
  }, [search, clubes]);

  const fetchClubes = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('clubes')
        .select('id, nombre, pais, ciudad, direccion, email_corporativo, telefono, website, estado, deporte_id, reconocimiento_deportivo_url, documento_representante_url, deportes(nombre)')
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
      fetchClubes();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Error creating club:', err);
      setError(err.message || 'Error al crear club.');
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
        id: club.id,
        nombre: club.nombre,
        pais: club.pais,
        ciudad: club.ciudad,
        direccion: club.direccion,
        email_corporativo: club.email_corporativo,
        telefono: club.telefono,
        website: club.website,
        estado: club.estado,
        deporte_nombre: deporteNombre,
        reconocimiento_deportivo_url: club.reconocimiento_deportivo_url,
        documento_representante_url: club.documento_representante_url,
        jugadores: jugadores ?? 0,
        equipos: equipos ?? 0,
        entrenadores: entrenadores ?? 0,
        reservas: reservas ?? 0,
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
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-black text-white hover:bg-black/90 rounded-xl font-bold px-5">
          <Plus className="h-4 w-4" />
          <span>AGREGAR CLUB</span>
        </Button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs border border-red-100">{error}</div>}
      {successMsg && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-xs border border-emerald-100">{successMsg}</div>}

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

      {/* List */}
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
                  </div>
                </div>
                <button
                  onClick={() => openDetail(club)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#182332] hover:bg-[#202f43] text-white rounded-xl text-xs font-bold transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detalle Club */}
      <Modal isOpen={isDetailModalOpen} onClose={() => { setIsDetailModalOpen(false); setDetailClub(null); }} title={detailClub?.nombre || 'Club'} maxWidth="max-w-2xl">
        {loadingDetail ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#182332]" />
            <p className="italic">Cargando detalle...</p>
          </div>
        ) : detailClub ? (
          <div className="space-y-6">
            {/* Info del Club */}
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

            {/* Documentos */}
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

            {/* Estadísticas */}
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

      {/* Modal Crear Club */}
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
            <Input
              label="País"
              placeholder="Colombia"
              value={form.pais}
              onChange={(e) => setForm({ ...form, pais: e.target.value })}
            />
            <Input
              label="Ciudad"
              placeholder="Bogotá"
              value={form.ciudad}
              onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
            />
          </div>

          <Input
            label="Dirección"
            placeholder="Calle 123 #45-67"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              placeholder="+57 300 123 4567"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
            <Input
              label="Email Corporativo"
              placeholder="contacto@club.com"
              type="email"
              value={form.email_corporativo}
              onChange={(e) => setForm({ ...form, email_corporativo: e.target.value })}
            />
          </div>

          <Input
            label="Sitio Web"
            placeholder="https://club.com"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />

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
            <Button type="submit" className="bg-black text-white hover:bg-black/90 rounded-xl font-bold px-5">Crear Club</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
