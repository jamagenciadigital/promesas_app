import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, Shield, UserPlus, MapPin, Trophy, Search, RefreshCw, ExternalLink
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

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
  const navigate = useNavigate();
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

  const statsItems = [
    { label: 'Clubes', value: stats.clubes, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Equipos', value: stats.equipos, icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Jugadores', value: stats.jugadores, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Entrenadores', value: stats.entrenadores, icon: UserPlus, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Escenarios', value: stats.escenarios, icon: MapPin, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="h-40 bg-gray-100 rounded-[40px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-[32px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-200 px-3 py-1 rounded-xl text-[10px] font-black uppercase italic tracking-widest">
              Liga
            </Badge>
            {liga?.deportes && (
              <Badge className="bg-[var(--primary-10)] text-[var(--primary)] border-[var(--primary-20)] px-3 py-1 rounded-xl text-[10px] font-black uppercase italic tracking-widest">
                {liga.deportes.nombre}
              </Badge>
            )}
          </div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">
            {liga?.nombre || 'Panel Liga'}
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-2">
            Gestión de clubes, equipos y deportistas de la liga.
          </p>
        </div>
        <Button
          onClick={fetchDashboard}
          className="h-12 px-6 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {statsItems.map((stat, idx) => (
          <div key={idx} className="bg-white border border-gray-100 p-8 rounded-[40px] shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
            <div className={`absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-700 ${stat.color}`}>
              <stat.icon size={120} />
            </div>
            <div className="relative z-10 flex items-center gap-6">
              <div className={`p-5 ${stat.bg} ${stat.color} rounded-[24px]`}>
                <stat.icon size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">{stat.label}</p>
                <span className="font-black text-gray-900 italic leading-tight text-4xl">
                  {stat.value}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Clubes List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-[var(--primary)] rounded-full" />
            <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tight">Clubes</h2>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
              {clubes.length} clubes
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
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#182332] transition-all"
          />
        </div>

        {filteredClubes.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-500">
              {search ? 'No se encontraron clubes' : 'No hay clubes registrados'}
            </h3>
            <p className="text-gray-400 mt-2 text-sm italic">
              {search ? 'Intenta con otro nombre.' : 'Aún no hay clubes vinculados a esta liga.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredClubes.map(club => (
              <div key={club.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#182332] to-[#bd0f10] flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {club.nombre?.charAt(0) || 'C'}
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-[#182332]">{club.nombre}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {(club.pais || club.ciudad) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {[club.ciudad, club.pais].filter(Boolean).join(', ')}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          club.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {club.estado || 'activo'}
                        </span>
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
