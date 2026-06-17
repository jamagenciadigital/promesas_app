import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Building2, Users, UserPlus, MapPin, Trophy, Search, RefreshCw, TrendingUp
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface LigaInfo {
  id: string;
  nombre: string;
  deporte_id: string;
  presidente?: string;
  secretario?: string;
  direccion?: string;
  correo?: string;
  telefono?: string;
  deportes?: { nombre: string };
}

interface ClubRow {
  id: string;
  nombre: string;
  pais?: string;
  ciudad?: string;
  estado?: string;
  logo_url?: string;
}

export default function LigaDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [liga, setLiga] = useState<LigaInfo | null>(null);
  const [clubes, setClubes] = useState<ClubRow[]>([]);
  const [filteredClubes, setFilteredClubes] = useState<ClubRow[]>([]);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({
    clubes: 0, equipos: 0, jugadores: 0, entrenadores: 0, escenarios: 0
  });

  useEffect(() => {
    if (profile?.liga_id) fetchDashboard();
    else setLoading(false);
  }, [profile?.liga_id]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFilteredClubes(clubes.filter(c => c.nombre.toLowerCase().includes(q)));
  }, [search, clubes]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const { data: ligaData } = await supabase
        .from('ligas')
        .select('*, deportes(nombre)')
        .eq('id', profile!.liga_id)
        .single();

      if (!ligaData) throw new Error('Liga no encontrada');
      setLiga(ligaData);

      const deporteId = ligaData.deporte_id;

      const { data: clubesData } = await supabase
        .from('clubes')
        .select('id, nombre, pais, ciudad, estado, logo_url')
        .eq('deporte_id', deporteId)
        .order('nombre');

      const clubs = clubesData || [];
      setClubes(clubs);
      const clubIds = clubs.map(c => c.id);

      const [{ count: eCount }, { count: jCount }, { count: enCount }, { count: escCount }] = await Promise.all([
        clubIds.length > 0
          ? supabase.from('equipos').select('*', { count: 'exact', head: true }).in('club_id', clubIds)
          : { count: 0 },
        clubIds.length > 0
          ? supabase.from('deportistas').select('*', { count: 'exact', head: true }).in('club_id', clubIds)
          : { count: 0 },
        clubIds.length > 0
          ? supabase.from('perfiles').select('*', { count: 'exact', head: true }).in('club_id', clubIds).eq('rol', 'entrenador')
          : { count: 0 },
        supabase.from('escenarios').select('*', { count: 'exact', head: true }).eq('deporte_id', deporteId),
      ]);

      setStats({
        clubes: clubs.length,
        equipos: eCount ?? 0,
        jugadores: jCount ?? 0,
        entrenadores: enCount ?? 0,
        escenarios: escCount ?? 0,
      });
    } catch (err) {
      console.error('Error fetching liga dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-gray-100 dark:bg-white/5 rounded-3xl" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 dark:bg-white/5 rounded-2xl" />
          ))}
        </div>
        <div className="h-12 bg-gray-100 dark:bg-white/5 rounded-2xl max-w-md" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-white/5 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-[#182332] to-[#bd0f10] text-white rounded-xl shadow-sm">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#182332] tracking-tight">{liga?.nombre || 'Panel Liga'}</h2>
            <p className="text-xs text-gray-500">
              {liga?.deportes?.nombre ? `${liga.deportes.nombre} — ` : ''}
              Gestión de clubes, equipos y deportistas
            </p>
          </div>
        </div>
        <Button
          onClick={fetchDashboard}
          className="h-10 px-5 bg-white border border-gray-200 rounded-xl text-[10px] font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <Building2 size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#182332] dark:text-white">{stats.clubes}</p>
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Clubes</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-blue-500">
            <TrendingUp size={11} />
            <span className="text-[8px] font-bold uppercase tracking-wider">registrados</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
              <Trophy size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#182332] dark:text-white">{stats.equipos}</p>
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Equipos</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-emerald-500">
            <TrendingUp size={11} />
            <span className="text-[8px] font-bold uppercase tracking-wider">totales</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <Users size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#182332] dark:text-white">{stats.jugadores}</p>
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Jugadores</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-purple-500">
            <TrendingUp size={11} />
            <span className="text-[8px] font-bold uppercase tracking-wider">totales</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
              <UserPlus size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#182332] dark:text-white">{stats.entrenadores}</p>
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Entrenadores</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-amber-500">
            <TrendingUp size={11} />
            <span className="text-[8px] font-bold uppercase tracking-wider">totales</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center">
              <MapPin size={18} className="text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#182332] dark:text-white">{stats.escenarios}</p>
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Escenarios</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-rose-500">
            <TrendingUp size={11} />
            <span className="text-[8px] font-bold uppercase tracking-wider">totales</span>
          </div>
        </div>
      </div>

      {/* Clubes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
              <Building2 size={16} className="text-[var(--primary)]" />
            </div>
            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Clubes</h3>
            <span className="text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-lg">
              {clubes.length}
            </span>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar club por nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#16171b] border border-gray-200 dark:border-white/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182332] transition-all"
          />
        </div>

        {filteredClubes.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              {search ? 'No se encontraron clubes' : 'No hay clubes registrados'}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              {search ? 'Intenta con otro nombre.' : 'Aún no hay clubes vinculados a esta liga.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredClubes.map(club => (
              <div key={club.id} className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-2xl p-5 hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#182332] to-[#bd0f10] flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {club.nombre?.charAt(0) || 'C'}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#182332] dark:text-white">{club.nombre}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          club.estado === 'activo' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                        }`}>
                          {club.estado || 'activo'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500 dark:text-gray-400">
                        {(club.pais || club.ciudad) && (
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[club.ciudad, club.pais].filter(Boolean).join(', ')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
