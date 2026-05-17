import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { Club } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ImageUpload } from '../../../components/ui/ImageUpload';
import { CheckCircle2, Building2, Upload, CalendarDays, RefreshCw } from 'lucide-react';

export default function GeneralInfoTab() {
  const { profile } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    email_corporativo: '',
    telefono: '',
    direccion: '',
    pais: '',
    ciudad: '',
    website: '',
    color_principal: '#E53E13',
    logo_url: '',
    temporada_inicio: '',
    temporada_fin: '',
    nit: ''
  });

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getDirectImageUrl = (url: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.includes('drive.google.com')) {
      const id = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
      if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    }
    if (trimmed.includes('dropbox.com')) {
      return trimmed.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/\?dl=\d/, '');
    }
    return trimmed;
  };

  useEffect(() => {
    async function fetchClubData() {
      if (!profile?.club_id) {
        setLoadingConfig(false);
        return;
      }
      try {
        setLoadingConfig(true);
        const { data, error } = await supabase.from('clubes').select('*').eq('id', profile.club_id).single();
        if (error) throw error;
        if (data) {
          setClub(data as Club);
          setFormData({
            nombre: data.nombre || '',
            descripcion: data.descripcion || '',
            email_corporativo: data.email_corporativo || '',
            telefono: data.telefono || '',
            direccion: data.direccion || '',
            pais: data.pais || '',
            ciudad: data.ciudad || '',
            website: data.website || '',
            color_principal: data.color_principal || '#E53E13',
            logo_url: data.logo_url || '',
            temporada_inicio: data.temporada_inicio || '',
            temporada_fin: data.temporada_fin || '',
            nit: data.nit || ''
          });
        }
      } catch (err: any) {
        console.error("Error fetching club:", err);
      } finally {
        setLoadingConfig(false);
      }
    }
    fetchClubData();
  }, [profile?.club_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const syncCartera = async (newStart: string, newEnd: string) => {
    if (!profile?.club_id) return;
    setSyncing(true);
    try {
      // 1. Obtener todos los deportistas con sus planes
      const { data: deportistas, error: dError } = await supabase
        .from('deportistas')
        .select('id, plan_id')
        .eq('club_id', profile.club_id)
        .not('plan_id', 'is', null);

      if (dError) throw dError;

      // 2. Obtener detalles de los planes para saber los periodos
      const { data: planes, error: pError } = await supabase
        .from('planes_club')
        .select('*')
        .eq('club_id', profile.club_id);

      if (pError) throw pError;

      for (const dep of (deportistas || [])) {
        const plan = planes?.find(p => p.id === dep.plan_id);
        if (!plan || plan.periodo === 'Único') continue;

        // A. Eliminar cobros PENDIENTES fuera del nuevo rango para este plan
        await supabase
          .from('cartera')
          .delete()
          .eq('deportista_id', dep.id)
          .eq('plan_id', plan.id)
          .eq('estado', 'pendiente')
          .or(`fecha_vencimiento.lt.${newStart},fecha_vencimiento.gt.${newEnd}`);

        // B. Generar cobros faltantes en el nuevo rango
        let current = new Date(newStart + 'T00:00:00');
        const end = new Date(newEnd + 'T23:59:59');
        let mesesSalto = plan.periodo === '3 meses' ? 3 : plan.periodo === '6 meses' ? 6 : plan.periodo === '12 meses' ? 12 : 1;

        const newCharges = [];
        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0];
          
          // Verificar si ya existe un cobro para este mes/fecha
          const { data: existing } = await supabase
            .from('cartera')
            .select('id')
            .eq('deportista_id', dep.id)
            .eq('plan_id', plan.id)
            .eq('fecha_vencimiento', dateStr)
            .single();

          if (!existing) {
            const monthName = current.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
            newCharges.push({
              club_id: profile.club_id,
              deportista_id: dep.id,
              titulo: `${plan.nombre.toUpperCase()} - ${monthName} ${current.getFullYear()}`,
              monto: plan.precio,
              fecha_vencimiento: dateStr,
              estado: 'pendiente',
              plan_id: plan.id
            });
          }
          current.setMonth(current.getMonth() + mesesSalto);
        }

        if (newCharges.length > 0) {
          await supabase.from('cartera').insert(newCharges);
        }
      }
    } catch (err) {
      console.error("Error syncing cartera:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.club_id) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // Detectar si cambiaron las fechas
      const datesChanged = formData.temporada_inicio !== club?.temporada_inicio || 
                           formData.temporada_fin !== club?.temporada_fin;

      const { error: updateError } = await supabase
        .from('clubes')
        .update({
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          email_corporativo: formData.email_corporativo,
          telefono: formData.telefono,
          direccion: formData.direccion,
          pais: formData.pais,
          ciudad: formData.ciudad,
          website: formData.website,
          color_principal: formData.color_principal,
          logo_url: formData.logo_url,
          temporada_inicio: formData.temporada_inicio || null,
          temporada_fin: formData.temporada_fin || null,
          nit: formData.nit || null
        })
        .eq('id', profile.club_id);

      if (updateError) throw updateError;

      if (datesChanged && formData.temporada_inicio && formData.temporada_fin) {
        setSuccessMsg('Guardando y sincronizando cartera de todos los deportistas...');
        await syncCartera(formData.temporada_inicio, formData.temporada_fin);
        setSuccessMsg('Configuración actualizada y Cartera sincronizada con éxito.');
      } else {
        setSuccessMsg('Configuración actualizada correctamente.');
      }
      
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  if (!profile?.club_id) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center">
        <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-full mb-4">
          <Building2 className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic">Perímetro no configurado</h3>
        <p className="text-sm text-gray-500 max-w-xs mt-2 italic">Su usuario no tiene un club asociado. Contacte con el administrador de la plataforma.</p>
      </div>
    );
  }

  if (loadingConfig) return <div className="p-8 text-center text-gray-500 italic">Cargando configuración...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Building2 className="w-6 h-6 text-gray-900 dark:text-[#daff01]" />
        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Configuración del Club</h2>
      </div>

      {successMsg && (
        <div className="bg-[#CCFF00]/10 border border-[#CCFF00]/20 rounded-2xl p-4 flex items-center gap-3 mb-6">
          {syncing ? <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic">{successMsg}</p>
        </div>
      )}

      {error && <div className="bg-red-50 p-4 rounded-2xl text-red-600 text-xs font-bold mb-6 italic">{error}</div>}

      <form onSubmit={handleSave} className="space-y-10 pb-20">
        <div className="bg-black p-8 rounded-[40px] border border-white/5 space-y-6">
            <div className="flex items-center gap-2">
                <CalendarDays className="text-[#CCFF00]" size={20} />
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] italic">Vigencia de la Temporada</h3>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">Nota: Si cambias estas fechas, el sistema sincronizará automáticamente la cartera de todos los jugadores activos.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                   label="Fecha Inicio"
                   type="date"
                   name="temporada_inicio"
                   value={formData.temporada_inicio}
                   onChange={(e) => handleChange(e as any)}
                   className="bg-white/5 border-white/10 text-white"
                />
                <Input 
                   label="Fecha Fin"
                   type="date"
                   name="temporada_fin"
                   value={formData.temporada_fin}
                   onChange={(e) => handleChange(e as any)}
                   className="bg-white/5 border-white/10 text-white"
                />
            </div>
        </div>

        {/* Identidad Visual */}
        <section className="space-y-6 bg-white dark:bg-[#1e293b]/40 border border-gray-100 dark:border-white/5 p-8 rounded-[40px] shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 italic mb-4">Identidad Visual</h3>
            
            <div className="flex flex-col xl:flex-row gap-10 items-center xl:items-start">
                <div className="flex flex-col items-center gap-4">
                    <ImageUpload 
                        value={formData.logo_url}
                        onChange={(url) => setFormData({ ...formData, logo_url: url })}
                        bucket="club-logos"
                        path={profile.club_id}
                        label="Logo Oficial del Club"
                        className="w-full"
                    />
                </div>

                <div className="flex-1 w-full space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Input 
                            label="Nombre del Club" 
                            name="nombre" 
                            value={formData.nombre} 
                            onChange={(e) => handleChange(e as any)} 
                            className="bg-gray-50 dark:bg-white/5 h-14" 
                        />
                        <Input 
                            label="NIT / Identificación" 
                            name="nit" 
                            value={formData.nit} 
                            onChange={(e) => handleChange(e as any)} 
                            className="bg-gray-50 dark:bg-white/5 h-14" 
                            placeholder="Ej: 900.123.456-7"
                        />
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Color Principal</label>
                            <div className="flex gap-4 items-center">
                                <input 
                                    type="color" 
                                    name="color_principal"
                                    value={formData.color_principal} 
                                    onChange={(e) => setFormData({...formData, color_principal: e.target.value})}
                                    className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer"
                                />
                                <span className="text-sm font-bold font-mono">{formData.color_principal.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Descripción / Slogan</label>
                        <textarea 
                            name="descripcion"
                            value={formData.descripcion}
                            onChange={(e) => handleChange(e as any)}
                            className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl p-4 text-sm outline-none min-h-[100px] resize-none"
                            placeholder="Escribe una breve descripción del club..."
                        />
                    </div>
                </div>
            </div>
        </section>

        {/* Contacto y Ubicación */}
        <section className="space-y-6 bg-white dark:bg-[#1e293b]/40 border border-gray-100 dark:border-white/5 p-8 rounded-[40px] shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 italic mb-4">Contacto y Ubicación</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <Input label="Email Corporativo" type="email" name="email_corporativo" value={formData.email_corporativo} onChange={(e) => handleChange(e as any)} className="bg-gray-50 dark:bg-white/5 h-14" />
                <Input label="Teléfono / WhatsApp" name="telefono" value={formData.telefono} onChange={(e) => handleChange(e as any)} className="bg-gray-50 dark:bg-white/5 h-14" />
                <Input label="Sitio Web" name="website" value={formData.website} onChange={(e) => handleChange(e as any)} className="bg-gray-50 dark:bg-white/5 h-14" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <Input label="País" name="pais" value={formData.pais} onChange={(e) => handleChange(e as any)} className="bg-gray-50 dark:bg-white/5 h-14" />
                <Input label="Ciudad" name="ciudad" value={formData.ciudad} onChange={(e) => handleChange(e as any)} className="bg-gray-50 dark:bg-white/5 h-14" />
                <Input label="Dirección / Sede Principal" name="direccion" value={formData.direccion} onChange={(e) => handleChange(e as any)} className="bg-gray-50 dark:bg-white/5 h-14" />
            </div>
        </section>


        <div className="flex justify-end pt-8">
          <Button type="submit" isLoading={saving || syncing} className="px-12 h-14 bg-black dark:bg-[#daff01] text-white dark:text-gray-900 font-black uppercase italic tracking-widest text-xs rounded-2xl">
            {syncing ? 'Sincronizando Cartera...' : 'Actualizar Plataforma'}
          </Button>
        </div>
      </form>
    </div>
  );
}
