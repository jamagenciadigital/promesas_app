import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Trophy, Search, Filter, ArrowLeft, 
  Download, User, Building2, Calendar, 
  Hash, Mail, Phone, ChevronRight, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AthleteList() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClub, setSelectedClub] = useState('all');
  const [selectedSport, setSelectedSport] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Clubs for filter
      const { data: clubsData } = await supabase.from('clubes').select('id, nombre').order('nombre');
      setClubs(clubsData || []);

      // 2. Fetch Players with club and category info
      const { data: playersData, error } = await supabase
        .from('deportistas')
        .select(`
          id,
          nombre_completo,
          apellidos,
          segundo_apellido,
          numero_documento,
          fecha_nacimiento,
          email_deportista,
          celular_deportista,
          club_id,
          club:clubes(nombre),
          equipo:equipos!deportistas_equipo_id_fkey(
            nombre,
            categoria:deportes_config_campos(
              valor,
              deporte:deportes(nombre)
            )
          )
        `)
        .order('nombre_completo');

      if (error) throw error;
      setPlayers(playersData || []);
    } catch (error) {
      console.error("Error fetching athlete data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = 
      player.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.numero_documento.includes(searchTerm);
    
    const matchesClub = selectedClub === 'all' || player.club_id === selectedClub;
    
    // Deporte filter (simplificado si no existe la relación exacta)
    const sportName = player.equipo?.categoria?.deporte?.nombre || '';
    const matchesSport = selectedSport === 'all' || sportName === selectedSport;

    return matchesSearch && matchesClub && matchesSport;
  });

  // Extraer lista única de deportes para el filtro
  const uniqueSports = Array.from(new Set(players.map(p => p.equipo?.categoria?.deporte?.nombre).filter(Boolean)));

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/superadmin')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">Listado Maestro</h1>
          <p className="text-sm text-gray-500 font-medium mt-2 uppercase tracking-widest text-[10px]">Gestión Global de Deportistas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-[#1e293b]/40 p-6 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm">
        <div className="relative md:col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o documento..."
            className="w-full pl-12 pr-4 h-14 bg-gray-50 dark:bg-white/5 rounded-2xl text-sm border-none focus:ring-2 focus:ring-[var(--primary)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select 
            className="w-full pl-10 pr-4 h-14 bg-gray-50 dark:bg-white/5 rounded-2xl text-sm border-none appearance-none"
            value={selectedClub}
            onChange={(e) => setSelectedClub(e.target.value)}
          >
            <option value="all">Todos los Clubes</option>
            {clubs.map(club => (
              <option key={club.id} value={club.id}>{club.nombre}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select 
            className="w-full pl-10 pr-4 h-14 bg-gray-50 dark:bg-white/5 rounded-2xl text-sm border-none appearance-none"
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
          >
            <option value="all">Todos los Deportes</option>
            {uniqueSports.map((sport: any) => (
              <option key={sport} value={sport}>{sport}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-[#1e293b]/40 rounded-[48px] border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-white/5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-6">Deportista</th>
                <th className="px-8 py-6">Documento</th>
                <th className="px-8 py-6">F. Nacimiento</th>
                <th className="px-8 py-6">Club / Categoría</th>
                <th className="px-8 py-6">Contacto</th>
                <th className="px-8 py-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-8 py-6"><div className="h-8 bg-gray-100 dark:bg-white/5 rounded-xl w-full"></div></td>
                  </tr>
                ))
              ) : filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-gray-400 uppercase font-black italic tracking-widest">No se encontraron deportistas</td>
                </tr>
              ) : filteredPlayers.map((player) => (
                <tr key={player.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-900 dark:bg-[var(--primary)] flex items-center justify-center text-white dark:text-black font-black italic text-lg shadow-lg">
                        {player.nombre_completo.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic leading-none">
                          {player.nombre_completo} {player.apellidos || ''} {player.segundo_apellido || ''}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Activo</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Hash size={14} className="text-gray-400" />
                      <span className="text-xs font-bold">{player.numero_documento}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar size={14} className="text-gray-400" />
                      <span className="text-xs font-bold">
                        {player.fecha_nacimiento ? format(new Date(player.fecha_nacimiento + 'T00:00:00'), "dd/MM/yyyy") : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div>
                      <p className="text-xs font-black uppercase italic text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Building2 size={12} className="text-[var(--primary)]" />
                        {player.club?.nombre || 'Independiente'}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                        {player.equipo?.categoria?.valor || 'Sin Categoría'} 
                        {player.equipo?.categoria?.deporte?.nombre ? ` • ${player.equipo.categoria.deporte.nombre}` : ''}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Mail size={12} />
                        <span className="text-[10px] font-bold truncate max-w-[150px]">{player.email_deportista}</span>
                      </div>
                      {player.celular_deportista && (
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Phone size={12} />
                          <span className="text-[10px] font-bold">{player.celular_deportista}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => navigate(`/club/players/${player.id}`)}
                      className="p-3 bg-gray-100 dark:bg-white/5 hover:bg-[var(--primary)] text-gray-500 hover:text-black rounded-2xl transition-all group flex items-center gap-2 ml-auto"
                      title="Ver Ficha Completa"
                    >
                      <Eye size={18} />
                      <span className="text-[10px] font-black uppercase italic hidden group-hover:block">Ver Ficha</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 bg-gray-50/50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mostrando {filteredPlayers.length} deportistas</p>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white text-[10px] font-black uppercase italic rounded-full shadow-lg"
          >
            <Download size={14} className="text-[var(--primary)]" /> Exportar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
