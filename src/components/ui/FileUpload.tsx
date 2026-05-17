import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from './Button';
import { Upload, X, Loader2, FileText, CheckCircle2 } from 'lucide-react';

interface FileUploadProps {
  value?: string;
  onChange: (url: string) => void;
  bucket: 'deportista-documentos' | 'club-logos' | 'atleta-fotos' | 'comprobantes-reserva' | 'pqrs-adjuntos';
  path?: string;
  label?: string;
  accept?: string;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  value,
  onChange,
  bucket,
  path = 'general',
  label = 'Documento',
  accept = '.pdf,image/*',
  className = ''
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputId = `file-upload-${Math.random().toString(36).substr(2, 9)}`;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación de tamaño (ej: 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo es demasiado grande (máx 5MB)');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const cleanPath = path.replace(/[^a-zA-Z0-9]/g, '-');
      const fileName = `${cleanPath}-${Date.now()}.${fileExt}`;
      const fullPath = `${cleanPath}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fullPath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(fullPath);

      if (!data?.publicUrl) throw new Error('No se pudo generar la URL pública');
      
      onChange(data.publicUrl);
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(err.message || 'Error al procesar la subida');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between px-1">
        {label && (
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {label}
          </label>
        )}
        {value && (
          <a href={value} target="_blank" rel="noreferrer" className="text-[9px] font-black text-[#CCFF00] uppercase underline italic">
            Ver Actual
          </a>
        )}
      </div>
      
      <div className="relative">
        <div className={`flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-[#111215] border-2 transition-all ${
          error ? 'border-red-500/50 bg-red-50/5' : 
          value ? 'border-emerald-500/20 bg-emerald-50/10' : 'border-dashed border-gray-200 dark:border-white/10'
        }`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`p-2 rounded-xl ${
              error ? 'bg-red-500 text-white' : 
              value ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-400'
            }`}>
              {uploading ? <Loader2 className="animate-spin" size={18} /> : 
               error ? <X size={18} /> :
               (value ? <CheckCircle2 size={18} /> : <FileText size={18} />)}
            </div>
            <div className="flex-1 min-w-0 text-left">
               {uploading ? (
                 <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest animate-pulse">Subiendo...</p>
               ) : error ? (
                 <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest truncate">{error}</p>
               ) : value ? (
                 <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest truncate">Cargado Correctamente</p>
               ) : (
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Esperando archivo...</p>
               )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setError(null);
                }}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Eliminar archivo"
              >
                <X size={18} />
              </button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => document.getElementById(fileInputId)?.click()}
              className="h-10 px-4 rounded-xl bg-black dark:bg-white text-[#CCFF00] dark:text-black font-black uppercase text-[9px] tracking-widest italic hover:scale-105 transition-transform"
              disabled={uploading}
            >
              {value ? 'Cambiar' : (error ? 'Reintentar' : 'Subir')}
            </Button>
          </div>
        </div>
        <input 
          id={fileInputId}
          type="file" 
          className="hidden" 
          accept={accept} 
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </div>
    </div>
  );
};
