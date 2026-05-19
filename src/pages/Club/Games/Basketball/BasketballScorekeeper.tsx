// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScorekeeper } from '../../../../hooks/useScorekeeper';
import { supabase } from '../../../../lib/supabase';
import { Play, Pause, RotateCcw, Shield, Activity, Monitor, Users, Clock, AlertCircle, X, Trash2, Target, FileText } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

const shortenName = (name) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return name;
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

export default function BasketballScorekeeper() {
  const { id: matchId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { 
    match, loading, scoreA, scoreB,
    teamAPlayers, teamBPlayers, events,
    addEvent, deleteEvent 
  } = useScorekeeper(matchId);

  const getMiniStats = (playerId) => {
    const pEvts = (events || []).filter(e => e.jugador_id === playerId);
    const pts = pEvts.filter(e => e.tipo === 'POINT').reduce((sum, e) => sum + (e.puntos || 0), 0);
    const fouls = pEvts.filter(e => e.tipo === 'FOUL').length;
    return { pts, fouls };
  };

  const getPlayerFullStats = (pid, evs) => {
    const pEvts = (evs || []).filter(e => e.jugador_id === pid);
    const getCount = (type) => pEvts.filter(e => e.tipo === type).length;
    const pts1 = pEvts.filter(e => e.tipo === 'POINT' && e.puntos === 1).length;
    const pts2 = pEvts.filter(e => e.tipo === 'POINT' && e.puntos === 2).length;
    const pts3 = pEvts.filter(e => e.tipo === 'POINT' && e.puntos === 3).length;
    const ms1 = pEvts.filter(e => e.tipo === 'MISSED_SHOT' && e.puntos === 1).length;
    const ms2 = pEvts.filter(e => e.tipo === 'MISSED_SHOT' && e.puntos === 2).length;
    const ms3 = pEvts.filter(e => e.tipo === 'MISSED_SHOT' && e.puntos === 3).length;
    return {
      pts: (pts1 * 1) + (pts2 * 2) + (pts3 * 3),
      tl: `${pts1}/${pts1 + ms1}`,
      tc2: `${pts2}/${pts2 + ms2}`,
      tc3: `${pts3}/${pts3 + ms3}`,
      tcTotal: `${pts2 + pts3}/${pts2 + ms2 + pts3 + ms3}`,
      reb: getCount('REBOUND'),
      ast: getCount('ASSIST'),
      stl: getCount('STEAL'),
      blk: getCount('BLOCK'),
      to: getCount('TURNOVER'),
      fouls: getCount('FOUL')
    };
  };

  // Timer state
  const [timeLeft, setTimeLeft] = useState(600); 
  const [isRunning, setIsRunning] = useState(false);
  const [period, setPeriod] = useState(1);
  const timerRef = useRef(null);

  // Selection state
  const [selectedPlayer, setSelectedPlayer] = useState(null); 
  const [showStats, setShowStats] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [hasInitializedPeriod, setHasInitializedPeriod] = useState(false);
  const [onCourtPlayers, setOnCourtPlayers] = useState(() => {
    const saved = localStorage.getItem(`onCourt_${matchId}`);
    return saved ? JSON.parse(saved) : []; 
  });

  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [activeTeamTab, setActiveTeamTab] = useState('A');
  const [finishedTab, setFinishedTab] = useState('LOCAL');

  useEffect(() => {
    localStorage.setItem(`onCourt_${matchId}`, JSON.stringify(onCourtPlayers));
  }, [onCourtPlayers, matchId]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleOnCourt = (playerId) => {
    setOnCourtPlayers(prev => {
      if (prev.includes(playerId)) return prev.filter(id => id !== playerId);
      const isTeamA = teamAPlayers.some(p => p.id === playerId);
      const teamOnCourtCount = prev.filter(id => (isTeamA ? teamAPlayers : teamBPlayers).some(p => p.id === id)).length;
      if (teamOnCourtCount >= 5) {
        alert(`¡Alerta! El equipo ${(isTeamA ? match.nombre_local : match.nombre_visitante) || ''} ya tiene 5 jugadores en cancha.`);
        return prev;
      }
      return [...prev, playerId];
    });
  };

  useEffect(() => {
    if (!loading && events && !hasInitializedPeriod) {
      if (events.length > 0) {
        const lastEvt = events[0]; 
        if (lastEvt.tipo === 'PERIOD_END') setPeriod(lastEvt.periodo < 4 ? lastEvt.periodo + 1 : 5);
        else setPeriod(lastEvt.periodo || 1);
      }
      setHasInitializedPeriod(true);
    }
  }, [loading, events, hasInitializedPeriod]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => (prev <= 0 ? (setIsRunning(false), 0) : prev - 1));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  const timeLeftRef = useRef(600);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  const syncMatchState = async () => {
    if (!matchId || !match) return;
    await supabase.from('juegos_amistosos').update({ 
      score_local: scoreA, score_visitante: scoreB,
      tiempo_restante: formatTime(timeLeftRef.current),
      timer_running: isRunning,
      periodo: period
    }).eq('id', matchId);
  };

  useEffect(() => { syncMatchState(); }, [isRunning, period, scoreA, scoreB, matchId]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAction = async (type, points = 0) => {
    if (!selectedPlayer) { alert("Selecciona un jugador primero"); return; }
    const { fouls } = getMiniStats(selectedPlayer.id);
    if (fouls >= 5) { alert("Este jugador ha sido expulsado (5 faltas)."); return; }

    try {
      await addEvent({
        jugador_id: selectedPlayer.id,
        equipo: selectedPlayer.teamId,
        tipo: type, puntos: points, periodo: period,
        tiempo_juego: formatTime(timeLeft)
      });
    } catch (err) { alert("Error al registrar evento."); }
  };

  const handleEndPeriod = async () => {
    if (!window.confirm(`¿Estás seguro de finalizar el Periodo ${period}?`)) return;
    try {
      setIsRunning(false);
      await addEvent({ tipo: 'PERIOD_END', periodo: period, tiempo_juego: formatTime(timeLeft), puntos: 0 });
      if (period >= 4 && scoreA !== scoreB) {
          const winner = scoreA > scoreB ? match.nombre_local : match.nombre_visitante;
          if (window.confirm(`Finalizar partido? Ganador: ${winner}`)) {
            await supabase.from('juegos_amistosos').update({ estado: 'Played' }).eq('id', matchId);
            navigate(profile?.rol === 'entrenador' ? '/coach/games' : '/club/games');
            return;
          }
      }
      setPeriod(prev => prev + 1);
      setTimeLeft(600);
    } catch (err) { alert("Error al finalizar periodo."); }
  };

  const teamFoulsA = (events || []).filter(e => e.equipo === 'LOCAL' && e.type === 'FOUL' && e.period === period).length;
  const teamFoulsB = (events || []).filter(e => e.equipo === 'VISITANTE' && e.type === 'FOUL' && e.period === period).length;

  const getPeriodScores = () => {
    const scores = [];
    for (let i = 1; i <= period; i++) {
      const pEvts = (events || []).filter(e => e.periodo === i);
      const sA = pEvts.filter(e => e.equipo === 'LOCAL' && e.tipo === 'POINT').reduce((sum, e) => sum + (e.puntos || 0), 0);
      const sB = pEvts.filter(e => e.equipo === 'VISITANTE' && e.tipo === 'POINT').reduce((sum, e) => sum + (e.puntos || 0), 0);
      const fA = pEvts.filter(e => e.equipo === 'LOCAL' && e.tipo === 'FOUL').length;
      const fB = pEvts.filter(e => e.equipo === 'VISITANTE' && e.tipo === 'FOUL').length;
      scores.push({ p: i, a: sA, b: sB, fa: fA, fb: fB });
    }
    return scores;
  };

  const TeamFoulBonusDots = ({ count }) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <div style={{ display: 'flex', gap: '2px' }}>
          {[...Array(4)].map((_, i) => (
            <div 
              key={i} 
              style={{ 
                width: '5px', 
                height: '5px', 
                borderRadius: '50%', 
                backgroundColor: i < count ? (count >= 4 ? '#ff4d4d' : colors.accent) : 'rgba(255,255,255,0.1)'
              }} 
            />
          ))}
        </div>
        {count >= 4 && <span style={{ fontSize: '0.45rem', fontWeight: '900', color: '#ff4d4d', letterSpacing: '0.5px' }}>BONUS</span>}
      </div>
    );
  };

  const colors = { bg: '#0d0f14', card: '#161a21', accent: '#10B981', failed: '#ff6b6b', text: '#ffffff', textMuted: '#6b7280', border: '#21262d' };

  if (loading) return <div style={{ background: '#090a0c', color: 'white', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando...</div>;
  if (!match) return <div style={{ color: 'white' }}>Partido no encontrado.</div>;

  if (match.estado === 'Played') {
    return (
      <div style={{ background: '#090a0c', color: '#fff', minHeight: '100vh', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header with Score */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#161a21', padding: '1.5rem', borderRadius: '16px', border: '1px solid #21262d' }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <p style={{ color: colors.textMuted, fontSize: '0.8rem', marginBottom: '0.5rem' }}>LOCAL</p>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>{match.nombre_local}</h2>
            <div style={{ fontSize: '3.5rem', fontWeight: '900', color: colors.accent }}>{scoreA}</div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '0 2rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', color:colors.accent, marginBottom: '0.5rem' }}>FINALIZADO</div>
            <div style={{ fontSize: '1.5rem', opacity: 0.3 }}>VS</div>
          </div>

          <div style={{ textAlign: 'center', flex: 1 }}>
            <p style={{ color: colors.textMuted, fontSize: '0.8rem', marginBottom: '0.5rem' }}>VISITANTE</p>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>{match.nombre_visitante}</h2>
            <div style={{ fontSize: '3.5rem', fontWeight: '900', color: colors.accent }}>{scoreB}</div>
          </div>
        </div>

        {/* Professional Stats Section */}
        <div style={{ background: '#161a21', borderRadius: '16px', border: '1px solid #21262d', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #21262d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '12px' }}>
              <button 
                onClick={() => setFinishedTab('LOCAL')} 
                style={{ background: finishedTab === 'LOCAL' ? colors.accent : 'transparent', color: finishedTab === 'LOCAL' ? '#000' : '#fff', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
              >
                {match.nombre_local || 'Local'}
              </button>
              <button 
                onClick={() => setFinishedTab('VIS')} 
                style={{ background: finishedTab === 'VIS' ? colors.accent : 'transparent', color: finishedTab === 'VIS' ? '#000' : '#fff', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
              >
                {match.nombre_visitante || 'Visitante'}
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => window.print()} 
                style={{ background: 'rgba(16, 185, 129, 0.1)', color: colors.accent, padding: '0.6rem 1.25rem', borderRadius: '10px', border: `1px solid ${colors.accent}`, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                className="no-print"
              >
                <FileText size={18} /> GENERAR REPORTE PDF
              </button>
              
              <button 
                onClick={() => navigate(profile?.rol === 'entrenador' ? '/coach/games' : '/club/games')} 
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '0.6rem 1.25rem', borderRadius: '10px', border: '1px solid #333', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                className="no-print"
              >
                VOLVER AL PANEL
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowX: 'auto', padding: '1rem' }} className="no-print">
             <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ color: colors.textMuted, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: '1px solid #21262d' }}>
                    <th style={{ padding: '1rem' }}>Jugador</th>
                    <th style={{ padding: '1rem' }}>Pts</th>
                    <th style={{ padding: '1rem' }}>TC (2P/3P)</th>
                    <th style={{ padding: '1rem' }}>TL</th>
                    <th style={{ padding: '1rem' }}>Reb</th>
                    <th style={{ padding: '1rem' }}>Ast</th>
                    <th style={{ padding: '1rem' }}>Rob</th>
                    <th style={{ padding: '1rem' }}>Tap</th>
                    <th style={{ padding: '1rem' }}>Per</th>
                    <th style={{ padding: '1rem' }}>Faltas</th>
                  </tr>
                </thead>
                <tbody>
                  {(finishedTab === 'LOCAL' ? teamAPlayers : teamBPlayers).map(p => {
                    const s = getPlayerFullStats(p.id, events);
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 'bold' }}>#{p.numero} {p.nombre}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ color: colors.accent, fontWeight: 'bold', fontSize: '1.1rem' }}>{s.pts}</span>
                        </td>
                        <td style={{ padding: '1rem', color: colors.textMuted }}>{s.tcTotal} <span style={{fontSize: '0.75rem'}}>({s.tc2} / {s.tc3})</span></td>
                        <td style={{ padding: '1rem', color: colors.textMuted }}>{s.tl}</td>
                        <td style={{ padding: '1rem' }}>{s.reb}</td>
                        <td style={{ padding: '1rem' }}>{s.ast}</td>
                        <td style={{ padding: '1rem' }}>{s.stl}</td>
                        <td style={{ padding: '1rem' }}>{s.blk}</td>
                        <td style={{ padding: '1rem', color: colors.failed }}>{s.to}</td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '3px' }}>
                            {[...Array(5)].map((_, i) => (
                              <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i < s.fouls ? (s.fouls >= 5 ? colors.failed : colors.accent) : 'rgba(255,255,255,0.1)' }} />
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
          </div>

          {/* PRINT-ONLY SECTION (Hidden on screen) */}
          <div className="print-only" style={{ display: 'none', color: '#000', padding: '20px' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', marginBottom: '20px', paddingBottom: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '24px' }}>RESUMEN OFICIAL DE JUEGO</h1>
              <p style={{ margin: '5px 0' }}>{match.fecha ? new Date(match.fecha).toLocaleDateString() : ''} · {match.lugar || 'Cancha Principal'}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
               <div style={{ textAlign: 'center', flex: 1 }}>
                 <p style={{ fontSize: '12px', margin: 0 }}>LOCAL</p>
                 <h2 style={{ margin: '5px 0' }}>{match.nombre_local}</h2>
                 <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{scoreA}</div>
               </div>
               <div style={{ alignSelf: 'center', fontSize: '24px', opacity: 0.2 }}>VS</div>
               <div style={{ textAlign: 'center', flex: 1 }}>
                 <p style={{ fontSize: '12px', margin: 0 }}>VISITANTE</p>
                 <h2 style={{ margin: '5px 0' }}>{match.nombre_visitante}</h2>
                 <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{scoreB}</div>
               </div>
            </div>

            {/* Local Team Table */}
            <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>{match.nombre_local} (Estadísticas)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
               <thead>
                 <tr style={{ background: '#eee', fontSize: '10px' }}>
                   <th style={{ padding: '8px', textAlign: 'left' }}>Jugador</th>
                   <th style={{ padding: '8px' }}>PTS</th>
                   <th style={{ padding: '8px' }}>TC</th>
                   <th style={{ padding: '8px' }}>TL</th>
                   <th style={{ padding: '8px' }}>REB</th>
                   <th style={{ padding: '8px' }}>AST</th>
                   <th style={{ padding: '8px' }}>ROB</th>
                   <th style={{ padding: '8px' }}>FAL</th>
                 </tr>
               </thead>
               <tbody>
                 {teamAPlayers.map(p => {
                   const s = getPlayerFullStats(p.id, events);
                   return (
                     <tr key={p.id} style={{ borderBottom: '1px solid #eee', fontSize: '11px' }}>
                       <td style={{ padding: '8px' }}>#{p.numero} {p.nombre}</td>
                       <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{s.pts}</td>
                       <td style={{ padding: '8px', textAlign: 'center' }}>{s.tcTotal}</td>
                       <td style={{ padding: '8px', textAlign: 'center' }}>{s.tl}</td>
                       <td style={{ padding: '8px', textAlign: 'center' }}>{s.reb}</td>
                       <td style={{ padding: '8px', textAlign: 'center' }}>{s.ast}</td>
                       <td style={{ padding: '8px', textAlign: 'center' }}>{s.stl}</td>
                       <td style={{ padding: '8px', textAlign: 'center' }}>{s.fouls}</td>
                     </tr>
                   );
                 })}
               </tbody>
            </table>

            {/* Visitor Team Table */}
            <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>{match.nombre_visitante} (Estadísticas)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                 <tr style={{ background: '#eee', fontSize: '10px' }}>
                   <th style={{ padding: '8px', textAlign: 'left' }}>Jugador</th>
                   <th style={{ padding: '8px' }}>PTS</th>
                   <th style={{ padding: '8px' }}>TC</th>
                   <th style={{ padding: '8px' }}>TL</th>
                   <th style={{ padding: '8px' }}>REB</th>
                   <th style={{ padding: '8px' }}>AST</th>
                   <th style={{ padding: '8px' }}>ROB</th>
                   <th style={{ padding: '8px' }}>FAL</th>
                 </tr>
               </thead>
               <tbody>
                 {teamBPlayers.map(p => {
                   const s = getPlayerFullStats(p.id, events);
                   return (
                     <tr key={p.id} style={{ borderBottom: '1px solid #eee', fontSize: '11px' }}>
                       <td style={{ padding: '8px' }}>#{p.numero} {p.nombre}</td>
                       <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{s.pts}</td>
                       <td style={{ padding: '8px', textAlign: 'center' }}>{s.tcTotal}</td>
                       <td style={{ padding: '8px', textAlign: 'center' }}>{s.tl}</td>
                       <td style={{ padding: '8px', textAlign: 'center' }}>{s.reb}</td>
                       <td style={{ padding: '8px', textAlign: 'center' }}>{s.ast}</td>
                       <td style={{ padding: '8px', textAlign: 'center' }}>{s.stl}</td>
                       <td style={{ padding: '8px', textAlign: 'center' }}>{s.fouls}</td>
                     </tr>
                   );
                 })}
               </tbody>
            </table>
          </div>
        </div>

        <style>{`
          @media print {
            body { background: #fff !important; color: #000 !important; }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            @page { margin: 1cm; }
          }
        `}</style>
      </div>
    );
  }


  const FoulDots = ({ count, max = 5 }) => {
    return (
      <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
        {[...Array(max)].map((_, i) => (
          <div 
            key={i} 
            style={{ 
              width: '7px', 
              height: '7px', 
              borderRadius: '50%', 
              backgroundColor: i < count 
                ? (count >= 5 ? '#ff4d4d' : (count >= 4 ? '#ff9f43' : colors.accent)) 
                : 'rgba(255,255,255,0.1)',
              boxShadow: i < count ? `0 0 5px ${count >= 5 ? '#ff4d4d' : (count >= 4 ? '#ff9f43' : colors.accent)}` : 'none'
            }} 
          />
        ))}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: colors.bg, color: colors.text, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', backgroundColor: colors.card, borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => navigate(profile?.rol === 'entrenador' ? '/coach/games' : '/club/games')}>
          <div style={{ background: colors.accent, width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo_simbolo.png" alt="F" style={{ height: '32px' }} />
          </div>
          {!isMobile && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: '900', fontSize: '0.9rem', color: colors.accent, letterSpacing: '0.5px' }}>FICHAJE LIVE</span>
              <span style={{ fontSize: '0.65rem', color: '#888', fontWeight: 'bold' }}>{match.nombre_local} vs {match.nombre_visitante}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
           <button onClick={() => window.open(`/broadcast/match/${matchId}`, '_blank')} style={{ background: '#0066ff', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold' }}>TRANSMITIR</button>
           <button onClick={() => navigate(profile?.rol === 'entrenador' ? '/coach/games' : '/club/games')} style={{ background: 'transparent', color: colors.failed, border: `1px solid ${colors.failed}`, padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.7rem' }}>SALIR</button>
        </div>
      </div>

      {isMobile ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {/* Summary Mobile */}
          <div style={{ padding: '0.8rem', background: '#11151c', borderBottom: `1px solid ${colors.border}` }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                   <div style={{ fontSize: '0.7rem', color: colors.textMuted }}>{match.nombre_local}</div>
                   <div style={{ fontSize: '2.4rem', fontWeight: '900' }}>{scoreA}</div>
                   <div style={{ fontSize: '0.6rem', color: teamFoulsA >= 5 ? colors.failed : colors.textMuted }}>FALLAS: {teamFoulsA}</div>
                </div>
                <div style={{ textAlign: 'center', minWidth: '90px' }}>
                   <div style={{ color: colors.accent, fontSize: '1.4rem', fontWeight: 'bold' }}>{formatTime(timeLeft)}</div>
                   <div style={{ fontSize: '0.6rem', opacity: 0.7 }}>PER {period}</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                   <div style={{ fontSize: '0.7rem', color: colors.textMuted }}>{match.nombre_visitante}</div>
                   <div style={{ fontSize: '2.4rem', fontWeight: '900' }}>{scoreB}</div>
                   <div style={{ fontSize: '0.6rem', color: teamFoulsB >= 5 ? colors.failed : colors.textMuted }}>FALLAS: {teamFoulsB}</div>
                </div>
             </div>
             <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.2rem 0', paddingLeft: '0.5rem' }}>
                {getPeriodScores().map(ps => (
                  <div key={ps.p} style={{ minWidth: '80px', background: ps.p === period ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)', padding: '5px 8px', borderRadius: '8px', border: `1px solid ${ps.p === period ? colors.accent : 'transparent'}`, display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: '900', color: ps.p === period ? colors.accent : '#888' }}>P{ps.p}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '900' }}>{ps.a} - {ps.b}</div>
                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '3px', width: '100%', justifyContent: 'center' }}>
                      <TeamFoulBonusDots count={ps.fa} />
                      <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', height: '10px' }}></div>
                      <TeamFoulBonusDots count={ps.fb} />
                    </div>
                  </div>
                ))}
             </div>
          </div>

          <div style={{ display: 'flex', padding: '0.4rem', gap: '0.4rem' }}>
            <button onClick={() => setActiveTeamTab('A')} style={{ flex: 1, padding: '0.6rem', background: activeTeamTab === 'A' ? 'rgba(16, 185, 129, 0.1)' : 'transparent', border: `1px solid ${activeTeamTab === 'A' ? colors.accent : colors.border}`, color: activeTeamTab === 'A' ? colors.accent : '#fff', fontWeight: 'bold', fontSize: '0.7rem', borderRadius: '8px' }}>{match.nombre_local}</button>
            <button onClick={() => setActiveTeamTab('B')} style={{ flex: 1, padding: '0.6rem', background: activeTeamTab === 'B' ? 'rgba(16, 185, 129, 0.1)' : 'transparent', border: `1px solid ${activeTeamTab === 'B' ? colors.accent : colors.border}`, color: activeTeamTab === 'B' ? colors.accent : '#fff', fontWeight: 'bold', fontSize: '0.7rem', borderRadius: '8px' }}>{match.nombre_visitante}</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.4rem', paddingBottom: '300px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem', marginBottom: '1rem' }}>
               {(activeTeamTab === 'A' ? teamAPlayers : teamBPlayers).filter(p => onCourtPlayers.includes(p.id)).map(p => {
                 const { pts, fouls } = getMiniStats(p.id);
                 const isSel = selectedPlayer?.id === p.id;
                 return (
                   <button key={p.id} onClick={() => setSelectedPlayer({ id: p.id, teamId: (activeTeamTab === 'A' ? 'LOCAL' : 'VISITANTE'), name: p.nombre, number: p.numero })} style={{ aspectRatio: '1', background: isSel ? 'rgba(16, 185, 129, 0.2)' : colors.card, border: `2px solid ${isSel ? colors.accent : (fouls >= 5 ? colors.failed : 'transparent')}`, borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: isSel ? colors.accent : '#fff' }}>{p.numero}</div>
                      <div style={{ fontSize: '0.45rem', fontWeight: '600', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortenName(p.base_name || p.nombre)}</div>
                      
                      {/* Puntos High Visibility Badge */}
                      <div style={{ position: 'absolute', top: '-4px', right: '-4px', background: pts > 0 ? colors.accent : '#333', color: pts > 0 ? '#000' : '#888', borderRadius: '4px', fontSize: '0.7rem', padding: '1px 5px', fontWeight: '900', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>{pts}</div>
                      
                      {/* Faltas Dots (Bolitas) */}
                      <div style={{ marginTop: '2px' }}>
                        <FoulDots count={fouls} />
                      </div>
                   </button>
                 );
               })}
            </div>

            <div style={{ background: colors.card, padding: '0.8rem', borderRadius: '12px' }}>
               <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: colors.textMuted, marginBottom: '0.6rem' }}>LIVE HISTORY</div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                 {(events || []).slice(0, 10).map(e => {
                   const p = [...teamAPlayers, ...teamBPlayers].find(pl => pl.id === e.jugador_id);
                   return (
                     <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                        <span style={{ fontWeight: '500' }}>{e.tiempo_juego} | #{p?.numero} {e.tipo === 'POINT' ? `+${e.puntos}` : e.tipo}</span>
                        <div style={{ background: 'rgba(255,107,107,0.1)', padding: '4px', borderRadius: '6px', cursor: 'pointer' }} onClick={() => deleteEvent(e.id)}>
                           <Trash2 size={16} style={{ color: colors.failed }} />
                        </div>
                     </div>
                   );
                 })}
               </div>
            </div>
          </div>

          {/* Action Pad Fixed Mobile */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: colors.bg, padding: '0.4rem', borderTop: `1px solid ${colors.border}`, zIndex: 100 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', marginBottom: '0.4rem' }}>
                <ActionButton label="1" sub="PTS" color={colors.accent} textColor="#000" isMobile onClick={() => handleAction('POINT', 1)} />
                <ActionButton label="2" sub="PTS" color={colors.accent} textColor="#000" isMobile onClick={() => handleAction('POINT', 2)} />
                <ActionButton label="3" sub="PTS" color={colors.accent} textColor="#000" isMobile onClick={() => handleAction('POINT', 3)} />
                <ActionButton sub="FALTA" color="#b44" isMobile onClick={() => handleAction('FOUL')} />
                
                <ActionButton label="1" sub="FALLO" color="rgba(255, 107, 107, 0.1)" textColor={colors.failed} isMobile onClick={() => handleAction('MISSED_SHOT', 1)} border={colors.failed} />
                <ActionButton label="2" sub="FALLO" color="rgba(255, 107, 107, 0.1)" textColor={colors.failed} isMobile onClick={() => handleAction('MISSED_SHOT', 2)} border={colors.failed} />
                <ActionButton label="3" sub="FALLO" color="rgba(255, 107, 107, 0.1)" textColor={colors.failed} isMobile onClick={() => handleAction('MISSED_SHOT', 3)} border={colors.failed} />
                <ActionButton sub="REB" color="#2c333f" isMobile icon={<Shield size={14}/>} onClick={() => handleAction('REBOUND')} />

                <ActionButton sub="ASIST" color="#2c333f" isMobile icon={<Activity size={14}/>} onClick={() => handleAction('ASSIST')} />
                <ActionButton sub="ROBO" color="#2c333f" isMobile onClick={() => handleAction('STEAL')} />
                <ActionButton sub="TAPÓN" color="#2c333f" isMobile icon={<Target size={14}/>} onClick={() => handleAction('BLOCK')} />
                <ActionButton sub="PERDIDA" color="#2c333f" isMobile onClick={() => handleAction('TURNOVER')} />
              </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem', background: colors.card, borderRadius: '8px' }}>
                <FooterBtn icon={isRunning ? <Pause size={18}/> : <Play size={18}/>} label={isRunning ? "PAUSE" : "PLAY"} onClick={() => setIsRunning(!isRunning)} active={isRunning} />
                <FooterBtn icon={<RotateCcw size={18}/>} label="ROSTER" onClick={() => setShowSubModal(true)} />
                <FooterBtn icon={<Activity size={18}/>} label="STATS" onClick={() => setShowStats(true)} />
                <button onClick={handleEndPeriod} style={{ background: colors.failed, color: '#fff', border: 'none', borderRadius: '8px', padding: '0 10px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', cursor: 'pointer' }}><Clock size={12}/> FIN P</button>
             </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr 300px', gap: '1rem', padding: '1rem', overflow: 'hidden' }}>
          <TeamPanel team={{name: match.nombre_local}} players={teamAPlayers} selectedPlayer={selectedPlayer} setSelectedPlayer={setSelectedPlayer} onCourtPlayers={onCourtPlayers} toggleOnCourt={toggleOnCourt} getMiniStats={getMiniStats} side="local" events={events} deleteEvent={deleteEvent} FoulDots={FoulDots} colors={colors} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', height: '100%', paddingBottom: '1rem' }}>
            {/* Scoreboard Desktop */}
            <div style={{ background: colors.card, borderRadius: '16px', padding: '1.5rem', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '3rem', width: '100%', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                     <div style={{ fontSize: '6rem', fontWeight: '900' }}>{scoreA}</div>
                     <div style={{ fontSize: '0.8rem', color: teamFoulsA >= 5 ? colors.failed : colors.textMuted, fontWeight: 'bold' }}>FALTAS EQUIPO: {teamFoulsA}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                     <div style={{ background: '#000', padding: '0.5rem 1.5rem', borderRadius: '12px', marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '4rem', fontWeight: 'bold', color: colors.accent, fontFamily: 'monospace' }}>{formatTime(timeLeft)}</div>
                     </div>
                     <div style={{ color: colors.accent, fontWeight: 'bold', fontSize: '0.8rem' }}>PERIOD {period}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                     <div style={{ fontSize: '6rem', fontWeight: '900' }}>{scoreB}</div>
                     <div style={{ fontSize: '0.8rem', color: teamFoulsB >= 5 ? colors.failed : colors.textMuted, fontWeight: 'bold' }}>FALTAS EQUIPO: {teamFoulsB}</div>
                  </div>
               </div>
               <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.2rem', overflowX: 'auto', paddingBottom: '0.5rem', width: '100%', justifyContent: 'center' }}>
                  {getPeriodScores().map(ps => (
                    <div key={ps.p} style={{ minWidth: '100px', background: ps.p === period ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '12px', border: `2px solid ${ps.p === period ? colors.accent : colors.border}`, transition: 'all 0.3s' }}>
                       <div style={{ fontSize: '0.65rem', color: ps.p === period ? colors.accent : colors.textMuted, fontWeight: '900', marginBottom: '4px', textAlign: 'center' }}>CUARTO {ps.p}</div>
                       <div style={{ fontSize: '1.4rem', fontWeight: '900', textAlign: 'center', marginBottom: '8px' }}>{ps.a} - {ps.b}</div>
                       
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                         <div style={{ textAlign: 'center' }}>
                           <TeamFoulBonusDots count={ps.fa} />
                         </div>
                         <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', height: '20px', alignSelf: 'center' }}></div>
                         <div style={{ textAlign: 'center' }}>
                           <TeamFoulBonusDots count={ps.fb} />
                         </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* Action Buttons Desktop */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
               <ActionButton label="1" sub="PTS" color={colors.accent} textColor="#000" onClick={() => handleAction('POINT', 1)} />
               <ActionButton label="2" sub="PTS" color={colors.accent} textColor="#000" onClick={() => handleAction('POINT', 2)} />
               <ActionButton label="3" sub="PTS" color={colors.accent} textColor="#000" onClick={() => handleAction('POINT', 3)} />
               
               <ActionButton label="1" sub="FALLO" color="rgba(255, 107, 107, 0.1)" textColor={colors.failed} border={colors.failed} onClick={() => handleAction('MISSED_SHOT', 1)} />
               <ActionButton label="2" sub="FALLO" color="rgba(255, 107, 107, 0.1)" textColor={colors.failed} border={colors.failed} onClick={() => handleAction('MISSED_SHOT', 2)} />
               <ActionButton label="3" sub="FALLO" color="rgba(255, 107, 107, 0.1)" textColor={colors.failed} border={colors.failed} onClick={() => handleAction('MISSED_SHOT', 3)} />
               
               <ActionButton sub="REBOTE" icon={<Shield/>} color="#2c333f" onClick={() => handleAction('REBOUND')} />
               <ActionButton sub="ASIST" icon={<Activity/>} color="#2c333f" onClick={() => handleAction('ASSIST')} />
               <ActionButton sub="ROBO" color="#2c333f" onClick={() => handleAction('STEAL')} />
               <ActionButton sub="TAPÓN" icon={<Target/>} color="#2c333f" onClick={() => handleAction('BLOCK')} />
               <ActionButton sub="PERDIDA" color="#2c333f" onClick={() => handleAction('TURNOVER')} />
               <ActionButton sub="FALTA" icon={<AlertCircle/>} color="#b44" onClick={() => handleAction('FOUL')} />
            </div>

            {/* Main Controls Desktop */}
            <div style={{ background: colors.card, borderTop: `1px solid ${colors.border}`, padding: '1rem', display: 'flex', justifyContent: 'center', gap: '2rem', borderRadius: '12px' }}>
                <FooterBtn icon={isRunning ? <Pause size={24}/> : <Play size={24}/>} label={isRunning ? "PAUSAR" : "INICIAR"} onClick={() => setIsRunning(!isRunning)} active={isRunning} />
                <FooterBtn icon={<RotateCcw size={24}/>} label="ROSTER" onClick={() => setShowSubModal(true)} />
                <FooterBtn icon={<Activity size={24}/>} label="STATS" onClick={() => setShowStats(true)} />
                <button 
                  onClick={handleEndPeriod} 
                  style={{ background: '#a22', color: '#fff', padding: '0 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                >
                  <Clock size={16}/> FINALIZAR P{period}
                </button>
            </div>
          </div>

          <TeamPanel team={{name: match.nombre_visitante}} players={teamBPlayers} selectedPlayer={selectedPlayer} setSelectedPlayer={setSelectedPlayer} onCourtPlayers={onCourtPlayers} toggleOnCourt={toggleOnCourt} getMiniStats={getMiniStats} side="away" events={events} deleteEvent={deleteEvent} FoulDots={FoulDots} colors={colors} />
        </div>
      )}

      {/* Modals */}
      {showStats && <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} match={match} playersA={teamAPlayers} playersB={teamBPlayers} events={events} FoulDots={FoulDots} colors={colors} />}
      {showSubModal && <SubstitutionModal isOpen={showSubModal} onClose={() => setShowSubModal(false)} teamA={{name: match.nombre_local}} teamB={{name: match.nombre_visitante}} playersA={teamAPlayers} playersB={teamBPlayers} onCourtPlayers={onCourtPlayers} toggleOnCourt={toggleOnCourt} shortenName={shortenName} />}
    </div>
  );
}

function ActionButton({ label, sub, icon, color, textColor = "#fff", onClick, border, isMobile }) {
  return (
    <button onClick={onClick} style={{ backgroundColor: color, border: border ? `1px solid ${border}` : 'none', borderRadius: '10px', color: textColor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0.4rem' : '0.6rem', cursor: 'pointer', transition: 'all 0.2s' }}>
      {label && <span style={{ fontSize: isMobile ? '1.1rem' : '1.5rem', fontWeight: 'bold' }}>{label}</span>}
      {icon && <div style={{ color: color === '#10B981' ? '#000' : (textColor === '#fff' ? '#fff' : textColor), marginBottom: '1px' }}>{React.cloneElement(icon, { size: isMobile ? 14 : 20 })}</div>}
      <span style={{ fontSize: isMobile ? '0.5rem' : '0.6rem', fontWeight: 'bold' }}>{sub}</span>
    </button>
  );
}

function TeamPanel({ team, players, selectedPlayer, setSelectedPlayer, onCourtPlayers, toggleOnCourt, getMiniStats, side, events, deleteEvent, FoulDots, colors }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', overflow: 'hidden', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: '#1c222b', padding: '0.8rem', borderRadius: '10px' }}>
        <img src={team?.logo_url || '/ico-blanco.png'} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
        <span style={{ fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team?.name}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {players.filter(p => onCourtPlayers.includes(p.id)).map(p => {
          const { pts, fouls } = getMiniStats(p.id);
          const isSel = selectedPlayer?.id === p.id;
          return (
            <div key={p.id} onClick={() => setSelectedPlayer({ id: p.id, teamId: (side === 'local' ? 'LOCAL' : 'VISITANTE'), name: p.nombre, number: p.numero })} style={{ display: 'flex', alignItems: 'center', padding: '0.6rem 0.8rem', background: isSel ? 'rgba(204,255,0,0.15)' : '#1c222b', borderRadius: '8px', border: `1px solid ${isSel ? '#10B981' : 'transparent'}`, cursor: 'pointer', position: 'relative' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: '900', width: '35px', color: isSel ? '#10B981' : '#fff' }}>{p.numero}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: '800' }}>{shortenName(p.base_name || p.nombre)}</div>
                <FoulDots count={fouls} />
              </div>
              <div style={{ background: pts > 0 ? colors.accent : '#333', color: pts > 0 ? '#000' : '#888', borderRadius: '4px', fontSize: '0.75rem', padding: '2px 8px', fontWeight: '900', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>{pts} PTS</div>
            </div>
          );
        })}
      </div>
      <div style={{ height: '160px', background: '#111', padding: '0.6rem', borderRadius: '10px', overflowY: 'auto' }}>
        <div style={{ fontSize: '0.65rem', color: '#667', fontWeight: 'bold', marginBottom: '6px' }}>RECENT FEED</div>
        {(events || []).filter(e => e.equipo === (side === 'local' ? 'LOCAL' : 'VISITANTE')).slice(0, 10).map(e => (
          <div key={e.id} style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', padding: '4px 0' }}>
            <span>{e.tiempo_juego} #{players.find(pl => pl.id === e.jugador_id)?.numero} {e.tipo === 'POINT' ? `+${e.puntos}` : e.tipo}</span>
            <div style={{ background: 'rgba(255,107,107,0.1)', padding: '3px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => deleteEvent(e.id)}>
               <Trash2 size={14} style={{ color: colors.failed }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FooterBtn({ icon, label, onClick, active }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', color: active ? '#10B981' : '#88919e', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
      {icon}
      <span style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>{label}</span>
    </button>
  );
}

function StatsModal({ isOpen, onClose, match, playersA, playersB, events, FoulDots, colors }) {
  const [tab, setTab] = useState('LOCAL');
  
  const getStats = (pid) => {
    const pEvts = events.filter(e => e.player_id === pid);
    const getCount = (type) => pEvts.filter(e => e.type === type).length;
    
    // Points logic
    const pts1 = pEvts.filter(e => e.type === 'POINT' && e.points === 1).length;
    const pts2 = pEvts.filter(e => e.type === 'POINT' && e.points === 2).length;
    const pts3 = pEvts.filter(e => e.type === 'POINT' && e.points === 3).length;
    
    // Missed logic
    const ms1 = pEvts.filter(e => e.type === 'MISSED_SHOT' && e.points === 1).length;
    const ms2 = pEvts.filter(e => e.type === 'MISSED_SHOT' && e.points === 2).length;
    const ms3 = pEvts.filter(e => e.type === 'MISSED_SHOT' && e.points === 3).length;

    const totalPts = (pts1 * 1) + (pts2 * 2) + (pts3 * 3);
    
    return {
      pts: totalPts,
      tl: `${pts1}/${pts1 + ms1}`,
      tc2: `${pts2}/${pts2 + ms2}`,
      tc3: `${pts3}/${pts3 + ms3}`,
      tcTotal: `${pts2 + pts3}/${pts2 + ms2 + pts3 + ms3}`,
      reb: getCount('REBOUND'),
      ast: getCount('ASSIST'),
      stl: getCount('STEAL'),
      blk: getCount('BLOCK'),
      to: getCount('TURNOVER'),
      fouls: getCount('FOUL')
    };
  };

  const currentPlayers = tab === 'LOCAL' ? playersA : playersB;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
       <div style={{ background: '#161a21', width: '100%', maxWidth: '900px', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px' }}>
              <button 
                onClick={() => setTab('LOCAL')} 
                style={{ background: tab === 'LOCAL' ? colors.accent : 'transparent', color: tab === 'LOCAL' ? '#000' : '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
              >
                {match.nombre_local}
              </button>
              <button 
                onClick={() => setTab('VIS')} 
                style={{ background: tab === 'VIS' ? colors.accent : 'transparent', color: tab === 'VIS' ? '#000' : '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
              >
                {match.nombre_visitante}
              </button>
            </div>
            <div 
              onClick={onClose} 
              style={{ background: 'rgba(255,255,255,0.05)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X style={{ color: '#888' }} size={20} />
            </div>
          </div>

          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ color: colors.textMuted, fontSize: '0.65rem', textTransform: 'uppercase', borderBottom: '1px solid #333' }}>
                  <th style={{ padding: '0.8rem' }}>Jugador</th>
                  <th style={{ padding: '0.8rem' }}>Pts</th>
                  <th style={{ padding: '0.8rem' }}>TC</th>
                  <th style={{ padding: '0.8rem' }}>2P</th>
                  <th style={{ padding: '0.8rem' }}>3P</th>
                  <th style={{ padding: '0.8rem' }}>TL</th>
                  <th style={{ padding: '0.8rem' }}>Reb</th>
                  <th style={{ padding: '0.8rem' }}>Ast</th>
                  <th style={{ padding: '0.8rem' }}>Robo</th>
                  <th style={{ padding: '0.8rem' }}>Tap</th>
                  <th style={{ padding: '0.8rem' }}>Per</th>
                  <th style={{ padding: '0.8rem' }}>Faltas</th>
                </tr>
              </thead>
              <tbody>
                {currentPlayers.map(p => {
                  const s = getStats(p.id);
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                      <td style={{ padding: '0.8rem' }}>
                        <div style={{ fontWeight: '900', fontSize: '0.95rem' }}>#{p.numero} {p.nombre}</div>
                        <FoulDots count={s.fouls} />
                      </td>
                      <td style={{ padding: '0.8rem' }}>
                        <span style={{ color: colors.accent, fontWeight: '900', fontSize: '1.2rem' }}>{s.pts}</span>
                      </td>
                      <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{s.tcTotal}</td>
                      <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{s.tc2}</td>
                      <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{s.tc3}</td>
                      <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{s.tl}</td>
                      <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{s.reb}</td>
                      <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{s.ast}</td>
                      <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{s.stl}</td>
                      <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{s.blk}</td>
                      <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{s.to}</td>
                      <td style={{ padding: '0.8rem', fontWeight: 'bold', color: s.fouls >= 5 ? colors.failed : '#fff' }}>{s.fouls}/5</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
       </div>
    </div>
  );
}

function SubstitutionModal({ isOpen, onClose, teamA, teamB, playersA, playersB, onCourtPlayers, toggleOnCourt, shortenName }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
       <div style={{ background: '#161a21', width: '100%', maxWidth: '600px', borderRadius: '16px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Roster / Cambios</h2>
            <X onClick={onClose} style={{ cursor: 'pointer', color: '#888' }} size={24} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
             <div>
                <h4 style={{ color: '#10B981', marginBottom: '0.5rem', fontSize: '0.8rem' }}>{teamA?.short_name}</h4>
                {playersA.map(p => (
                  <button key={p.id} onClick={() => toggleOnCourt(p.id)} style={{ width: '100%', padding: '0.6rem', margin: '2px 0', borderRadius: '6px', border: '1px solid #333', background: onCourtPlayers.includes(p.id) ? 'rgba(204,255,0,0.1)' : 'transparent', color: onCourtPlayers.includes(p.id) ? '#10B981' : '#fff', textAlign: 'left', fontSize: '0.7rem' }}>#{p.numero} {shortenName(p.nombre)}</button>
                ))}
             </div>
             <div>
                <h4 style={{ color: '#10B981', marginBottom: '0.5rem', fontSize: '0.8rem' }}>{teamB?.short_name}</h4>
                {playersB.map(p => (
                  <button key={p.id} onClick={() => toggleOnCourt(p.id)} style={{ width: '100%', padding: '0.6rem', margin: '2px 0', borderRadius: '6px', border: '1px solid #333', background: onCourtPlayers.includes(p.id) ? 'rgba(204,255,0,0.1)' : 'transparent', color: onCourtPlayers.includes(p.id) ? '#10B981' : '#fff', textAlign: 'left', fontSize: '0.7rem' }}>#{p.numero} {shortenName(p.nombre)}</button>
                ))}
             </div>
          </div>
          <button onClick={onClose} style={{ width: '100%', marginTop: '1.5rem', padding: '0.8rem', background: '#10B981', color: '#000', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>CONFIRMAR</button>
       </div>
    </div>
  );
}
