import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Wallet, CheckCircle2, Clock, 
  ArrowUpRight, DollarSign, Upload, 
  FileText, X, AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency, parseLocalDate } from '../../utils/formatUtils';
import { ProductoEvento } from '../../types';

const getDirectImageUrl = (url: string) => {
  if (!url) return '';
  const trimmed = url.trim();

  // Google Drive
  if (trimmed.includes('drive.google.com')) {
    const id = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
    if (id) {
      return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    }
  }

  // Dropbox
  if (trimmed.includes('dropbox.com')) {
    return trimmed.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/\?dl=\d/, '');
  }

  return trimmed;
};

interface Charge {
  id: string;
  titulo: string;
  monto: number;
  fecha_vencimiento: string;
  estado: 'pendiente' | 'pagado' | 'vencido' | 'anulado' | 'por validar';
  comprobante_url?: string;
  fecha_pago?: string;
  producto_evento_id?: string;
  productos_eventos?: ProductoEvento;
  created_at: string;
}

export default function PlayerCartera() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [clubCurrency, setClubCurrency] = useState('COP');
  const [clubInfo, setClubInfo] = useState<{ qr_url?: string; pago_instrucciones?: string } | null>(null);

  // Estado para el modal de pago/comprobante
  const [approvingCharge, setApprovingCharge] = useState<Charge | null>(null);
  const [uploading, setUploading] = useState(false);
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewingComprobante, setViewingComprobante] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.deportista_id) {
      fetchCharges();
      fetchClubInfo();
    }
  }, [profile?.deportista_id]);

  async function fetchClubInfo() {
    if (!profile?.club_id) return;
    const { data } = await supabase
      .from('clubes')
      .select('moneda, qr_url, pago_instrucciones')
      .eq('id', profile.club_id)
      .single();
    
    if (data) {
      if (data.moneda) setClubCurrency(data.moneda.split(' ')[0]);
      setClubInfo({
        qr_url: data.qr_url,
        pago_instrucciones: data.pago_instrucciones
      });
    }
  }

  async function fetchCharges() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cartera')
        .select('*, productos_eventos(*)')
        .eq('deportista_id', profile?.deportista_id)
        .order('fecha_vencimiento', { ascending: true });

      if (error) throw error;
      setCharges(data || []);
    } catch (err) {
      console.error("Error fetching player charges:", err);
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

  const processPayment = async () => {
    if (!approvingCharge || !comprobanteFile) return;

    try {
      setUploading(true);
      
      const fileExt = comprobanteFile.name.split('.').pop();
      const fileName = `pago_${approvingCharge.id}_${Date.now()}.${fileExt}`;
      const filePath = `${profile?.club_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('comprobantes-pagos')
        .upload(filePath, comprobanteFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('comprobantes-pagos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('cartera')
        .update({ 
          estado: 'por validar',
          comprobante_url: publicUrl,
          fecha_pago: new Date().toISOString()
        })
        .eq('id', approvingCharge.id);

      if (updateError) throw updateError;
      
      // Enviar notificación a administradores del club y al rol cartera
      try {
        let deportistaName = 'el deportista';
        if (profile?.deportista_id) {
          const { data: depData, error: depError } = await supabase
            .from('deportistas')
            .select('nombre_completo, apellidos')
            .eq('id', profile.deportista_id)
            .maybeSingle();

          if (depError) {
             console.error("Error fetching deportista:", depError);
          } else if (depData) {
            deportistaName = `${depData.nombre_completo || ''} ${depData.apellidos || ''}`.trim();
          }
        }

        const { data: financeAdmins } = await supabase
          .from('perfiles')
          .select('id')
          .eq('club_id', profile?.club_id)
          .in('rol', ['admin_club', 'cartera']);

        if (financeAdmins && financeAdmins.length > 0) {
          const notifications = financeAdmins.map(admin => ({
            user_id: admin.id,
            tipo: 'pago',
            titulo: 'Pago por Validar',
            mensaje: `Comprobante de ${deportistaName} para: ${approvingCharge.titulo}`,
            leida: false
          }));
          await supabase.from('notificaciones').insert(notifications);
        }
      } catch (notifyErr) {
        console.error("Error al notificar pago:", notifyErr);
      }

      setCharges(charges.map(c => c.id === approvingCharge.id ? { 
        ...c, 
        estado: 'por validar', 
        comprobante_url: publicUrl,
        fecha_pago: new Date().toISOString()
      } : c));

      setApprovingCharge(null);
      setComprobanteFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      alert("Error al procesar el pago: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const stats = {
    pending: charges.filter(c => c.estado === 'pendiente' || c.estado === 'vencido').reduce((acc, curr) => acc + curr.monto, 0),
    paid: charges.filter(c => c.estado === 'pagado').reduce((acc, curr) => acc + curr.monto, 0),
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-club-primary/10 rounded-2xl">
            <Wallet className="w-8 h-8 text-club-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">Mi Cartera</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Sigue el estado de tus pagos y mensualidades</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-black p-8 rounded-[40px] border border-white/5 shadow-2xl">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 font-outfit">Total Pendiente</p>
          <h2 className="text-5xl font-black text-white italic tracking-tighter tabular-nums">{formatCurrency(stats.pending, clubCurrency)}</h2>
        </div>
        <div className="bg-club-primary p-8 rounded-[40px] flex items-center justify-between shadow-xl shadow-club-primary/10 overflow-hidden relative group">
           <div className="relative z-10">
             <p className="text-[10px] font-black text-black/60 uppercase tracking-widest mb-2 font-outfit">Total Pagado</p>
             <h2 className="text-5xl font-black text-black italic tracking-tighter tabular-nums">{formatCurrency(stats.paid, clubCurrency)}</h2>
           </div>
           <CheckCircle2 size={120} className="absolute -right-4 -bottom-4 text-black/10 group-hover:scale-110 transition-transform" />
        </div>
      </div>

      <div className="bg-white dark:bg-[#16171b] border border-gray-100 dark:border-[#26282e] rounded-[40px] overflow-hidden">
        <div className="p-8 border-b border-gray-50 dark:border-white/5 bg-gray-50/30 dark:bg-white/5">
           <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Historial de Cobros</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-[#111215]">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest font-outfit">Concepto</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest font-outfit">Monto</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest font-outfit">Vencimiento</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest font-outfit text-center">Estado</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest font-outfit text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs italic">Cargando...</td></tr>
              ) : charges.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs italic">No hay cobros registrados.</td></tr>
              ) : (
                charges.map((charge) => (
                  <tr key={charge.id} className="group hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-6">
                       <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">{charge.titulo}</p>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Ref: {charge.id.slice(0,8)}</p>
                    </td>
                    <td className="px-6 py-6 text-sm font-black text-gray-900 dark:text-white italic">{formatCurrency(charge.monto, clubCurrency)}</td>
                    <td className="px-6 py-6">
                       <div className="flex items-center gap-2 text-gray-400">
                          <Clock size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{parseLocalDate(charge.fecha_vencimiento).toLocaleDateString()}</span>
                       </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className={`inline-flex px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        charge.estado === 'pagado' ? 'bg-emerald-500/10 text-emerald-500' : 
                        charge.estado === 'por validar' ? 'bg-blue-500/10 text-blue-500' :
                        charge.estado === 'vencido' ? 'bg-red-500/10 text-red-500' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>
                        {charge.estado}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {charge.comprobante_url && (
                            <button onClick={() => setViewingComprobante(charge.comprobante_url || null)} className="p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:scale-105 transition-transform" title="Ver Comprobante"><FileText size={18} /></button>
                        )}
                        {charge.estado !== 'pagado' && charge.estado !== 'anulado' && charge.estado !== 'por validar' && (
                            <button 
                              onClick={() => setApprovingCharge(charge)} 
                              className="p-3 bg-club-primary text-black hover:bg-black hover:text-club-primary rounded-xl transition-all font-black uppercase text-[10px] tracking-widest flex items-center gap-2 border border-transparent hover:border-club-primary" 
                              title="Informar Pago"
                            >
                              <Upload size={18} /> Pagar
                            </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA INFORMAR PAGO */}
      <Modal isOpen={!!approvingCharge} onClose={() => { setApprovingCharge(null); setComprobanteFile(null); setPreviewUrl(null); }} title="Informar Pago">
         {approvingCharge && (
            <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Detalles del Producto/Evento Especial (Si Aplica) */}
                  {approvingCharge.productos_eventos && (
                    <div className="space-y-4 mb-6">
                      {approvingCharge.productos_eventos.imagen_url && (
                        <div className="w-full aspect-video rounded-3xl overflow-hidden bg-black/5 relative shadow-inner">
                          <img 
                            src={approvingCharge.productos_eventos.imagen_url} 
                            alt="Banner Evento" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      {approvingCharge.productos_eventos.descripcion && (
                        <div className="p-5 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10">
                           <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed italic">
                             {approvingCharge.productos_eventos.descripcion}
                           </p>
                        </div>
                      )}

                      {approvingCharge.productos_eventos.link_pago && (
                        <div className="pt-2">
                          <a 
                            href={approvingCharge.productos_eventos.link_pago} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 w-full h-14 bg-club-primary text-black font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] transition-transform"
                          >
                            <DollarSign size={18} /> Pagar en Línea Ahora
                          </a>
                          <p className="text-center text-[8px] font-black uppercase tracking-widest text-gray-400 mt-3">
                            Si pagas en línea, recuerda descargar tu recibo y subirlo abajo para validar.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Detalles del Cobro (Estándar) */}
                  <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 relative overflow-hidden flex flex-col justify-center">
                    <div className="relative z-10">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-outfit mb-1">Concepto</p>
                      <p className="text-lg font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-tight">{approvingCharge.titulo}</p>
                      <div className="flex items-center gap-2 mt-4">
                         <DollarSign size={20} className="text-club-primary" />
                         <p className="text-3xl font-black text-club-primary italic tabular-nums leading-none tracking-tighter">{formatCurrency(approvingCharge.monto, clubCurrency)}</p>
                      </div>
                    </div>
                  </div>

                   {/* QR del Club (Ocultarlo si es un producto con link de pago, para no confundir, a menos que queramos dejar ambos) */}
                  {!approvingCharge.productos_eventos?.link_pago && (
                    <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap gap-4">
                      {clubInfo?.qr_url ? (
                        <div className="flex-1 p-4 bg-white rounded-3xl border border-gray-100 flex flex-col items-center justify-center shadow-inner relative group">
                           <img 
                              src={getDirectImageUrl(clubInfo.qr_url)} 
                              className="w-32 h-32 object-contain" 
                              alt="QR de Pago" 
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add('qr-error');
                              }}
                           />
                           {/* Mensaje de error (oculto por defecto, visible por CSS ad-hoc) */}
                           <style>{`.qr-error .fallback-qr { display: flex !important; }`}</style>
                           <div className="fallback-qr hidden w-32 h-32 flex-col items-center justify-center text-center text-gray-400">
                              <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                              <span className="text-[8px] font-black uppercase">Enlace Inválido</span>
                              <span className="text-[7px] mx-2 leading-tight mt-1 opacity-70">El administrador no subió la imagen o el enlace está bloqueado.</span>
                           </div>

                           <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-2 qr-error:hidden">Escanea para pagar</p>
                        </div>
                      ) : (
                        <div className="flex-1 p-6 bg-amber-500/5 rounded-3xl border border-amber-500/10 flex flex-col items-center justify-center text-center">
                           <AlertCircle className="text-amber-500 mb-2" size={24} />
                           <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Coordinar pago con el club</p>
                        </div>
                      )}

                      {/* Instrucciones de Pago */}
                      {clubInfo?.pago_instrucciones && (
                        <div className="flex-1 p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10 flex flex-col justify-center">
                           <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2"><FileText size={14}/> Instrucciones Generales</p>
                           <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed italic">{clubInfo.pago_instrucciones}</p>
                        </div>
                      )}
                    </div>
                  )}
               </div> {/* END GRID ROW */}

               <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-outfit">Comprobante de Pago</label>
                    <span className="text-[8px] font-bold text-amber-500 uppercase tracking-widest italic flex items-center gap-1"><AlertCircle size={10}/> Requerido para validar</span>
                  </div>
                  
                  <div className="relative group">
                     {previewUrl ? (
                        <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-club-primary shadow-2xl">
                           <img src={previewUrl} className="w-full h-full object-cover" />
                           <button onClick={() => { setComprobanteFile(null); setPreviewUrl(null); }} className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black transition-colors"><X size={18}/></button>
                        </div>
                     ) : (
                        <label className="flex flex-col items-center justify-center w-full aspect-video bg-gray-50 dark:bg-[#111215] border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl cursor-pointer hover:border-club-primary transition-all hover:bg-white/5">
                           <div className="p-4 bg-white/5 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                             <Upload size={32} className="text-gray-300" />
                           </div>
                           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Haz clic para subir imagen</span>
                           <span className="text-[8px] text-gray-500 mt-2">JPG, PNG, PDF (Máx 5MB)</span>
                           <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileSelect} />
                        </label>
                     )}
                  </div>
               </div>

               <div className="flex gap-4 pt-4">
                  <Button variant="ghost" className="flex-1 h-16 rounded-2xl font-black uppercase text-xs italic tracking-widest" onClick={() => setApprovingCharge(null)}>Cancelar</Button>
                  <Button 
                    className="flex-[2] h-16 bg-club-primary text-black rounded-2xl font-black uppercase text-xs italic tracking-widest gap-3 shadow-xl shadow-club-primary/20 active:scale-95 transition-all" 
                    disabled={!comprobanteFile || uploading}
                    isLoading={uploading}
                    onClick={processPayment}
                  >
                    Informar Pago <CheckCircle2 size={18} />
                  </Button>
               </div>
            </div>
         )}
      </Modal>

      {/* MODAL PARA VER COMPROBANTE */}
      <Modal isOpen={!!viewingComprobante} onClose={() => setViewingComprobante(null)} title="Comprobante Enviado">
         <div className="space-y-6">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5">
              <img src={viewingComprobante || ''} className="w-full h-auto" />
            </div>
            <Button className="w-full h-16 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs italic tracking-widest" onClick={() => setViewingComprobante(null)}>Cerrar Vista</Button>
         </div>
      </Modal>
    </div>
  );
}
