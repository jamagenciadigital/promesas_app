import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { getAuthErrorMessage } from '../../utils/authErrors';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [showResendAction, setShowResendAction] = useState(false);
  
  const [viewMode, setViewMode] = useState<'login' | 'forgot' | 'update'>('login');
  const [isVerifyingStatus, setIsVerifyingStatus] = useState(false);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  
  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setViewMode('update');
    });

    if (location.state?.error) {
      setError(location.state.error);
      if (location.state.error.includes('confirmar')) setShowResendAction(true);
    }

    if (profile && viewMode === 'login') {
      const from = (location.state as any)?.from?.pathname;
      if (from && from !== '/' && from !== '/login') {
        navigate(from, { replace: true });
        return;
      }
      redirectByRole(profile.rol);
    }

    return () => subscription.unsubscribe();
  }, [profile, navigate, location.state, viewMode]);

  const redirectByRole = (rol: string) => {
    switch (rol) {
      case 'superadmin': navigate('/superadmin', { replace: true }); break;
      case 'admin_club': navigate('/club', { replace: true }); break;
      case 'direccion_deportiva': navigate('/sports-dir', { replace: true }); break;
      case 'admin_equipo': navigate('/coordinator', { replace: true }); break;
      case 'entrenador': navigate('/coach', { replace: true }); break;
      case 'cartera': navigate('/finance-admin', { replace: true }); break;
      case 'padre': navigate('/player', { replace: true }); break;
      case 'escenario_deportivo': 
      case 'admin_escenario': 
          navigate('/escenario', { replace: true }); break;
      case 'jefatura': navigate('/jefatura', { replace: true }); break;
      default: 
          setError(`Acceso restringido para el rol: ${rol}`);
          signOut(); 
          break;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setIsVerifyingStatus(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      if (authData.user) {
        if (!authData.user.email_confirmed_at) {
          setError('Tu correo electrónico aún no ha sido confirmado.');
          setShowResendAction(true);
          await supabase.auth.signOut();
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('perfiles')
          .select('rol, id, estado')
          .eq('id', authData.user.id)
          .single();

        if (profileError) throw profileError;

        if (profileData.estado === 'suspendido') {
            setShowSuspendedModal(true);
            await supabase.auth.signOut();
            return;
        }

        redirectByRole(profileData.rol);
      }
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
      setIsVerifyingStatus(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-50"
        style={{ 
          backgroundImage: 'url("/assets/bg-login.jpg")',
          maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)'
        }}
      />
      
      <div className="relative z-10 w-full max-w-[400px] px-4">
        <div className="bg-white rounded-[40px] p-10 shadow-2xl flex flex-col items-center">
          <div className="mb-8 flex flex-col items-center">
            <img src="/assets/logo-login.png" alt="Fichaje" className="w-40 h-auto" />
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] mt-4 italic text-center">Protocolo Operativo</p>
          </div>

          <form className="w-full space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs text-center border border-red-100 animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}
            
            <input type="email" required placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-6 py-4 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#CCFF00] bg-gray-50 text-gray-900 placeholder-gray-400" disabled={loading} />
            <input type="password" required placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-6 py-4 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#CCFF00] bg-gray-50 text-gray-900 placeholder-gray-400" disabled={loading} />

            <div className="flex justify-between px-2">
                <div className="flex items-center">
                  <input id="remember_me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                  <label htmlFor="remember_me" className="ml-2 text-xs text-gray-400 font-bold italic">Recordarme</label>
                </div>
                <button type="button" className="text-xs text-gray-400 font-bold hover:text-black italic">¿Olvido clave?</button>
            </div>
            
            <button type="submit" disabled={loading} className="w-full bg-black text-[#CCFF00] font-black py-5 rounded-2xl transition-all hover:scale-[1.02] shadow-xl uppercase tracking-widest text-[11px] italic">
              {loading ? 'Validando...' : 'Acceder al Sistema'}
            </button>

            <div className="pt-4 text-center">
              <Link to="/registro-club" className="text-[10px] font-black text-gray-400 hover:text-black uppercase tracking-widest italic">
                ¿Nuevo club? REGISTRATE AQUÍ
              </Link>
            </div>
          </form>
        </div>
      </div>

      {showSuspendedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] p-12 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-2xl font-black text-black uppercase italic mb-4">Acceso Bloqueado</h3>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-loose mb-10">Tu organización ha sido suspendida. Contacta con administración.</p>
            <button onClick={() => setShowSuspendedModal(false)} className="w-full py-5 bg-black text-[#CCFF00] font-black rounded-2xl uppercase italic tracking-widest">Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}
