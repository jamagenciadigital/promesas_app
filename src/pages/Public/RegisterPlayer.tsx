import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { 
  User, Mail, Phone, MapPin, Calendar, 
  Shield, Hash, CheckCircle2, ChevronRight, 
  ArrowLeft, Info, Heart, QrCode, Wallet, PackageCheck,
  Upload, FileText, Camera, X, RefreshCw, Clock, Trophy, User as UserIcon
} from 'lucide-react';
import { COLOMBIA_DATA, COUNTRIES } from '../../utils/locations';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { FileUpload } from '../../components/ui/FileUpload';

export default function RegisterPlayer() {
  const [step, setStep] = useState<number | 'success'>(0); 
  const [loading, setLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
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
  
  const [teamInfo, setTeamInfo ] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    codigo: '',
    tipo_documento: 'tarjeta identidad',
    numero_documento: '',
    nombre_completo: '',
    apellidos: '',
    segundo_apellido: '',
    genero: 'Masculino',
    fecha_nacimiento: '',
    eps: '',
    celular_deportista: '',
    email_deportista: '',
    colegio: '',
    foto_url: '',
    tutor_nombre: '',
    tutor_apellidos: '',
    tutor_celular: '',
    tutor_email: '',
    emergencia_nombre: '',
    emergencia_celular: '',
    emergencia_email: '',
    tutor_numero_documento: '',
    pais: 'Colombia',
    departamento: '',
    municipio: '',
    barrio: '',
    direccion: '',
    url_registro_civil: '',
    url_documento_id: '',
    url_contrato: '',
    url_certificado_salud: '',
    url_carta_traspaso: '',
    viene_de_otro_club: false,
    plan_id: '',
    plan_inscripcion_id: '',
    acepta_terminos: false,
    rh: ''
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    if (codeParam) setFormData(prev => ({ ...prev, codigo: codeParam.toUpperCase() }));
  }, []);

  const nextStep = () => {
    setError(null);
    if (step === 0) validateCode();
    else if (typeof step === 'number') {
       // Validaciones estrictas por paso
       if (step === 1) {
         if (!formData.nombre_completo || !formData.apellidos || !formData.numero_documento || !formData.fecha_nacimiento || !formData.celular_deportista || !formData.email_deportista || !formData.colegio || !formData.eps) {
           setError("Por favor completa todos los campos obligatorios de tus datos personales.");
           return;
         }

         // Validación de Edad
         if (teamInfo?.edad_minima || teamInfo?.edad_maxima) {
           const birthDate = new Date(formData.fecha_nacimiento);
           const today = new Date();
           let age = today.getFullYear() - birthDate.getFullYear();
           const m = today.getMonth() - birthDate.getMonth();
           if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
             age--;
           }

           if (teamInfo.edad_minima !== null && age < teamInfo.edad_minima) {
             setError(`La edad mínima para este equipo es de ${teamInfo.edad_minima} años. El deportista tiene ${age}.`);
             return;
           }
           if (teamInfo.edad_maxima !== null && age > teamInfo.edad_maxima) {
             setError(`La edad máxima para este equipo es de ${teamInfo.edad_maxima} años. El deportista tiene ${age}.`);
             return;
           }
         }
       }
       if (step === 2) {
         if (!formData.tutor_nombre || !formData.tutor_apellidos || !formData.tutor_celular || !formData.tutor_email || !formData.tutor_numero_documento) {
           setError("Por favor completa toda la información del acudiente.");
           return;
         }
       }
       if (step === 3) {
         if (!formData.emergencia_nombre || !formData.emergencia_celular) {
           setError("Por favor completa los datos de contacto de emergencia.");
           return;
         }
       }
       if (step === 4) {
         if (!formData.departamento || !formData.municipio || !formData.barrio || !formData.direccion) {
           setError("Por favor completa tu información de ubicación residencial.");
           return;
         }
       }
       if (step === 5) {
         if (plans.some(p => p.periodo === 'Único') && !formData.plan_inscripcion_id) {
           setError("Por favor selecciona un plan de inscripción.");
           return;
         }
         if (plans.some(p => p.periodo !== 'Único') && !formData.plan_id) {
           setError("Por favor selecciona un plan de mensualidad.");
           return;
         }
       }
       if (step === 6) {
         if (!formData.acepta_terminos) {
           setError("Debes aceptar el contrato para continuar.");
           return;
         }
       }
        if (step === 7) {
          const missingDocs = [];
          if (!formData.url_registro_civil) missingDocs.push("Registro Civil");
          if (!formData.url_documento_id) missingDocs.push("Documento ID");
          if (!formData.url_contrato) missingDocs.push("Contrato");
          if (!formData.url_certificado_salud) missingDocs.push("Certificado de Salud");
          if (formData.viene_de_otro_club && !formData.url_carta_traspaso) missingDocs.push("Carta de Traspaso");

          if (missingDocs.length > 0) {
            setError(`Debes subir los documentos obligatorios: ${missingDocs.join(', ')}`);
            return;
          }
        }
       setStep(prev => (prev as number) + 1);
    }
  };

  const prevStep = () => {
    setError(null);
    if (typeof step === 'number') setStep(prev => (prev as number) - 1);
  };

  const validateCode = async () => {
    if (!formData.codigo) {
      setError("Por favor ingresa un código de equipo válido.");
      return;
    }
    try {
      setValidatingCode(true);
      setError(null);
      const { data, error: teamError } = await supabase
        .from('equipos')
        .select(`
          *, 
          club:clubes(id, nombre, nit, logo_url, qr_url, pago_instrucciones, temporada_inicio, temporada_fin, pais, plan_id, theme),
          sede:club_sedes(nombre),
          categoria:deportes_config_campos(valor),
          entrenadores:equipo_entrenadores(
            entrenador:perfiles(nombre, apellido)
          )
        `)
        .ilike('codigo', formData.codigo.trim())
        .single();

      if (teamError || !data) throw new Error("El código de equipo no existe.");
      
      // Validar límite de jugadores del plan B2B
      if (data.club?.plan_id) {
        const { data: planData } = await supabase.from('planes_suscripcion').select('limite_jugadores').eq('id', data.club.plan_id).single();
        if (planData && planData.limite_jugadores !== -1) {
           const { count, error: countError } = await supabase.from('deportistas').select('*', { count: 'exact', head: true }).eq('club_id', data.club_id);
           if (count !== null && count >= planData.limite_jugadores) {
               throw new Error("El club ha alcanzado el límite de jugadores permitidos por su plan suscrito. No es posible aceptar más registros.");
           }
        }
      }

      setTeamInfo(data);
      
      if (data.club?.pais) {
        setFormData(prev => ({ ...prev, pais: data.club.pais }));
      }
      
      const { data: plansData } = await supabase.from('planes_club').select('*').eq('club_id', data.club_id);
      setPlans(plansData || []);
      
      const inscPlans = (plansData || []).filter(p => p.periodo === 'Único');
      if (inscPlans.length === 1) setFormData(prev => ({ ...prev, plan_inscripcion_id: inscPlans[0].id }));
      
      setStep(1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setValidatingCode(false);
    }
  };





  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validación de seguridad adicional
    if (!formData.url_registro_civil || !formData.url_documento_id || !formData.url_contrato || !formData.acepta_terminos) {
      setError("Faltan documentos obligatorios o términos por aceptar.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newDeportistaId = crypto.randomUUID();

      const { error: insertError } = await supabase
        .from('deportistas')
        .insert([{
          id: newDeportistaId,
          club_id: teamInfo.club_id,
          equipo_id: teamInfo.id,
          tipo_documento: formData.tipo_documento,
          numero_documento: formData.numero_documento,
          nombre_completo: formData.nombre_completo,
          apellidos: formData.apellidos,
          segundo_apellido: formData.segundo_apellido,
          genero: formData.genero,
          fecha_nacimiento: formData.fecha_nacimiento,
          eps: formData.eps,
          celular_deportista: formData.celular_deportista,
          email_deportista: formData.email_deportista,
          colegio: formData.colegio,
          foto_url: formData.foto_url,
          tutor_nombre: formData.tutor_nombre,
          tutor_apellidos: formData.tutor_apellidos,
          tutor_celular: formData.tutor_celular,
          tutor_email: formData.tutor_email,
          emergencia_nombre: formData.emergencia_nombre,
          emergencia_celular: formData.emergencia_celular,
          emergencia_email: formData.emergencia_email,
          tutor_numero_documento: formData.tutor_numero_documento,
          rh: formData.rh || null,
          pais: formData.pais,
          departamento: formData.departamento,
          municipio: formData.municipio,
          barrio: formData.barrio,
          direccion: formData.direccion,
          url_registro_civil: formData.url_registro_civil,
          url_documento_id: formData.url_documento_id,
          url_contrato: formData.url_contrato,
          url_certificado_salud: formData.url_certificado_salud,
          url_carta_traspaso: formData.url_carta_traspaso || null,
          viene_de_otro_club: formData.viene_de_otro_club,
          plan_id: formData.plan_id || null,
          plan_inscripcion_id: formData.plan_inscripcion_id || null,
          acepta_terminos: formData.acepta_terminos,
          estado_pago: 'pendiente',
          estado: 'pendiente_validacion'
        }]);

      if (insertError) throw insertError;
      


      setStep('success');
    } catch (err: any) {
      console.error(err);
      setError(err.code === '23505' ? "Documento duplicado." : (err.message || "Error al registrar."));
    } finally {
      setLoading(false);
    }
  };

  const inscripcionPlans = plans.filter(p => p.periodo === 'Único');
  const regularPlans = plans.filter(p => p.periodo !== 'Único');

  return (
    <div className="min-h-screen bg-white flex relative overflow-hidden bg-gray-50/30 pb-20">
      {/* Visual Left Side */}
      <div className="hidden lg:block lg:w-[40%] xl:w-1/3 absolute lg:relative inset-y-0 left-0 z-0 bg-cover bg-center shadow-[10px_0_30px_rgba(0,0,0,0.5)] print:hidden" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80")' }}>
        <div className="absolute inset-0 transition-colors duration-500" 
             style={{ 
               backgroundColor: teamInfo?.club?.theme?.sidebar_bg || '#182332', 
               opacity: 0.85, 
               mixBlendMode: 'multiply' 
             }} />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <img src="/assets/LOGO-HORIZONTAL.png" className="w-auto h-16 mb-6" alt="Fichaje Logo"/>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none mb-4">Registro Oficial</h1>
          <p className="text-lg font-medium text-white/70">La plataforma #1 para la gestión de talentos deportivos.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center py-12 px-6 sm:px-12 lg:px-20 z-10 w-full overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto space-y-8">
          {step !== 'success' && (
            <div className="text-left animate-in fade-in duration-700 space-y-4">
              {teamInfo?.club && (
                <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-3xl border border-gray-100 max-w-fit">
                  {teamInfo.club.logo_url ? <img src={getDirectImageUrl(teamInfo.club.logo_url)} className="w-12 h-12 rounded-2xl object-cover" /> : <div className="w-12 h-12 rounded-2xl bg-[var(--primary-10)] flex items-center justify-center"><Shield className="w-6 h-6 text-[var(--primary)]" /></div>}
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tighter text-gray-900 leading-none">{teamInfo.club.nombre}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Club Validado</p>
                  </div>
                </div>
              )}
              {teamInfo && (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 p-6 bg-white/50 rounded-[32px] border border-gray-50 backdrop-blur-sm shadow-sm border-l-4 border-l-[var(--primary)] animate-in slide-in-from-top-4 duration-500">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">NIVEL</p>
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-3 h-3 text-[var(--primary)]" />
                      <span className="text-[10px] font-black uppercase tracking-tighter text-gray-700 italic">{teamInfo.nivel_habilidad}</span>
                    </div>
                  </div>
                  {teamInfo.categoria?.valor ? (
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">CATEGORÍA</p>
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-[var(--primary)]" />
                        <span className="text-[10px] font-black uppercase tracking-tighter text-gray-700 italic">{teamInfo.categoria.valor}</span>
                      </div>
                    </div>
                  ) : teamInfo.nombre && (
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">EQUIPO</p>
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-[var(--primary)]" />
                        <span className="text-[10px] font-black uppercase tracking-tighter text-gray-700 italic">{teamInfo.nombre}</span>
                      </div>
                    </div>
                  )}
                  {teamInfo.sede?.nombre && (
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">SEDE ENTRENAMIENTO</p>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-[var(--primary)]" />
                        <span className="text-[10px] font-black uppercase tracking-tighter text-gray-700 italic truncate max-w-[120px]">{teamInfo.sede.nombre}</span>
                      </div>
                    </div>
                  )}
                  {teamInfo.dias_entrenamiento && teamInfo.dias_entrenamiento.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">DÍAS DE ENTRENAMIENTO</p>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-[var(--primary)]" />
                        <span className="text-[10px] font-black uppercase tracking-tighter text-gray-700 italic">{teamInfo.dias_entrenamiento.join(', ')}</span>
                      </div>
                    </div>
                  )}
                  {(teamInfo.hora_inicio || teamInfo.hora_fin) && (
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">HORARIOS</p>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-[var(--primary)]" />
                        <span className="text-[10px] font-black uppercase tracking-tighter text-gray-700 italic">
                          {teamInfo.hora_inicio && teamInfo.hora_fin ? `${teamInfo.hora_inicio} - ${teamInfo.hora_fin}` : teamInfo.hora_inicio || teamInfo.hora_fin}
                        </span>
                      </div>
                    </div>
                  )}
                  {teamInfo.entrenadores && teamInfo.entrenadores.length > 0 && (
                    <div className="space-y-1 col-span-2">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">COACH ASIGNADO</p>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-[var(--primary)]" />
                        <span className="text-[10px] font-black uppercase tracking-tighter text-gray-700 italic">
                          {teamInfo.entrenadores.map((e: any) => e.entrenador ? `${e.entrenador.nombre} ${e.entrenador.apellido}` : 'Staff Deportivo').join(', ') || 'Staff Deportivo'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <h2 className="text-4xl font-black text-gray-900 uppercase italic tracking-tighter mb-2 print:hidden">
                {step === 0 ? '¡Hola Estrella!' : 
                 step === 1 ? 'Tus Datos' : 
                 step === 2 ? 'Acudiente' : 
                 step === 3 ? 'Emergencia' :
                 step === 4 ? 'Ubicación' :
                 step === 5 ? 'Planes' :
                 step === 6 ? 'Contrato' :
                 step === 7 ? 'Documentos' :
                 'Finalizar Registro'}
              </h2>
              {typeof step === 'number' && step > 0 && (
                <div className="flex gap-1 h-1 w-full max-w-xs bg-gray-100 rounded-full overflow-hidden print:hidden">
                  {[1,2,3,4,5,6,7].map(s => (
                    <div key={s} className={`flex-1 transition-all duration-500 ${step >= s ? 'bg-[var(--primary)]' : 'bg-transparent'}`}></div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 0 && (
             <div className="space-y-6">
               <div className="bg-white p-8 rounded-[40px] shadow-2xl shadow-black/5 border border-gray-50">
                 <Input label="Código del Equipo" placeholder="ABC-123" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })} className="h-16 text-2xl font-black uppercase tracking-widest text-center" icon={<Hash className="w-6 h-6" />} />
                 {error && <p className="text-red-500 text-xs font-bold mt-3 px-2 italic">{error}</p>}
                 <Button onClick={nextStep} isLoading={validatingCode} className="w-full h-16 bg-black text-[var(--primary)] font-black uppercase italic tracking-widest rounded-3xl mt-8 shadow-xl text-sm gap-2">Verificar <ChevronRight size={20} /></Button>
               </div>
             </div>
          )}

          {typeof step === 'number' && step > 0 && (
            <form onSubmit={handleRegister} className="space-y-8">
              {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl text-xs text-red-700 font-bold italic">{error}</div>}

              {step === 1 && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="flex flex-col items-center gap-6 mb-8">
                    <ImageUpload 
                      value={formData.foto_url}
                      onChange={(url) => setFormData(prev => ({ ...prev, foto_url: url }))}
                      bucket="atleta-fotos"
                      path={formData.codigo || 'registro'}
                      label="Foto de Perfil"
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5 px-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Documento</label>
                      <select required className="w-full h-14 bg-gray-50 dark:bg-white/5 rounded-2xl px-5 text-sm" value={formData.tipo_documento} onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}>
                        <option value="tarjeta identidad">Tarjeta de Identidad</option><option value="cedula">Cédula</option><option value="pasaporte">Pasaporte</option>
                      </select></div>
                    <Input label="Número" placeholder="1234..." required value={formData.numero_documento} onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })} icon={<Hash size={16}/>} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Nombres" required value={formData.nombre_completo} onChange={e => setFormData({...formData, nombre_completo: e.target.value})} icon={<User size={16}/>} />
                    <Input label="Primer Apellido" required value={formData.apellidos} onChange={e => setFormData({...formData, apellidos: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Segundo Apellido" required value={formData.segundo_apellido} onChange={e => setFormData({...formData, segundo_apellido: e.target.value})} />
                    <Input label="F. Nacimiento" type="date" required value={formData.fecha_nacimiento} onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5 px-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Género</label>
                      <select required className="w-full h-14 bg-gray-50 dark:bg-white/5 rounded-2xl px-5 text-sm" value={formData.genero} onChange={e => setFormData({...formData, genero: e.target.value})}>
                        <option value="Masculino">Masculino</option><option value="Femenino">Femenino</option>
                      </select></div>
                    <Input label="EPS / Prepagada" required value={formData.eps} onChange={e => setFormData({...formData, eps: e.target.value})} icon={<Shield size={16}/>} />
                    <div className="space-y-1.5 px-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Factor RH</label>
                      <select 
                        required 
                        className="w-full h-14 bg-gray-50 dark:bg-white/5 rounded-2xl px-5 text-sm" 
                        value={formData.rh} 
                        onChange={e => setFormData({...formData, rh: e.target.value})}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Celular Personal" required value={formData.celular_deportista} onChange={e => setFormData({...formData, celular_deportista: e.target.value})} icon={<Phone size={16}/>} />
                    <Input label="Email Personal" type="email" required value={formData.email_deportista} onChange={e => setFormData({...formData, email_deportista: e.target.value})} icon={<Mail size={16}/>} />
                  </div>
                  <Input label="Institución Educativa" required value={formData.colegio} onChange={e => setFormData({...formData, colegio: e.target.value})} icon={<PackageCheck size={16}/>} />

                  <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-[32px] border border-gray-100 dark:border-white/5">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${formData.viene_de_otro_club ? 'bg-black text-[var(--primary)]' : 'bg-white dark:bg-white/5 text-gray-400 group-hover:border-[var(--primary)] border border-transparent'}`}>
                        {formData.viene_de_otro_club ? <CheckCircle2 size={24} /> : <div className="w-6 h-6 border-2 border-current rounded-lg" />}
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={formData.viene_de_otro_club} 
                        onChange={e => setFormData({...formData, viene_de_otro_club: e.target.checked})} 
                      />
                      <div className="flex-1">
                        <p className="text-xs font-black uppercase tracking-widest italic text-gray-900 dark:text-white">¿Viene de otro club?</p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Marca esta opción si realizaste un traspaso deportivo recientemente</p>
                      </div>
                    </label>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button type="button" variant="ghost" onClick={prevStep} className="flex-1 h-14">Atrás</Button>
                    <Button type="button" onClick={nextStep} className="flex-[2] h-14 bg-black text-[var(--primary)] font-black uppercase text-xs rounded-3xl shadow-xl">Continuar <ChevronRight size={16} /></Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Nombres Tutor" required value={formData.tutor_nombre} onChange={e => setFormData({...formData, tutor_nombre: e.target.value})} />
                    <Input label="Apellidos Tutor" required value={formData.tutor_apellidos} onChange={e => setFormData({...formData, tutor_apellidos: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Celular Tutor" required value={formData.tutor_celular} onChange={e => setFormData({...formData, tutor_celular: e.target.value})} icon={<Phone size={16}/>} />
                    <Input label="Email Tutor" type="email" required value={formData.tutor_email} onChange={e => setFormData({...formData, tutor_email: e.target.value})} icon={<Mail size={16}/>} />
                  </div>
                  <Input label="Nro Documento Tutor" required value={formData.tutor_numero_documento} onChange={e => setFormData({...formData, tutor_numero_documento: e.target.value})} icon={<Hash size={16}/>} />
                  <div className="flex gap-4 pt-4">
                    <Button type="button" variant="ghost" onClick={prevStep} className="flex-1 h-14 font-black uppercase text-[10px]">Anterior</Button>
                    <Button type="button" onClick={nextStep} className="flex-[2] h-14 bg-black text-[var(--primary)] font-black uppercase text-xs rounded-3xl shadow-xl">Siguiente <ChevronRight size={16} /></Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8 animate-in fade-in">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 italic">Este contacto será usado exclusivamente en situaciones críticas de salud.</p>
                  <Input label="Nombre Completo" required value={formData.emergencia_nombre} onChange={e => setFormData({...formData, emergencia_nombre: e.target.value})} icon={<Heart size={16}/>} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Celular de Contacto" required value={formData.emergencia_celular} onChange={e => setFormData({...formData, emergencia_celular: e.target.value})} icon={<Phone size={16}/>} />
                    <Input label="Email (Opcional)" type="email" value={formData.emergencia_email} onChange={e => setFormData({...formData, emergencia_email: e.target.value})} icon={<Mail size={16}/>} />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <Button type="button" variant="ghost" onClick={prevStep} className="flex-1 h-14 font-black uppercase text-[10px]">Anterior</Button>
                    <Button type="button" onClick={nextStep} className="flex-[2] h-14 bg-black text-[var(--primary)] font-black uppercase text-xs rounded-3xl shadow-xl">Siguiente <ChevronRight size={16} /></Button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8 animate-in fade-in">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5 px-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">País</label>
                        <select className="w-full h-14 bg-gray-50 dark:bg-white/5 rounded-2xl px-5 text-sm" value={formData.pais} onChange={e => setFormData({...formData, pais: e.target.value, departamento: '', municipio: ''})}>
                          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select></div>
                      
                      {formData.pais === 'Colombia' ? (
                        <div className="space-y-1.5 px-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Departamento</label>
                        <select required className="w-full h-14 bg-gray-50 dark:bg-white/5 rounded-2xl px-5 text-sm" value={formData.departamento} onChange={e => setFormData({...formData, departamento: e.target.value, municipio: ''})}>
                          <option value="">Seleccionar...</option>
                          {Object.keys(COLOMBIA_DATA).map(d => <option key={d} value={d}>{d}</option>)}
                        </select></div>
                      ) : (
                        <Input label="Estado / Provincia" required value={formData.departamento} onChange={e => setFormData({...formData, departamento: e.target.value})} />
                      )}
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {formData.pais === 'Colombia' && formData.departamento ? (
                        <div className="space-y-1.5 px-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Municipio</label>
                        <select required className="w-full h-14 bg-gray-50 dark:bg-white/5 rounded-2xl px-5 text-sm" value={formData.municipio} onChange={e => setFormData({...formData, municipio: e.target.value})}>
                          <option value="">Seleccionar...</option>
                          {COLOMBIA_DATA[formData.departamento]?.map(m => <option key={m} value={m}>{m}</option>)}
                        </select></div>
                     ) : (
                       <Input label="Ciudad / Municipio" required value={formData.municipio} onChange={e => setFormData({...formData, municipio: e.target.value})} />
                     )}
                     <Input label="Barrio" required value={formData.barrio} onChange={e => setFormData({...formData, barrio: e.target.value})} />
                   </div>

                   <Input label="Dirección Residencial" required value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} icon={<MapPin size={16}/>} />

                  <div className="flex gap-4 pt-4">
                    <Button type="button" variant="ghost" onClick={prevStep} className="flex-1 h-14 font-black uppercase text-[10px]">Anterior</Button>
                    <Button type="button" onClick={nextStep} className="flex-[2] h-14 bg-black text-[var(--primary)] font-black uppercase text-xs rounded-3xl shadow-xl">Siguiente <ChevronRight size={16} /></Button>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="space-y-6">
                    {/* INSCRIPCIÓN */}
                    {inscripcionPlans.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Concepto de Inscripción (Único)</h4>
                        <div className="grid grid-cols-1 gap-3">
                          {inscripcionPlans.map(p => (
                            <button key={p.id} type="button" onClick={() => setFormData({ ...formData, plan_inscripcion_id: p.id })} className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${formData.plan_inscripcion_id === p.id ? 'bg-black border-black text-[var(--primary)]' : 'bg-gray-50 border-transparent text-gray-900 font-bold'}`}>
                              <div className="text-left"><p className="uppercase italic tracking-tighter">{p.nombre}</p><p className="text-[8px] font-black opacity-60">PAGO ÚNICO</p></div>
                              <p className="text-xl font-black">${new Intl.NumberFormat('es-CO').format(p.precio)}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* MENSULIDADES */}
                    {regularPlans.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Mensualidades de la Temporada</h4>
                        <div className="grid grid-cols-1 gap-3">
                          {regularPlans.map(p => (
                            <button key={p.id} type="button" onClick={() => setFormData({ ...formData, plan_id: p.id })} className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${formData.plan_id === p.id ? 'bg-black border-black text-[var(--primary)]' : 'bg-gray-50 border-transparent text-gray-900 font-bold'}`}>
                              <div className="text-left"><p className="uppercase italic tracking-tighter">{p.nombre}</p><p className="text-[8px] font-black opacity-60 uppercase">{p.periodo}</p></div>
                              <p className="text-xl font-black">${new Intl.NumberFormat('es-CO').format(p.precio)}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-[9px] text-gray-400 font-bold uppercase italic px-2">Nota: Al finalizar el registro se generarán automáticamente tus cobros según las fechas de temporada del club.</p>

                  <div className="flex gap-4 pt-4">
                    <Button type="button" variant="ghost" onClick={prevStep} className="flex-1 h-16 font-black uppercase text-[10px]">Anterior</Button>
                    <Button type="button" onClick={nextStep} className="flex-[2] h-16 bg-black text-[var(--primary)] font-black uppercase text-xs rounded-3xl shadow-xl">Revisar Contrato <ChevronRight size={16} /></Button>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="p-8 border border-gray-200 rounded-3xl bg-white shadow-sm print:shadow-none print:border-none print:p-0 print:absolute print:inset-0 print:bg-white print:z-50" id="contract-content">
                    <div className="flex items-center justify-between border-b pb-6 mb-6 print:border-black">
                      <div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 mb-1">Acuerdo de Afiliación Deportiva</h3>
                        <p className="text-sm font-bold text-gray-500 uppercase">{teamInfo?.club?.nombre} {teamInfo?.club?.nit ? `| NIT: ${teamInfo.club.nit}` : ''}</p>
                      </div>
                      {teamInfo?.club?.logo_url && (
                        <img src={getDirectImageUrl(teamInfo?.club?.logo_url)} className="w-16 h-16 object-contain" alt="Logo Club" />
                      )}
                    </div>
                    
                    <div className="space-y-6 text-sm text-gray-800 text-justify leading-relaxed print:text-xs">
                      <p>
                        Entre los suscritos a saber: de una parte el Club Deportivo <strong>{teamInfo?.club?.nombre?.toUpperCase()}</strong>, en adelante el CLUB, y por la otra parte el señor(a) <strong>{formData.tutor_nombre.toUpperCase()} {formData.tutor_apellidos.toUpperCase()}</strong>, identificado con documento número <strong>{formData.tutor_numero_documento}</strong>, obrando en calidad de representante legal/tutor del deportista <strong>{formData.nombre_completo.toUpperCase()} {formData.apellidos.toUpperCase()} {formData.segundo_apellido.toUpperCase()}</strong>, identificado con {formData.tipo_documento} número <strong>{formData.numero_documento}</strong>, hemos convenido celebrar el presente acuerdo de afiliación sujeto a las normativas del club y legales vigentes.
                      </p>
                      
                      <div className="bg-gray-50 p-4 rounded-xl print:bg-transparent print:border print:border-gray-200">
                        <h4 className="font-bold mb-2 uppercase text-xs">Datos de Contacto y Ubicación</h4>
                        <ul className="grid grid-cols-2 gap-2 text-xs">
                          <li><strong>Celular Tutor:</strong> {formData.tutor_celular}</li>
                          <li><strong>Email Tutor:</strong> {formData.tutor_email}</li>
                          <li><strong>Dirección:</strong> {formData.direccion}, {formData.barrio}</li>
                          <li><strong>Ciudad:</strong> {formData.municipio}, {formData.departamento}</li>
                        </ul>
                      </div>
                      
                      <p><strong>DECLARACIONES:</strong></p>
                      <ol className="list-decimal pl-5 space-y-2">
                        <li>El acudiente declara bajo juramento que los datos suministrados son reales y verificables.</li>
                        <li>Que conoce y acepta los reglamentos internos, disciplinarios y las tarifas de inscripción y mensualidades dispuestas por el club.</li>
                        <li>Que en caso de emergencia médica, autoriza al club a contactar a <strong>{formData.emergencia_nombre.toUpperCase()}</strong> al <strong>{formData.emergencia_celular}</strong> y gestionar atención de primeros auxilios.</li>
                      </ol>

                      <div className="mt-12 flex justify-between px-10 print:mt-24">
                        <div className="border-t border-black pt-2 w-48 text-center">
                          <p className="font-bold text-xs uppercase">{formData.tutor_nombre} {formData.tutor_apellidos}</p>
                          <p className="text-[10px] text-gray-500">Firma del Acudiente / Tutor</p>
                        </div>
                        <div className="border-t border-black pt-2 w-48 text-center">
                          <p className="font-bold text-xs uppercase">Representante</p>
                          <p className="text-[10px] text-gray-500">Club {teamInfo?.club?.nombre}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="print:hidden space-y-6">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800">
                        Genera el documento en PDF, descárgalo e imprímelo. Si tu club requiere firma física, deberás escanearlo o tomarle foto para subirlo en el siguiente paso.
                      </p>
                    </div>

                    <Button 
                      type="button" 
                      onClick={() => window.print()}
                      className="w-full h-14 bg-white text-black border-2 border-black font-black uppercase text-xs tracking-widest hover:bg-gray-50"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Descargar / Imprimir Contrato
                    </Button>

                    <label className="flex items-start gap-3 cursor-pointer p-6 bg-gray-50 rounded-[32px] border border-gray-100 hover:bg-gray-100 transition-colors">
                      <input type="checkbox" required checked={formData.acepta_terminos} onChange={e => setFormData({...formData, acepta_terminos: e.target.checked})} className="mt-1 h-5 w-5 rounded border-gray-300 text-black focus:ring-[var(--primary)]" />
                      <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-relaxed">He verificado toda la información suministrada, he generado el contrato y acepto los términos y condiciones.</span>
                    </label>

                    <div className="flex gap-4 pt-4">
                      <Button type="button" variant="ghost" onClick={prevStep} className="flex-1 h-14 font-black uppercase text-[10px]">Anterior</Button>
                      <Button type="button" onClick={nextStep} className="flex-[2] h-14 bg-black text-[var(--primary)] font-black uppercase text-xs rounded-3xl shadow-xl">Siguiente: Documentos <ChevronRight size={16} /></Button>
                    </div>
                  </div>
                </div>
              )}

              {step === 7 && (
                <div className="space-y-8 animate-in fade-in">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 italic">Carga tus documentos en formato PDF o Imagen para formalizar tu registro.</p>
                  
                  {[
                    { label: 'Registro Civil', field: 'url_registro_civil' },
                    { label: 'Documento Identidad (Frente/Atrás)', field: 'url_documento_id' },
                    { label: 'Contrato del Club Firmado', field: 'url_contrato' },
                    { label: 'Certificado de Salud / EPS', field: 'url_certificado_salud' },
                    ...(formData.viene_de_otro_club ? [{ label: 'Carta de Traspaso / Libertad', field: 'url_carta_traspaso' }] : [])
                  ].map((doc) => (
                    <FileUpload 
                      key={doc.field}
                      label={doc.label}
                      value={formData[doc.field as keyof typeof formData] as string}
                      onChange={(url) => setFormData(prev => ({ ...prev, [doc.field]: url }))}
                      bucket="deportista-documentos"
                      path={formData.numero_documento || 'registro'}
                    />
                  ))}
                  
                  {/* INFORMACIÓN DE PAGO (QR + Instrucciones) */}
                  {(teamInfo?.club?.qr_url || teamInfo?.club?.pago_instrucciones) && (
                    <div className="bg-blue-50/50 border border-blue-100 p-8 rounded-[40px] space-y-6 mt-8">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Wallet size={16} />
                        <h4 className="text-[10px] font-black uppercase tracking-widest leading-none">Información de Pagos del Club</h4>
                      </div>
                      
                      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap gap-8 items-center md:items-start">
                        {teamInfo.club.qr_url && (
                          <div className="shrink-0 bg-white p-4 rounded-[32px] shadow-sm border border-gray-100 flex flex-col items-center gap-2">
                             <img 
                               src={getDirectImageUrl(teamInfo.club.qr_url)} 
                               alt="QR de Pago" 
                               className="w-40 h-40 object-contain rounded-2xl"
                               onError={(e) => {
                                 (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error+Carga+Imagen';
                               }}
                             />
                             <span className="text-[8px] font-black uppercase text-gray-400">Escanea para pagar</span>
                          </div>
                        )}
                        
                        {teamInfo.club.pago_instrucciones && (
                          <div className="flex-1">
                            <p className="text-xs text-gray-700 font-medium leading-relaxed bg-white/50 p-6 rounded-3xl border border-white">
                              {teamInfo.club.pago_instrucciones}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <Button type="button" variant="ghost" onClick={prevStep} className="flex-1 h-16 font-black uppercase text-[10px]">Anterior</Button>
                    <Button type="submit" isLoading={loading} className="flex-[2] h-16 bg-[var(--primary)] text-black font-black uppercase italic tracking-widest text-xs rounded-[32px] shadow-2xl shadow-[var(--primary-20)]">Finalizar Registro</Button>
                  </div>
                </div>
              )}
            </form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-10 animate-in zoom-in-95">
               <div className="w-24 h-24 bg-[var(--primary)] rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-[var(--primary-30)]"><CheckCircle2 size={48} className="text-black" /></div>
               <div className="space-y-4">
                 <h2 className="text-5xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">¡Bienvenido!</h2>
                 <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Tu cuenta ha sido creada y tus cobros de temporada generados satisfactoriamente.</p>
               </div>

               {/* REPETIR INFO DE PAGO EN SUCCESS PARA CONVENIENCIA */}
               {(teamInfo?.club?.qr_url || teamInfo?.club?.pago_instrucciones) && (
                 <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-black/5 space-y-6 max-w-lg mx-auto">
                   <div className="flex items-center justify-center gap-3 text-emerald-500">
                     <Wallet size={20} />
                     <h4 className="text-xs font-black uppercase tracking-widest">Información para tu primer pago</h4>
                   </div>

                   {teamInfo.club.qr_url && (
                     <div className="flex flex-col items-center gap-3">
                        <img 
                         src={getDirectImageUrl(teamInfo.club.qr_url)} 
                         alt="QR de Pago" 
                         className="w-48 h-48 object-contain rounded-2xl shadow-sm"
                         onError={(e) => {
                           (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error+Carga+Imagen';
                         }}
                        />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Escanea el código QR</p>
                     </div>
                   )}

                   {teamInfo.club.pago_instrucciones && (
                     <div className="p-5 bg-gray-50 rounded-2xl">
                       <p className="text-sm text-gray-600 font-medium leading-relaxed">
                         {teamInfo.club.pago_instrucciones}
                       </p>
                     </div>
                   )}
                 </div>
               )}
               <Button onClick={() => window.location.reload()} className="h-16 px-12 bg-black text-[var(--primary)] rounded-3xl font-black uppercase italic tracking-widest shadow-2xl">Entendido</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
