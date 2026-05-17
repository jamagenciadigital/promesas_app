import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Check, Shield, Zap, Star, Trophy, Users, Layout, ArrowRight, ArrowLeft } from 'lucide-react';

export default function RegisterClub() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [deportes, setDeportes] = useState<{ id: string; nombre: string }[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Paso 1: Datos del Club
  const [clubData, setClubData] = useState({
    nombre: '',
    pais: '',
    ciudad: '',
    direccion: '',
    telefono: '',
    email_corporativo: '',
    website: '',
    deporte_id: ''
  });

  // Paso 2: Datos del AdminClub
  const [adminData, setAdminData] = useState({
    nombreCompleto: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const loadDeportes = async () => {
      const { data } = await supabase.from('deportes').select('*').order('nombre');
      if (data) setDeportes(data);
    };
    const loadPlanes = async () => {
      const { data } = await supabase.from('planes_suscripcion').select('*').eq('estado', true).order('precio');
      if (data) setPlanes(data);
    };
    loadDeportes();
    loadPlanes();
  }, []);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!clubData.nombre || !clubData.deporte_id) {
        setError("El nombre del club y el deporte son obligatorios.");
        return;
      }
      setError(null);
      setStep(2);
    } else if (step === 2) {
      if (!selectedPlanId) {
        setError("Por favor selecciona un plan para continuar.");
        return;
      }
      setError(null);
      setStep(3);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (adminData.password !== adminData.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (adminData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      // 0. Verificar si el usuario ya tiene un perfil (evita duplicados antes de crear el club)
      const { data: existingProfile } = await supabase
        .from('perfiles')
        .select('id')
        .eq('email', adminData.email)
        .maybeSingle();

      if (existingProfile) {
        throw new Error("Este correo electrónico ya está registrado en el sistema. Por favor intenta iniciar sesión.");
      }

      // 1. Call our secure RPC to create the club first
      // This bypasses RLS issues, creates the club, and returns its ID
      const { data: rpcData, error: rpcError } = await supabase.rpc('register_club_and_admin', {
        p_club_nombre: clubData.nombre,
        p_pais: clubData.pais,
        p_ciudad: clubData.ciudad,
        p_direccion: clubData.direccion,
        p_telefono: clubData.telefono,
        p_email_corporativo: clubData.email_corporativo,
        p_website: clubData.website,
        p_deporte_id: clubData.deporte_id,
        p_admin_email: adminData.email,
        p_admin_password: adminData.password,
        p_admin_nombre: adminData.nombreCompleto,
        p_plan_id: selectedPlanId
      });

      if (rpcError) {
        console.error("RPC Error:", rpcError);
        throw new Error(`Error en la base de datos al crear el club: ${rpcError.message}`);
      }
      
      if (!rpcData || !rpcData.success) {
        console.error("RPC Logic Error:", rpcData);
        throw new Error(`Error creando club: ${rpcData?.error || 'Desconocido'}`);
      }

      const newClubId = rpcData.club_id;

      // 2. Now sign up the user, passing the new club_id in metadata
      // We pass redundant keys (nombre, full_name) to ensure compatibility with different triggers
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminData.email,
        password: adminData.password,
        options: {
          data: {
            nombre: adminData.nombreCompleto,
            full_name: adminData.nombreCompleto,
            rol: 'admin_club',
            club_id: newClubId,
            setup_complete: true
          }
        }
      });

      if (authError) {
        console.error("Auth SignUP Error:", authError);
        if (authError.message.includes("already registered") || authError.message.includes("exists")) {
          throw new Error("Este correo ya tiene una cuenta activa. Si el registro falló anteriormente, intenta con otro correo o contacta a soporte.");
        }
        throw new Error(`El club se creó pero el registro de usuario falló: ${authError.message}`);
      }

      if (authData.user) {
        // Garantizar que el perfil se cree en la tabla perfiles
        // Si el trigger falla, el upsert manual lo asegura
        const { error: profileError } = await supabase
          .from('perfiles')
          .upsert({
            id: authData.user.id,
            email: adminData.email,
            nombre: adminData.nombreCompleto,
            rol: 'admin_club',
            club_id: newClubId,
            estado: 'activo'
          });

        if (profileError) {
          console.error("Profile Upsert Error:", profileError);
          // No lanzamos error para no bloquear al usuario si el registro en Auth fue exitoso,
          // pero lo registramos en consola.
        } else {
          console.log("User registered and profile created successfully with Club ID:", newClubId);
        }
      }

      // Everything succeeded! 
      // Show success modal instead of JS alert
      setShowSuccessModal(true);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error durante el registro');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-white flex relative overflow-hidden">
      
      {/* Decorative Left Side Image (Based on User Mockup) */}
      <div 
        className="hidden md:block md:w-[45%] lg:w-[40%] xl:w-1/3 absolute md:relative inset-y-0 left-0 z-0 bg-cover bg-center shadow-[10px_0_30px_rgba(0,0,0,0.5)]"
        style={{ 
          backgroundImage: 'url("/assets/bg-login.jpg")'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent"></div>
        <div className="absolute bottom-8 left-8 right-8 flex items-center gap-3">
          <img src="/assets/LOGO-HORIZONTAL.png" className="w-auto h-12" alt="Fichaje Logo"/>
        </div>
      </div>

      <div className="flex-1 flex justify-center py-12 px-4 sm:px-6 lg:px-8 z-10 w-full overflow-y-auto">
        <div className="w-full max-w-md space-y-8 my-auto">
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
              {step === 1 ? '¡Bienvenido!' : step === 2 ? 'Selecciona tu Plan' : 'Administrador del Club'}
            </h2>
            <p className="text-sm text-gray-600">
              {step === 1 
                ? 'Crea tu cuenta y empieza administrar tu Club Deportivo' 
                : step === 2
                ? 'Elige la potencia que tu club necesita'
                : 'Ingresa los datos del administrador principal'
              }
            </p>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? 'w-8 bg-[#CCFF00]' : 'w-4 bg-gray-200'}`}></div>
            ))}
          </div>

          <form className="mt-8 space-y-5" onSubmit={step < 3 ? handleNextStep : handleRegister}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            {/* Step 1: Club Info */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <select 
                    required
                    value={clubData.deporte_id} 
                    onChange={e => setClubData({...clubData, deporte_id: e.target.value})}
                    className="appearance-none rounded-2xl relative block w-full px-5 py-3 border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-[#CCFF00] focus:border-[#CCFF00] focus:z-10 sm:text-sm"
                  >
                    <option value="" disabled>Seleccionar Deporte...</option>
                    {deportes.map(d => (
                      <option key={d.id} value={d.id}>{d.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <input
                    type="text" required placeholder="Nombre del equipo o club"
                    value={clubData.nombre} onChange={e => setClubData({...clubData, nombre: e.target.value})}
                    className="appearance-none rounded-2xl relative block w-full px-5 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#CCFF00] focus:border-[#CCFF00] sm:text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text" placeholder="País"
                    value={clubData.pais} onChange={e => setClubData({...clubData, pais: e.target.value})}
                    className="appearance-none rounded-2xl relative block w-full px-5 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#CCFF00] focus:border-[#CCFF00] sm:text-sm"
                  />
                  <input
                    type="text" placeholder="Ciudad"
                    value={clubData.ciudad} onChange={e => setClubData({...clubData, ciudad: e.target.value})}
                    className="appearance-none rounded-2xl relative block w-full px-5 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#CCFF00] focus:border-[#CCFF00] sm:text-sm"
                  />
                </div>
                <div>
                  <input
                    type="text" placeholder="Dirección"
                    value={clubData.direccion} onChange={e => setClubData({...clubData, direccion: e.target.value})}
                    className="appearance-none rounded-2xl relative block w-full px-5 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#CCFF00] focus:border-[#CCFF00] sm:text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="tel" placeholder="Teléfono"
                    value={clubData.telefono} onChange={e => setClubData({...clubData, telefono: e.target.value})}
                    className="appearance-none rounded-2xl relative block w-full px-5 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#CCFF00] focus:border-[#CCFF00] sm:text-sm"
                  />
                  <input
                    type="email" placeholder="Email corporativo"
                    value={clubData.email_corporativo} onChange={e => setClubData({...clubData, email_corporativo: e.target.value})}
                    className="appearance-none rounded-2xl relative block w-full px-5 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#CCFF00] focus:border-[#CCFF00] sm:text-sm"
                  />
                </div>
                <div>
                  <input
                    type="url" placeholder="Website (Opcional)"
                    value={clubData.website} onChange={e => setClubData({...clubData, website: e.target.value})}
                    className="appearance-none rounded-2xl relative block w-full px-5 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#CCFF00] focus:border-[#CCFF00] sm:text-sm"
                  />
                </div>

                <div className="pt-4 pb-2">
                  <button
                    type="submit"
                    className="group relative w-full flex items-center justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-full text-black bg-[#CCFF00] hover:bg-[#b8e600] focus:outline-none transition-all shadow-lg shadow-[#CCFF00]/20"
                  >
                    CONTINUAR <ArrowRight size={18} className="ml-2" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Plan Selection */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-1 gap-4">
                  {planes.map(plan => (
                    <div 
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative p-6 rounded-[32px] border-2 cursor-pointer transition-all duration-300 ${
                        selectedPlanId === plan.id 
                        ? 'border-[#CCFF00] bg-[#CCFF00]/5 shadow-xl' 
                        : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      {selectedPlanId === plan.id && (
                        <div className="absolute top-4 right-4 text-[#CCFF00]">
                          <Check size={20} className="stroke-[3px]" />
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-black uppercase italic tracking-tighter text-gray-900">{plan.nombre}</h4>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{plan.descripcion || 'Plan Profesional'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-gray-900 leading-none">${plan.precio.toLocaleString()}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase">Por Mes</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-y-2 mb-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                          <Users size={12} className="text-[#CCFF00]" />
                          {plan.limite_jugadores === -1 ? 'Jugadores Ilimitados' : `${plan.limite_jugadores} Jugadores`}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                          <Trophy size={12} className="text-[#CCFF00]" />
                          {plan.limite_equipos === -1 ? 'Equipos Ilimitados' : `${plan.limite_equipos} Equipos`}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                          <Layout size={12} className="text-[#CCFF00]" />
                          {plan.modulos_activos?.length || 0} Módulos Activos
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 italic">
                          <Star size={12} />
                          Comisión: ${plan.comision?.toLocaleString() || 0}
                        </div>
                      </div>

                      {selectedPlanId === plan.id && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {plan.modulos_activos?.map((mod: string) => (
                            <span key={mod} className="px-2 py-0.5 bg-black text-[#CCFF00] text-[7px] font-black uppercase rounded-md tracking-tighter">
                              {mod.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3.5 px-4 border border-gray-200 text-sm font-bold rounded-full text-gray-600 bg-white hover:bg-gray-50 focus:outline-none transition-all"
                  >
                    ATRÁS
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] flex items-center justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-full text-black bg-[#CCFF00] hover:bg-[#b8e600] focus:outline-none transition-all shadow-xl"
                  >
                    CONTINUAR <ArrowRight size={18} className="ml-2" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Admin Info */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <div>
                  <input
                    type="text" required placeholder="Nombre completo del Administrador"
                    value={adminData.nombreCompleto} onChange={e => setAdminData({...adminData, nombreCompleto: e.target.value})}
                    className="appearance-none rounded-2xl relative block w-full px-5 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#CCFF00] focus:border-[#CCFF00] sm:text-sm"
                  />
                </div>
                <div>
                  <input
                    type="email" required placeholder="Correo de acceso"
                    value={adminData.email} onChange={e => setAdminData({...adminData, email: e.target.value})}
                    className="appearance-none rounded-2xl relative block w-full px-5 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#CCFF00] focus:border-[#CCFF00] sm:text-sm"
                  />
                </div>
                <div>
                  <input
                    type="password" required placeholder="Contraseña"
                    value={adminData.password} onChange={e => setAdminData({...adminData, password: e.target.value})}
                    className="appearance-none rounded-2xl relative block w-full px-5 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#CCFF00] focus:border-[#CCFF00] sm:text-sm"
                  />
                </div>
                <div>
                  <input
                    type="password" required placeholder="Repetir Contraseña"
                    value={adminData.confirmPassword} onChange={e => setAdminData({...adminData, confirmPassword: e.target.value})}
                    className="appearance-none rounded-2xl relative block w-full px-5 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#CCFF00] focus:border-[#CCFF00] sm:text-sm"
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => { setError(null); setStep(2); }}
                    className="group relative flex-1 flex justify-center py-3.5 px-4 border border-gray-300 text-sm font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
                  >
                    ATRÁS
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex-[2] flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-full text-[#CCFF00] bg-black hover:bg-gray-900 focus:outline-none transition-colors disabled:opacity-70"
                  >
                    {loading ? 'CREANDO...' : 'REGISTRAR CLUB'}
                  </button>
                </div>
              </div>
            )}
            
            <div className="text-center pt-8">
               <span className="text-sm text-gray-600">¿Ya tienes gestionado tu club? </span>
               <Link to="/login" className="font-semibold text-black hover:underline">
                 Inicia Sesión aquí.
               </Link>
            </div>
          </form>

        </div>
      </div>

      {/* Success Modal Overlay */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 className="text-2xl font-black text-gray-900 mb-2">¡Registro Exitoso!</h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Hemos enviado las instrucciones a tu correo electrónico. Por favor, revisa tu bandeja y confirma tu cuenta para poder iniciar sesión.
            </p>
            
            <button
              onClick={handleModalClose}
              className="w-full py-3.5 px-4 font-bold rounded-full text-[#CCFF00] bg-black hover:bg-gray-900 focus:outline-none transition-colors"
            >
              IR A INICIAR SESIÓN
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
