import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Plus, Calendar as CalendarIcon, Clock, Target, 
  Layers, FileText, Save, PlusCircle, Trash2, 
  CheckCircle2, Info, Loader2, ChevronRight, ChevronLeft,
  Zap, Brain, Shield, Sword, Trophy, Check
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

// Local X icon to avoid import issues if not in lucide-react version
const XIcon = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

interface Objective {
  type: string;
  text: string;
  met?: boolean;
}

interface Phase {
  description: string;
  tasks: string[];
}

interface PlanningSession {
  id?: string;
  titulo: string;
  equipo_id: string;
  club_id?: string;
  fecha: string;
  hora: string;
  periodo: string;
  semana_no: number;
  sesion_no: number;
  descripcion: string;
  objetivos: Objective[];
  fase_calentamiento: Phase;
  fase_principal: Phase;
  fase_vuelta_calma: Phase;
  notas_generales: string;
  completada: boolean;
  equipo?: { nombre: string };
}

export default function Planning() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [sessions, setSessions] = useState<PlanningSession[]>([]);
  const [availableDates, setAvailableDates] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Helper: Calcular semana del año
  const getWeekNumber = (d: Date) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
  };

  const [form, setForm] = useState<PlanningSession>({
    titulo: '',
    equipo_id: '',
    fecha: '',
    hora: '',
    periodo: 'pretemporada',
    semana_no: 0,
    sesion_no: 0,
    descripcion: '',
    objetivos: [],
    fase_calentamiento: { description: '', tasks: [] },
    fase_principal: { description: '', tasks: [] },
    fase_vuelta_calma: { description: '', tasks: [] },
    notas_generales: '',
    completada: false
  });

  useEffect(() => {
    if (profile?.club_id) {
      fetchTeams();
      fetchSessions();
    }
  }, [profile?.club_id]);

  useEffect(() => {
    if (form.equipo_id) {
      fetchAvailableDates(form.equipo_id);
    } else {
      setAvailableDates([]);
    }
  }, [form.equipo_id]);

  async function fetchTeams() {
    const { data } = await supabase
      .from('equipos')
      .select('id, nombre')
      .eq('club_id', profile?.club_id);
    setTeams(data || []);
  }

  async function fetchAvailableDates(equipoId: string) {
    try {
      // 1. Obtener fechas de agenda
      const { data: agenda, error: agendaError } = await supabase
        .from('agenda_deportiva')
        .select('fecha, hora_inicio, titulo')
        .eq('equipo_id', equipoId)
        .eq('tipo', 'entrenamiento')
        .order('fecha', { ascending: false });
      
      if (agendaError) throw agendaError;

      // 2. Obtener fechas ya planificadas para este equipo
      const { data: planned, error: plannedError } = await supabase
        .from('planificaciones')
        .select('fecha')
        .eq('equipo_id', equipoId);
      
      if (plannedError) throw plannedError;

      const plannedDates = new Set(planned?.map(p => p.fecha));
      
      // 3. Filtrar: Solo mostrar sesiones de agenda que NO tengan planificación aún
      // Y filtrar por el mes seleccionado
      const filtered = agenda?.filter(a => {
        const isNotPlanned = !plannedDates.has(a.fecha) || a.fecha === form.fecha;
        const month = new Date(a.fecha + 'T00:00:00').getMonth() + 1;
        return isNotPlanned && month === monthFilter;
      });
      
      setAvailableDates(filtered || []);
    } catch (err) {
      console.error("Error fetching available dates:", err);
    }
  }

  async function fetchSessions() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('planificaciones')
        .select('*, equipo:equipos(nombre)')
        .eq('club_id', profile?.club_id)
        .order('fecha', { ascending: false });
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "planificaciones" does not exist')) {
           setSessions([]);
           return;
        }
        throw error;
      }
      setSessions(data || []);
    } catch (err) {
      console.error("Error fetching sessions:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddObjective = () => {
    setForm(prev => ({
      ...prev,
      objetivos: [...prev.objetivos, { type: 'tecnico', text: '' }]
    }));
  };

  const handleRemoveObjective = (index: number) => {
    setForm(prev => ({
      ...prev,
      objetivos: prev.objetivos.filter((_, i) => i !== index)
    }));
  };

  const handleObjectiveChange = (index: number, field: keyof Objective, value: any) => {
    const newObjectives = [...form.objetivos];
    newObjectives[index] = { ...newObjectives[index], [field]: value };
    setForm(prev => ({ ...prev, objetivos: newObjectives }));
  };

  const handleAddTask = (phaseKey: 'fase_calentamiento' | 'fase_principal' | 'fase_vuelta_calma') => {
    setForm(prev => ({
      ...prev,
      [phaseKey]: {
        ...prev[phaseKey],
        tasks: [...prev[phaseKey].tasks, '']
      }
    }));
  };

  const handleRemoveTask = (phaseKey: 'fase_calentamiento' | 'fase_principal' | 'fase_vuelta_calma', index: number) => {
    setForm(prev => ({
      ...prev,
      [phaseKey]: {
        ...prev[phaseKey],
        tasks: prev[phaseKey].tasks.filter((_, i) => i !== index)
      }
    }));
  };

  const handleTaskChange = (phaseKey: 'fase_calentamiento' | 'fase_principal' | 'fase_vuelta_calma', index: number, value: string) => {
    const newTasks = [...form[phaseKey].tasks];
    newTasks[index] = value;
    setForm(prev => ({
      ...prev,
      [phaseKey]: { ...prev[phaseKey], tasks: newTasks }
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.club_id) return;

    if (form.completada && !form.notas_generales.trim()) {
      setToast({ message: t('planning.error_notes_required'), type: 'error' });
      return;
    }

    if (form.completada && !form.objetivos.some(o => o.met)) {
      setToast({ message: t('planning.error_objectives_required'), type: 'error' });
      return;
    }

    setSaving(true);
    try {
      // Remove the join object if editing
      const { equipo, ...saveData } = form as any;
      const payload = {
        ...saveData,
        club_id: profile.club_id
      };

      const { error } = await supabase
        .from('planificaciones')
        .upsert(payload);

      if (error) throw error;
      
      setToast({ message: t('common.success'), type: 'success' });
      setShowModal(false);
      resetForm();
      fetchSessions();
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      titulo: '',
      equipo_id: '',
      fecha: '',
      hora: '',
      periodo: 'competencia',
      semana_no: 0,
      sesion_no: 0,
      descripcion: '',
      objetivos: [],
      fase_calentamiento: { description: '', tasks: [] },
      fase_principal: { description: '', tasks: [] },
      fase_vuelta_calma: { description: '', tasks: [] },
      notas_generales: '',
      completada: false
    });
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const isNotesActive = new Date(form.fecha).toDateString() === new Date().toDateString() || form.completada;

  const getObjectiveIcon = (type: string) => {
    switch (type) {
    case 'tecnico': return <Zap size={14} />;
    case 'tactico': return <Brain size={14} />;
    case 'ofensivo': return <Sword size={14} />;
    case 'defensivo': return <Shield size={14} />;
    case 'mental': return <Trophy size={14} />;
      default: return <Target size={14} />;
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap md:items-center justify-between gap-6">
        <div>
           <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none">{t('nav.planning')}</h1>
           <p className="text-sm text-gray-500 font-medium mt-2">{t('planning.subtitle')}</p>
        </div>
        
        <Button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-[#CCFF00] text-black h-12 rounded-2xl font-black uppercase italic text-[10px] tracking-widest gap-2"
        >
          <PlusCircle size={16} /> {t('planning.new_session')}
        </Button>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#CCFF00]" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white dark:bg-[#1e293b]/40 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-[48px] p-20 text-center">
          <FileText size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">{t('calendar.no_players_found')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sessions.map(session => (
            <div 
              key={session.id}
              onClick={() => { setForm(session); setShowModal(true); }}
              className="bg-white dark:bg-[#1e293b]/40 border border-gray-100 dark:border-white/5 rounded-[40px] p-8 hover:border-[#CCFF00]/50 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                  <CalendarIcon size={20} />
                </div>
                {session.completada && (
                  <div className="bg-[#CCFF00] text-black text-[8px] font-black px-2 py-1 rounded-full uppercase italic">
                    {t('calendar.pres')}
                  </div>
                )}
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic mb-2 truncate group-hover:text-[#CCFF00] transition-colors">
                {session.titulo}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 font-bold mb-6">
                 {session.equipo?.nombre && (
                   <>
                    <span className="text-[#CCFF00]">{session.equipo.nombre}</span>
                    <span>•</span>
                   </>
                 )}
                <span className="bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-lg uppercase tracking-wider">{session.periodo}</span>
                <span>•</span>
                <span>{session.fecha}</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <span>{t('planning.objectives')}</span>
                  <span>{session.objetivos.length}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {session.objetivos.slice(0, 3).map((obj, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 px-2 py-1 rounded-lg text-[8px] font-bold text-gray-600 dark:text-gray-400 border border-transparent">
                      {getObjectiveIcon(obj.type)}
                      {obj.type}
                    </div>
                  ))}
                  {session.objetivos.length > 3 && (
                    <div className="bg-gray-50 dark:bg-white/5 px-2 py-1 rounded-lg text-[8px] font-bold text-gray-400">
                      +{session.objetivos.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={form.id ? t('planning.session_title') : t('planning.new_session')}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSave} className="space-y-8 py-4 px-2 overflow-x-hidden custom-scrollbar max-h-[80vh] overflow-y-auto">
          {/* Section 1: General Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('planning.session_title')}</label>
              <Input 
                required
                disabled={form.completada}
                placeholder={t('planning.session_title')}
                value={form.titulo}
                onChange={e => setForm({...form, titulo: e.target.value})}
                className="h-14 rounded-2xl bg-gray-50 dark:bg-white/5 border-none font-bold disabled:opacity-50"
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('planning.team')}</label>
              <select 
                required
                disabled={form.completada}
                className="w-full h-14 bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-6 text-sm font-bold appearance-none focus:ring-2 focus:ring-[#CCFF00] dark:text-white disabled:opacity-50"
                value={form.equipo_id}
                onChange={e => setForm({...form, equipo_id: e.target.value})}
              >
                <option value="">{t('calendar.choose_team')}</option>
                {teams.map(t => <option key={t.id} value={t.id} className="dark:bg-[#1e293b]">{t.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-4 lg:col-span-1">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Filtrar Mes</label>
               <select 
                className="w-full h-14 bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-6 text-sm font-bold appearance-none dark:text-white"
                value={monthFilter}
                onChange={e => setMonthFilter(parseInt(e.target.value))}
               >
                 {Array.from({length: 12}, (_, i) => (
                   <option key={i+1} value={i+1}>{new Date(2024, i).toLocaleString('es-ES', { month: 'long' }).toUpperCase()}</option>
                 ))}
               </select>
            </div>

            <div className="space-y-4 lg:col-span-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                {availableDates.length > 0 ? 'Seleccionar Entrenamiento' : t('calendar.date')}
              </label>
              {availableDates.length > 0 ? (
                <div className="relative group">
                  <select 
                    required
                    disabled={form.completada}
                    className="w-full h-14 bg-[#CCFF00]/5 border-2 border-[#CCFF00]/20 rounded-2xl px-6 text-sm font-black appearance-none focus:ring-2 focus:ring-[#CCFF00] dark:text-white transition-all hover:border-[#CCFF00]/50"
                    value={form.fecha}
                    onChange={async (e) => {
                      const selectedDate = e.target.value;
                      const selected = availableDates.find(d => d.fecha === selectedDate);
                      
                      if (selected) {
                        const dateObj = new Date(selectedDate + 'T00:00:00');
                        const weekNo = getWeekNumber(dateObj);
                        const cleanTime = selected.hora_inicio ? selected.hora_inicio.substring(0, 5) : '';
                        
                        // Calcular sesión sugerida
                        const { data: weekPlans } = await supabase
                          .from('planificaciones')
                          .select('id')
                          .eq('equipo_id', form.equipo_id)
                          .eq('semana_no', weekNo);
                        
                        setForm(prev => ({
                          ...prev, 
                          fecha: selectedDate,
                          hora: cleanTime,
                          semana_no: weekNo,
                          sesion_no: (weekPlans?.length || 0) + 1
                        }));
                      }
                    }}
                  >
                    <option value="" className="dark:bg-[#0f1115] text-gray-500 italic">Elegir sesión pendiente...</option>
                    {availableDates.map((d, i) => (
                      <option key={i} value={d.fecha} className="dark:bg-[#1e293b]">
                        📅 {d.fecha} - ⏰ {d.hora_inicio} - {d.titulo}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-[#CCFF00]">
                    <CalendarIcon size={18} />
                  </div>
                </div>
              ) : (
                <input 
                  type="date"
                  required
                  disabled={form.completada}
                  value={form.fecha}
                  onChange={e => setForm({...form, fecha: e.target.value})}
                  className="w-full h-14 bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-[#CCFF00] dark:text-white disabled:opacity-50"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('common.time')}</label>
              <div className="relative group">
                <input 
                  type="text"
                  readOnly
                  value={form.hora ? (
                    (() => {
                      const [h, m] = form.hora.split(':');
                      const hour = parseInt(h);
                      const ampm = hour >= 12 ? 'p.m.' : 'a.m.';
                      const h12 = hour % 12 || 12;
                      return `${h12.toString().padStart(2, '0')}:${m} ${ampm}`;
                    })()
                  ) : '--:-- --'}
                  className="w-full h-14 bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-6 text-sm font-black focus:ring-2 focus:ring-[#CCFF00] dark:text-white cursor-default"
                />
                <Clock className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Semana del Año</label>
              <div className="flex items-center h-14 bg-[#CCFF00]/5 rounded-2xl px-6 border border-[#CCFF00]/10">
                <span className="text-sm font-black text-[#CCFF00] italic uppercase tracking-widest">
                  {form.semana_no > 0 ? `Semana ${form.semana_no}` : '--'}
                </span>
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nº Sesión (Sugerida)</label>
              <input 
                type="number"
                disabled={form.completada}
                placeholder="--"
                value={form.sesion_no || ''}
                onChange={e => setForm({...form, sesion_no: parseInt(e.target.value) || 0})}
                className="w-full h-14 bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-6 text-sm font-black focus:ring-2 focus:ring-[#CCFF00] dark:text-white disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('planning.description')}</label>
            <textarea 
              disabled={form.completada}
              value={form.descripcion}
              onChange={e => setForm({...form, descripcion: e.target.value})}
              className="w-full p-6 bg-gray-50 dark:bg-white/5 border-none rounded-[32px] text-sm font-medium focus:ring-2 focus:ring-[#CCFF00] dark:text-white min-h-[100px] disabled:opacity-50"
            />
          </div>

          {/* Section 2: Objectives */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#CCFF00]/10 rounded-xl text-[#CCFF00]">
                  <Target size={18} />
                </div>
                <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase italic">{t('planning.objectives')}</h4>
              </div>
              {!form.completada && (
                <Button type="button" onClick={handleAddObjective} variant="ghost" className="text-[#CCFF00] hover:bg-[#CCFF00]/5 gap-2 font-black italic uppercase text-[10px] tracking-widest">
                  <Plus size={16} /> {t('planning.add_objective')}
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {form.objetivos.map((obj, index) => (
                <div key={index} className="flex gap-4 animate-in slide-in-from-left-2 duration-300 items-center">
                  <select 
                    disabled={form.completada}
                    className="w-1/3 h-12 bg-gray-50 dark:bg-white/5 border-none rounded-xl px-4 text-xs font-bold appearance-none dark:text-white disabled:opacity-50"
                    value={obj.type}
                    onChange={e => handleObjectiveChange(index, 'type', e.target.value)}
                  >
                    {['tecnico', 'tactico', 'ofensivo', 'defensivo', 'mental'].map(type => (
                      <option key={type} value={type} className="dark:bg-[#1e293b]">{t(`planning.types.${type}`)}</option>
                    ))}
                  </select>
                  <div className="flex-1 flex items-center gap-3 bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12">
                    <input 
                      type="text"
                      disabled={form.completada}
                      placeholder={t('planning.add_objective')}
                      value={obj.text}
                      onChange={e => handleObjectiveChange(index, 'text', e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-xs font-bold dark:text-white disabled:opacity-50"
                    />
                    {new Date(form.fecha).toDateString() === new Date().toDateString() && !form.completada && (
                      <button
                        type="button"
                        onClick={() => handleObjectiveChange(index, 'met', !obj.met)}
                        className={cn(
                          "p-1.5 rounded-lg transition-all",
                          obj.met ? "bg-[#CCFF00] text-black" : "bg-gray-200 dark:bg-white/10 text-gray-400"
                        )}
                      >
                        <Check size={14} />
                      </button>
                    )}
                    {form.completada && obj.met && (
                      <div className="bg-[#CCFF00] text-black p-1 rounded-lg">
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                  {!form.completada && (
                    <button 
                      type="button"
                      onClick={() => handleRemoveObjective(index)}
                      className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Phases */}
          <div className="space-y-8">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-white/5 pb-4">
              <div className="p-2 bg-[#CCFF00]/10 rounded-xl text-[#CCFF00]">
                <Layers size={18} />
              </div>
              <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase italic">{t('planning.phases')}</h4>
            </div>

            {(['fase_calentamiento', 'fase_principal', 'fase_vuelta_calma'] as const).map(phaseKey => (
              <div key={phaseKey} className="bg-white dark:bg-[#1e293b]/20 border border-gray-100 dark:border-white/5 rounded-[32px] p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h5 className="font-black text-gray-900 dark:text-white uppercase italic tracking-wider">
                    {t(`planning.${phaseKey.replace('fase_', '')}`)}
                  </h5>
                  {!form.completada && (
                    <Button 
                      type="button" 
                      onClick={() => handleAddTask(phaseKey)}
                      className="h-9 rounded-xl bg-[#CCFF00] text-black hover:bg-[#CCFF00]/90 text-[9px] font-black uppercase tracking-widest gap-1 border-none shadow-lg shadow-[#CCFF00]/10"
                    >
                      <Plus size={14} /> {t('planning.add_task')}
                    </Button>
                  )}
                </div>

                <textarea 
                  disabled={form.completada}
                  placeholder={t('planning.phase_description')}
                  className="w-full p-4 bg-white dark:bg-[#1e293b]/20 border-none rounded-2xl text-xs font-medium focus:ring-1 focus:ring-[#CCFF00] dark:text-white min-h-[60px] disabled:opacity-50"
                  value={form[phaseKey].description}
                  onChange={e => setForm({...form, [phaseKey]: { ...form[phaseKey], description: e.target.value }})}
                />

                <div className="space-y-3">
                  {form[phaseKey].tasks.map((task, idx) => (
                    <div key={idx} className="flex gap-3 items-center group">
                      <div className="w-1 h-10 bg-[#CCFF00] rounded-full shrink-0" />
                      <input 
                        type="text"
                        disabled={form.completada}
                        placeholder={t('planning.add_task')}
                        className="flex-1 bg-white dark:bg-[#1e293b]/20 border-none rounded-xl px-4 h-10 text-xs font-bold dark:text-white focus:ring-1 focus:ring-[#CCFF00] disabled:opacity-50"
                        value={task}
                        onChange={e => handleTaskChange(phaseKey, idx, e.target.value)}
                      />
                      {!form.completada && (
                        <button 
                          type="button"
                          onClick={() => handleRemoveTask(phaseKey, idx)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <XIcon size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Section 4: General Notes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#CCFF00]/10 rounded-xl text-[#CCFF00]">
                  <FileText size={18} />
                </div>
                <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase italic">{t('planning.general_notes')}</h4>
              </div>
              {!isNotesActive && (
                <div className="flex items-center gap-2 bg-amber-500/5 px-3 py-1 rounded-full border border-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest">
                  <Info size={12} /> {t('calendar.coach_obs').split(' ')[0]} {form.fecha}
                </div>
              )}
            </div>
            
            <textarea 
              disabled={!isNotesActive}
              placeholder={t('planning.notes_placeholder')}
              className={cn(
                "w-full p-6 bg-gray-50 dark:bg-white/5 border-none rounded-[32px] text-sm font-medium dark:text-white min-h-[100px] transition-all",
                !isNotesActive ? "opacity-30 cursor-not-allowed italic" : "focus:ring-2 focus:ring-[#CCFF00]"
              )}
              value={form.notas_generales}
              onChange={e => setForm({...form, notas_generales: e.target.value})}
            />

            {isNotesActive && (
              <div className="flex items-center gap-3 p-4 bg-[#CCFF00]/5 rounded-2xl border border-[#CCFF00]/10">
                <CheckCircle2 size={16} className="text-[#CCFF00]" />
                <p className="text-[10px] text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wide">
                  {t('planning.complete_session')} <span className="text-[#CCFF00]">(Nota requerida)</span>
                </p>
                <div className="ml-auto">
                   <input 
                    type="checkbox"
                    checked={form.completada}
                    onChange={e => {
                      if (form.notas_generales.trim()) {
                        setForm({...form, completada: e.target.checked});
                      } else {
                        showToast("Debe dejar una nota general para completar la sesión", 'error');
                      }
                    }}
                    className="w-5 h-5 rounded-lg border-none bg-white dark:bg-white/10 text-[#CCFF00] focus:ring-[#CCFF00]"
                   />
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          {!form.completada && (
            <div className="flex gap-4 pt-8">
              <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="flex-1 h-14 rounded-3xl text-[10px] font-black uppercase italic tracking-widest">
                {t('common.cancel')}
              </Button>
              <Button type="submit" isLoading={saving} className="flex-1 bg-black text-white dark:bg-[#CCFF00] dark:text-black h-14 rounded-3xl text-[10px] font-black uppercase italic tracking-widest gap-2">
                <Save size={16} /> {t('planning.save_session')}
              </Button>
            </div>
          )}
          
          {form.completada && (
            <div className="pt-8 text-center text-[10px] font-black uppercase tracking-widest text-[#CCFF00] italic">
               {t('planning.complete_session')}
            </div>
          )}
        </form>
      </Modal>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}
