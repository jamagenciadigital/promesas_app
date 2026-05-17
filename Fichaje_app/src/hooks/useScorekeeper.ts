import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useScorekeeper(matchId: string) {
  const [match, setMatch] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamAEvents, setTeamAEvents] = useState<any[]>([]);
  const [teamBEvents, setTeamBEvents] = useState<any[]>([]);
  const [teamAPlayers, setTeamAPlayers] = useState<any[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<any[]>([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [periodScores, setPeriodScores] = useState({
    teamA: { 1: 0, 2: 0, 3: 0, 4: 0 },
    teamB: { 1: 0, 2: 0, 3: 0, 4: 0 }
  });
  const [livePeriod, setLivePeriod] = useState(1);
  const [liveTime, setLiveTime] = useState('10:00');
  const [liveRunning, setLiveRunning] = useState(false);

  const fetchMatchData = useCallback(async (isInitial = false) => {
    if (!matchId) return;
    if (isInitial) setLoading(true);
    try {
      // Fetch match details
      let { data: matchData, error: matchError } = await supabase
        .from('juegos_amistosos')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;
      setMatch(matchData);

      // Fetch players for both teams
      if (isInitial || teamAPlayers.length === 0) {
        const { data: players, error: errPlayers } = await supabase
          .from('juegos_jugadores')
          .select('*')
          .eq('juego_id', matchId)
          .order('numero', { ascending: true });

        if (!errPlayers && players) {
          setTeamAPlayers(players.filter(p => p.equipo === 'LOCAL'));
          setTeamBPlayers(players.filter(p => p.equipo === 'VISITANTE'));
        }
      }

      // Fetch events for this match
      const { data: eventData, error: eventError } = await supabase
        .from('juegos_eventos')
        .select('*')
        .eq('juego_id', matchId)
        .order('created_at', { ascending: false });

      if (eventError) throw eventError;
      setEvents(eventData || []);
      
      calculateScore(eventData || [], matchData);
    } catch (err) {
      console.error('Error fetching scorekeeper data:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [matchId, teamAPlayers.length]);

  const calculateScore = (allEvents: any[], matchData: any) => {
    if (!matchData) return;
    let sa = 0;
    let sb = 0;
    let lp = matchData?.periodo || 1;
    let lt = matchData?.tiempo_restante || '10:00';
    let lr = !!matchData?.timer_running;
    
    const teamAEvts: any[] = [];
    const teamBEvts: any[] = [];
    const ps: any = {
      teamA: { 1: 0, 2: 0, 3: 0, 4: 0 },
      teamB: { 1: 0, 2: 0, 3: 0, 4: 0 }
    };

    const chronEvents = [...allEvents].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    chronEvents.forEach(evt => {
      if (evt.tipo === 'POINT') {
        const pts = evt.puntos || 0;
        const p = evt.periodo || 1;
        if (evt.equipo === 'LOCAL') {
          sa += pts;
          ps.teamA[p] = (ps.teamA[p] || 0) + pts;
        } else if (evt.equipo === 'VISITANTE') {
          sb += pts;
          ps.teamB[p] = (ps.teamB[p] || 0) + pts;
        }
        if (evt.periodo > lp) lp = evt.periodo;
      }
      
      if (evt.tipo === 'SYNC_STATE') {
        lp = evt.periodo || lp;
        lt = evt.tiempo_juego || lt;
        lr = evt.puntos === 1;
      }

      if (evt.tipo === 'PERIOD_END') {
        lp = (evt.periodo || lp) + 1;
      }

      if (evt.equipo === 'LOCAL') teamAEvts.push(evt);
      else if (evt.equipo === 'VISITANTE') teamBEvts.push(evt);
    });

    setScoreA(sa);
    setScoreB(sb);
    setTeamAEvents(teamAEvts);
    setTeamBEvents(teamBEvts);
    setPeriodScores(ps);
    setLivePeriod(lp);
    setLiveTime(lt);
    setLiveRunning(lr);
  };

  useEffect(() => {
    fetchMatchData(true);
  }, [fetchMatchData]);

  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`live_match_${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'juegos_eventos', filter: `juego_id=eq.${matchId}` },
        (payload) => {
          if (payload.new.tipo === 'SYNC_STATE') {
            const newPeriod = payload.new.periodo;
            const newTime = payload.new.tiempo_juego;
            const newRunning = payload.new.puntos === 1;
            setLivePeriod(prev => newPeriod || prev);
            setLiveTime(prev => newTime || prev);
            setLiveRunning(newRunning);
          } else {
            fetchMatchData();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'juegos_eventos', filter: `juego_id=eq.${matchId}` },
        () => {}
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'juegos_amistosos', filter: `id=eq.${matchId}` },
        (payload) => {
          setMatch((prev: any) => ({ ...prev, ...payload.new }));
          if (payload.new.score_local !== undefined) setScoreA(payload.new.score_local);
          if (payload.new.score_visitante !== undefined) setScoreB(payload.new.score_visitante);
          if (payload.new.periodo !== undefined) setLivePeriod(payload.new.periodo);
          if (payload.new.tiempo_restante !== undefined) setLiveTime(payload.new.tiempo_restante);
          if (payload.new.timer_running !== undefined) setLiveRunning(!!payload.new.timer_running);
        }
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      fetchMatchData();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [matchId, fetchMatchData]);

  const addEvent = async (eventData: any) => {
    try {
      const { data, error } = await supabase
        .from('juegos_eventos')
        .insert([{
          juego_id: matchId,
          ...eventData
        }])
        .select()
        .single();

      if (error) throw error;
      
      const updatedEvents = [data, ...events];
      setEvents(updatedEvents);
      calculateScore(updatedEvents, match);
      
      if (eventData.tipo === 'POINT') {
        const newScoreA = eventData.equipo === 'LOCAL' ? scoreA + eventData.puntos : scoreA;
        const newScoreB = eventData.equipo === 'VISITANTE' ? scoreB + eventData.puntos : scoreB;
        
        await supabase
          .from('juegos_amistosos')
          .update({ score_local: newScoreA, score_visitante: newScoreB })
          .eq('id', matchId);
      }

      return data;
    } catch (err) {
      console.error('Error adding event:', err);
      throw err;
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('juegos_eventos')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      
      const updatedEvents = events.filter(e => e.id !== eventId);
      setEvents(updatedEvents);
      calculateScore(updatedEvents, match);
      
      let sa = 0;
      let sb = 0;
      updatedEvents.forEach(evt => {
        if (evt.tipo === 'POINT') {
          if (evt.equipo === 'LOCAL') sa += (evt.puntos || 0);
          else if (evt.equipo === 'VISITANTE') sb += (evt.puntos || 0);
        }
      });
      
      await supabase
        .from('juegos_amistosos')
        .update({ score_local: sa, score_visitante: sb })
        .eq('id', matchId);
        
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  return {
    match,
    events,
    loading,
    scoreA,
    scoreB,
    periodScores,
    teamAEvents,
    teamBEvents,
    teamAPlayers,
    teamBPlayers,
    addEvent,
    deleteEvent,
    refresh: fetchMatchData,
    period: livePeriod,
    remaining_time: liveTime,
    timer_running: liveRunning
  };
}
