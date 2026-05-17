import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  User, Calendar, Shield, MapPin, Phone, Mail, 
  ArrowLeft, QrCode, Printer, ShieldCheck, Star, Award
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { QRCodeSVG } from 'qrcode.react';

export default function CoachProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [coach, setCoach] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getDirectImageUrl = (url: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    
    if (trimmed.includes('drive.google.com')) {
      let id = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || 
               trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
      
      if (id) {
        return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
      }
    }
    
    if (trimmed.includes('dropbox.com')) {
      return trimmed.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/\?dl=\d/, '');
    }
    
    return trimmed;
  };

  useEffect(() => {
    async function fetchCoach() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        setCoach(data);
      } catch (err) {
        console.error("Error fetching coach:", err);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchCoach();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CCFF00]"></div>
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0f172a] p-4 text-center">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic">Entrenador no encontrado</h2>
        <Button onClick={() => navigate(-1)} className="mt-4 bg-[#CCFF00] text-black">Regresar</Button>
      </div>
    );
  }

  const profileUrl = window.location.href;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] pb-20 print:bg-white print:pb-0">
      {/* Barra de Herramientas (Oculta al imprimir) */}
      <div className="bg-white dark:bg-[#1e293b] border-b border-gray-200 dark:border-white/5 py-4 sticky top-0 z-50 print:hidden">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-black uppercase italic text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={18} /> Volver a Cuerpo Técnico
          </button>
          <div className="flex gap-3">
             <Button 
               onClick={handlePrint}
               className="bg-black text-[#CCFF00] border-0 px-6 rounded-2xl flex items-center gap-2 uppercase font-black italic text-xs h-12"
             >
               <Printer size={16} /> Imprimir Perfil
             </Button>
          </div>
        </div>
      </div>

      <div id="ficha-entrenador" className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 print:m-0 print:p-4 print:max-w-none">
        {/* Cabecera Principal - Estilo Coach */}
        <div className="relative bg-black rounded-[48px] overflow-hidden shadow-2xl print:shadow-none print:rounded-[32px]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[120px] -mr-48 -mt-48 rounded-full"></div>
          
          <div className="p-8 md:p-12 flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap items-center gap-10 relative z-10">
            {/* Foto de Perfil */}
            <div className="relative shrink-0">
                <div className="w-48 h-48 md:w-56 md:h-56 rounded-[60px] border-[6px] border-blue-600 overflow-hidden bg-gray-900 shadow-2xl print:shadow-none">
                {coach.foto_url ? (
                    <img 
                    key={coach.foto_url}
                    src={getDirectImageUrl(coach.foto_url)} 
                    alt={coach.nombre}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://www.google.com/s2/favicons?domain=drive.google.com&sz=64';
                      target.className = "w-12 h-12 opacity-20 absolute inset-1/2 -translate-x-1/2 -translate-y-1/2";
                    }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <User size={80} className="text-gray-700" />
                    </div>
                )}
                </div>
                <div className="absolute -bottom-4 -right-4 bg-white p-3 rounded-2xl shadow-xl print:shadow-none">
                    <QRCodeSVG value={profileUrl} size={60} />
                </div>
            </div>

            {/* Información Destacada */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <Badge className="bg-blue-600 text-white border-none font-black italic tracking-widest text-xs uppercase px-4 py-1.5 rounded-full">
                  Cuerpo Técnico: {coach.rol || 'Entrenador'}
                </Badge>
                <Badge variant="default" className="bg-transparent border border-white/20 text-white/60 font-black italic tracking-widest text-xs uppercase px-4 py-1.5 rounded-full">
                  ID: {coach.numero_documento || 'ID-TEMP'}
                </Badge>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black text-white italic uppercase leading-none tracking-tighter">
                {coach.nombre.split(' ')[0]}<br/>
                <span className="text-blue-500">{coach.nombre.split(' ').slice(1).join(' ')}</span>
              </h1>

              <div className="pt-4 flex flex-wrap justify-center md:justify-start gap-6 text-white/60 text-sm font-bold uppercase tracking-widest italic">
                <span className="flex items-center gap-2"><ShieldCheck size={18} className="text-blue-500" /> {coach.estado === 'activo' ? 'Personal Activo' : 'Perfil Suspendido'}</span>
                {coach.tipo_documento && <span className="flex items-center gap-2"><Award size={18} className="text-blue-500" /> {coach.tipo_documento}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Cuadrícula de Información */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 print:grid-cols-2">
          
          {/* Columna 1: Contacto */}
          <div className="space-y-8">
            <section className="bg-white dark:bg-[#1e293b] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 space-y-6 print:border-gray-200">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 italic border-b border-gray-100 dark:border-white/5 pb-3">Información de Contacto</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-3xl bg-gray-50 dark:bg-white/5 print:bg-gray-50">
                  <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl"><Phone size={20} /></div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Teléfono Móvil</p>
                    <p className="font-black text-gray-900 dark:text-white print:text-black">{coach.telefono || 'Sin registrar'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-3xl bg-gray-50 dark:bg-white/5 print:bg-gray-50">
                  <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl"><Mail size={20} /></div>
                  <div className="overflow-hidden">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Email Institucional</p>
                    <p className="font-black text-gray-900 dark:text-white truncate print:text-black">{coach.email}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Columna 2: Identidad y QR */}
          <div className="space-y-8">
            <section className="bg-white dark:bg-[#1e293b] p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/5 space-y-6 print:border-gray-200">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 italic border-b border-gray-100 dark:border-white/5 pb-3">Identidad Oficial</h3>
               <div className="grid grid-cols-1 gap-6">
                 <div>
                   <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Tipo de Documento</p>
                   <p className="text-lg font-black text-gray-900 dark:text-white uppercase italic print:text-black">{coach.tipo_documento || 'Pendiente'}</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Número Identificación</p>
                   <p className="text-lg font-black text-gray-900 dark:text-white uppercase italic print:text-black">{coach.numero_documento || '---'}</p>
                 </div>
               </div>
            </section>
          </div>

          {/* Columna 3: QR Compartir */}
          <div className="space-y-8 print:hidden">
            <section className="bg-gray-900 p-8 rounded-[40px] shadow-xl text-center space-y-6 border border-white/5">
                <QrCode className="text-blue-500 mx-auto" size={48} />
                <div className="space-y-2">
                   <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">Perfil Digital Técnico</h3>
                   <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Escanea este código para validar la autenticidad del perfil y vinculación con el Club.</p>
                </div>
                <div className="bg-white p-4 rounded-3xl inline-block shadow-2xl">
                   <QRCodeSVG value={profileUrl} size={150} />
                </div>
                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText(profileUrl);
                    alert("¡Link de perfil copiado al portapapeles!");
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic text-[10px] h-12 rounded-2xl tracking-widest"
                >
                  Copiar Link Compartible
                </Button>
            </section>
          </div>
        </div>

        {/* Footer para Impresión */}
        <div className="hidden print:block pt-12 border-t-2 border-dashed border-gray-200 mt-20">
           <div className="flex justify-between items-end">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Personal Técnico</p>
                <p className="text-2xl font-black italic tracking-tighter">PROMESAS<span className="text-gray-400">APP</span></p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fecha de Validación</p>
                <p className="text-sm font-black italic">{new Date().toLocaleDateString()}</p>
              </div>
           </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: auto; margin: 10mm; }
          body { visibility: hidden; -webkit-print-color-adjust: exact; background-color: white !important; }
          #ficha-entrenador, #ficha-entrenador * { visibility: visible; }
          #ficha-entrenador { 
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
        }
      `}} />
    </div>
  );
}
