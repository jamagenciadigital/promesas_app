import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  User, Calendar, Shield, MapPin, Phone, Mail, 
  Heart, Baby, FileText, Download, Printer, ArrowLeft,
  QrCode, Trophy, TrendingUp
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { QRCodeSVG } from 'qrcode.react';

export default function PlayerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      try {
        setLoading(true);
        setError(null);

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || '');
        const looksLikeUUID = (id || '').length > 20 && (id || '').includes('-');
        
        let query = supabase
          .from('deportistas')
          .select(`
            *,
            posicion:deportes_config_campos(valor),
            equipo:equipos!deportistas_equipo_id_fkey(nivel_habilidad),
            equipo2:equipos!deportistas_equipo_id_2_fkey(nombre),
            equipo3:equipos!deportistas_equipo_id_3_fkey(nombre),
            trayectorias:trayectorias_deportivas(*)
          `);

        if (isUUID || looksLikeUUID) {
          query = query.eq('id', id);
        } else {
          query = query.eq('numero_documento', id);
        }

        const { data, error } = await query.single();
        if (error) throw error;
        setPlayer(data);
      } catch (err: any) {
        console.error("Error fetching player:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchPlayer();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0f172a] p-4 text-center">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic">Deportista no encontrado</h2>
        <Button onClick={() => navigate(-1)} className="mt-4 bg-[var(--primary)] text-black">Regresar</Button>
      </div>
    );
  }

  const profileUrl = window.location.href;
  const isElite = player?.equipo?.nivel_habilidad === 'Elite';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] pb-20 print:bg-white print:pb-0">
      {/* Barra de Herramientas (Oculta al imprimir) */}
      <div className="bg-white dark:bg-[#1e293b] border-b border-gray-200 dark:border-white/5 py-4 sticky top-0 z-50 print:hidden">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-black uppercase italic text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={18} /> Volver al Plantel
          </button>
          <div className="flex gap-3">
             <Button 
               onClick={handlePrint}
               className="bg-black text-[var(--primary)] border-0 px-6 rounded-2xl flex items-center gap-2 uppercase font-black italic text-xs h-12"
             >
               <Printer size={16} /> Imprimir / PDF
             </Button>
          </div>
        </div>
      </div>

      <div id="ficha-deportista" className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 print:m-0 print:p-4 print:max-w-none">
        {/* Alerta de Validación */}
        {player.estado === 'pendiente_validacion' && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[32px] flex items-center gap-4 animate-pulse print:hidden">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase italic text-amber-600 dark:text-amber-400 leading-none">Validación de Documentos Pendiente</h3>
              <p className="text-xs font-bold text-amber-500/80 mt-1 uppercase tracking-widest">El equipo administrativo está revisando la información cargada.</p>
            </div>
          </div>
        )}

        {player.estado === 'rechazado' && (
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[32px] flex items-center gap-4 print:hidden">
            <div className="p-3 bg-red-500 text-white rounded-2xl shadow-lg shadow-red-500/20">
              <FileText size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black uppercase italic text-red-600 dark:text-red-400 leading-none">Documentación Rechazada</h3>
              <p className="text-xs font-bold text-red-500/80 mt-1 uppercase tracking-widest">Motivo: {player.observaciones_validacion || 'Documentos no válidos o incompletos.'}</p>
            </div>
            <Button 
              onClick={() => navigate(`/player/edit-docs/${player.id}`)} // O donde sea que editen docs
              className="bg-red-500 text-white px-6 h-12 rounded-2xl uppercase font-black italic text-[10px] tracking-widest"
            >
              Corregir Documentos
            </Button>
          </div>
        )}

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
                <span className="text-[var(--primary)]">{player.apellidos} {player.segundo_apellido || ''}</span>
              </h1>

              <div className="pt-4 flex flex-wrap justify-center md:justify-start gap-6 text-white/60 text-sm font-bold uppercase tracking-widest italic">
                <span className="flex items-center gap-2"><Calendar size={18} className="text-[var(--primary)]" /> {player.fecha_nacimiento}</span>
                <span className="flex items-center gap-2"><Shield size={18} className="text-[var(--primary)]" /> {player.eps}</span>
                <span className="flex items-center gap-2"><MapPin size={18} className="text-[var(--primary)]" /> {player.municipio || '---'}</span>
                {player.dorsal && <span className="flex items-center gap-2 font-black text-[var(--primary)]"><Trophy size={18} /> DORSAL: {player.dorsal}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Cuadrícula de Información */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 print:grid-cols-2">
          
          {/* Columna 1: Identidad y Contacto */}
          <div className="space-y-8">
            <section className="bg-white dark:bg-[#1e293b] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 space-y-6 print:border-gray-200">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] italic border-b border-gray-100 dark:border-white/5 pb-3 print:text-black print:border-gray-100">Información de Identidad</h3>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Nombre Legal Completo</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white uppercase italic print:text-black">
                    {player.nombre_completo} {player.apellidos} {player.segundo_apellido || ''}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Documento de Identidad</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white uppercase italic print:text-black">{player.tipo_documento} {player.numero_documento}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Entidad Educativa</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white uppercase italic print:text-black">{player.colegio || '---'}</p>
                </div>
              </div>
            </section>

            <section className="bg-black text-white p-8 rounded-[40px] shadow-sm space-y-6 print:bg-black print:text-white">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] italic border-b border-white/10 pb-3">Perfil Deportivo y Antropométrico</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Posición</p>
                  <p className="text-sm font-black text-[var(--primary)] uppercase italic leading-none">{player.posicion?.valor || '---'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Rh</p>
                  <p className="text-sm font-black text-white uppercase italic leading-none uppercase">{player.rh || '---'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Estatura</p>
                  <p className="text-sm font-black text-white italic leading-none">{player.estatura ? `${player.estatura} cm` : '---'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Peso</p>
                  <p className="text-sm font-black text-white italic leading-none">{player.peso ? `${player.peso} kg` : '---'}</p>
                </div>
                {isElite && player.salario && (
                  <div className="col-span-2 pt-2 border-t border-white/10 mt-2">
                    <p className="text-[9px] font-black text-[var(--primary)] uppercase tracking-widest mb-1">Salario / Honorarios</p>
                    <p className="text-xl font-black text-white italic leading-none transition-all hover:text-[var(--primary)]">
                      $ {Number(player.salario).toLocaleString('es-CO')}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white dark:bg-[#1e293b] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 space-y-6 print:border-gray-200">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] italic border-b border-gray-100 dark:border-white/5 pb-3 print:text-black print:border-gray-100">Contacto Directo</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-3xl bg-gray-50 dark:bg-white/5 print:bg-gray-50">
                  <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl"><Phone size={20} /></div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Celular</p>
                    <p className="font-black text-gray-900 dark:text-white print:text-black">{player.celular_deportista || '---'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-3xl bg-gray-50 dark:bg-white/5 print:bg-gray-50">
                  <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl"><Mail size={20} /></div>
                  <div className="overflow-hidden">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Email</p>
                    <p className="font-black text-gray-900 dark:text-white truncate print:text-black">{player.email_deportista || '---'}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Columna 2: Tutor y Emergencia */}
          <div className="space-y-8">
            {!isElite && (
              <section className="bg-[var(--primary)] p-8 rounded-[40px] shadow-sm space-y-6 relative overflow-hidden group print:bg-[var(--primary)]">
                <Baby size={120} className="absolute -bottom-8 -right-8 opacity-10 transform -rotate-12 transition-transform group-hover:scale-125 duration-700" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black italic border-b border-black/10 pb-3">Información del Tutor</h3>
                <div className="space-y-4 relative z-10">
                  <div>
                    <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1">Nombre Completo</p>
                    <p className="text-xl font-black text-black uppercase italic tracking-tighter">{player.tutor_nombre} {player.tutor_apellidos}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-black text-black flex items-center gap-2"><Phone size={14} /> {player.tutor_celular}</p>
                    <p className="text-xs font-black text-black flex items-center gap-2 lowercase"><Mail size={14} /> {player.tutor_email}</p>
                    {player.tutor_numero_documento && <p className="text-[10px] font-black text-black uppercase tracking-widest pt-2">DOC: {player.tutor_numero_documento}</p>}
                  </div>
                </div>
              </section>
            )}

            <section className="bg-white dark:bg-[#1e293b] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 space-y-6 print:border-red-100">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] italic border-b border-gray-100 dark:border-white/5 pb-3">Trayectoria Deportiva</h3>
              <div className="space-y-4 relative">
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gray-100 dark:bg-white/5"></div>
                {player.trayectorias && player.trayectorias.length > 0 ? (
                  player.trayectorias
                    .sort((a: any, b: any) => (b.es_actual ? 1 : -1))
                    .map((tray: any, idx: number) => (
                    <div key={idx} className="relative pl-8">
                      <div className={`absolute left-0 top-1.5 w-5 h-5 rounded-full border-2 ${tray.es_actual ? 'bg-[var(--primary)] border-[var(--primary)]' : 'bg-white dark:bg-[#1e293b] border-gray-300 dark:border-white/20'}`}></div>
                      <div>
                        <p className={`text-sm font-black uppercase italic ${tray.es_actual ? 'text-[var(--primary)]' : 'text-gray-900 dark:text-white'}`}>
                          {tray.equipo_nombre} {tray.es_actual && '(ACTUAL)'}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {tray.temporada_inicio} - {tray.temporada_fin || 'Presente'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 italic">No hay historial registrado.</p>
                )}
              </div>
            </section>

            <section className="bg-white dark:bg-[#1e293b] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 space-y-6 print:border-red-100">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 italic border-b border-gray-100 dark:border-white/5 pb-3 print:border-red-100">En Caso de Emergencia</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-5 rounded-3xl bg-red-500/5 border border-red-500/10 print:bg-red-50 print:border-red-100">
                  <Heart className="text-red-500 shrink-0" size={24} />
                  <div>
                    <p className="text-[9px] font-bold text-red-500/50 uppercase tracking-widest mb-1">Contactar a:</p>
                    <p className="text-xl font-black text-gray-900 dark:text-white uppercase italic leading-none print:text-black">{player.emergencia_nombre}</p>
                    <p className="text-lg font-black text-red-500 mt-2 font-mono">{player.emergencia_celular}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Columna 3: Ubicación y Documentos */}
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

            {!isElite && (
              <section className="bg-white dark:bg-[#1e293b] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 space-y-6 print:hidden">
                {(player.equipo2 || player.equipo3) && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] italic border-b border-gray-100 dark:border-white/5 pb-3 print:text-black">Equipos Adicionales (Ascendido)</h3>
                    <div className="flex flex-col gap-3">
                      {player.equipo2 && (
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-900 text-white font-black uppercase italic text-[11px] tracking-tight border border-[var(--primary-20)]">
                          <Trophy size={14} className="text-[var(--primary)]" /> {player.equipo2.nombre}
                        </div>
                      )}
                      {player.equipo3 && (
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-900 text-white font-black uppercase italic text-[11px] tracking-tight border border-[var(--primary-20)]">
                          <Trophy size={14} className="text-[var(--primary)]" /> {player.equipo3.nombre}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 italic border-b border-gray-100 dark:border-white/5 pb-3">Expediente Digital</h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { label: 'Registro Civil', url: player.url_registro_civil },
                    { label: 'Documento ID', url: player.url_documento_id },
                    { label: 'Contrato', url: player.url_contrato },
                    { label: 'Certificado Salud', url: player.url_certificado_salud },
                    ...(player.viene_de_otro_club ? [{ label: 'Carta Traspaso', url: player.url_carta_traspaso }] : [])
                  ].map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-white/5 group">
                      <div className="flex items-center gap-3">
                        <FileText className="text-gray-400 group-hover:text-[var(--primary)] transition-colors" size={18} />
                        <span className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400">{doc.label}</span>
                      </div>
                      {doc.url ? (
                        <a href={doc.url} target="_blank" rel="noreferrer" className="text-black dark:text-[var(--primary)] hover:scale-110 transition-transform"><Download size={18} /></a>
                      ) : (
                        <span className="text-[8px] font-black uppercase text-gray-300 italic">Pendiente</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

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
          .print\\:shadow-none { shadow: none !important; }
          .print\\:rounded-\\[32px\\] { border-radius: 32px !important; }
        }
      `}} />
    </div>
  );
}
