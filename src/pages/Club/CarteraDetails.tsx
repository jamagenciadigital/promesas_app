import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  ArrowLeft, CheckCircle2, XCircle, FileText, 
  Upload, X, User, MapPin, Phone, Mail, FileBadge, UserCircle2, RotateCcw, Bell
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

interface Charge {
  id: string;
  club_id: string;
  deportista_id: string;
  titulo: string;
  monto: number;
  fecha_vencimiento: string;
  estado: 'pendiente' | 'pagado' | 'vencido' | 'anulado' | 'por validar';
  comprobante_url?: string;
  fecha_pago?: string;
  created_at: string;
}

export default function CarteraDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [athlete, setAthlete] = useState<any>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [clubCurrency, setClubCurrency] = useState('COP');

  // Funciones de Modal
  const [approvingCharge, setApprovingCharge] = useState<Charge | null>(null);
  const [uploading, setUploading] = useState(false);
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewingComprobante, setViewingComprobante] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.club_id && id) {
      fetchData();
      fetchClubCurrency();
    }
  }, [profile?.club_id, id]);

  async function fetchClubCurrency() {
    const { data } = await supabase.from('clubes').select('moneda').eq('id', profile?.club_id).single();
    if (data?.moneda) setClubCurrency(data.moneda.split(' ')[0]);
  }

  async function fetchData() {
    try {
      setLoading(true);

      // 1. Cargar datos del deportista (SIN JOIN AMBIGUO)
      const { data: deportistaData, error: dError } = await supabase
        .from('deportistas')
        .select('*')
        .eq('id', id)
        .maybeSingle();
        
      if (dError) {
         alert("Error Supabase: " + dError.message);
         console.warn("Error cargando deportista:", dError.message);
      } else if (!deportistaData) {
         alert("El deportista NO fue encontrado en la base de datos.");
      } else {
         // Si tiene equipo_id, buscar el nombre del equipo aparte
         if (deportistaData.equipo_id) {
           const { data: equipoData } = await supabase.from('equipos').select('nombre').eq('id', deportistaData.equipo_id).maybeSingle();
           deportistaData.equipos = equipoData || null;
         }
         
         // Buscar perfil del padre para sobrescribir con su documento más reciente
         const { data: padrePerfil } = await supabase
           .from('perfiles')
           .select('nombre, apellido, documento, email')
           .eq('deportista_id', deportistaData.id)
           .eq('rol', 'padre')
           .maybeSingle();

         if (padrePerfil) {
           deportistaData.tutor_nombre = padrePerfil.nombre || deportistaData.tutor_nombre;
           deportistaData.tutor_apellidos = padrePerfil.apellido || deportistaData.tutor_apellidos;
           deportistaData.tutor_numero_documento = padrePerfil.documento || deportistaData.tutor_numero_documento;
           deportistaData.tutor_email = padrePerfil.email || deportistaData.tutor_email;
         }

         setAthlete(deportistaData);
      }

      // 2. Cargar sus cobros
      const { data: chargesData, error: cError } = await supabase
        .from('cartera')
        .select('*')
        .eq('deportista_id', id)
        .eq('club_id', profile?.club_id)
        .order('fecha_vencimiento', { ascending: true });

      if (cError) throw cError;
      setCharges(chargesData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setComprobanteFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const processApproval = async () => {
    if (!approvingCharge) return;
    
    // Si no hay archivo nuevo Y tampoco hay URL existente, no continuar
    if (!comprobanteFile && !approvingCharge.comprobante_url) {
       alert("Debes subir un comprobante para aprobar.");
       return;
    }

    try {
      setUploading(true);
      
      let finalUrl = approvingCharge.comprobante_url;

      // Solo si el admin decidió subir uno nuevo o reemplazar el existente
      if (comprobanteFile) {
        const fileExt = comprobanteFile.name.split('.').pop();
        const fileName = `admin_pago_${approvingCharge.id}_${Date.now()}.${fileExt}`;
        const filePath = `${profile?.club_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('comprobantes-pagos')
          .upload(filePath, comprobanteFile);

        if (uploadError) throw new Error("Error al subir comprobante a Supabase.");

        const { data: { publicUrl } } = supabase.storage
          .from('comprobantes-pagos')
          .getPublicUrl(filePath);
          
        finalUrl = publicUrl;
      }

      const { error: updateError } = await supabase
        .from('cartera')
        .update({ 
          estado: 'pagado',
          comprobante_url: finalUrl,
          fecha_pago: new Date().toISOString()
        })
        .eq('id', approvingCharge.id);

      if (updateError) throw updateError;
      
      // Notificar al padre sobre la validación exitosa
      const { data: padrePerfil } = await supabase
        .from('perfiles')
        .select('id')
        .eq('deportista_id', athlete.id)
        .eq('rol', 'padre')
        .maybeSingle();

      if (padrePerfil) {
        await supabase.from('notificaciones').insert({
          user_id: padrePerfil.id,
          titulo: 'Pago Aprobado ✅',
          mensaje: `Hemos verificado y aprobado tu pago de ${formatCurrency(approvingCharge.monto)} por el concepto de "${approvingCharge.titulo}".`,
          tipo: 'pago',
          leida: false
        });
      }
      
      setCharges(charges.map(c => c.id === approvingCharge.id ? { 
        ...c, 
        estado: 'pagado', 
        comprobante_url: finalUrl,
        fecha_pago: new Date().toISOString()
      } : c));

      setApprovingCharge(null);
      setComprobanteFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const processRejection = async () => {
    if (!approvingCharge) return;
    
    try {
      setUploading(true);
      
      const { error: updateError } = await supabase
        .from('cartera')
        .update({ 
          estado: 'pendiente'
        })
        .eq('id', approvingCharge.id);

      if (updateError) throw updateError;
      
      // Notificar al padre sobre el rechazo
      const { data: padres } = await supabase
        .from('perfiles')
        .select('id')
        .eq('deportista_id', athlete.id)
        .eq('rol', 'padre');

      if (padres && padres.length > 0) {
        const notifs = padres.map(p => ({
          user_id: p.id,
          titulo: 'Pago Rechazado ❌',
          mensaje: `Hemos revisado tu comprobante para "${approvingCharge.titulo}" y ha sido rechazado. Por favor, verifica y sube un comprobante válido si es necesario.`,
          tipo: 'pago',
          leida: false
        }));
        await supabase.from('notificaciones').insert(notifs);
      } else if (athlete?.tutor_celular) {
        if (confirm("El acudiente no tiene cuenta en la app. ¿Deseas notificarle del pago rechazado por WhatsApp?")) {
           const text = `Hola ${athlete.tutor_nombre}, tu comprobante de pago para "${approvingCharge.titulo}" ha sido rechazado. Por favor revisa y sube uno válido.`;
           window.open(`https://wa.me/${athlete.tutor_celular.replace(/\D/g,'')}?text=${encodeURIComponent(text)}`, '_blank');
        }
      }
      
      setCharges(charges.map(c => c.id === approvingCharge.id ? { 
        ...c, 
        estado: 'pendiente'
      } : c));

      setApprovingCharge(null);
      setComprobanteFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      alert("Error al rechazar: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateStatus = async (chargeId: string, newStatus: string) => {
    if (newStatus === 'pagado') return; // Bloqueado, requiere modal
    try {
      const { error } = await supabase.from('cartera').update({ estado: newStatus }).eq('id', chargeId);
      if (error) throw error;
      setCharges(charges.map(c => c.id === chargeId ? { ...c, estado: newStatus as any } : c));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendReminder = async (charge: Charge) => {
    if (!athlete?.id) return;
    try {
      const { data: padres } = await supabase
        .from('perfiles')
        .select('id')
        .eq('deportista_id', athlete.id)
        .eq('rol', 'padre');

      const isVencido = charge.estado === 'vencido';
      
      if (padres && padres.length > 0) {
        const notifs = padres.map(p => ({
          user_id: p.id,
          titulo: isVencido ? 'Recordatorio de Pago Vencido ⚠️' : 'Recordatorio de Pago 🔔',
          mensaje: isVencido 
            ? `El cobro "${charge.titulo}" por ${formatCurrency(charge.monto)} se encuentra vencido. Por favor regulariza tu pago lo antes posible.`
            : `Te recordamos que tienes un pago pendiente por "${charge.titulo}" con un valor de ${formatCurrency(charge.monto)}.`,
          tipo: 'pago',
          leida: false
        }));
        await supabase.from('notificaciones').insert(notifs);
        alert("Recordatorio enviado con éxito al acudiente vía in-app.");
      } else if (athlete?.tutor_celular) {
        if (confirm("El acudiente no ha creado cuenta en la app. ¿Deseas enviarle el recordatorio por WhatsApp?")) {
           const text = isVencido 
             ? `Hola ${athlete.tutor_nombre}, el cobro "${charge.titulo}" por ${formatCurrency(charge.monto)} se encuentra vencido. Por favor regulariza tu pago lo antes posible.`
             : `Hola ${athlete.tutor_nombre}, te recordamos que tienes un pago pendiente por "${charge.titulo}" con un valor de ${formatCurrency(charge.monto)}.`;
           window.open(`https://wa.me/${athlete.tutor_celular.replace(/\D/g,'')}?text=${encodeURIComponent(text)}`, '_blank');
        }
      } else {
        alert("No se encontró cuenta en la app ni teléfono del acudiente.");
      }
    } catch (err: any) {
      alert("Error al enviar recordatorio: " + err.message);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: clubCurrency, minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in pb-20">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Volver a Cartera
      </button>

      {/* Header Info */}
      <div className="bg-black p-8 rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden">
         <div className="absolute right-0 top-0 opacity-5">
           <UserCircle2 size={160} />
         </div>
         <div className="relative z-10">
           <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest mb-2 font-outfit">Detalle de Cobros</p>
           {athlete ? (
             <>
               <h1 className="text-4xl font-black text-white italic tracking-tighter leading-none mb-2 uppercase">
                 {athlete.nombre_completo} {athlete.apellidos}
               </h1>
               <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                 Equipo: {athlete.equipos?.nombre || 'General'}
               </p>
             </>
           ) : (
             <h1 className="text-3xl font-black text-white italic tracking-tighter leading-none uppercase">
               Atleta Desconocido (RLS/Restricción)
             </h1>
           )}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Datos Facturación */}
         <div className="bg-white dark:bg-[#1e1f24] p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-sm">
           <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter mb-6 flex items-center gap-3">
             <FileBadge className="text-[var(--primary)]" />
             Datos Facturación (Acudiente)
           </h3>
           
           {athlete ? (
             <div className="space-y-4">
               <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-white/5">
                 <User className="text-gray-400 shrink-0 mt-1" size={20} />
                 <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tutor / Acudiente</p>
                   <p className="font-bold text-sm uppercase text-gray-900 dark:text-white">
                     {athlete.tutor_nombre} {athlete.tutor_apellidos}
                   </p>
                   {athlete.tutor_numero_documento && (
                     <div className="flex items-center gap-2 mt-1">
                       <span className="text-[10px] uppercase font-bold text-gray-400">NIT/CC:</span>
                       <span className="text-xs font-black text-black bg-[#daff01] px-2 py-0.5 rounded-md shadow-sm">
                         {athlete.tutor_numero_documento}
                       </span>
                     </div>
                   )}
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 overflow-hidden">
                   <Phone className="text-[var(--primary)] shrink-0" size={18} />
                   <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{athlete.tutor_celular || 'N/A'}</p>
                 </div>
                 <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 overflow-hidden">
                   <Mail className="text-[var(--primary)] shrink-0" size={18} />
                   <p className="font-bold text-xs text-gray-900 dark:text-white truncate">{athlete.tutor_email || 'N/A'}</p>
                 </div>
               </div>

               <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-white/5">
                 <MapPin className="text-gray-400 shrink-0 mt-1" size={20} />
                 <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dirección Residencial</p>
                   <p className="font-bold text-xs text-gray-900 dark:text-white leading-relaxed">
                     {athlete.direccion}, {athlete.barrio}<br/>
                     {athlete.municipio}, {athlete.departamento} ({athlete.pais})
                   </p>
                 </div>
               </div>
             </div>
           ) : (
             <p className="text-sm font-bold text-gray-500 italic p-6 text-center border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl">
               Sin datos del acudiente.
             </p>
           )}
         </div>

         {/* Stats y Tabla */}
         <div className="space-y-6">
           <div className="grid grid-cols-2 gap-6">
             <div className="bg-[var(--primary)] p-6 rounded-[32px] text-black shadow-xl shadow-[var(--primary-10)]">
               <p className="text-[10px] font-black text-black/60 uppercase tracking-widest mb-1">Total Pagado</p>
               <h2 className="text-3xl font-black italic">{formatCurrency(charges.filter(c => c.estado === 'pagado').reduce((sum, c) => sum + c.monto, 0))}</h2>
             </div>
             <div className="bg-white dark:bg-[#1e1f24] p-6 rounded-[32px] border border-gray-100 dark:border-white/5">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Pendiente</p>
               <h2 className="text-3xl font-black text-amber-500 italic">{formatCurrency(charges.filter(c => c.estado === 'pendiente' || c.estado === 'vencido').reduce((sum, c) => sum + c.monto, 0))}</h2>
             </div>
           </div>

           <div className="bg-white dark:bg-[#1e1f24] rounded-[32px] border border-gray-100 dark:border-white/5 p-6 overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/5">
                      <th className="pb-4 px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Concepto</th>
                      <th className="pb-4 px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto</th>
                      <th className="pb-4 px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Estado</th>
                      <th className="pb-4 px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {loading ? (
                      <tr><td colSpan={4} className="py-8 text-center text-xs text-gray-500">Cargando...</td></tr>
                    ) : charges.length === 0 ? (
                      <tr><td colSpan={4} className="py-8 text-center text-xs text-gray-500">No hay cobros para mostrar</td></tr>
                    ) : charges.map((charge) => (
                      <tr key={charge.id} className="group">
                        <td className="py-4 px-2 text-[11px] font-bold text-gray-900 dark:text-gray-300 uppercase">{charge.titulo}</td>
                        <td className="py-4 px-2 text-xs font-black text-gray-900 dark:text-white italic">{formatCurrency(charge.monto)}</td>
                        <td className="py-4 px-2 text-center">
                          <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            charge.estado === 'pagado' ? 'bg-emerald-500/10 text-emerald-500' : 
                            charge.estado === 'por validar' ? 'bg-blue-500/10 text-blue-500' :
                            charge.estado === 'vencido' ? 'bg-red-500/10 text-red-500' :
                            'bg-amber-500/10 text-amber-500'
                          }`}>
                            {charge.estado}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {charge.comprobante_url && (
                                <button onClick={() => setViewingComprobante(charge.comprobante_url || null)} className="p-2 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-colors" title="Ver Comprobante"><FileText size={16} /></button>
                            )}
                            
                            {charge.estado === 'por validar' && (
                                <>
                                  <button onClick={() => setApprovingCharge(charge)} className="p-2 bg-[var(--primary-10)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-black rounded-lg transition-all" title="Aprobar Pago"><CheckCircle2 size={16} /></button>
                                  <button onClick={() => handleUpdateStatus(charge.id, 'pendiente')} className="p-2 hover:bg-amber-500/10 text-amber-500 rounded-lg transition-all" title="Rechazar Comprobante"><XCircle size={16} /></button>
                                </>
                            )}

                            {(charge.estado === 'pendiente' || charge.estado === 'vencido') && (
                                <>
                                  <button onClick={() => setApprovingCharge(charge)} className="p-2 bg-[var(--primary-10)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-black rounded-lg transition-all" title="Aprobar Pago (Subir Comprobante)"><CheckCircle2 size={16} /></button>
                                  <button onClick={() => handleSendReminder(charge)} className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-all" title="Enviar Recordatorio"><Bell size={16} /></button>
                                  <button onClick={() => handleUpdateStatus(charge.id, 'anulado')} className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all" title="Anular Cobro"><XCircle size={16} /></button>
                                </>
                            )}

                            {charge.estado === 'anulado' && (
                                <button onClick={() => handleUpdateStatus(charge.id, 'pendiente')} className="p-2 hover:bg-blue-500/10 text-gray-400 hover:text-blue-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all" title="Habilitar Cobro"><RotateCcw size={16} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
           </div>
         </div>
      </div>

      {/* MODALES CLONADOS DE CARTERA */}
      <Modal isOpen={!!approvingCharge} onClose={() => { setApprovingCharge(null); setComprobanteFile(null); setPreviewUrl(null); }} title="Aprobar Pago">
         {approvingCharge && (
            <div className="space-y-6">
               <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Concepto</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic">{approvingCharge.titulo}</p>
                  <p className="text-xl font-black text-[var(--primary)] mt-1">{formatCurrency(approvingCharge.monto)}</p>
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                    {approvingCharge.comprobante_url ? 'Comprobante Subido por Acudiente' : 'Subir Comprobante de Pago (Obligatorio)'}
                  </label>
                  <div className="relative group">
                     {previewUrl ? (
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-[var(--primary)]">
                           <img src={previewUrl} className="w-full h-full object-cover" />
                           <button onClick={() => { setComprobanteFile(null); setPreviewUrl(null); }} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full"><X size={16}/></button>
                        </div>
                     ) : approvingCharge.comprobante_url ? (
                        <div className="relative w-full h-48 sm:h-64 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                           <img src={approvingCharge.comprobante_url} className="max-w-full max-h-full object-contain p-2" />
                           <label className="absolute top-3 right-3 px-3 py-1.5 bg-black/80 text-white hover:text-[var(--primary)] rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-black transition-colors backdrop-blur-md">
                             Reemplazar
                             <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                           </label>
                        </div>
                     ) : (
                        <label className="flex flex-col items-center justify-center w-full aspect-video bg-gray-50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl cursor-pointer hover:border-[var(--primary)] transition-colors">
                           <Upload size={32} className="text-gray-300 mb-2" />
                           <span className="text-[10px] font-black text-gray-400 uppercase">Seleccionar Imagen</span>
                           <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                        </label>
                     )}
                  </div>
               </div>

               <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button variant="ghost" className="w-full sm:flex-1 h-14 rounded-2xl font-black uppercase text-xs" onClick={() => { setApprovingCharge(null); setComprobanteFile(null); setPreviewUrl(null); }}>Cancelar</Button>
                  
                  {approvingCharge.estado === 'por validar' && (
                    <Button 
                      variant="danger"
                      className="w-full sm:flex-1 h-14 rounded-2xl font-black uppercase text-xs bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white" 
                      disabled={uploading}
                      onClick={processRejection}
                    >
                      Rechazar <XCircle size={16} />
                    </Button>
                  )}

                  <Button 
                    className="w-full sm:flex-[2] h-14 bg-[var(--primary)] text-black rounded-2xl font-black uppercase text-xs gap-2" 
                    disabled={(!comprobanteFile && !approvingCharge.comprobante_url) || uploading}
                    isLoading={uploading}
                    onClick={processApproval}
                  >
                    Confirmar / Validar Pago <CheckCircle2 size={16} />
                  </Button>
               </div>
            </div>
         )}
      </Modal>

      <Modal isOpen={!!viewingComprobante} onClose={() => setViewingComprobante(null)} title="Comprobante de Pago">
         <div className="space-y-4">
            <img src={viewingComprobante || ''} className="w-full rounded-2xl shadow-2xl" />
            <Button className="w-full h-14 bg-black text-white rounded-2xl font-black uppercase text-xs" onClick={() => setViewingComprobante(null)}>Cerrar</Button>
         </div>
      </Modal>
    </div>
  );
}
