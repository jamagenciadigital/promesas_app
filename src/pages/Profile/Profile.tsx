import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { UserProfile } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { User, Mail, Phone, Calendar, HeartPulse, ShieldCheck, CheckCircle2, Hash } from 'lucide-react';

export default function Profile() {
  const { profile, user } = useAuth();
  
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    nombre: '',
    apellido: '',
    documento: '',
    telefono: '',
    fecha_nacimiento: '',
    contacto_emergencia_nombre: '',
    contacto_emergencia_telefono: '',
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos actuales del perfil cuando el componente se monta o cuando el perfil se actualiza
  useEffect(() => {
    if (profile) {
      setFormData({
        nombre: profile.nombre || '',
        apellido: profile.apellido || '',
        documento: profile.documento || '',
        telefono: profile.telefono || '',
        fecha_nacimiento: profile.fecha_nacimiento || '',
        contacto_emergencia_nombre: profile.contacto_emergencia_nombre || '',
        contacto_emergencia_telefono: profile.contacto_emergencia_telefono || '',
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setSuccessMsg(null);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('perfiles')
        .update({
          nombre: formData.nombre,
          apellido: formData.apellido,
          documento: formData.documento,
          telefono: formData.telefono,
          fecha_nacimiento: formData.fecha_nacimiento || null, // nullify empty dates
          contacto_emergencia_nombre: formData.contacto_emergencia_nombre,
          contacto_emergencia_telefono: formData.contacto_emergencia_telefono,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Sincronizar datos con la ficha del deportista si el usuario es un padre
      if (profile?.rol === 'padre' && profile?.deportista_id) {
         await supabase.from('deportistas').update({
            tutor_nombre: formData.nombre,
            tutor_apellidos: formData.apellido,
            tutor_numero_documento: formData.documento
         }).eq('id', profile.deportista_id);
      }

      // Opción: Idealmente deberíamos forzar a AuthContext a recargar, 
      // pero para UX inmediata mostramos la alerta.
      setSuccessMsg('Tu perfil ha sido actualizado correctamente.');
      
      // Limpiar mensaje después de unos segundos
      setTimeout(() => {
        setSuccessMsg(null);
      }, 5000);

    } catch (err: any) {
      setError(err.message || 'Error al actualizar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  const formatRole = (role?: string) => {
    if (!role) return 'Usuario';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header Profile Section */}
      <div className="bg-white dark:bg-[#16171b] shadow-sm rounded-2xl p-6 border border-gray-100 dark:border-[#26282e]">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-[#f97316] text-white flex items-center justify-center font-bold text-3xl shadow-lg ring-4 ring-orange-50 dark:ring-orange-500/10">
            {formData.nombre?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 text-center sm:text-left pt-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {formData.nombre} {formData.apellido}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{user?.email}</p>
            
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200/50 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-sm font-semibold">{formatRole(profile?.rol)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-green-800 dark:text-green-400">¡Actualizado!</h4>
            <p className="text-sm text-green-700 dark:text-green-500/80 mt-1">{successMsg}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <div className="w-5 h-5 text-red-500 mt-0.5 font-bold">!</div>
          <div>
            <h4 className="text-sm font-semibold text-red-800 dark:text-red-400">Error</h4>
            <p className="text-sm text-red-700 dark:text-red-500/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Información Personal */}
        <div className="bg-white dark:bg-[#16171b] shadow-sm rounded-2xl overflow-hidden border border-gray-100 dark:border-[#26282e]">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-[#26282e] bg-gray-50/50 dark:bg-[#111215]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-gray-900 dark:text-[#daff01]" />
              Información Personal
            </h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nombre"
              name="nombre"
              value={formData.nombre || ''}
              onChange={handleChange}
              placeholder="Tus nombres"
              icon={<User className="h-4 w-4" />}
            />
            
            <Input
              label="Apellidos"
              name="apellido"
              value={formData.apellido || ''}
              onChange={handleChange}
              placeholder="Tus apellidos"
              icon={<User className="h-4 w-4" />}
            />

            <Input
              label="Documento de Identidad"
              name="documento"
              value={formData.documento || ''}
              onChange={handleChange}
              placeholder="NIT, CC o Pasaporte"
              icon={<Hash className="h-4 w-4" />}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full pl-10 rounded-xl border border-gray-200 dark:border-[#26282e] bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 shadow-sm px-4 py-3 cursor-not-allowed text-base md:text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500 font-medium">El correo electrónico no puede modificarse.</p>
            </div>

            <Input
              label="Teléfono"
              type="tel"
              name="telefono"
              value={formData.telefono || ''}
              onChange={handleChange}
              placeholder="+1 234 567 890"
              icon={<Phone className="h-4 w-4" />}
            />

            <Input
              label="Fecha de Nacimiento"
              type="date"
              name="fecha_nacimiento"
              value={formData.fecha_nacimiento || ''}
              onChange={handleChange}
              icon={<Calendar className="h-4 w-4" />}
            />
          </div>
        </div>

        {/* Contacto de Emergencia */}
        <div className="bg-white dark:bg-[#16171b] shadow-sm rounded-2xl overflow-hidden border border-gray-100 dark:border-[#26282e]">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-[#26282e] bg-gray-50/50 dark:bg-[#111215]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-red-500 dark:text-red-400" />
              Contacto de Emergencia
            </h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nombre del Contacto"
              name="contacto_emergencia_nombre"
              value={formData.contacto_emergencia_nombre || ''}
              onChange={handleChange}
              placeholder="Nombre completo"
              icon={<User className="h-4 w-4" />}
            />

            <Input
              label="Teléfono del Contacto"
              type="tel"
              name="contacto_emergencia_telefono"
              value={formData.contacto_emergencia_telefono || ''}
              onChange={handleChange}
              placeholder="+1 234 567 890"
              icon={<Phone className="h-4 w-4" />}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            type="submit" 
            isLoading={loading}
            className="px-8 py-2.5 rounded-full bg-gray-900 hover:bg-gray-800 dark:bg-[#daff01] dark:hover:bg-[#cbe600] text-white dark:text-gray-900 font-semibold border-0"
          >
            Guardar Cambios
          </Button>
        </div>

      </form>
    </div>
  );
}
