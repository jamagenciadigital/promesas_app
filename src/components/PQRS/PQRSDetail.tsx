import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { PQRS, TipoPQRS, EstadoPQRS, FeedbackPQRS } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { 
  MessageSquare, 
  User, 
  Calendar, 
  Paperclip, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PQRSDetailProps {
  pqrs: PQRS;
  onBack: () => void;
  onUpdate: () => void;
}

const TIPO_LABELS: Record<TipoPQRS, string> = {
  pregunta: 'Pregunta',
  queja: 'Queja',
  reclamo: 'Reclamo',
  sugerencia: 'Sugerencia'
};

const ESTADO_BADGES: Record<EstadoPQRS, { variant: any, label: string }> = {
  pendiente: { variant: 'warning', label: 'Pendiente' },
  en_revision: { variant: 'info', label: 'En Revisión' },
  respondida: { variant: 'success', label: 'Respondida' },
  cerrada: { variant: 'default', label: 'Cerrada' }
};

export default function PQRSDetail({ pqrs, onBack, onUpdate }: PQRSDetailProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [respuesta, setRespuesta] = useState('');
  const [feedbackMotivo, setFeedbackMotivo] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const isOwner = profile?.id === pqrs.solicitante_id;
  const isDestinatario = !isOwner && (
    (pqrs.destino_tipo === 'club' && profile?.rol === 'admin_club') ||
    (pqrs.destino_tipo === 'escenario' && (profile?.rol === 'admin_escenario' || profile?.rol === 'escenario_deportivo'))
  );

  const handleResponder = async () => {
    if (!respuesta.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('pqrs')
        .update({
          respuesta,
          estado: 'respondida',
          fecha_respuesta: new Date().toISOString(),
          respondido_por: profile?.id
        })
        .eq('id', pqrs.id);
      
      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error('Error al responder PQRS:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCerrarDefinitivamente = async () => {
    setIsConfirmModalOpen(false);
    setLoading(true);
    try {
      const { error } = await supabase
        .from('pqrs')
        .update({
          estado: 'cerrada'
        })
        .eq('id', pqrs.id);
      
      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error('Error al cerrar PQRS:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (feedback: FeedbackPQRS) => {
    if (feedback === 'rechazada' && !feedbackMotivo.trim()) {
      setShowRejectForm(true);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('pqrs')
        .update({
          feedback_usuario: feedback,
          feedback_motivo: feedback === 'rechazada' ? feedbackMotivo : null,
          estado: feedback === 'aceptada' ? 'cerrada' : 'en_revision'
        })
        .eq('id', pqrs.id);
      
      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error('Error al enviar feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-white transition-colors italic"
      >
        <ArrowLeft size={14} /> Volver al listado
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info Principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/5 border border-white/5 p-8 rounded-[40px] space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">{pqrs.codigo}</span>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight flex items-center gap-3">
                  <MessageSquare className="text-[#CCFF00]" />
                  {TIPO_LABELS[pqrs.tipo]}
                </h2>
              </div>
              <Badge variant={ESTADO_BADGES[pqrs.estado].variant} className="px-4 py-1.5 text-[10px] font-black uppercase italic">
                {ESTADO_BADGES[pqrs.estado].label}
              </Badge>
            </div>

            <div className="p-6 bg-black/40 rounded-3xl border border-white/5">
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{pqrs.descripcion}</p>
            </div>

            {pqrs.adjunto_url && (
              <a 
                href={pqrs.adjunto_url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group"
              >
                <div className="p-2 bg-black rounded-xl text-gray-400 group-hover:text-[#CCFF00]">
                  <Paperclip size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-white uppercase italic">Documento Adjunto</p>
                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Click para visualizar archivo</p>
                </div>
              </a>
            )}
          </div>

          {/* Respuesta del Destinatario */}
          {(pqrs.respuesta || isDestinatario) && (
            <div className={`p-8 rounded-[40px] border-2 space-y-6 ${pqrs.respuesta && pqrs.estado !== 'en_revision' ? 'bg-white/5 border-transparent' : 'bg-[#CCFF00]/5 border-[#CCFF00]/20'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="text-[#CCFF00]" size={20} />
                  <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] italic">
                    {pqrs.estado === 'en_revision' && pqrs.respuesta ? 'Nueva Respuesta (Seguimiento)' : 'Respuesta del Encargado'}
                  </h3>
                </div>
                {isDestinatario && pqrs.estado !== 'cerrada' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsConfirmModalOpen(true)}
                    isLoading={loading}
                    className="text-red-500 hover:text-red-600 font-black uppercase italic tracking-widest text-[10px]"
                  >
                    <XCircle size={14} className="mr-2" /> Cerrar Definitivamente
                  </Button>
                )}
              </div>

              {pqrs.respuesta && (
                <div className="space-y-4">
                  <div className="p-6 bg-black/40 rounded-3xl border border-white/5 italic text-gray-400 leading-relaxed relative">
                    <span className="absolute -top-3 left-6 px-3 py-1 bg-black border border-white/10 rounded-full text-[8px] font-black uppercase italic tracking-widest text-white/40">Respuesta Anterior</span>
                    {pqrs.respuesta}
                  </div>
                  <div className="flex items-center gap-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest px-2">
                     <span className="flex items-center gap-1"><Clock size={10} /> {format(new Date(pqrs.fecha_respuesta!), 'dd MMM yyyy, HH:mm', { locale: es })}</span>
                  </div>
                </div>
              )}

              {isDestinatario && (pqrs.estado === 'pendiente' || pqrs.estado === 'en_revision') && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <textarea
                    value={respuesta}
                    onChange={(e) => setRespuesta(e.target.value)}
                    placeholder={pqrs.respuesta ? "Escribe una nueva respuesta para el seguimiento..." : "Escribe aquí tu respuesta oficial..."}
                    className="w-full bg-black/40 border-2 border-transparent focus:border-[#CCFF00]/40 rounded-3xl p-6 text-sm text-white outline-none min-h-[150px] resize-none transition-all"
                  />
                  <Button
                    onClick={handleResponder}
                    isLoading={loading}
                    className="w-full h-14 bg-[#CCFF00] text-black font-black uppercase italic tracking-widest text-xs rounded-2xl"
                  >
                    {pqrs.respuesta ? 'Enviar Nueva Respuesta' : 'Enviar Respuesta Oficial'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Feedback del Usuario */}
          {pqrs.estado === 'respondida' && isOwner && !pqrs.feedback_usuario && (
            <div className="p-8 bg-black border-2 border-[#CCFF00]/20 rounded-[40px] space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-sm font-black text-white uppercase italic">¿Estás satisfecho con la respuesta?</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Tu feedback ayuda a mejorar el servicio</p>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => handleFeedback('aceptada')}
                  isLoading={loading}
                  className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase italic tracking-widest text-xs rounded-2xl"
                >
                  <CheckCircle2 className="mr-2" size={16} /> Aceptar Respuesta
                </Button>
                <Button
                  onClick={() => setShowRejectForm(true)}
                  className="flex-1 h-14 bg-red-500 hover:bg-red-600 text-white font-black uppercase italic tracking-widest text-xs rounded-2xl"
                >
                  <XCircle className="mr-2" size={16} /> Rechazar Respuesta
                </Button>
              </div>

              {showRejectForm && (
                <div className="space-y-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-4">
                  <textarea
                    required
                    value={feedbackMotivo}
                    onChange={(e) => setFeedbackMotivo(e.target.value)}
                    placeholder="Cuéntanos por qué rechazas la respuesta..."
                    className="w-full bg-white/5 border-2 border-red-500/20 rounded-2xl p-4 text-sm text-white outline-none min-h-[100px] resize-none"
                  />
                  <Button
                    onClick={() => handleFeedback('rechazada')}
                    isLoading={loading}
                    className="w-full h-12 bg-white text-black font-black uppercase italic tracking-widest text-xs rounded-xl"
                  >
                    Confirmar Rechazo
                  </Button>
                </div>
              )}
            </div>
          )}

          {pqrs.feedback_usuario && (
            <div className={`p-6 rounded-[32px] border flex items-center gap-4 ${pqrs.feedback_usuario === 'aceptada' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
              {pqrs.feedback_usuario === 'aceptada' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
              <div>
                <p className="text-xs font-black uppercase italic tracking-widest">Respuesta {pqrs.feedback_usuario === 'aceptada' ? 'Aceptada' : 'Rechazada'}</p>
                {pqrs.feedback_motivo && <p className="text-[10px] font-bold opacity-80 mt-1">{pqrs.feedback_motivo}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar de Detalles */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/5 p-6 rounded-[32px] space-y-6">
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">Información del Solicitante</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-xl border border-white/5 flex items-center justify-center text-gray-400">
                  <User size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white uppercase italic">{pqrs.solicitante_nombre}</p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Remitente</p>
                </div>
              </div>

              {pqrs.solicitante_documento && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-xl border border-white/5 flex items-center justify-center text-gray-400">
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white uppercase italic">{pqrs.solicitante_documento}</p>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Documento</p>
                  </div>
                </div>
              )}

              {pqrs.solicitante_email && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-xl border border-white/5 flex items-center justify-center text-gray-400">
                    <Send size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white lowercase italic truncate">{pqrs.solicitante_email}</p>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Email</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-xl border border-white/5 flex items-center justify-center text-gray-400">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white uppercase italic">{format(new Date(pqrs.created_at), 'dd/MM/yyyy')}</p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Fecha Envío</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#CCFF00]/5 border border-[#CCFF00]/10 p-6 rounded-[32px] space-y-4">
            <div className="flex items-center gap-2 text-[#CCFF00]">
              <AlertCircle size={16} />
              <span className="text-[10px] font-black uppercase italic">Estado de Seguimiento</span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium leading-relaxed italic">
              {pqrs.estado === 'pendiente' && 'Tu solicitud está en la cola de atención del encargado.'}
              {pqrs.estado === 'en_revision' && 'El encargado ha visto tu solicitud y está trabajando en una respuesta.'}
              {pqrs.estado === 'respondida' && 'Ya tienes una respuesta oficial. Por favor revísala y danos tu feedback.'}
              {pqrs.estado === 'cerrada' && 'Este PQRS ha sido finalizado con éxito.'}
            </p>
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isConfirmModalOpen} 
        onClose={() => setIsConfirmModalOpen(false)} 
        title="Confirmar Cierre"
      >
        <div className="space-y-6">
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-[24px] flex items-center gap-4 text-red-500">
            <div className="p-3 bg-red-500/20 rounded-2xl">
              <AlertCircle size={24} />
            </div>
            <p className="text-xs font-black uppercase italic leading-tight tracking-tight">
              ¿Estás seguro de que deseas cerrar definitivamente esta solicitud? No se podrá responder nuevamente.
            </p>
          </div>
          <div className="flex gap-4">
            <Button 
              variant="ghost" 
              onClick={() => setIsConfirmModalOpen(false)}
              className="flex-1 h-14 rounded-2xl text-gray-500 font-black uppercase italic tracking-widest text-[10px]"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCerrarDefinitivamente}
              isLoading={loading}
              className="flex-1 h-14 bg-red-500 text-white font-black uppercase italic tracking-widest text-[10px] rounded-2xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
            >
              Cerrar PQRS
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
