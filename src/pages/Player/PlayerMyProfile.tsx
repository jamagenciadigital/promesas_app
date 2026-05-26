import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  User, Calendar, Shield, MapPin, Phone, Mail, 
  Heart, Baby, FileText, Download, Printer,
  Trophy, TrendingUp, Activity, Target
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { FileUpload } from '../../components/ui/FileUpload';
import { QRCodeSVG } from 'qrcode.react';

export default function PlayerMyProfile() {
  const { profile } = useAuth();
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [asistencias, setAsistencias] = useState<any[]>([]);

  const getDirectImageUrl = (url: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.includes('drive.google.com')) {
      const id = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
      if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    }
    if (trimmed.includes('dropbox.com')) {
      return trimmed.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/\?dl=\d/, '');
    }
    return trimmed;
  };

  useEffect(() => {
    async function fetchPlayer() {
      if (!profile?.deportista_id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('deportistas')
          .select(`
            *,
            posicion:deportes_config_campos(valor),
            equipo:equipos!deportistas_equipo_id_fkey(nombre),
            equipo2:equipos!deportistas_equipo_id_2_fkey(nombre),
            equipo3:equipos!deportistas_equipo_id_3_fkey(nombre)
          `)
          .eq('id', profile.deportista_id)
          .single();
        
        const { data: astData } = await supabase
          .from('asistencia')
          .select(`
            *,
            evento:agenda_deportiva(titulo, fecha, tipo)
          `)
          .eq('deportista_id', profile.deportista_id)
          .eq('estado', 'presente')
          .not('puntaje_total', 'is', null)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setPlayer(data);
        if (astData) setAsistencias(astData);
      } catch (err) {
        console.error("Error fetching player profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlayer();
  }, [profile?.deportista_id]);

  const handlePrint = () => {
    window.print();
  };

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer || !profile?.deportista_id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('deportistas')
        .update({
          nombre_completo: editingPlayer.nombre_completo,
          apellidos: editingPlayer.apellidos,
          segundo_apellido: editingPlayer.segundo_apellido,
          genero: editingPlayer.genero,
          fecha_nacimiento: editingPlayer.fecha_nacimiento,
          tipo_documento: editingPlayer.tipo_documento,
          numero_documento: editingPlayer.numero_documento,
          eps: editingPlayer.eps,
          celular_deportista: editingPlayer.celular_deportista,
          email_deportista: editingPlayer.email_deportista,
          colegio: editingPlayer.colegio,
          tutor_nombre: editingPlayer.tutor_nombre,
          tutor_apellidos: editingPlayer.tutor_apellidos,
          tutor_celular: editingPlayer.tutor_celular,
          tutor_email: editingPlayer.tutor_email,
          tutor_numero_documento: editingPlayer.tutor_numero_documento,
          emergencia_nombre: editingPlayer.emergencia_nombre,
          emergencia_celular: editingPlayer.emergencia_celular,
          emergencia_email: editingPlayer.emergencia_email,
          departamento: editingPlayer.departamento,
          municipio: editingPlayer.municipio,
          barrio: editingPlayer.barrio,
          direccion: editingPlayer.direccion,
          foto_url: editingPlayer.foto_url,
          url_registro_civil: editingPlayer.url_registro_civil,
          url_documento_id: editingPlayer.url_documento_id,
          url_contrato: editingPlayer.url_contrato,
          url_certificado_salud: editingPlayer.url_certificado_salud,
          url_carta_traspaso: editingPlayer.url_carta_traspaso,
          viene_de_otro_club: editingPlayer.viene_de_otro_club,
          rh: editingPlayer.rh
        })
        .eq('id', profile.deportista_id);

      if (error) throw error;

      setPlayer({ ...player, ...editingPlayer });
      setIsEditing(false);
      setToast({ message: '¡Ficha técnica actualizada con éxito!', type: 'success' });
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setToast({ message: 'Error al actualizar la ficha.', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic">No se encontró información del deportista</h2>
        <p className="text-gray-400 mt-2">Comunícate con el administrador del club.</p>
      </div>
    );
  }

  const profileUrl = window.location.href;

  return (
    <div className="space-y-8 animate-in fade-in pb-20 print:bg-white print:pb-0">
      <div className="flex justify-between items-center print:hidden">
        <div>
           <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">Mi Ficha Oficial</h1>
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Datos registrados en el club</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => {
              setEditingPlayer({ ...player });
              setIsEditing(true);
            }}
            className="bg-[var(--primary)] text-black border-0 px-6 rounded-2xl flex items-center gap-2 uppercase font-black italic text-xs h-12 hover:scale-105 transition-transform"
          >
            <User size={16} /> Editar Ficha Técnica
          </Button>
          <Button 
            onClick={handlePrint}
            className="bg-black dark:bg-white text-[var(--primary)] dark:text-black border-0 px-6 rounded-2xl flex items-center gap-2 uppercase font-black italic text-xs h-12 hover:scale-105 transition-transform"
          >
            <Printer size={16} /> Imprimir / PDF
          </Button>
        </div>
      </div>

      <div id="ficha-deportista" className="space-y-8 print:m-0 print:p-4">
        {/* Cabecera Principal */}
        <div className="relative bg-black rounded-[48px] overflow-hidden shadow-2xl print:shadow-none print:rounded-[32px]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--primary-10)] blur-[120px] -mr-48 -mt-48 rounded-full"></div>
          
          <div className="p-8 md:p-12 flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap items-center gap-10 relative z-10">
            {/* Foto de Perfil */}
            <div className="relative shrink-0">
                <div className="w-48 h-48 md:w-56 md:h-56 rounded-[60px] border-[6px] border-[var(--primary)] overflow-hidden bg-gray-900 shadow-2xl print:shadow-none">
                {player.foto_url ? (
                    <img 
                    src={getDirectImageUrl(player.foto_url)} 
                    alt={player.nombre_completo}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/player_placeholder.png';
                    }}
                    />
                ) : (
                    <img 
                    src="/assets/player_placeholder.png" 
                    alt="Placeholder"
                    className="w-full h-full object-cover opacity-50"
                    />
                )}
                </div>
                <div className="absolute -bottom-4 -right-4 bg-white p-3 rounded-2xl shadow-xl print:shadow-none">
                    <QRCodeSVG value={profileUrl} size={60} />
                </div>
            </div>

            {/* Información Destacada */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <Badge className="bg-[var(--primary)] text-black border-none font-black italic tracking-widest text-xs uppercase px-4 py-1.5 rounded-full print:bg-[var(--primary)] print:text-black">
                  Ficha Oficial: {player.genero || 'Deportista'}
                </Badge>
                <Badge variant="default" className="bg-transparent border border-white/20 text-white/60 font-black italic tracking-widest text-xs uppercase px-4 py-1.5 rounded-full">
                  ID: {player.numero_documento}
                </Badge>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black text-white italic uppercase leading-none tracking-tighter">
                {player.nombre_completo}<br/>
                <span className="text-[var(--primary)]">{player.apellidos || ''}</span>
              </h1>

              <div className="pt-4 space-y-4">
                 <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                       <Trophy className="text-[var(--primary)]" size={20} />
                       <div className="text-left">
                          <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Equipo Principal</p>
                          <p className="text-sm font-black text-white uppercase italic">{player.equipo?.nombre || 'Sin equipo'}</p>
                       </div>
                    </div>
                    {player.dorsal && (
                        <div className="flex items-center gap-3 px-6 py-3 bg-[var(--primary-10)] border border-[var(--primary-20)] rounded-2xl">
                            <span className="text-3xl font-black text-[var(--primary)] italic leading-none">{player.dorsal}</span>
                            <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-tighter leading-tight">Dorsal<br/>Oficial</span>
                        </div>
                    )}
                 </div>

                 <div className="flex flex-wrap justify-center md:justify-start gap-6 text-white/60 text-[10px] font-bold uppercase tracking-widest italic">
                    <span className="flex items-center gap-2"><Calendar size={16} className="text-[var(--primary)]" /> {player.fecha_nacimiento}</span>
                    <span className="flex items-center gap-2"><Shield size={16} className="text-[var(--primary)]" /> {player.eps}</span>
                    <span className="flex items-center gap-2"><MapPin size={16} className="text-[var(--primary)]" /> {player.municipio || '---'}</span>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cuadrícula de Información */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 print:grid-cols-2">
          
          {/* Columna 1: Perfil Deportivo */}
          <div className="space-y-8">
            <section className="bg-black text-white p-8 rounded-[40px] shadow-sm space-y-6 print:bg-black print:text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                 <TrendingUp size={80} className="text-[var(--primary)]" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] italic border-b border-white/10 pb-3">Perfil Deportivo</h3>
              <div className="grid grid-cols-2 gap-y-6 gap-x-2 relative z-10">
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Posición Principal</p>
                  <p className="text-sm font-black text-[var(--primary)] uppercase italic leading-none">{player.posicion?.valor || '---'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Sangre / RH</p>
                  <p className="text-sm font-black text-white uppercase italic leading-none">{player.rh || '---'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Estatura</p>
                  <p className="text-sm font-black text-white italic leading-none">{player.estatura ? `${player.estatura} cm` : '---'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Peso</p>
                  <p className="text-sm font-black text-white italic leading-none">{player.peso ? `${player.peso} kg` : '---'}</p>
                </div>
              </div>
            </section>

            <section className="bg-white dark:bg-[#16171b] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 space-y-6 print:border-gray-200">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] italic border-b border-gray-100 dark:border-white/5 pb-3">Identidad</h3>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Documento</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white uppercase italic print:text-black">{player.tipo_documento} {player.numero_documento}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Institución Educativa</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white uppercase italic print:text-black">{player.colegio || '---'}</p>
                </div>
              </div>
            </section>
          </div>

          {/* Columna 2: Familia y Emergencia */}
          <div className="space-y-8">
            <section className="bg-[var(--primary)] p-8 rounded-[40px] shadow-sm space-y-6 relative overflow-hidden group print:bg-[var(--primary)]">
              <Baby size={120} className="absolute -bottom-8 -right-8 opacity-10 transform -rotate-12 transition-transform group-hover:scale-125 duration-700" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black italic border-b border-black/10 pb-3">Información del Tutor</h3>
              <div className="space-y-4 relative z-10">
                <div>
                  <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1">Representante Legal</p>
                  <p className="text-xl font-black text-black uppercase italic tracking-tighter">{player.tutor_nombre} {player.tutor_apellidos}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-black text-black flex items-center gap-2"><Phone size={14} /> {player.tutor_celular}</p>
                  <p className="text-xs font-black text-black flex items-center gap-2 lowercase"><Mail size={14} /> {player.tutor_email}</p>
                </div>
              </div>
            </section>

            <section className="bg-red-500/5 dark:bg-red-500/5 p-8 rounded-[40px] border border-red-500/10 space-y-6 print:border-red-100">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 italic border-b border-red-500/10 pb-3">Contacto de Emergencia</h3>
              <div className="flex items-center gap-4">
                <div className="p-4 bg-red-500 text-white rounded-3xl shrink-0 shadow-lg shadow-red-500/20">
                   <Heart size={24} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-red-500/50 uppercase tracking-widest mb-1">En caso de urgencia:</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white uppercase italic leading-none">{player.emergencia_nombre}</p>
                  <p className="text-xl font-black text-red-500 mt-2 font-mono tracking-tighter">{player.emergencia_celular}</p>
                </div>
              </div>
            </section>
          </div>

          {/* Columna 3: Localización y Otros Equipos */}
          <div className="space-y-8 print:col-span-2 print:grid print:grid-cols-2 print:gap-8 print:space-y-0">
            <section className="bg-gray-900 p-8 rounded-[40px] shadow-xl space-y-6 relative overflow-hidden print:bg-gray-900">
               <MapPin size={100} className="absolute -top-10 -right-10 opacity-10 text-white transform rotate-12" />
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] italic border-b border-white/5 pb-3">Residencia</h3>
               <div className="space-y-4 relative z-10">
                 <div>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Dirección Registrada</p>
                    <p className="text-xl font-black text-white uppercase italic tracking-tighter leading-tight">{player.direccion}</p>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    <Badge className="bg-white/10 text-white border-none font-black italic">BARRIO: {player.barrio}</Badge>
                    <Badge className="bg-[var(--primary)] text-black border-none font-black italic">{player.municipio}</Badge>
                 </div>
               </div>
            </section>

            <section className="bg-white dark:bg-[#16171b] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 italic border-b border-gray-100 dark:border-white/5 pb-3">Equipos Adicionales</h3>
              <div className="space-y-3">
                 {!player.equipo2 && !player.equipo3 ? (
                   <p className="text-[10px] text-gray-500 italic">No pertenece a otros equipos.</p>
                 ) : (
                   <>
                     {player.equipo2 && (
                       <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                          <Trophy size={18} className="text-[var(--primary)]" />
                          <span className="text-sm font-black text-gray-900 dark:text-white uppercase italic">{player.equipo2.nombre}</span>
                       </div>
                     )}
                     {player.equipo3 && (
                       <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                          <Trophy size={18} className="text-[var(--primary)]" />
                          <span className="text-sm font-black text-gray-900 dark:text-white uppercase italic">{player.equipo3.nombre}</span>
                       </div>
                     )}
                   </>
                 )}
              </div>
            </section>
          </div>
        </div>

        {/* Rendimiento y Desempeño */}
        {asistencias.length > 0 && (
          <section className="bg-white dark:bg-[#16171b] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 space-y-6 print:hidden">
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-white/5 pb-3">
              <Activity className="w-4 h-4 text-[var(--primary)]" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] italic">Rendimiento y Desempeño</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {asistencias.map((ast, idx) => (
                <div key={idx} className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-transparent hover:border-[var(--primary-20)] transition-all space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-4">
                      <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">{ast.evento?.tipo || 'Evento'}</span>
                      <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic truncate" title={ast.evento?.titulo}>{ast.evento?.titulo}</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-1">{new Date(ast.evento?.fecha).toLocaleDateString()}</p>
                    </div>
                    <div className="p-3 bg-black dark:bg-[#111215] rounded-2xl flex flex-col items-center justify-center min-w-[60px] shadow-lg">
                      <span className="text-xl font-black text-[var(--primary)] leading-none">{ast.puntaje_total}%</span>
                    </div>
                  </div>
                  
                  {ast.evaluaciones && ast.evaluaciones.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-white/5">
                      {ast.evaluaciones.map((ev: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-[10px] bg-white dark:bg-[#111215] px-3 py-2 rounded-xl">
                          <span className="font-bold text-gray-500 dark:text-gray-400 uppercase truncate pr-2 flex items-center gap-2">
                             <Target size={10} className="text-[var(--primary)]" /> {ev.objetivo}
                          </span>
                          <span className="font-black text-gray-900 dark:text-white">{ev.puntaje}/5</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {ast.notas && (
                    <div className="p-4 bg-[var(--primary-5)] border border-[var(--primary-10)] rounded-2xl mt-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Observación</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 italic line-clamp-2">{ast.notas}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Expediente Digital */}
        <section className="bg-white dark:bg-[#16171b] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 space-y-6 print:hidden">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] italic border-b border-gray-100 dark:border-white/5 pb-3">Documentación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
                { label: 'Registro Civil', url: player.url_registro_civil },
                { label: 'Documento ID', url: player.url_documento_id },
                { label: 'Contrato', url: player.url_contrato },
                { label: 'Certificado Salud', url: player.url_certificado_salud },
                ...(player.viene_de_otro_club ? [{ label: 'Carta Traspaso', url: player.url_carta_traspaso }] : [])
            ].map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-5 rounded-3xl bg-gray-50 dark:bg-white/5 group border border-transparent hover:border-[var(--primary-20)] transition-all">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white dark:bg-[#111215] rounded-2xl">
                       <FileText className="text-gray-400 group-hover:text-[var(--primary)] transition-colors" size={20} />
                    </div>
                    <span className="text-xs font-black uppercase text-gray-600 dark:text-gray-400">{doc.label}</span>
                </div>
                {doc.url ? (
                    <a href={doc.url} target="_blank" rel="noreferrer" className="p-3 bg-black dark:bg-white text-[var(--primary)] dark:text-black rounded-xl hover:scale-110 transition-transform shadow-lg"><Download size={18} /></a>
                ) : (
                    <span className="text-[8px] font-black uppercase text-gray-300 italic">Pendiente</span>
                )}
                </div>
            ))}
            </div>
        </section>

        {/* Footer para Impresión */}
        <div className="hidden print:block pt-12 border-t-2 border-dashed border-gray-200 mt-20">
           <div className="flex justify-between items-end">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Generado por</p>
                <p className="text-2xl font-black italic tracking-tighter">FICHAJE<span className="text-gray-400">APP</span></p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fecha de Impresión</p>
                <p className="text-sm font-black italic">{new Date().toLocaleDateString()}</p>
              </div>
           </div>
        </div>
      </div>

      {/* Modal de Edición */}
      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="Editar Información del Deportista"
        maxWidth="max-w-4xl"
      >
        {editingPlayer && (
          <form onSubmit={handleUpdatePlayer} className="space-y-8 max-h-[75vh] overflow-y-auto px-2 pb-6 custom-scrollbar">
            {/* Foto de Perfil */}
            <div className="bg-gray-50 dark:bg-white/5 p-8 rounded-[40px] border border-gray-100 dark:border-white/5">
                <ImageUpload
                  value={editingPlayer.foto_url}
                  onChange={(url) => setEditingPlayer({...editingPlayer, foto_url: url})}
                  bucket="atleta-fotos"
                  path={player.id}
                  label="Foto de Perfil del Deportista"
                />
            </div>

            {/* Datos Personales */}
            <div className="space-y-4">
               <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                 <User className="w-4 h-4 text-[var(--primary)]" />
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Datos Personales</h4>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    label="Nombre Completo"
                    value={editingPlayer.nombre_completo || ''}
                    onChange={(e) => setEditingPlayer({...editingPlayer, nombre_completo: e.target.value})}
                    required
                  />
                  <Input 
                    label="Apellidos"
                    value={editingPlayer.apellidos || ''}
                    onChange={(e) => setEditingPlayer({...editingPlayer, apellidos: e.target.value})}
                    required
                  />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    label="Segundo Apellido"
                    value={editingPlayer.segundo_apellido || ''}
                    onChange={(e) => setEditingPlayer({...editingPlayer, segundo_apellido: e.target.value})}
                  />
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Género</label>
                    <select 
                      className="w-full h-14 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-5 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all dark:text-white"
                      value={editingPlayer.genero || ''}
                      onChange={(e) => setEditingPlayer({...editingPlayer, genero: e.target.value})}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Otro">Otro / Prefiero no decir</option>
                    </select>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    label="Fecha Nacimiento"
                    type="date"
                    value={editingPlayer.fecha_nacimiento || ''}
                    onChange={(e) => setEditingPlayer({...editingPlayer, fecha_nacimiento: e.target.value})}
                  />
                  <Input 
                    label="EPS"
                    value={editingPlayer.eps || ''}
                    onChange={(e) => setEditingPlayer({...editingPlayer, eps: e.target.value})}
                  />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Tipo Documento</label>
                    <select 
                      className="w-full h-14 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-5 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all dark:text-white"
                      value={editingPlayer.tipo_documento || ''}
                      onChange={(e) => setEditingPlayer({...editingPlayer, tipo_documento: e.target.value})}
                    >
                      <option value="registro civil">Registro Civil</option>
                      <option value="tarjeta identidad">Tarjeta de Identidad</option>
                      <option value="cédula">Cédula de Ciudadanía</option>
                      <option value="pasaporte">Pasaporte</option>
                    </select>
                  </div>
                  <Input 
                    label="Nro Documento"
                    value={editingPlayer.numero_documento || ''}
                    onChange={(e) => setEditingPlayer({...editingPlayer, numero_documento: e.target.value})}
                    required
                    maxLength={15}
                  />
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Factor RH</label>
                    <select 
                      className="w-full h-14 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-5 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all dark:text-white"
                      value={editingPlayer.rh || ''}
                      onChange={(e) => setEditingPlayer({...editingPlayer, rh: e.target.value})}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
               </div>
            </div>

            {/* Información del Tutor */}
            <div className="space-y-4">
               <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                 <Shield className="w-4 h-4 text-[var(--primary)]" />
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Información del Tutor</h4>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="Nombres Tutor"
                      value={editingPlayer.tutor_nombre || ''}
                      onChange={(e) => setEditingPlayer({...editingPlayer, tutor_nombre: e.target.value})}
                    />
                    <Input 
                      label="Apellidos Tutor"
                      value={editingPlayer.tutor_apellidos || ''}
                      onChange={(e) => setEditingPlayer({...editingPlayer, tutor_apellidos: e.target.value})}
                    />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <Input 
                     label="Celular Tutor"
                     value={editingPlayer.tutor_celular || ''}
                     onChange={(e) => setEditingPlayer({...editingPlayer, tutor_celular: e.target.value})}
                   />
                    <Input 
                      label="Email Tutor"
                      type="email"
                      value={editingPlayer.tutor_email || ''}
                      onChange={(e) => setEditingPlayer({...editingPlayer, tutor_email: e.target.value})}
                    />
               </div>
            </div>

            {/* Ubicación y Emergencia */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                     <MapPin className="w-4 h-4 text-[var(--primary)]" />
                     <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Residencia</h4>
                   </div>
                   <Input label="Departamento" value={editingPlayer.departamento || ''} onChange={(e) => setEditingPlayer({...editingPlayer, departamento: e.target.value})} />
                   <Input label="Municipio" value={editingPlayer.municipio || ''} onChange={(e) => setEditingPlayer({...editingPlayer, municipio: e.target.value})} />
                   <Input label="Barrio" value={editingPlayer.barrio || ''} onChange={(e) => setEditingPlayer({...editingPlayer, barrio: e.target.value})} />
                   <Input label="Dirección" value={editingPlayer.direccion || ''} onChange={(e) => setEditingPlayer({...editingPlayer, direccion: e.target.value})} />
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                     <Heart className="w-4 h-4 text-red-500" />
                     <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Emergencia</h4>
                   </div>
                   <Input label="Contacto de Emergencia" value={editingPlayer.emergencia_nombre || ''} onChange={(e) => setEditingPlayer({...editingPlayer, emergencia_nombre: e.target.value})} />
                   <Input label="Celular Emergencia" value={editingPlayer.emergencia_celular || ''} onChange={(e) => setEditingPlayer({...editingPlayer, emergencia_celular: e.target.value})} />
                   <Input label="Email Emergencia" type="email" value={editingPlayer.emergencia_email || ''} onChange={(e) => setEditingPlayer({...editingPlayer, emergencia_email: e.target.value})} />
                </div>
            </div>

            {/* Documentación Oficial */}
            <div className="space-y-4">
               <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                 <FileText className="w-4 h-4 text-[var(--primary)]" />
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Documentación Oficial</h4>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FileUpload 
                    label="Registro Civil"
                    value={editingPlayer.url_registro_civil}
                    onChange={(url) => setEditingPlayer({...editingPlayer, url_registro_civil: url})}
                    bucket="deportista-documentos"
                    path={player.numero_documento}
                  />
                  <FileUpload 
                    label="Documento ID"
                    value={editingPlayer.url_documento_id}
                    onChange={(url) => setEditingPlayer({...editingPlayer, url_documento_id: url})}
                    bucket="deportista-documentos"
                    path={player.numero_documento}
                  />
                  <FileUpload 
                    label="Contrato"
                    value={editingPlayer.url_contrato}
                    onChange={(url) => setEditingPlayer({...editingPlayer, url_contrato: url})}
                    bucket="deportista-documentos"
                    path={player.numero_documento}
                  />
                  <FileUpload 
                    label="Certificado Salud"
                    value={editingPlayer.url_certificado_salud}
                    onChange={(url) => setEditingPlayer({...editingPlayer, url_certificado_salud: url})}
                    bucket="deportista-documentos"
                    path={player.numero_documento}
                  />
                  {editingPlayer.viene_de_otro_club && (
                    <FileUpload 
                      label="Carta Traspaso"
                      value={editingPlayer.url_carta_traspaso}
                      onChange={(url) => setEditingPlayer({...editingPlayer, url_carta_traspaso: url})}
                      bucket="deportista-documentos"
                      path={player.numero_documento}
                    />
                  )}
               </div>
            </div>

            {/* Perfil Deportivo (SOLO LECTURA) */}
            <div className="space-y-4 bg-gray-50 dark:bg-white/5 p-6 rounded-3xl border border-dashed border-gray-200 dark:border-white/10 opacity-70">
               <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                 <Trophy className="w-4 h-4 text-gray-400" />
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Perfil Deportivo (Solo Lectura)</h4>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <p className="text-[9px] font-bold text-gray-500 uppercase">Posición</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic">{player.posicion?.valor || '---'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[9px] font-bold text-gray-500 uppercase">Dorsal</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white italic">{player.dorsal || '---'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[9px] font-bold text-gray-500 uppercase">Estatura</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white italic">{player.estatura} cm</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[9px] font-bold text-gray-500 uppercase">RH</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white italic">{player.rh}</p>
                    </div>
               </div>
               <p className="text-[9px] text-gray-400 italic mt-2">* Para modificar datos deportivos, solicita un cambio al administrador del club.</p>
            </div>

            <div className="pt-6 sticky bottom-0 bg-white dark:bg-[#1e293b] flex gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" isLoading={saving} className="flex-1 bg-[var(--primary)] text-black uppercase font-black tracking-widest text-[10px] italic h-14 rounded-2xl">
                Guardar Cambios
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Premium Toast Notification */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-500">
           <div className={`flex items-center gap-3 px-6 py-4 rounded-3xl border shadow-2xl backdrop-blur-xl ${
             toast.type === 'success' ? 'bg-black/90 border-[var(--primary-20)] text-white' : 'bg-red-500/90 border-red-500/20 text-white'
           }`}>
             <div className={`p-2 rounded-xl ${
               toast.type === 'success' ? 'bg-[var(--primary)] text-black' : 'bg-white/20 text-white'
             }`}>
               <Shield size={18} />
             </div>
             <p className="text-sm font-black uppercase tracking-widest italic">{toast.message}</p>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: auto; margin: 10mm; }
          body { visibility: hidden; -webkit-print-color-adjust: exact; background-color: white !important; }
          #ficha-deportista, #ficha-deportista * { visibility: visible; }
          #ficha-deportista { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            padding: 0 !important;
            margin: 0 !important;
          }
          .dark { color-scheme: light !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:bg-white { background-color: white !important; }
        }
      `}} />
    </div>
  );
}
