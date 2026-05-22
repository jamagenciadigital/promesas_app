import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/Button';
import { Mail, CheckCircle2, Edit3, Eye, Key, ToggleLeft, Server, Bold, Italic, Underline, List, ListOrdered, Link2, Code } from 'lucide-react';
import type { PlantillaCorreo, TipoNotificacionCorreo } from '../../../types';

const TIPOS_NOTIFICACION: { tipo: TipoNotificacionCorreo; label: string; desc: string }[] = [
  { tipo: 'cartera', label: 'Cartera', desc: 'Notificaciones de cartera y cuentas por cobrar' },
  { tipo: 'pagos', label: 'Pagos', desc: 'Confirmación de pagos recibidos' },
  { tipo: 'agenda', label: 'Agenda', desc: 'Recordatorios y cambios en la agenda' },
  { tipo: 'entrenamientos', label: 'Entrenamientos', desc: 'Información sobre entrenamientos' },
  { tipo: 'eventos', label: 'Eventos', desc: 'Notificaciones de eventos programados' },
  { tipo: 'partidos', label: 'Partidos', desc: 'Información de partidos y resultados' },
  { tipo: 'equipos', label: 'Equipos', desc: 'Notificaciones de asignación de nuevos equipos' },
];

const PLACEHOLDER_VARS = [
  { var: '{{nombre}}', desc: 'Nombre del destinatario' },
  { var: '{{club}}', desc: 'Nombre del club' },
  { var: '{{fecha}}', desc: 'Fecha del evento' },
  { var: '{{monto}}', desc: 'Monto (para pagos/cartera)' },
  { var: '{{enlace_login}}', desc: 'Tu enlace de login personalizado' },
];

const APP_EMAIL_CONFIG = {
  resend_api_key: 're_5whxtgXY_9j8nza3AcRscadgvfVqHzGWw',
  resend_from_email: 'replay-to@fichaje.com.co',
  template_id_registro: 'bienvenido-fichaje',
  template_id_recuperacion: 'restaurar_fichaje',
  template_id_notificaciones: 'bienvenido-fichaje',
  activar_correos: true
};

const DEFAULT_TEMPLATES: Record<TipoNotificacionCorreo, { asunto: string; cuerpo: string }> = {
  cartera: {
    asunto: 'Recordatorio de Pago Pendiente - {{club}}',
    cuerpo: 'Hola {{nombre}},<br><br>Te recordamos que tienes una cuota o pago pendiente en <strong>{{club}}</strong> por un monto de <strong>{{monto}}</strong>.<br><br>Por favor, realiza el pago correspondiente lo antes posible para mantener tu cuenta al día.<br><br>Saludos,<br>El equipo de <strong>{{club}}</strong>'
  },
  pagos: {
    asunto: 'Confirmación de Pago Recibido - {{club}}',
    cuerpo: 'Hola {{nombre}},<br><br>Hemos recibido correctamente tu pago por un monto de <strong>{{monto}}</strong> en <strong>{{club}}</strong>.<br><br>Muchas gracias por tu compromiso y estar al día con tus aportes.<br><br>Saludos,<br>El equipo de <strong>{{club}}</strong>'
  },
  agenda: {
    asunto: 'Novedades en tu Agenda - {{club}}',
    cuerpo: 'Hola {{nombre}},<br><br>Te notificamos que hay novedades o actualizaciones en tu agenda en <strong>{{club}}</strong> para la fecha <strong>{{fecha}}</strong>.<br><br>Por favor, ingresa a la plataforma para revisar los detalles.<br><br>Saludos,<br>El equipo de <strong>{{club}}</strong>'
  },
  entrenamientos: {
    asunto: 'Actualización de Entrenamiento - {{club}}',
    cuerpo: 'Hola {{nombre}},<br><br>Se ha programado o modificado una sesión de entrenamiento para el día <strong>{{fecha}}</strong> en <strong>{{club}}</strong>.<br><br>¡Te esperamos en la cancha para seguir mejorando!<br><br>Saludos,<br>El equipo de <strong>{{club}}</strong>'
  },
  eventos: {
    asunto: 'Nuevo Evento Programado - {{club}}',
    cuerpo: 'Hola {{nombre}},<br><br>Queremos invitarte al evento programado para el día <strong>{{fecha}}</strong> organizado por <strong>{{club}}</strong>.<br><br>¡Esperamos contar con tu valiosa presencia! Revisa los detalles en la aplicación.<br><br>Saludos,<br>El equipo de <strong>{{club}}</strong>'
  },
  partidos: {
    asunto: 'Convocatoria e Información de Partido - {{club}}',
    cuerpo: 'Hola {{nombre}},<br><br>Te informamos que hay novedades y detalles sobre el próximo partido de <strong>{{club}}</strong> programado para la fecha <strong>{{fecha}}</strong>.<br><br>Revisa la aplicación para ver la convocatoria oficial y los detalles del encuentro.<br><br>Saludos,<br>El equipo de <strong>{{club}}</strong>'
  },
  equipos: {
    asunto: 'Asignación de Nuevo Equipo - {{club}}',
    cuerpo: 'Hola {{nombre}},<br><br>El <strong>{{club}}</strong> te ha asignado un nuevo equipo, ingresa y valida en tu perfil.<br><br>Saludos,<br>El equipo de <strong>{{club}}</strong>'
  }
};

export default function NotificacionesTab() {
  const { profile } = useAuth();
  const [plantillas, setPlantillas] = useState<PlantillaCorreo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoNotificacionCorreo | null>(null);
  const [editForm, setEditForm] = useState({ asunto: '', cuerpo: '' });
  const [previewTipo, setPreviewTipo] = useState<TipoNotificacionCorreo | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState<TipoNotificacionCorreo | null>(null);
  const cuerpoRef = useRef<HTMLTextAreaElement>(null);

  const wrapTag = useCallback((before: string, after: string) => {
    const ta = cuerpoRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = editForm.cuerpo.substring(start, end) || before.trim().replace('<', '');
    const newText = editForm.cuerpo.substring(0, start) + before + selected + after + editForm.cuerpo.substring(end);
    setEditForm({ ...editForm, cuerpo: newText });
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  }, [editForm]);

  const wrapList = useCallback((ordered: boolean) => {
    const tag = ordered ? 'ol' : 'ul';
    const lines = `\n<${tag}>\n  <li>Item</li>\n  <li>Item</li>\n</${tag}>\n`;
    const ta = cuerpoRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const newText = editForm.cuerpo.substring(0, pos) + lines + editForm.cuerpo.substring(ta.selectionEnd);
    setEditForm({ ...editForm, cuerpo: newText });
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(pos + lines.length, pos + lines.length);
    }, 0);
  }, [editForm]);

  const wrapLink = useCallback(() => {
    const url = window.prompt('URL del enlace:', 'https://');
    if (!url) return;
    const ta = cuerpoRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = editForm.cuerpo.substring(start, end) || 'enlace';
    const link = `<a href="${url}">${selected}</a>`;
    const newText = editForm.cuerpo.substring(0, start) + link + editForm.cuerpo.substring(end);
    setEditForm({ ...editForm, cuerpo: newText });
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + link.length, start + link.length);
    }, 0);
  }, [editForm]);

  const [emailConfig, setEmailConfig] = useState({
    resend_api_key: '',
    resend_from_email: '',
    template_id_registro: '',
    template_id_recuperacion: '',
    template_id_notificaciones: '',
    activar_correos: false
  });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const isUsingAppDefaults = !emailConfig.resend_api_key || !emailConfig.resend_from_email;

  useEffect(() => {
    if (profile?.club_id) {
      fetchPlantillas();
      fetchEmailConfig();
    }
  }, [profile]);

  const fetchEmailConfig = async () => {
    if (!profile?.club_id) return;
    try {
      setLoadingConfig(true);
      const { data, error } = await supabase
        .from('clubes')
        .select('resend_api_key, resend_from_email, template_id_registro, template_id_recuperacion, template_id_notificaciones, activar_correos')
        .eq('id', profile.club_id)
        .single();

      if (error) throw error;
      if (data) {
        setEmailConfig({
          resend_api_key: data.resend_api_key || '',
          resend_from_email: data.resend_from_email || '',
          template_id_registro: data.template_id_registro || '',
          template_id_recuperacion: data.template_id_recuperacion || '',
          template_id_notificaciones: data.template_id_notificaciones || '',
          activar_correos: data.activar_correos || false
        });
      }
    } catch (err: any) {
      console.error("Error fetching email config:", err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.club_id) return;

    setSavingConfig(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase
        .from('clubes')
        .update({
          resend_api_key: emailConfig.resend_api_key || null,
          resend_from_email: emailConfig.resend_from_email || null,
          template_id_registro: emailConfig.template_id_registro || null,
          template_id_recuperacion: emailConfig.template_id_recuperacion || null,
          template_id_notificaciones: emailConfig.template_id_notificaciones || null,
          activar_correos: emailConfig.activar_correos
        })
        .eq('id', profile.club_id);

      if (error) throw error;
      setSuccessMsg('Configuración de correo guardada');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar configuración');
    } finally {
      setSavingConfig(false);
    }
  };

  const fetchPlantillas = async () => {
    if (!profile?.club_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('plantillas_correo')
        .select('*')
        .eq('club_id', profile.club_id);

      if (error) throw error;
      setPlantillas(data || []);
    } catch (err: any) {
      console.error("Error fetching plantillas:", err);
    } finally {
      setLoading(false);
    }
  };

  const getPlantilla = (tipo: TipoNotificacionCorreo): PlantillaCorreo | undefined => {
    return plantillas.find(p => p.tipo === tipo);
  };

  const openEditor = (tipo: TipoNotificacionCorreo) => {
    const existing = getPlantilla(tipo);
    const def = DEFAULT_TEMPLATES[tipo] || { asunto: '', cuerpo: '' };
    setEditForm({
      asunto: existing?.asunto || def.asunto,
      cuerpo: existing?.cuerpo || def.cuerpo
    });
    setEditingTipo(tipo);
    setPreviewTipo(null);
  };

  const handleSavePlantilla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.club_id || !editingTipo) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const existing = getPlantilla(editingTipo);
      const payload = {
        club_id: profile.club_id,
        tipo: editingTipo,
        asunto: editForm.asunto,
        cuerpo: editForm.cuerpo,
        activo: true
      };

      if (existing) {
        const { error } = await supabase
          .from('plantillas_correo')
          .update({ asunto: editForm.asunto, cuerpo: editForm.cuerpo, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('plantillas_correo')
          .insert(payload);

        if (error) throw error;
      }

      setSuccessMsg(`Plantilla "${TIPOS_NOTIFICACION.find(t => t.tipo === editingTipo)?.label}" guardada`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchPlantillas();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (tipo: TipoNotificacionCorreo, plantilla?: PlantillaCorreo) => {
    try {
      if (plantilla) {
        const { error } = await supabase
          .from('plantillas_correo')
          .update({ activo: !plantilla.activo, updated_at: new Date().toISOString() })
          .eq('id', plantilla.id);

        if (error) throw error;
      } else {
        const def = DEFAULT_TEMPLATES[tipo];
        const payload = {
          club_id: profile?.club_id,
          tipo,
          asunto: def.asunto,
          cuerpo: def.cuerpo,
          activo: false
        };
        const { error } = await supabase
          .from('plantillas_correo')
          .insert(payload);

        if (error) throw error;
      }
      await fetchPlantillas();
    } catch (err: any) {
      console.error("Error toggling plantilla:", err);
    }
  };

  const handleSendTest = async (tipo: TipoNotificacionCorreo) => {
    if (!profile?.club_id || !profile?.email) return;
    setSendingTest(tipo);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: profile.email,
          tipo,
          club_id: profile.club_id,
          variables: {
            nombre: profile.nombre || 'Admin Test',
            club: 'Mi Club',
            fecha: new Date().toLocaleDateString('es-CO'),
            monto: '$50,000'
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Error al enviar');
      setSuccessMsg(`Correo de prueba enviado a ${profile.email}`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingTest(null);
    }
  };

  if (loading || loadingConfig) {
    return <div className="p-8 text-center text-gray-500">Cargando configuración...</div>;
  }

  const previewCuerpo = (cuerpo: string) => {
    let html = cuerpo
      .replace(/\{\{nombre\}\}/g, 'Juan Pérez')
      .replace(/\{\{club\}\}/g, profile?.club_id || 'Club')
      .replace(/\{\{fecha\}\}/g, new Date().toLocaleDateString('es-CO'))
      .replace(/\{\{monto\}\}/g, '$50,000')
      .replace(/\{\{enlace_login\}\}/g, `<a href="${window.location.origin}/login?club=${profile?.club_id || ''}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: bold;">${window.location.origin}/login?club=${profile?.club_id || 'ID_CLUB'}</a>`);
    if (!html.includes('<')) {
      html = html.replace(/\n/g, '<br>');
    }
    return html;
  };

  return (
    <div className="p-[1.2rem] space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Mail className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-[#182332] tracking-tight">Notificaciones por Correo</h2>
      </div>
      <p className="text-sm text-gray-400 mt-1">
        Configura la conexión con Resend y personaliza las plantillas de correo de tu club.
      </p>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <p className="text-sm font-medium text-green-700">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Conexión de Correo */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Server className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#182332] uppercase tracking-wider">Conexión de Correo</h3>
            <p className="text-sm text-gray-400 mt-1">API Key de Resend y configuración de envío</p>
          </div>
        </div>

        {isUsingAppDefaults && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Server className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Usando Configuración de Fichaje (Por defecto)</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Tu club no ha configurado credenciales propias de Resend. El sistema utilizará la cuenta por defecto de Fichaje para enviar las notificaciones y los correos del sistema de manera automática.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Resend API Key</label>
              <input
                type="password"
                value={emailConfig.resend_api_key}
                onChange={e => setEmailConfig({ ...emailConfig, resend_api_key: e.target.value })}
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-club-primary focus:border-transparent transition-all"
                placeholder={APP_EMAIL_CONFIG.resend_api_key ? "re_5whx...VqHzGWw (Por defecto)" : "re_..."}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">From Email</label>
              <input
                type="email"
                value={emailConfig.resend_from_email}
                onChange={e => setEmailConfig({ ...emailConfig, resend_from_email: e.target.value })}
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-club-primary focus:border-transparent transition-all"
                placeholder={APP_EMAIL_CONFIG.resend_from_email ? `${APP_EMAIL_CONFIG.resend_from_email} (Por defecto)` : "notificaciones@tudominio.com"}
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">IDs de Templates en Resend</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Template Bienvenida / Registro
                </label>
                <input
                  type="text"
                  value={emailConfig.template_id_registro}
                  onChange={e => setEmailConfig({ ...emailConfig, template_id_registro: e.target.value })}
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-club-primary focus:border-transparent transition-all font-mono text-xs"
                  placeholder={APP_EMAIL_CONFIG.template_id_registro ? `${APP_EMAIL_CONFIG.template_id_registro} (Por defecto)` : "re_..."}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Template Recuperación Contraseña
                </label>
                <input
                  type="text"
                  value={emailConfig.template_id_recuperacion}
                  onChange={e => setEmailConfig({ ...emailConfig, template_id_recuperacion: e.target.value })}
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-club-primary focus:border-transparent transition-all font-mono text-xs"
                  placeholder={APP_EMAIL_CONFIG.template_id_recuperacion ? `${APP_EMAIL_CONFIG.template_id_recuperacion} (Por defecto)` : "re_..."}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Template Notificaciones
                </label>
                <input
                  type="text"
                  value={emailConfig.template_id_notificaciones}
                  onChange={e => setEmailConfig({ ...emailConfig, template_id_notificaciones: e.target.value })}
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-club-primary focus:border-transparent transition-all font-mono text-xs"
                  placeholder={APP_EMAIL_CONFIG.template_id_notificaciones ? `${APP_EMAIL_CONFIG.template_id_notificaciones} (Por defecto)` : "re_..."}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  checked={isUsingAppDefaults ? true : emailConfig.activar_correos}
                  disabled={isUsingAppDefaults}
                  onChange={e => !isUsingAppDefaults && setEmailConfig({ ...emailConfig, activar_correos: e.target.checked })}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${isUsingAppDefaults ? 'opacity-60 cursor-not-allowed' : ''}`}></div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Activar envío de correos</span>
                <p className="text-xs text-gray-400">
                  {isUsingAppDefaults 
                    ? "Activo por defecto usando la cuenta del aplicativo Fichaje" 
                    : "Los correos solo se enviarán si esta opción está activa"
                  }
                </p>
              </div>
            </label>
            <Button
              type="submit"
              isLoading={savingConfig}
              className="px-6 h-12 rounded-xl bg-black text-white font-bold shadow-sm hover:bg-black/90 transition-all text-sm"
            >
              Guardar Conexión
            </Button>
          </div>
        </form>
      </div>

      {/* Plantillas de Cuerpo (Notificaciones) */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Edit3 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#182332] uppercase tracking-wider">Plantillas de Contenido</h3>
            <p className="text-sm text-gray-400 mt-1">Personaliza el cuerpo de cada tipo de notificación</p>
          </div>
        </div>

        <div className="space-y-3">
          {TIPOS_NOTIFICACION.map(({ tipo, label, desc }) => {
            const plantilla = getPlantilla(tipo);
            const isEditing = editingTipo === tipo;
            const fallbackTemplate = DEFAULT_TEMPLATES[tipo];

            return (
              <div key={tipo} className={`border rounded-2xl transition-all ${isEditing ? 'border-purple-300 bg-purple-50/30' : 'border-gray-200'}`}>
                {!isEditing ? (
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${(!plantilla || plantilla.activo !== false) ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                        {label.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{label}</h3>
                          {!plantilla && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                              Predeterminada
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{desc}</p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                          {plantilla?.cuerpo 
                            ? plantilla.cuerpo.replace(/<[^>]*>/g, '').substring(0, 80) + (plantilla.cuerpo.length > 80 ? '...' : '')
                            : (fallbackTemplate?.cuerpo || '').replace(/<[^>]*>/g, '').substring(0, 80) + ((fallbackTemplate?.cuerpo || '').length > 80 ? '...' : '')
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewTipo(previewTipo === tipo ? null : tipo)}
                        className="p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-all"
                        title="Vista previa"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openEditor(tipo)}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                        title="Editar plantilla"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleSendTest(tipo)}
                        disabled={sendingTest === tipo}
                        className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-40"
                        title="Enviar correo de prueba"
                      >
                        {sendingTest === tipo ? (
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <Mail size={16} />
                        )}
                      </button>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={plantilla ? plantilla.activo : true}
                          onChange={() => toggleActivo(tipo, plantilla)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSavePlantilla} className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{label}</h3>
                      <span className="text-xs text-gray-400">Editando plantilla</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Asunto del correo</label>
                      <input
                        type="text"
                        value={editForm.asunto}
                        onChange={e => setEditForm({ ...editForm, asunto: e.target.value })}
                        className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-club-primary focus:border-transparent transition-all"
                        placeholder="Ej: Notificación de pago - {{club}}"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Cuerpo del correo</label>
                      <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-club-primary">
                        <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
                          <button type="button" onClick={() => wrapTag('<strong>', '</strong>')} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-all" title="Negrita"><Bold size={15} /></button>
                          <button type="button" onClick={() => wrapTag('<em>', '</em>')} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-all" title="Cursiva"><Italic size={15} /></button>
                          <button type="button" onClick={() => wrapTag('<u>', '</u>')} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-all" title="Subrayado"><Underline size={15} /></button>
                          <span className="w-px h-5 bg-gray-200 mx-1" />
                          <button type="button" onClick={() => wrapList(false)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-all" title="Lista viñetas"><List size={15} /></button>
                          <button type="button" onClick={() => wrapList(true)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-all" title="Lista numerada"><ListOrdered size={15} /></button>
                          <span className="w-px h-5 bg-gray-200 mx-1" />
                          <button type="button" onClick={wrapLink} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-all" title="Insertar enlace"><Link2 size={15} /></button>
                        </div>
                        <textarea
                          ref={cuerpoRef}
                          value={editForm.cuerpo}
                          onChange={e => setEditForm({ ...editForm, cuerpo: e.target.value })}
                          className="w-full bg-gray-50 px-4 py-3 text-sm outline-none text-gray-900 placeholder-gray-400 resize-y h-24 font-mono"
                          placeholder="Escribe el contenido del correo. Usa {{variables}} para personalizar."
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                      <span className="font-medium text-gray-600">Variables disponibles:</span>
                      {PLACEHOLDER_VARS.map(v => (
                        <code key={v.var} className="text-purple-600 font-mono" title={v.desc}>{v.var}</code>
                      ))}
                    </div>

                    {editForm.cuerpo && (
                      <div className="bg-white border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye size={14} className="text-gray-400" />
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Vista previa</span>
                        </div>
                        <div className="text-sm text-gray-700 [&_a]:text-purple-600 [&_a]:underline [&_strong]:font-semibold" dangerouslySetInnerHTML={{ __html: previewCuerpo(editForm.cuerpo) }} />
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => { setEditingTipo(null); setPreviewTipo(null); }}
                        className="px-5 h-10 rounded-xl text-sm"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        isLoading={saving}
                        className="px-6 h-12 rounded-xl bg-black text-white font-bold shadow-sm hover:bg-black/90 transition-all text-sm"
                      >
                        Guardar Plantilla
                      </Button>
                    </div>
                  </form>
                )}

                {previewTipo === tipo && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                    <div className="max-w-lg mx-auto bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-gray-100 px-5 py-3 border-b border-gray-200">
                        <p className="text-xs font-semibold text-gray-500">
                          {plantilla?.asunto || fallbackTemplate?.asunto || '(Sin asunto)'}
                        </p>
                      </div>
                      <div className="p-5 text-sm text-gray-700 [&_a]:text-purple-600 [&_a]:underline [&_strong]:font-semibold" dangerouslySetInnerHTML={{ __html: previewCuerpo(plantilla?.cuerpo || fallbackTemplate?.cuerpo || '') }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
