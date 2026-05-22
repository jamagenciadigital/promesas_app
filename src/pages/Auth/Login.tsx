import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { getAuthErrorMessage } from '../../utils/authErrors';
import { applyTheme, resetTheme } from '../../utils/theme';
import { ClubTheme } from '../../types';
import { LogIn, AlertCircle, RefreshCw } from 'lucide-react';

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
  
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('club');
  const [clubInfo, setClubInfo] = useState<{ nombre: string; logoUrl: string | null } | null>(null);
  
  useEffect(() => {
    if (!clubId) {
      resetTheme();
      setClubInfo(null);
      return;
    }

    async function loadClubThemeAndInfo() {
      try {
        const { data, error } = await supabase
          .from('clubes')
          .select('nombre, logo_url, theme')
          .eq('id', clubId)
          .single();

        if (error) throw error;
        if (data) {
          setClubInfo({
            nombre: data.nombre,
            logoUrl: data.logo_url || null
          });
          if (data.theme && typeof data.theme === 'object') {
            applyTheme(data.theme as ClubTheme);
          } else {
            resetTheme();
          }
        }
      } catch (err) {
        console.error('Error loading club personalization on login page:', err);
        resetTheme();
        setClubInfo(null);
      }
    }

    loadClubThemeAndInfo();

    return () => {
      resetTheme();
    };
  }, [clubId]);
  
  useEffect(() => {
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
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-500 py-12 px-4 bg-gray-950"
      style={{ backgroundColor: 'var(--club-login-bg)' }}
    >
      {/* Background radial glow decorations */}
      <div 
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-[120px] pointer-events-none transition-colors duration-500 z-0"
        style={{ backgroundColor: 'var(--club-primary-color)' }}
      />
      <div 
        className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-15 blur-[120px] pointer-events-none transition-colors duration-500 z-0"
        style={{ backgroundColor: 'var(--club-primary-color)' }}
      />
      {/* Soft dark overlay to make split card stand out */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] pointer-events-none z-0" />

      {/* Main Split-Card Container */}
      <div className="relative z-10 w-full max-w-[850px] min-h-[500px] bg-white rounded-[32px] md:rounded-[40px] shadow-[0_30px_80px_rgba(0,0,0,0.55)] border border-gray-100/10 flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        
        {/* Left Side (Brand Cover Panel - 5/12 width on desktop) */}
        <div 
          className="w-full md:w-5/12 p-8 md:p-12 text-white flex flex-col justify-between transition-colors duration-500 relative overflow-hidden shrink-0 min-h-[220px] md:min-h-auto"
          style={{ backgroundColor: 'var(--club-login-bg)' }}
        >
          {/* Decorative gradients for the left panel */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/15 via-transparent to-black/35 pointer-events-none z-0" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none z-0" />

          {/* Left Top: Club / App Brand */}
          <div className="relative z-10 flex items-center gap-3">
            {clubInfo?.logoUrl ? (
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-1.5 shadow-inner shrink-0">
                <img 
                  src={clubInfo.logoUrl} 
                  alt={clubInfo.nombre} 
                  className="w-full h-full object-contain animate-fade-in" 
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-1.5 shadow-inner shrink-0">
                <img 
                  src="/logo_simbolo.png" 
                  alt="Fichaje" 
                  className="w-full h-full object-contain animate-fade-in" 
                />
              </div>
            )}
            <span className="text-xs font-black tracking-[0.25em] uppercase truncate max-w-[140px] text-white/95 italic">
              {clubInfo ? clubInfo.nombre : 'FICHAJE'}
            </span>
          </div>

          {/* Left Center: Bold Greeting text */}
          <div className="relative z-10 my-auto py-8 md:py-0 space-y-3 text-left">
            <h2 className="text-2xl md:text-3xl font-black leading-tight tracking-tight uppercase italic text-white">
              Bienvenido de Nuevo
            </h2>
            <p className="text-xs md:text-sm text-white/80 font-medium leading-relaxed max-w-[280px]">
              Ingresa al portal de administración deportiva de tu club.
            </p>
          </div>

          {/* Left Bottom: Copyright info */}
          <div className="relative z-10 text-[10px] text-white/50 tracking-wider font-semibold uppercase italic text-left">
            © 2026 {clubInfo ? clubInfo.nombre : 'Fichaje App'}.
          </div>
        </div>

        {/* Right Side (Form Panel) */}
        <div className="flex-1 p-8 md:p-12 bg-white flex flex-col justify-center relative z-10 text-[#182332]">
          
          {/* Header */}
          <div className="mb-6 space-y-1 text-left">
            <h3 className="text-2xl font-black text-[#182332] uppercase italic tracking-wide">
              Iniciar Sesión
            </h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Digita tus credenciales para acceder
            </p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-xs text-left flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 w-full">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="font-semibold">{error}</span>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1 italic">
                  Correo electrónico
                </label>
                <input 
                  type="email" 
                  required 
                  placeholder="correo@ejemplo.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-club-primary focus:border-club-primary bg-[#f8fafc] text-gray-900 placeholder-gray-400 transition-all duration-200 text-sm shadow-sm" 
                  disabled={loading} 
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1 italic">
                  Contraseña
                </label>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-club-primary focus:border-club-primary bg-[#f8fafc] text-gray-900 placeholder-gray-400 transition-all duration-200 text-sm shadow-sm" 
                  disabled={loading} 
                />
              </div>
            </div>

            <div className="flex justify-between items-center px-1 text-xs">
              <div className="flex items-center">
                <input 
                  id="remember_me" 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                  className="h-4.5 w-4.5 rounded-lg border-gray-300 text-club-primary focus:ring-club-primary accent-club-primary cursor-pointer transition-all duration-200" 
                />
                <label htmlFor="remember_me" className="ml-2 text-xs text-gray-400 font-bold italic hover:text-gray-950 transition-colors cursor-pointer select-none">
                  Recordarme
                </label>
              </div>
              <button type="button" className="text-xs text-gray-400 font-bold hover:text-club-primary transition-colors italic">
                ¿Olvido clave?
              </button>
            </div>
            
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full theme-btn-primary hover:text-club-primary font-black py-4.5 rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg uppercase tracking-wider text-[11px] italic flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>{loading ? 'Validando...' : 'Ingresar'}</span>
            </button>

            <div className="pt-4 text-center border-t border-gray-100 mt-2">
              <Link to="/registro-club" className="text-[10px] font-black text-gray-400 hover:text-club-primary transition-colors uppercase tracking-widest italic">
                ¿Nuevo club? REGISTRATE AQUÍ
              </Link>
            </div>
          </form>
        </div>
      </div>

      {showSuspendedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white border border-gray-100 rounded-[40px] p-12 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-2xl font-black text-black uppercase italic mb-4">Acceso Bloqueado</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-loose mb-10">Tu organización ha sido suspendida. Contacta con administración.</p>
            <button onClick={() => setShowSuspendedModal(false)} className="w-full py-5 bg-[#182332] text-white hover:text-club-primary font-black rounded-2xl uppercase italic tracking-widest hover:bg-[#202f43]">Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}
