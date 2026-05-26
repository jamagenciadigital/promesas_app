import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from './Button';
import { ImageCropper } from './ImageCropper';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  bucket: 'club-logos' | 'atleta-fotos' | 'entrenador-fotos';
  path?: string;
  label?: string;
  aspect?: number;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  bucket,
  path = 'general',
  label = 'Imagen de perfil',
  aspect = 1,
  className = ''
}) => {
  const [uploading, setUploading] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [fileType, setFileType] = useState<'image/jpeg' | 'image/png'>('image/jpeg');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileType(file.type === 'image/png' ? 'image/png' : 'image/jpeg');
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (blob: Blob) => {
    setUploading(true);
    setShowCropper(false);
    setImageToCrop(null);

    try {
      const ext = fileType === 'image/png' ? 'png' : 'jpg';
      const fileName = `${path}-${Date.now()}.${ext}`;
      const fullPath = `${path}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fullPath, blob, {
          contentType: fileType,
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(fullPath);

      onChange(data.publicUrl);
    } catch (err: any) {
      console.error('Error uploading image:', err.message);
      alert('Error al subir la imagen. Por favor intente de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {label && (
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
          {label}
        </label>
      )}
      
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group">
          <div className="w-32 h-32 rounded-[32px] overflow-hidden bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center transition-all group-hover:border-[var(--primary-50)]">
            {value ? (
              <img src={value} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="text-gray-300" size={40} />
            )}
            
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="text-[var(--primary)] animate-spin" size={24} />
              </div>
            )}
            
            <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
              <Upload className="text-white" size={24} />
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </label>
          </div>
          
          {value && (
            <button
              onClick={() => onChange('')}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
              title="Eliminar imagen"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Formatos aceptados: JPG, PNG.
          </p>
          <p className="text-[9px] text-gray-400 italic">
            Se recomienda una imagen cuadrada de al menos 400x400px.
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={() => document.getElementById(`file-upload-${bucket}`)?.click()}
            className="text-[10px] font-black uppercase italic tracking-widest p-0 h-auto hover:text-[var(--primary)]"
            disabled={uploading}
          >
            {value ? 'Cambiar Imagen' : 'Seleccionar Archivo'}
          </Button>
          <input 
            id={`file-upload-${bucket}`}
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {imageToCrop && showCropper && (
        <ImageCropper
          image={imageToCrop}
          onCancel={() => {
            setShowCropper(false);
            setImageToCrop(null);
          }}
          onCropComplete={handleCropComplete}
          aspect={aspect}
          outputFormat={fileType}
        />
      )}
    </div>
  );
};
