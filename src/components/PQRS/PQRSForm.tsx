import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FileUpload } from '../ui/FileUpload';
import { Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { TipoPQRS } from '../../types';

interface PQRSFormProps {
  destinoTipo: 'club' | 'escenario';
  destinoId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TIPO_LABELS: Record<TipoPQRS, string> = {
  pregunta: 'Pregunta',
  queja: 'Queja',
  reclamo: 'Reclamo',
  sugerencia: 'Sugerencia'
};

export default function PQRSForm({ destinoTipo, destinoId, onSuccess, onCancel }: PQRSFormProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    tipo: 'pregunta' as TipoPQRS,
    descripcion: '',
    adjunto_url: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    setError(null);

    try {
      // Generar código: PQRS-2024-RANDOM
      const year = new Date().getFullYear();
      const random = Math.random().toString(36).substring(2, 7).toUpperCase();
      const codigo = `PQRS-${year}-${random}`;

      const { error: insertError } = await supabase
        .from('pqrs')
        .insert([{
          codigo,
          solicitante_id: profile.id,
          solicitante_nombre: `${profile.nombre || ''} ${profile.apellido || ''}`.trim() || profile.email,
          solicitante_documento: profile.documento,
          solicitante_email: profile.email,
          tipo: formData.tipo,
          descripcion: formData.descripcion,
          adjunto_url: formData.adjunto_url,
          destino_tipo: destinoTipo,
          destino_id: destinoId,
          estado: 'pendiente'
        }]);

      if (insertError) throw insertError;

      setSuccess(true);
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err: any) {
      console.error('Error creating PQRS:', err);
      setError(err.message || 'Error al enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in">
        <div className="w-16 h-16 bg-club-primary/10 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-club-primary" />
        </div>
        <h3 className="text-xl font-black text-white uppercase italic">Solicitud Enviada</h3>
        <p className="text-sm text-gray-400">Tu PQRS ha sido registrado con éxito. Podrás hacerle seguimiento en tu panel.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic px-1">
          Tipo de Solicitud
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(TIPO_LABELS) as TipoPQRS[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFormData({ ...formData, tipo: t })}
              className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                formData.tipo === t 
                  ? 'bg-club-primary/10 border-club-primary text-club-primary' 
                  : 'bg-white/5 border-transparent text-gray-500 hover:border-white/10'
              }`}
            >
              {TIPO_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic px-1">
          Descripción de la Solicitud
        </label>
        <textarea
          required
          value={formData.descripcion}
          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          placeholder="Describe detalladamente tu petición, queja, reclamo o sugerencia..."
          className="w-full bg-white/5 border-2 border-transparent focus:border-club-primary/20 rounded-2xl p-6 text-sm text-white outline-none min-h-[150px] resize-none transition-all placeholder:text-white/10"
        />
      </div>

      <FileUpload
        label="Adjuntar Documento o Imagen (Opcional)"
        bucket="pqrs-adjuntos"
        path={`pqrs/${profile?.id}`}
        value={formData.adjunto_url}
        onChange={(url) => setFormData({ ...formData, adjunto_url: url })}
        className="bg-white/5 p-4 rounded-2xl border-2 border-transparent"
      />

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold uppercase italic">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="flex gap-4 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="flex-1 h-14 rounded-2xl text-gray-400 font-black uppercase italic tracking-widest text-xs"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          isLoading={loading}
          className="flex-1 h-14 bg-club-primary text-black font-black uppercase italic tracking-widest text-xs rounded-2xl hover:scale-[1.02] transition-transform shadow-lg shadow-club-primary/10"
        >
          <Send className="w-4 h-4 mr-2" />
          Enviar Solicitud
        </Button>
      </div>
    </form>
  );
}
