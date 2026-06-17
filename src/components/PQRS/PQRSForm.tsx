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
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Solicitud Enviada</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Tu PQRS ha sido registrado con éxito. Podrás hacerle seguimiento en tu panel.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 px-1">
          Tipo de Solicitud
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(TIPO_LABELS) as TipoPQRS[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFormData({ ...formData, tipo: t })}
              className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border-2 ${
                formData.tipo === t 
                  ? 'bg-[var(--primary-10)] border-[var(--primary)] text-[var(--primary)]' 
                  : 'bg-gray-50 dark:bg-black/20 border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:hover:border-white/10'
              }`}
            >
              {TIPO_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 px-1">
          Descripción de la Solicitud
        </label>
        <textarea
          required
          value={formData.descripcion}
          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          placeholder="Describe detalladamente tu petición, queja, reclamo o sugerencia..."
          className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent rounded-xl p-4 text-sm text-gray-900 dark:text-white outline-none min-h-[150px] resize-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
      </div>

      <FileUpload
        label="Adjuntar Documento o Imagen (Opcional)"
        bucket="pqrs-adjuntos"
        path={`pqrs/${profile?.id}`}
        value={formData.adjunto_url}
        onChange={(url) => setFormData({ ...formData, adjunto_url: url })}
        className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/10"
      />

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold">
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
            className="flex-1 h-10 rounded-xl text-gray-500 dark:text-gray-400 font-bold text-xs"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          isLoading={loading}
          className="flex-[2] h-10 bg-[#182332] dark:bg-[var(--primary)] text-white dark:text-black font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          Enviar Solicitud
        </Button>
      </div>
    </form>
  );
}
