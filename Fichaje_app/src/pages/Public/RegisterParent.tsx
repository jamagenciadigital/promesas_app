import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { 
  User, Mail, Lock, Hash, 
  CheckCircle2, ChevronRight, ArrowLeft, 
  Search, Shield, Users
} from 'lucide-react';

export default function RegisterParent() {
  const [step, setStep] = useState<number | 'success'>(0);
  const [loading, setLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    apellido: '',
    documento: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const nextStep = () => {
    setError(null);
    if (step === 0) validateCode();
    else if (step === 1) {
      if (!selectedPlayer) {
        setError("Por favor selecciona a tu hijo/deportista.");
        return;
      }
      setStep(2);
    }
  };

  const prevStep = () => {
    setError(null);
    if (typeof step === 'number') setStep(prev => (prev as number) - 1);
  };

  const validateCode = async () => {
    if (!formData.codigo) {
      setError("Ingresa el código del equipo.");
      return;
    }
    try {
      setValidatingCode(true);
      setError(null);
      
      // 1. Validar equipo
      const { data: team, error: teamError } = await supabase
        .from('equipos')
        .select(`
          *, 
          club:clubes(nombre, logo_url)
        `)
        .ilike('codigo', formData.codigo.trim())
        .single();

      if (teamError || !team) throw new Error("El código de equipo no existe.");
      setTeamInfo(team);

      // 2. Cargar deportistas del equipo usando RPC (Más seguro y evita RLS para anon)
      const { data: playersData, error: playersError } = await supabase
        .rpc('get_players_by_team_code', { p_codigo: formData.codigo.trim() });
      
      if (playersError) throw playersError;
      
      setPlayers(playersData || []);
      setStep(1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setValidatingCode(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.apellido || !formData.documento) {
       setError("Por favor completa todos tus datos personales (Nombres, Apellidos y Documento).");
       return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Crear usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nombre: formData.nombre,
            rol: 'padre',
            club_id: teamInfo.club_id,
            deportista_id: selectedPlayer.id
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario.");

      console.log('Update payload:', {
        club_id: teamInfo.club_id,
        deportista_id: selectedPlayer.id,
        rol: 'padre',
        nombre: formData.nombre,
        estado: 'activo'
      });

      const { data: updateData, error: updateError, count } = await supabase
        .from('perfiles')
        .update({
          club_id: teamInfo.club_id,
          deportista_id: selectedPlayer.id,
          rol: 'padre',
          nombre: formData.nombre,
          apellido: formData.apellido,
          documento: formData.documento,
          estado: 'activo'
        })
        .eq('id', authData.user.id)
        .select();

      console.log('Update result:', { updateData, updateError, count });

      if (updateError || !updateData || updateData.length === 0) {
        console.warn("Update failed or no rows affected, trying upsert...");
        const { error: upsertError } = await supabase
          .from('perfiles')
          .upsert({
            id: authData.user.id,
            email: formData.email,
            nombre: formData.nombre,
            apellido: formData.apellido,
            documento: formData.documento,
            rol: 'padre',
            club_id: teamInfo.club_id,
            deportista_id: selectedPlayer.id,
            estado: 'activo'
          });
        
        if (upsertError) {
           console.error('Upsert failed:', upsertError);
           throw upsertError;
        }
      }

      // Sincronizar la información de tutor directamente con el deportista para Cartera y contratos
      await supabase.from('deportistas').update({
         tutor_nombre: formData.nombre,
         tutor_apellidos: formData.apellido,
         tutor_numero_documento: formData.documento,
         tutor_email: formData.email
      }).eq('id', selectedPlayer.id);

      setStep('success');
    } catch (err: any) {
      console.error('Full registration error:', err);
      let errorMessage = err.message || "Error al crear la cuenta.";
      
      // Manejo amigable del límite de correos de Supabase
      if (err.code === 'over_email_send_rate_limit') {
        errorMessage = "Has excedido el límite de envíos de correo de prueba (Supabase limita a 3 por hora). Por favor, intenta en 1 hora o desactiva 'Confirm Email' en tu consola de Supabase.";
      }

      const errorDetails = err.details ? ` (${err.details})` : "";
      const errorCode = err.code ? ` [Código: ${err.code}]` : "";
      setError(`${errorMessage}${errorDetails}${errorCode}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(p => 
    `${p.nombre_completo} ${p.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.numero_documento?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-[#CCFF00]"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#CCFF00]/5 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-xl bg-white rounded-[48px] shadow-2xl shadow-black/5 border border-gray-100 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Progress Bar */}
        {typeof step === 'number' && (
          <div className="flex bg-gray-100 h-1.5 w-full">
            <div className={`h-full bg-[#CCFF00] transition-all duration-500 ${step === 0 ? 'w-1/3' : step === 1 ? 'w-2/3' : 'w-full'}`}></div>
          </div>
        )}

        <div className="p-10 md:p-14 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
             <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto shadow-xl transform -rotate-6">
                <Users className="text-[#CCFF00] w-8 h-8" />
             </div>
             <div>
               <h1 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">Acceso Familiar</h1>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Crea tu cuenta y conéctate con el equipo</p>
             </div>
          </div>

          {step === 0 && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               <div className="bg-gray-50 p-8 rounded-[32px] border border-gray-100 space-y-6">
                  <Input 
                    label="Código de Invitación del Equipo" 
                    placeholder="ABC-123" 
                    value={formData.codigo} 
                    onChange={e => setFormData({...formData, codigo: e.target.value.toUpperCase()})}
                    className="h-16 text-2xl font-black text-center uppercase tracking-widest"
                    icon={<Hash className="w-6 h-6" />}
                  />
                  {error && <p className="text-red-500 text-[10px] font-black uppercase text-center italic">{error}</p>}
               </div>
               <Button onClick={nextStep} isLoading={validatingCode} className="w-full h-16 bg-black text-[#CCFF00] rounded-2xl font-black uppercase italic tracking-widest shadow-xl flex items-center justify-center gap-2">
                 Validar Equipo <ChevronRight size={20} />
               </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
               <div className="flex items-center gap-4 mb-2">
                  <button onClick={prevStep} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ArrowLeft size={20} /></button>
                  <div className="flex-1">
                    <p className="text-[8px] font-black text-[#CCFF00] uppercase tracking-widest">Equipo Encontrado</p>
                    <h3 className="text-lg font-black text-gray-900 uppercase italic leading-none">{teamInfo?.nombre}</h3>
                  </div>
               </div>

               <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="text" 
                    placeholder="Busca por nombre o documento..." 
                    className="w-full h-14 pl-12 pr-4 bg-gray-50 rounded-2xl border border-transparent focus:border-[#CCFF00] outline-none transition-all text-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
               </div>

               <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {filteredPlayers.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => setSelectedPlayer(p)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedPlayer?.id === p.id ? 'bg-black border-black text-[#CCFF00]' : 'bg-white border-gray-100 text-gray-900 hover:border-[#CCFF00]'}`}
                    >
                      <div className="text-left leading-tight">
                        <p className="text-xs font-black uppercase italic">{p.nombre_completo} {p.apellidos}</p>
                        <p className={`text-[8px] font-bold uppercase tracking-widest ${selectedPlayer?.id === p.id ? 'text-white/40' : 'text-gray-400'}`}>Doc: {p.numero_documento}</p>
                      </div>
                      {selectedPlayer?.id === p.id && <CheckCircle2 size={18} />}
                    </button>
                  ))}
               </div>

               {error && <p className="text-red-500 text-[10px] font-black uppercase text-center italic">{error}</p>}

               <Button onClick={nextStep} className="w-full h-16 bg-[#CCFF00] text-black rounded-2xl font-black uppercase italic tracking-widest shadow-xl flex items-center justify-center gap-2">
                 Confirmar Selección <ChevronRight size={20} />
               </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
               <div className="flex items-center gap-4 mb-2">
                  <button onClick={prevStep} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ArrowLeft size={20} /></button>
                  <div className="flex-1 text-center">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Vinculación confirmada</p>
                    <h3 className="text-sm font-black text-gray-900 uppercase italic">{selectedPlayer?.nombre_completo}</h3>
                  </div>
               </div>

               <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <Input label="Tus Nombres" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} icon={<User size={16}/>} />
                     <Input label="Tus Apellidos" required value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} icon={<User size={16}/>} />
                  </div>
                  <Input label="Documento de Identidad (Para Facturación)" required value={formData.documento} onChange={e => setFormData({...formData, documento: e.target.value})} icon={<Hash size={16}/>} />
                  <Input label="Correo Electrónico" type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} icon={<Mail size={16}/>} />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Contraseña" type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} icon={<Lock size={16}/>} />
                    <Input label="Confirmar" type="password" required value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} icon={<Lock size={16}/>} />
                  </div>

                  {error && <p className="text-red-500 text-[10px] font-black uppercase text-center italic">{error}</p>}

                  <Button type="submit" isLoading={loading} className="w-full h-16 bg-black text-[#CCFF00] rounded-2xl font-black uppercase italic tracking-widest shadow-xl flex items-center justify-center gap-2 mt-4">
                    Crear mi Cuenta <Shield size={20} />
                  </Button>
               </form>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-8 animate-in zoom-in-95 duration-700">
               <div className="w-24 h-24 bg-[#CCFF00] rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-[#CCFF00]/40">
                  <CheckCircle2 size={48} className="text-black" />
               </div>
               <div className="space-y-2">
                  <h2 className="text-4xl font-black text-gray-900 uppercase italic tracking-tighter leading-tight">¡Cuenta Lista!</h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Te hemos enviado un correo de confirmación.</p>
               </div>
               <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-xs text-gray-500 font-medium italic">Ahora puedes iniciar sesión con tu correo y contraseña para acceder al portal del club.</p>
               </div>
               <Button onClick={() => window.location.href = '/login'} className="w-full h-16 bg-black text-[#CCFF00] rounded-2xl font-black uppercase italic tracking-widest shadow-xl">
                 Ir al Login
               </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center opacity-30">
         <img src="/assets/LOGO-HORIZONTAL.png" className="h-6 object-contain" alt="Fichaje Logo" />
      </div>
    </div>
  );
}
