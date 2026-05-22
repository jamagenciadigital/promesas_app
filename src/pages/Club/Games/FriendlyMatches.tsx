import React, { useState, useEffect } from 'react';
import { 
  Calendar, MapPin, Clock, Plus, Trash2, Play, Activity, Shield, X, Trophy, AlertTriangle, Info
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';

export default function FriendlyMatches() {
  const { profile, activeClubId } = useAuth();
  const navigate = useNavigate();
  const [friendlies, setFriendlies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Form State
  const [teams, setTeams] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    teamA: { id: '', name: 'Equipo Local', players: [{ name: '', number: '', deportista_id: '' }] },
    teamB: { name: 'Equipo Visitante', players: [{ name: '', number: '', deportista_id: '' }] }
  });

  useEffect(() => {
    if (activeClubId) {
      fetchFriendlies();
      fetchTeams();
    }
  }, [activeClubId]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('equipos')
        .select('*')
        .eq('club_id', activeClubId)
        .order('nombre');
      if (!error) setTeams(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFriendlies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('juegos_amistosos')
        .select('*')
        .eq('club_id', activeClubId)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setFriendlies(data || []);
    } catch (err) {
      console.error('Error fetching friendlies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = (team: 'teamA'|'teamB') => {
    setFormData(prev => ({
      ...prev,
      [team]: {
        ...prev[team],
        players: [...prev[team].players, { name: '', number: '', deportista_id: '' }]
      }
    }));
  };

  const handlePlayerChange = (team: 'teamA'|'teamB', index: number, field: 'name' | 'number', value: string) => {
    const newPlayers = [...formData[team].players];
    newPlayers[index][field] = value;
    setFormData(prev => ({
      ...prev,
      [team]: { ...prev[team], players: newPlayers }
    }));
  };

  const handleTeamSelect = async (teamId: string) => {
    const selectedTeam = teams.find(t => t.id === teamId);
    if (!selectedTeam) return;

    setFormData(prev => ({
      ...prev,
      teamA: { ...prev.teamA, id: teamId, name: selectedTeam.nombre, players: [] }
    }));

    try {
      const { data, error } = await supabase
        .from('deportistas')
        .select('id, nombre_completo, apellidos, dorsal')
        .or(`equipo_id.eq.${teamId},equipo_id_2.eq.${teamId},equipo_id_3.eq.${teamId}`);
      
      if (error) throw error;

      if (data && data.length > 0) {
        const players = data.map((d: any) => ({
          name: `${d.nombre_completo || ''} ${d.apellidos || ''}`.trim(),
          number: d.dorsal || '',
          deportista_id: d.id
        }));
        setFormData(prev => ({
          ...prev,
          teamA: { ...prev.teamA, players }
        }));
      } else {
         setFormData(prev => ({
          ...prev,
          teamA: { ...prev.teamA, players: [{ name: '', number: '', deportista_id: '' }] }
        }));
      }
    } catch (err) {
      console.error('Error fetching team players:', err);
    }
  };

  const handleRemovePlayer = (team: 'teamA'|'teamB', index: number) => {
    setFormData(prev => ({
      ...prev,
      [team]: {
        ...prev[team],
        players: prev[team].players.filter((_, i) => i !== index)
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClubId) return;

    if (!formData.date || !formData.time || !formData.location.trim()) {
      showToast('Por favor, ingresa fecha, hora y lugar del juego.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create Match
      const { data: match, error: errMatch } = await supabase
        .from('juegos_amistosos')
        .insert([{
          club_id: activeClubId,
          equipo_local_id: formData.teamA.id || null,
          nombre_local: formData.teamA.name,
          nombre_visitante: formData.teamB.name,
          fecha: `${formData.date}T${formData.time}:00`,
          lugar: formData.location,
          estado: 'Scheduled'
        }])
        .select()
        .single();
      if (errMatch) throw errMatch;

      // 3. Create Players for Team A
      const playersA = formData.teamA.players
        .filter(p => p.name.trim() !== '' || p.number.trim() !== '')
        .map(p => ({
          juego_id: match.id,
          equipo: 'LOCAL',
          deportista_id: p.deportista_id || null,
          nombre: p.name.trim() || `Jugador #${p.number}`,
          numero: p.number || '0'
        }));
      if (playersA.length > 0) {
        const { error: pErrA } = await supabase.from('juegos_jugadores').insert(playersA);
        if (pErrA) throw pErrA;
      }

      // 4. Create Players for Team B
      const playersB = formData.teamB.players
        .filter(p => p.name.trim() !== '' || p.number.trim() !== '')
        .map(p => ({
          juego_id: match.id,
          equipo: 'VISITANTE',
          nombre: p.name.trim() || `Jugador #${p.number}`,
          numero: p.number || '0'
        }));
      if (playersB.length > 0) {
        const { error: pErrB } = await supabase.from('juegos_jugadores').insert(playersB);
        if (pErrB) throw pErrB;
      }

      setIsModalOpen(false);
      fetchFriendlies();
      showToast('Juego creado exitosamente.');

    } catch (err: any) {
      console.error('Error creating friendly match:', err);
      showToast('Error: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este partido amistoso?')) return;
    try {
      await supabase.from('juegos_amistosos').delete().eq('id', id);
      fetchFriendlies();
      showToast('Partido eliminado', 'info');
    } catch (err) {
      showToast('Error al eliminar', 'error');
    }
  };

  const stats = {
    total: friendlies.filter(m => m.estado === 'Played').length,
    wins: friendlies.filter(m => m.estado === 'Played' && (m.score_local || 0) > (m.score_visitante || 0)).length,
    losses: friendlies.filter(m => m.estado === 'Played' && (m.score_local || 0) < (m.score_visitante || 0)).length,
    draws: friendlies.filter(m => m.estado === 'Played' && (m.score_local || 0) === (m.score_visitante || 0)).length,
    winRate: friendlies.filter(m => m.estado === 'Played').length > 0 
      ? Math.round((friendlies.filter(m => m.estado === 'Played' && (m.score_local || 0) > (m.score_visitante || 0)).length / friendlies.filter(m => m.estado === 'Played').length) * 100)
      : 0
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-gray-900 dark:text-white flex items-center gap-3 uppercase italic">
            <Trophy className="text-club-primary" size={32} /> Gestión de Juegos
          </h1>
          <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest italic">Panel de control y estadísticas de encuentros deportivos.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-club-primary text-black hover:bg-[#aacc00] rounded-2xl font-black px-8 py-6 uppercase italic text-xs tracking-widest shadow-xl shadow-club-primary/10">
          <Plus size={20} className="mr-2" /> Nuevo Partido
        </Button>
      </header>

      {/* Dashboard Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black rounded-[32px] p-6 border border-white/5 relative overflow-hidden group">
          <Activity className="absolute -right-4 -bottom-4 text-white/5 group-hover:scale-110 transition-transform" size={80} />
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mb-1">Partidos Jugados</p>
          <h2 className="text-4xl font-black text-white italic tracking-tighter">{stats.total}</h2>
        </div>
        <div className="bg-emerald-500/10 rounded-[32px] p-6 border border-emerald-500/20 relative overflow-hidden group">
          <Trophy className="absolute -right-4 -bottom-4 text-emerald-500/10 group-hover:scale-110 transition-transform" size={80} />
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic mb-1">Victorias</p>
          <div className="flex items-end gap-2">
            <h2 className="text-4xl font-black text-emerald-500 italic tracking-tighter">{stats.wins}</h2>
            <span className="text-[10px] font-black text-emerald-500/60 mb-1.5 uppercase italic">{stats.winRate}% WR</span>
          </div>
        </div>
        <div className="bg-red-500/10 rounded-[32px] p-6 border border-red-500/20 relative overflow-hidden group">
          <Shield className="absolute -right-4 -bottom-4 text-red-500/10 group-hover:scale-110 transition-transform" size={80} />
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest italic mb-1">Derrotas</p>
          <h2 className="text-4xl font-black text-red-500 italic tracking-tighter">{stats.losses}</h2>
        </div>
        <div className="bg-blue-500/10 rounded-[32px] p-6 border border-blue-500/20 relative overflow-hidden group">
          <Calendar className="absolute -right-4 -bottom-4 text-blue-500/10 group-hover:scale-110 transition-transform" size={80} />
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest italic mb-1">Empates</p>
          <h2 className="text-4xl font-black text-blue-500 italic tracking-tighter">{stats.draws}</h2>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {friendlies.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-12 text-center text-gray-500">
              <Activity size={48} className="mx-auto mb-4 opacity-50" />
              <p>No hay partidos amistosos registrados.</p>
            </div>
          ) : (
            friendlies.map(match => (
              <div key={match.id} className={`bg-white dark:bg-[#16171b] border border-gray-100 dark:border-white/5 rounded-3xl p-6 relative overflow-hidden ${match.estado === 'Played' ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-club-primary'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-white uppercase">
                      {match.nombre_local} vs {match.nombre_visitante}
                    </h3>
                    <div className="flex gap-4 mt-2 text-xs font-bold text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> 
                        {match.fecha ? new Date(match.fecha).toLocaleDateString() : 'S/F'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> 
                        {match.fecha ? new Date(match.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'S/H'}
                      </span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${match.estado === 'Played' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                    {match.estado}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl flex items-center justify-between mb-6">
                    <div className="text-center flex-1">
                        <div className="font-bold text-xs text-gray-500 uppercase">{match.nombre_local}</div>
                        {match.estado === 'Played' && <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">{match.score_local}</div>}
                    </div>
                    <div className="px-4 text-gray-300 font-black text-sm">VS</div>
                    <div className="text-center flex-1">
                        <div className="font-bold text-xs text-gray-500 uppercase">{match.nombre_visitante}</div>
                        {match.estado === 'Played' && <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">{match.score_visitante}</div>}
                    </div>
                </div>

                <div className="flex gap-3">
                   <Button 
                    className="flex-1 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white hover:bg-club-primary hover:text-black hover:border-transparent transition-all font-bold text-xs"
                    onClick={() => {
                      const basePath = profile?.rol === 'entrenador' ? '/coach' : '/club';
                      navigate(`${basePath}/games/${match.id}/score/basketball`);
                    }}
                   >
                     <Activity size={16} className="mr-2" /> {match.estado === 'Played' ? 'Estadísticas' : 'Mesa Control'}
                   </Button>
                   <button className="bg-red-500/10 text-red-500 hover:bg-red-500/20 p-3 rounded-xl transition-colors" onClick={() => handleDelete(match.id)}>
                     <Trash2 size={16} />
                   </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Nueva Amistoso */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Partido Amistoso" maxWidth="4xl">
         <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Ubicación / Cancha</label>
                  <input className="w-full h-12 bg-gray-50 dark:bg-white/5 rounded-xl px-4 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-club-primary" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Cancha Principal" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                     <input type="date" className="w-full h-12 bg-gray-50 dark:bg-white/5 rounded-xl px-4 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-club-primary" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Hora</label>
                     <input type="time" className="w-full h-12 bg-gray-50 dark:bg-white/5 rounded-xl px-4 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-club-primary" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-100 dark:border-white/5">
               {/* Equipo Local */}
               <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-2xl border border-gray-200 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-4 text-club-primary">
                     <Shield size={20} />
                     <div className="flex-1">
                        <select 
                           className="w-full bg-white dark:bg-[#16171b] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white mb-2 focus:outline-none"
                           value={formData.teamA.id}
                           onChange={e => handleTeamSelect(e.target.value)}
                        >
                           <option value="">Seleccionar Equipo Registrado</option>
                           {teams.map(t => (
                              <option key={t.id} value={t.id}>{t.nombre}</option>
                           ))}
                        </select>
                        <input 
                           className="bg-transparent border-none text-lg font-black text-gray-900 dark:text-white focus:outline-none w-full"
                           value={formData.teamA.name}
                           placeholder="O ingresa un nombre"
                           onChange={e => setFormData({...formData, teamA: {...formData.teamA, name: e.target.value}})}
                        />
                     </div>
                  </div>
                  <div className="space-y-3">
                     {formData.teamA.players.map((p, i) => (
                        <div key={i} className="flex gap-2 items-center">
                           <input className="w-16 h-10 bg-white dark:bg-[#16171b] rounded-lg px-2 text-center text-sm font-bold border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:border-club-primary" placeholder="00" value={p.number} onChange={e => handlePlayerChange('teamA', i, 'number', e.target.value)} />
                           <input className="flex-1 h-10 bg-white dark:bg-[#16171b] rounded-lg px-3 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:border-club-primary" placeholder="Nombre Jugador" value={p.name} onChange={e => handlePlayerChange('teamA', i, 'name', e.target.value)} />
                           <button type="button" onClick={() => handleRemovePlayer('teamA', i)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={16} /></button>
                        </div>
                     ))}
                     <button type="button" onClick={() => handleAddPlayer('teamA')} className="text-xs font-bold text-club-primary hover:text-[#aacc00] flex items-center gap-1 mt-2">
                        <Plus size={14} /> Añadir Jugador
                     </button>
                  </div>
               </div>

               {/* Equipo Visitante */}
               <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-2xl border border-gray-200 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-4 text-blue-500">
                     <Shield size={20} />
                     <input 
                        className="bg-transparent border-none text-lg font-black text-gray-900 dark:text-white focus:outline-none w-full"
                        value={formData.teamB.name}
                        onChange={e => setFormData({...formData, teamB: {...formData.teamB, name: e.target.value}})}
                     />
                  </div>
                  <div className="space-y-3">
                     {formData.teamB.players.map((p, i) => (
                        <div key={i} className="flex gap-2 items-center">
                           <input className="w-16 h-10 bg-white dark:bg-[#16171b] rounded-lg px-2 text-center text-sm font-bold border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" placeholder="00" value={p.number} onChange={e => handlePlayerChange('teamB', i, 'number', e.target.value)} />
                           <input className="flex-1 h-10 bg-white dark:bg-[#16171b] rounded-lg px-3 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500" placeholder="Nombre Jugador" value={p.name} onChange={e => handlePlayerChange('teamB', i, 'name', e.target.value)} />
                           <button type="button" onClick={() => handleRemovePlayer('teamB', i)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={16} /></button>
                        </div>
                     ))}
                     <button type="button" onClick={() => handleAddPlayer('teamB')} className="text-xs font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 mt-2">
                        <Plus size={14} /> Añadir Jugador
                     </button>
                  </div>
               </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-white/10">
               <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
               <Button type="submit" isLoading={isSubmitting} className="bg-club-primary text-black hover:bg-[#aacc00] px-8 py-3 rounded-xl font-bold">
                  {isSubmitting ? 'Creando...' : <><Play size={18} className="mr-2" /> Crear Juego</>}
               </Button>
            </div>
         </form>
      </Modal>

      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-500">
           <div className={`flex items-center gap-3 px-6 py-4 rounded-3xl border shadow-2xl backdrop-blur-xl ${
             toast.type === 'success' ? 'bg-black/90 border-club-primary/20 text-white' :
             toast.type === 'error' ? 'bg-red-500/90 border-red-500/20 text-white' :
             'bg-blue-600/90 border-blue-400/20 text-white'
           }`}>
             <div className={`p-2 rounded-xl ${
               toast.type === 'success' ? 'bg-club-primary text-black' : 'bg-white/20 text-white'
             }`}>
               {toast.type === 'success' ? <Trophy size={18} /> : 
                toast.type === 'error' ? <AlertTriangle size={18} /> : <Info size={18} />}
             </div>
             <p className="text-sm font-black uppercase tracking-widest italic">{toast.message}</p>
             <button onClick={() => setToast(null)} className="ml-4 hover:scale-110 transition-transform">
               <X size={16} className="opacity-50" />
             </button>
           </div>
        </div>
      )}
    </div>
  );
}
