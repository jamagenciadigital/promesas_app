import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { CreditCard, QrCode, AlignLeft, Eye, Save, Link as LinkIcon, CheckCircle2, Upload, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export default function PaymentsTab() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [qrFile, setQrFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    qr_url: '',
    pago_instrucciones: ''
  });

  const getDirectImageUrl = (url: string) => {
    if (!url) return '';
    const trimmed = url.trim();

    // Google Drive
    if (trimmed.includes('drive.google.com')) {
      const id = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
      if (id) {
        // Thumbnail es mucho más fiable que /uc?id para evitar bloqueos por virus/tamaño
        return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
      }
    }

    // Dropbox
    if (trimmed.includes('dropbox.com')) {
      return trimmed.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/\?dl=\d/, '');
    }

    // ImgBB (si pasan el link de la página en lugar de la imagen)
    if (trimmed.includes('ibb.co') && !trimmed.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      // Nota: ImgBB no tiene un conversor de link a imagen directo tan simple sin API, 
      // pero esto previene que se rompa si es un link directo.
    }

    return trimmed;
  };

  useEffect(() => {
    async function fetchPaymentConfig() {
      if (!profile?.club_id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('clubes')
          .select('qr_url, pago_instrucciones')
          .eq('id', profile.club_id)
          .single();

        if (error) throw error;
        if (data) {
          setFormData({
            qr_url: data.qr_url || '',
            pago_instrucciones: data.pago_instrucciones || ''
          });
        }
      } catch (err: any) {
        console.error("Error fetching payment config:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPaymentConfig();
  }, [profile?.club_id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("La imagen no debe superar los 5MB.");
        return;
      }
      setQrFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.club_id) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    let finalQrUrl = formData.qr_url;

    try {
      if (qrFile) {
        const fileExt = qrFile.name.split('.').pop();
        const fileName = `qr_${Date.now()}.${fileExt}`;
        const filePath = `${profile.club_id}/qrs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('comprobantes-pagos')
          .upload(filePath, qrFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('comprobantes-pagos')
          .getPublicUrl(filePath);

        finalQrUrl = publicUrl;
      }

      const { error: updateError } = await supabase
        .from('clubes')
        .update({
          qr_url: finalQrUrl,
          pago_instrucciones: formData.pago_instrucciones
        })
        .eq('id', profile.club_id);

      if (updateError) throw updateError;
      
      setFormData(prev => ({ ...prev, qr_url: finalQrUrl }));
      setQrFile(null);
      setPreviewUrl(null);
      setSuccessMsg('Configuración de pagos guardada correctamente.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CCFF00]"></div>
      </div>
    );
  }

  return (
    <div className="p-[1.2rem] space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <CreditCard className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-outfit uppercase tracking-tight">Configuración de Pagos</h2>
          <p className="text-sm text-gray-500">Configura el código QR y las instrucciones de pago que verán tus miembros.</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-green-700">¡Configuración actualizada!</h4>
            <p className="text-sm text-green-700 mt-1">{successMsg}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Sección QR */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-bold text-[#182332] uppercase tracking-wider">Código QR para Pagos</h3>
          </div>
          
          <div className="space-y-3">
            <div className={`relative w-full bg-gray-50 border-2 border-dashed ${qrFile ? 'border-[#CCFF00] bg-[#CCFF00]/5' : 'border-gray-200 hover:border-gray-300'} rounded-2xl p-8 flex flex-col items-center justify-center min-h-[220px] transition-all group overflow-hidden`}>
               <input 
                 type="file" 
                 accept="image/*" 
                 onChange={handleFileSelect} 
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                 title="Sube una imagen"
               />
               
              {previewUrl || formData.qr_url ? (
                <div className="text-center space-y-4 relative z-0">
                  <img 
                    src={previewUrl || getDirectImageUrl(formData.qr_url)} 
                    alt="Vista previa QR" 
                    className="max-h-40 rounded-xl shadow-md mx-auto object-contain border border-gray-100 bg-white"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                       e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="flex flex-col items-center">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{previewUrl ? 'Imagen seleccionada para subir' : 'QR Actual'}</p>
                    {previewUrl && <p className="text-[9px] font-black text-[#CCFF00] mt-1 bg-black px-2 py-0.5 rounded-full uppercase tracking-widest">Listo para guardar</p>}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center space-y-3 relative z-0">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                     <Upload className="w-5 h-5 text-gray-400 group-hover:text-[#CCFF00] transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Haz clic aquí para subir tu QR</p>
                    <p className="text-xs text-gray-500 mt-1">Formatos soportados: JPG, PNG, WEBP (Máx 5MB)</p>
                  </div>
                </div>
              )}

              {(previewUrl || formData.qr_url) && (
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setQrFile(null);
                    setPreviewUrl(null);
                    if (!previewUrl) setFormData(prev => ({...prev, qr_url: ''}));
                  }}
                  className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-20 shadow-lg"
                  title="Eliminar QR"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest pl-1">Los miembros verán este código QR cuando realicen pagos</p>
          </div>
        </div>

        {/* Sección Instrucciones */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlignLeft className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-bold text-[#182332] uppercase tracking-wider">Instrucciones de Pago</h3>
          </div>
          
          <div className="space-y-2">
            <textarea
              className="w-full bg-white border border-gray-300 rounded-2xl px-5 py-4 text-base text-gray-900 focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent outline-none transition-all placeholder-gray-400 min-h-[140px] shadow-sm"
              placeholder="Ejemplo: Número de cuenta: 123124132 Bancolombia Ahorros Titular: Club Deportivo Favor enviar comprobante al WhatsApp"
              value={formData.pago_instrucciones}
              onChange={(e) => setFormData({ ...formData, pago_instrucciones: e.target.value })}
            />
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest pl-1">Información adicional que aparecerá junto al QR (número de cuenta, titular, etc.)</p>
          </div>
        </div>

        {/* Sección Vista Previa */}
        <div className="pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-bold text-[#182332] uppercase tracking-wider">Vista Previa</h3>
            </div>
          </div>
          
          <div className="bg-gray-100 rounded-3xl p-8 flex justify-center border border-gray-200 shadow-inner">
            <div className="w-full max-w-[320px] aspect-[9/16] bg-white rounded-[40px] border-[8px] border-gray-900 shadow-2xl overflow-hidden flex flex-col relative group overflow-y-auto">
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <h4 className="text-lg font-bold text-gray-900">Realizar Pago</h4>
                  <p className="text-xs text-gray-500">Sigue las instrucciones para validar tu pago.</p>
                </div>
                
                {formData.qr_url || formData.pago_instrucciones ? (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    {formData.qr_url && (
                      <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col items-center">
                        <img 
                          src={previewUrl || getDirectImageUrl(formData.qr_url)} 
                          alt="QR Mockup" 
                          className="w-full h-auto rounded-2xl shadow-sm bg-white"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                             e.currentTarget.style.display = 'none';
                          }}
                        />
                        <p className="text-[9px] text-gray-400 mt-3 uppercase font-black tracking-widest">Escanea para pagar</p>
                      </div>
                    )}
                    
                    {formData.pago_instrucciones && (
                      <div className="p-5 bg-blue-50/50 rounded-3xl border border-blue-100/50">
                        <p className="text-sm text-gray-700 leading-relaxed font-medium">
                          {formData.pago_instrucciones}
                        </p>
                      </div>
                    )}

                    <div className="pt-4">
                      <div className="w-full h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-xl">
                        Subir Comprobante
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20 px-6">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                       <QrCode className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-400 font-medium">Agrega un QR o instrucciones para ver la vista previa</p>
                  </div>
                )}
              </div>
              
              {/* Floating Speaker/Sensors Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-900 rounded-b-2xl"></div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-8">
          <Button 
            type="submit" 
            isLoading={saving}
            className="px-10 py-4 bg-black text-white font-bold rounded-xl shadow-sm hover:bg-black/90 flex items-center gap-3 uppercase tracking-wider text-xs"
          >
            <Save className="w-4 h-4" />
            Guardar Configuración
          </Button>
        </div>
      </form>
    </div>
  );
}
