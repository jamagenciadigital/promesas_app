import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  ArrowLeft, User, Mail, Phone, Shield, TrendingUp, 
  Trash2, AlertTriangle, MapPin, CheckCircle2,
  Trophy, Star, Calendar, Hash
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { Badge } from '../../components/ui/Badge';

export default function RegisterElitePlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [positions, setPositions] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [newPlayer, setNewPlayer] = useState<any>({
    nombre_completo: '',
    apellidos: '',
    segundo_apellido: '',
    tipo_documento: 'tarjeta identidad',
    numero_documento: '',
    genero: '',
    fecha_nacimiento: '',
    celular_deportista: '',
    email_deportista: '',
    lugar_nacimiento: '',
    peso: '',
    estatura: '',
    alias: '',
    dorsal: '',
    foto_url: '',
    posicion_id: ''
  });
  const [newTrayectorias, setNewTrayectorias] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
      
      let query = supabase
        .from('equipos')
        .select(`
          *,
          club:clubes(deporte_id)
        `);
      
      if (isUUID) {
        query = query.eq('id', id);
      } else {
        query = query.ilike('codigo', id || '');
      }

      const { data: teamData, error: teamError } = await query.single();
      
      if (teamError) throw teamError;
      if (!teamData) {
        throw new Error("No se encontró el equipo o no tienes permisos.");
      }
      setTeam(teamData);

      // Fetch Positions
      let deporteId = null;
      if (teamData?.club) {
        if (Array.isArray(teamData.club)) {
          deporteId = teamData.club[0]?.deporte_id;
        } else {
          deporteId = (teamData.club as any).deporte_id;
        }
      }

      // Fallback: If join didn't work, fetch club directly
      if (!deporteId && teamData?.club_id) {
        const { data: directClub } = await supabase
          .from('clubes')
          .select('deporte_id')
          .eq('id', teamData.club_id)
          .single();
        deporteId = directClub?.deporte_id;
      }

      if (deporteId) {
        const { data: posData, error: posError } = await supabase
          .from('deportes_config_campos')
          .select('id, valor')
          .eq('deporte_id', deporteId)
          .eq('tipo_campo', 'posicion')
          .order('valor');
        if (posError) throw posError;
        setPositions(posData || []);
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      showToast("Error cargando datos del equipo o posiciones", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team?.id || !profile?.club_id) {
      showToast("Error: Información de club no disponible", "error");
      return;
    }

    try {
      setSaving(true);
      const newDeportistaId = crypto.randomUUID();
      
      // Prepare data (convert numeric strings to numbers or null)
      const playerToSave = {
        id: newDeportistaId,
        ...newPlayer,
        club_id: profile.club_id,
        equipo_id: team.id,
        posicion_id: newPlayer.posicion_id || null,
        peso: newPlayer.peso ? parseFloat(newPlayer.peso) : null,
        estatura: newPlayer.estatura ? parseFloat(newPlayer.estatura) : null,
        dorsal: newPlayer.dorsal ? parseInt(newPlayer.dorsal) : null
      };

      // 1. Insert Deportista
      const { data: player, error: playerError } = await supabase
        .from('deportistas')
        .insert(playerToSave)
        .select()
        .single();
      
      if (playerError) throw playerError;

      // 2. Insert Trayectorias
      if (newTrayectorias.length > 0) {
        const trayData = newTrayectorias.map(t => ({
          ...t,
          deportista_id: newDeportistaId
        }));
        const { error: trayError } = await supabase
          .from('trayectorias_deportivas')
          .insert(trayData);
        if (trayError) console.error("Error saving trayectorias:", trayError);
      }

      showToast('Deportista registrado exitosamente');
      
      // Redirect back to dashboard
      const pathPrefix = profile?.rol === 'admin_club' ? 'club' : 'sports-dir';
      setTimeout(() => {
        navigate(`/${pathPrefix}/teams/${id}`);
      }, 1500);

    } catch (err: any) {
      console.error("Error saving player:", err);
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CCFF00]"></div>
      </div>
    );
  }

  const pathPrefix = profile?.rol === 'admin_club' ? 'club' : 'sports-dir';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap md:items-center justify-between gap-6 bg-white dark:bg-[#1e293b]/40 p-10 rounded-[48px] border border-gray-100 dark:border-white/5 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-[#CCFF00]/5 blur-[80px] -mr-32 -mt-32 rounded-full"></div>
         
         <div className="space-y-4 relative z-10">
            <button 
              onClick={() => navigate(`/${pathPrefix}/teams/${id}`)}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group mb-4"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-black uppercase tracking-[0.2em] italic">Volver al Plantel</span>
            </button>
            <div className="flex items-center gap-4">
               <div className="p-4 bg-[#CCFF00]/10 rounded-3xl">
                  <Star className="w-8 h-8 text-[#CCFF00]" />
               </div>
               <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">
                     Registro de <span className="text-[#CCFF00]">Elite</span>
                  </h1>
                  <p className="text-gray-400 dark:text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">
                     Creando perfil técnico para {team?.nombre}
                  </p>
               </div>
            </div>
         </div>

         <div className="flex items-center gap-4 relative z-10">
            <Badge className="bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-none px-6 py-3 rounded-2xl font-black tracking-widest text-[10px] italic">
               MODO ADMINISTRADOR
            </Badge>
         </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* Lado Izquierdo: Foto y Datos Pro */}
         <div className="lg:col-span-1 space-y-8">
            <div className="bg-white dark:bg-[#1e293b]/40 p-8 rounded-[40px] border border-gray-100 dark:border-white/5 space-y-8">
               <div className="flex items-center gap-2 mb-2">
                  <div className="h-1 w-8 bg-[#CCFF00] rounded-full"></div>
                  <h4 className="text-sm font-black uppercase italic tracking-widest text-gray-900 dark:text-white">Imagen de Portada</h4>
               </div>
               <ImageUpload
                  value={newPlayer.foto_url}
                  onChange={(url) => setNewPlayer({...newPlayer, foto_url: url})}
                  bucket="atleta-fotos"
                  label="Cargar Foto de Perfil"
               />
               <div className="space-y-4">
                  <Input 
                    label="Alias / Nombre Deportivo"
                    placeholder="Ej: El Rayo"
                    value={newPlayer.alias || ''}
                    onChange={(e) => setNewPlayer({...newPlayer, alias: e.target.value})}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Dorsal"
                      placeholder="10"
                      value={newPlayer.dorsal || ''}
                      onChange={(e) => setNewPlayer({...newPlayer, dorsal: e.target.value})}
                    />
                    <Input 
                      label="Lugar de Nacimiento"
                      placeholder="Ciudad, País"
                      value={newPlayer.lugar_nacimiento || ''}
                      onChange={(e) => setNewPlayer({...newPlayer, lugar_nacimiento: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Posición</label>
                    <select 
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl text-sm focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all dark:text-white appearance-none"
                      value={newPlayer.posicion_id}
                      onChange={(e) => setNewPlayer({...newPlayer, posicion_id: e.target.value})}
                    >
                      <option value="">Seleccionar posición</option>
                      {positions.map(p => (
                        <option key={p.id} value={p.id}>{p.valor}</option>
                      ))}
                    </select>
                  </div>
               </div>
            </div>

            <div className="bg-white dark:bg-[#1e293b]/40 p-8 rounded-[40px] border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2 mb-6">
                   <TrendingUp size={18} className="text-[#CCFF00]" />
                   <h4 className="text-sm font-black uppercase italic tracking-widest text-gray-900 dark:text-white">Antropometría</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <Input 
                     label="Estatura (cm)"
                     type="number"
                     placeholder="175"
                     value={newPlayer.estatura}
                     onChange={(e) => setNewPlayer({...newPlayer, estatura: e.target.value})}
                   />
                   <Input 
                     label="Peso (kg)"
                     type="number"
                     placeholder="70"
                     value={newPlayer.peso}
                     onChange={(e) => setNewPlayer({...newPlayer, peso: e.target.value})}
                   />
                </div>
            </div>
         </div>

         {/* Lado Derecho: Datos Personales y Trayectoria */}
         <div className="lg:col-span-2 space-y-8">
            {/* Tarjeta: Datos Civiles */}
            <div className="bg-white dark:bg-[#1e293b]/40 p-10 rounded-[48px] border border-gray-100 dark:border-white/5 space-y-8">
               <div className="flex items-center gap-2 pb-4 border-b border-gray-50 dark:border-white/5">
                  <User className="w-5 h-5 text-[#CCFF00]" />
                  <h4 className="text-base font-black uppercase italic italic tracking-widest text-gray-900 dark:text-white">Información Civil</h4>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Input label="Nombres" required value={newPlayer.nombre_completo} onChange={(e) => setNewPlayer({...newPlayer, nombre_completo: e.target.value})} />
                  <Input label="Primer Apellido" required value={newPlayer.apellidos} onChange={(e) => setNewPlayer({...newPlayer, apellidos: e.target.value})} />
                  <Input label="Segundo Apellido" value={newPlayer.segundo_apellido} onChange={(e) => setNewPlayer({...newPlayer, segundo_apellido: e.target.value})} />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Tipo Documento</label>
                    <select 
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl text-sm focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all dark:text-white appearance-none"
                      value={newPlayer.tipo_documento}
                      onChange={(e) => setNewPlayer({...newPlayer, tipo_documento: e.target.value})}
                    >
                      <option value="registro civil">Registro Civil</option>
                      <option value="tarjeta identidad">Tarjeta Identidad</option>
                      <option value="cedula">Cédula</option>
                      <option value="pasaporte">Pasaporte</option>
                    </select>
                  </div>
                  <Input label="Número Documento" required value={newPlayer.numero_documento} onChange={(e) => setNewPlayer({...newPlayer, numero_documento: e.target.value})} />
                  <Input label="Fecha Nacimiento" type="date" required value={newPlayer.fecha_nacimiento} onChange={(e) => setNewPlayer({...newPlayer, fecha_nacimiento: e.target.value})} />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Género</label>
                    <select 
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl text-sm focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all dark:text-white appearance-none"
                      value={newPlayer.genero}
                      onChange={(e) => setNewPlayer({...newPlayer, genero: e.target.value})}
                    >
                      <option value="">Seleccionar</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <Input label="Celular de Contacto" value={newPlayer.celular_deportista} onChange={(e) => setNewPlayer({...newPlayer, celular_deportista: e.target.value})} />
                  <Input label="Correo Personal" type="email" value={newPlayer.email_deportista} onChange={(e) => setNewPlayer({...newPlayer, email_deportista: e.target.value})} />
               </div>
            </div>

            {/* Tarjeta: Trayectoria Deportiva */}
            <div className="bg-white dark:bg-[#1e293b]/40 p-10 rounded-[48px] border border-gray-100 dark:border-white/5 space-y-8">
               <div className="flex items-center gap-2 pb-4 border-b border-gray-50 dark:border-white/5">
                  <Shield className="w-5 h-5 text-[#CCFF00]" />
                  <h4 className="text-base font-black uppercase italic italic tracking-widest text-gray-900 dark:text-white">Perfil Trayectoria Deportiva</h4>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Clubes Anteriores</p>
                     {newTrayectorias.length === 0 ? (
                       <div className="p-8 border-2 border-dashed border-gray-100 dark:border-white/10 rounded-3xl text-center">
                          <Trophy className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Sin historial registrado</p>
                       </div>
                     ) : (
                       <div className="space-y-2">
                          {newTrayectorias.map((tray, idx) => (
                             <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                                <div>
                                   <p className="text-[11px] font-black uppercase italic italic">{tray.equipo_nombre}</p>
                                   <p className="text-[10px] text-gray-400">{tray.temporada_inicio} - {tray.temporada_fin || 'Presente'}</p>
                                </div>
                                <button type="button" onClick={() => setNewTrayectorias(newTrayectorias.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-500/10 p-2 rounded-xl transition-all">
                                   <Trash2 size={16} />
                                </button>
                             </div>
                          ))}
                       </div>
                     )}
                  </div>

                  <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-3xl border border-[#CCFF00]/10 flex flex-col gap-4">
                     <p className="text-[10px] font-black uppercase tracking-widest text-[#CCFF00]">Registrar Experiencia</p>
                     <input id="pg-equipo" className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-white/5 rounded-xl text-xs outline-none" placeholder="Nombre del Club" />
                     <div className="grid grid-cols-2 gap-3">
                        <input id="pg-inicio" className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-white/5 rounded-xl text-xs outline-none" placeholder="Desde (Año)" />
                        <input id="pg-fin" className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-white/5 rounded-xl text-xs outline-none" placeholder="Hasta (Vacío=Act)" />
                     </div>
                     <Button 
                       type="button" 
                       className="w-full bg-[#1e293b] dark:bg-[#CCFF00]/10 dark:text-[#CCFF00] border-none text-[10px] font-black uppercase h-12"
                       onClick={() => {
                          const e = (document.getElementById('pg-equipo') as HTMLInputElement).value;
                          const i = (document.getElementById('pg-inicio') as HTMLInputElement).value;
                          const f = (document.getElementById('pg-fin') as HTMLInputElement).value;
                          if (e && i) {
                             setNewTrayectorias([...newTrayectorias, { equipo_nombre: e, temporada_inicio: i, temporada_fin: f || null, es_actual: !f }]);
                             (document.getElementById('pg-equipo') as HTMLInputElement).value = '';
                             (document.getElementById('pg-inicio') as HTMLInputElement).value = '';
                             (document.getElementById('pg-fin') as HTMLInputElement).value = '';
                          }
                       }}
                     >
                        Añadir a la trayectoria
                     </Button>
                  </div>
               </div>
            </div>
         </div>
      </form>

      {/* Floating Action Bar */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-50">
         <div className="bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-2xl p-4 rounded-[32px] border border-white/20 shadow-2xl flex gap-4 items-center">
            <Button 
              type="button"
              variant="outline"
              onClick={() => navigate(`/${pathPrefix}/teams/${id}`)}
              className="flex-1 py-4 rounded-[24px] font-black uppercase text-[10px] tracking-widest italic"
            >
              Descartar
            </Button>
            <Button 
              type="submit"
              onClick={handleSave}
              isLoading={saving}
              className="flex-[2] bg-[#CCFF00] text-gray-900 py-6 rounded-[24px] font-black uppercase text-[12px] tracking-widest italic shadow-xl shadow-[#CCFF00]/20"
            >
              Publicar Perfil Elite
            </Button>
         </div>
      </div>

      {/* Global Toasts */}
      {toast && (
        <div className={`fixed top-10 right-10 z-[100] px-8 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-right-8 ${
          toast.type === 'success' ? 'bg-[#CCFF00] text-black border-[#CCFF00]' : 'bg-red-500 text-white border-red-500'
        }`}>
          <CheckCircle2 size={20} />
          <span className="font-black uppercase italic text-xs tracking-widest">{toast.message}</span>
        </div>
      )}

    </div>
  );
}
