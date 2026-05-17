import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Club } from '../../types';
import { 
  Building2, Search, Filter, LayoutDashboard, 
  Settings, Eye, ShieldAlert, CheckCircle2,
  MapPin, Globe, Phone, Mail, Trophy, CreditCard,
  Plus, MoreVertical, Hash, Calendar, ArrowLeft,
  Trash2, ShieldCheck, Lock, AlertTriangle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ClubList() {
  const navigate = useNavigate();
  const { setActiveClubId, setIsViewOnly } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // View Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [deportes, setDeportes] = useState<any[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [clubDebts, setClubDebts] = useState<Record<string, { plan: number, commissions: number, total: number }>>({});
  const [clubRevenues, setClubRevenues] = useState<Record<string, number>>({});

  // Form State for Edit
  const [editForm, setEditForm] = useState({
    nombre: '',
    deporte_id: '',
    plan_id: ''
  });

  // Custom Confirmation Modal
  const [confirmAction, setConfirmAction] = useState<{
     isOpen: boolean;
     club: Club | null;
     action: 'suspender' | 'activar';
  }>({ isOpen: false, club: null, action: 'suspender' });

  // Delete Security Modal
  const [deleteSecurity, setDeleteSecurity] = useState<{
    isOpen: boolean;
    club: Club | null;
    password: '';
    isVerifying: boolean;
    error: string | null;
  }>({ isOpen: false, club: null, password: '', isVerifying: false, error: null });

  useEffect(() => {
    fetchClubs();
    fetchDeportes();
    fetchPlanes();
    // Al estar en esta lista, resetear el modo visualización
    setIsViewOnly(false);
  }, []);

  useEffect(() => {
    if (clubs.length > 0) {
      calculateAllDebts();
    }
  }, [clubs]);

  const calculateAllDebts = async () => {
    const debts: Record<string, { plan: number, commissions: number, total: number }> = {};
    const revenues: Record<string, number> = {};
    
    for (const club of clubs) {
      // 1. Mensualidad del plan (Deuda base)
      const planFee = club.planes_suscripcion?.precio || 0;
      let commissionsTotal = 0;
      let currentRevenue = 0;
      const comisionFija = club.planes_suscripcion?.comision || 0;

      // 2. Escenarios (Reservas)
      try {
        const { data: clubReservations } = await supabase
          .from('reserva_escenario')
          .select('monto_total, equipos!inner(club_id)')
          .eq('equipos.club_id', club.id)
          .eq('estado', 'confirmada');
          
        if (clubReservations) {
          const resCount = clubReservations.length;
          const resTotal = clubReservations.reduce((acc, res) => acc + (res.monto_total || 0), 0);
          
          currentRevenue += resTotal;
          commissionsTotal += (resCount * comisionFija);
        }
      } catch (err) {
        console.error(`Error calculating revenue/commission for club ${club.id}:`, err);
      }

      // 3. Cartera (Pagos de Deportistas)
      try {
        const { data: carteraPayments } = await supabase
          .from('cartera')
          .select('monto')
          .eq('club_id', club.id)
          .eq('estado', 'pagado');
          
        if (carteraPayments) {
          const payCount = carteraPayments.length;
          const payTotal = carteraPayments.reduce((acc, pay) => acc + (pay.monto || 0), 0);
          
          currentRevenue += payTotal;
          commissionsTotal += (payCount * comisionFija);
        }
      } catch (err) {
        console.error(`Error calculating cartera revenue/commission for club ${club.id}:`, err);
      }
      
      debts[club.id] = {
        plan: planFee,
        commissions: commissionsTotal,
        total: planFee + commissionsTotal
      };
      revenues[club.id] = currentRevenue;
    }
    
    setClubDebts(debts);
    setClubRevenues(revenues);
  };

  const fetchDeportes = async () => {
    try {
      const { data } = await supabase.from('deportes').select('*').order('nombre');
      setDeportes(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPlanes = async () => {
    try {
      const { data } = await supabase.from('planes_suscripcion').select('*').eq('estado', true).order('precio');
      setPlanes(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clubes')
        .select('*, deportes(nombre), planes_suscripcion(nombre, precio, comision)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClubs(data || []);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEstado = (club: Club) => {
    const action = club.estado === 'suspendido' ? 'activar' : 'suspender';
    setConfirmAction({ isOpen: true, club, action });
  };

  const executeToggleAction = async () => {
    if (!confirmAction.club) return;
    const club = confirmAction.club;
    const nuevoEstado = confirmAction.action === 'suspender' ? 'suspendido' : 'activo';

    setUpdating(club.id);
    setConfirmAction({ ...confirmAction, isOpen: false });

    try {
      const { error } = await supabase
        .from('clubes')
        .update({ estado: nuevoEstado })
        .eq('id', club.id);

      if (error) throw error;
      
      setClubs(clubs.map(c => 
        c.id === club.id ? { ...c, estado: nuevoEstado } : c
      ));
      
      if (selectedClub && selectedClub.id === club.id) {
        setSelectedClub({ ...selectedClub, estado: nuevoEstado });
      }

    } catch (error: any) {
      console.error('Error toggling club status:', error);
    } finally {
      setUpdating(null);
    }
  };

  const openViewModal = (club: Club) => {
    setSelectedClub(club);
    setIsViewModalOpen(true);
  };

  const openEditModal = (club: Club) => {
    setSelectedClub(club);
    setEditForm({
      nombre: club.nombre,
      deporte_id: club.deporte_id || '',
      plan_id: club.plan_id || ''
    });
    setIsEditModalOpen(true);
  };

  const openDeleteSecurity = (club: Club) => {
    setDeleteSecurity({ ...deleteSecurity, isOpen: true, club, password: '', error: null });
  };

  const executeSecureDelete = async () => {
    if (!deleteSecurity.club) return;
    setDeleteSecurity(prev => ({ ...prev, isVerifying: true, error: null }));

    try {
      // 1. Validar password de SuperAdmin
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || '',
        password: deleteSecurity.password
      });

      if (authError) throw new Error("CONTRASEÑA DE AUTORIZACIÓN INCORRECTA");

      // 2. Verificar integridad (No permitir si hay deportistas o usuarios)
      const { count: athleteCount } = await supabase.from('deportistas').select('*', { count: 'exact', head: true }).eq('club_id', deleteSecurity.club.id);
      const { count: adminCount } = await supabase.from('perfiles').select('*', { count: 'exact', head: true }).eq('club_id', deleteSecurity.club.id);

      if ((athleteCount || 0) > 0 || (adminCount || 0) > 0) {
        throw new Error(`BLOQUEO DE INTEGRIDAD: El club tiene ${(athleteCount || 0)} deportistas y ${(adminCount || 0)} usuarios asociados. Elimínalos primero.`);
      }

      // 3. Proceder con la eliminación
      const { error: deleteError } = await supabase.from('clubes').delete().eq('id', deleteSecurity.club.id);
      if (deleteError) throw deleteError;

      setClubs(clubs.filter(c => c.id !== deleteSecurity.club?.id));
      setDeleteSecurity(prev => ({ ...prev, isOpen: false }));
      alert("✅ Club eliminado permanentemente del sistema.");

    } catch (error: any) {
      setDeleteSecurity(prev => ({ ...prev, error: error.message }));
    } finally {
      setDeleteSecurity(prev => ({ ...prev, isVerifying: false }));
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClub) return;

    setUpdating(selectedClub.id);
    try {
      const { error } = await supabase
        .from('clubes')
        .update({
          nombre: editForm.nombre,
          deporte_id: editForm.deporte_id || null,
          plan_id: editForm.plan_id || null
        })
        .eq('id', selectedClub.id);

      if (error) throw error;

      await fetchClubs();
      setIsEditModalOpen(false);
    } catch (error: any) {
      alert(`Error al actualizar el club: ${error.message}`);
    } finally {
      setUpdating(null);
    }
  };

  const handleVisualize = (club: Club) => {
    setActiveClubId(club.id);
    setIsViewOnly(true);
    navigate('/club');
  };

  const filteredClubs = clubs.filter(club => 
    club.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] -m-8 p-8">
      {/* Header Premium */}
      <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/superadmin')}
                className="p-2 hover:bg-white dark:hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-black dark:hover:text-white"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="h-10 w-1 bg-[#CCFF00] rounded-full"></div>
              <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">
                Clubes <span className="text-[#CCFF00]">Deportivos</span>
              </h1>
            </div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] ml-14">
              Control Maestro de Organizaciones • {clubs.length} Registros
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
            <div className="relative group min-w-[300px]">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#CCFF00] transition-colors">
                <Search size={18} />
              </div>
              <input 
                type="text"
                placeholder="BUSCAR CLUB..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-14 bg-white dark:bg-[#1e293b] border-0 rounded-2xl pl-12 pr-6 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-[#CCFF00] shadow-sm transition-all outline-none text-gray-900 dark:text-white"
              />
            </div>
            <button className="h-14 px-6 bg-white dark:bg-[#1e293b] rounded-2xl flex items-center justify-center gap-2 text-gray-400 hover:text-[#CCFF00] transition-all shadow-sm border-0">
              <Filter size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Filtros</span>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white dark:bg-[#1e293b] rounded-[40px] shadow-2xl shadow-black/5 overflow-hidden border border-gray-100 dark:border-white/5">
          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-gray-100 dark:border-white/5 border-t-[#CCFF00] rounded-full animate-spin"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sincronizando Base de Datos...</p>
            </div>
          ) : filteredClubs.length === 0 ? (
            <div className="py-32 flex flex-col items-center justify-center text-center px-4">
              <div className="w-24 h-24 bg-gray-50 dark:bg-white/5 rounded-[40px] flex items-center justify-center mb-6">
                <Building2 className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic">No se encontraron clubes</h3>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-2">Ajusta los filtros de búsqueda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-black/20 border-b border-gray-100 dark:border-white/5">
                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Organización</th>
                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Estado</th>
                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Deporte / Plan</th>
                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Registro</th>
                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ingresos Recaudados</th>
                    <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Deuda Sistema</th>
                    <th className="px-8 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredClubs.map((club) => (
                    <tr key={club.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all duration-300">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-2xl bg-black dark:bg-white/10 flex items-center justify-center text-[#CCFF00] font-black italic text-xl shadow-lg border border-white/5 group-hover:scale-110 transition-transform">
                            {club.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic leading-none">{club.nombre}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <MapPin size={10} className="text-gray-400" />
                              <p className="text-[10px] font-bold text-gray-400 uppercase">{club.ciudad || '---'}, {club.pais || '---'}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          club.estado === 'suspendido' 
                          ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                          : 'bg-[#CCFF00]/10 text-black dark:text-[#CCFF00] border border-[#CCFF00]/20'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${club.estado === 'suspendido' ? 'bg-red-500' : 'bg-[#CCFF00]'}`}></div>
                          {club.estado === 'suspendido' ? 'Suspendido' : 'Activo'}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Trophy size={12} className="text-[#CCFF00]" />
                            <p className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase italic">
                              {club.deportes?.nombre || 'General'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <CreditCard size={12} className="text-purple-500" />
                            <p className="text-[9px] font-bold text-gray-400 uppercase">
                              {club.planes_suscripcion?.nombre || 'Plan Legacy'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-gray-400 font-bold text-[10px]">
                          <Calendar size={12} />
                          {format(new Date(club.created_at), 'dd MMM yyyy', { locale: es }).toUpperCase()}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 italic">
                            ${(clubRevenues[club.id] || 0).toLocaleString()}
                          </p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                            TOTAL RECAUDADO
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Mensualidad:</span>
                            <span className="text-[10px] font-black text-gray-900 dark:text-white">
                              ${(clubDebts[club.id]?.plan || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Comisiones:</span>
                            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">
                              ${(clubDebts[club.id]?.commissions || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="h-[1px] bg-gray-100 dark:bg-white/5 my-0.5"></div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-tighter">Total Deuda:</span>
                            <span className="text-sm font-black text-red-600 dark:text-red-400 italic">
                              ${(clubDebts[club.id]?.total || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleVisualize(club)}
                            className="p-3 bg-[#CCFF00] text-black rounded-2xl hover:scale-110 transition-all shadow-lg shadow-[#CCFF00]/20 group/btn relative"
                            title="Visualizar Panel"
                          >
                            <LayoutDashboard size={18} />
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] font-black px-2 py-1 rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity uppercase tracking-widest whitespace-nowrap">Dashboard</span>
                          </button>
                          
                          <button 
                            onClick={() => openEditModal(club)}
                            className="p-3 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-blue-500 rounded-2xl hover:scale-110 transition-all group/btn relative"
                            title="Editar"
                          >
                            <Settings size={18} />
                          </button>

                          <button 
                            onClick={() => openViewModal(club)}
                            className="p-3 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-[#CCFF00] rounded-2xl hover:scale-110 transition-all group/btn relative"
                            title="Ver Ficha"
                          >
                            <Eye size={18} />
                          </button>

                          <button 
                            onClick={() => handleToggleEstado(club)}
                            disabled={updating === club.id}
                            className={`p-3 rounded-2xl hover:scale-110 transition-all ${
                              club.estado === 'suspendido'
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-red-500/10 text-red-500'
                            }`}
                          >
                            {club.estado === 'suspendido' ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
                          </button>

                          <button 
                            onClick={() => openDeleteSecurity(club)}
                            className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:scale-110 transition-all"
                            title="Eliminar permanentemente"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modales modernizados */}
      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)}
        title="Expediente Institucional"
      >
        {selectedClub && (
          <div className="space-y-8 p-2">
            <div className="flex items-center gap-6 p-6 bg-black rounded-[32px] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-[#CCFF00]/10 blur-3xl rounded-full"></div>
               <div className="h-20 w-20 rounded-3xl bg-white/10 flex items-center justify-center text-[#CCFF00] font-black italic text-3xl border border-white/10 shrink-0">
                 {selectedClub.nombre.charAt(0).toUpperCase()}
               </div>
               <div>
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">{selectedClub.nombre}</h3>
                  <div className="mt-3 flex items-center gap-3">
                    <Badge className={selectedClub.estado === 'suspendido' ? 'bg-red-500 text-white border-none' : 'bg-[#CCFF00] text-black border-none'}>
                      {selectedClub.estado === 'suspendido' ? 'SUSPENDIDO' : 'ACTIVO'}
                    </Badge>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">Desde {format(new Date(selectedClub.created_at), 'yyyy')}</span>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-3xl space-y-1">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Ubicación</p>
                <p className="text-xs font-black text-gray-900 dark:text-white uppercase italic">{selectedClub.ciudad || '---'}, {selectedClub.pais || '---'}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-3xl space-y-1">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Deporte</p>
                <p className="text-xs font-black text-[#CCFF00] uppercase italic">{selectedClub.deportes?.nombre || 'General'}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-3xl space-y-1 col-span-2">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Dirección</p>
                <p className="text-xs font-black text-gray-900 dark:text-white uppercase italic">{selectedClub.direccion || 'No registrada'}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-3xl space-y-1">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Contacto</p>
                <p className="text-xs font-black text-gray-900 dark:text-white italic">{selectedClub.telefono || '---'}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-3xl space-y-1">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Plan Actual</p>
                <p className="text-xs font-black text-purple-500 uppercase italic">{selectedClub.planes_suscripcion?.nombre || 'Legacy'}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
              <Button variant="ghost" className="rounded-2xl" onClick={() => setIsViewModalOpen(false)}>
                Cerrar Expediente
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Editar Club */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Configuración de Club"
      >
        <form onSubmit={handleSaveEdit} className="space-y-6 p-2">
          <Input 
            label="NOMBRE DE LA ORGANIZACIÓN"
            value={editForm.nombre}
            onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
            className="h-14 bg-gray-50 dark:bg-white/5 border-0 font-black italic uppercase"
            required
            icon={<Building2 size={18} />}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Deporte Base</label>
              <select
                className="w-full h-14 bg-gray-50 dark:bg-white/5 border-0 rounded-2xl px-5 text-xs font-black uppercase italic tracking-widest outline-none focus:ring-2 focus:ring-[#CCFF00] text-gray-900 dark:text-white"
                value={editForm.deporte_id}
                onChange={(e) => setEditForm({ ...editForm, deporte_id: e.target.value })}
                required
              >
                <option value="" disabled>Seleccionar...</option>
                {deportes.map(dep => (
                  <option key={dep.id} value={dep.id} className="bg-white dark:bg-[#1e293b]">{dep.nombre.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Plan de Suscripción</label>
              <select
                className="w-full h-14 bg-gray-50 dark:bg-white/5 border-0 rounded-2xl px-5 text-xs font-black uppercase italic tracking-widest outline-none focus:ring-2 focus:ring-[#CCFF00] text-gray-900 dark:text-white"
                value={editForm.plan_id}
                onChange={(e) => setEditForm({ ...editForm, plan_id: e.target.value })}
              >
                <option value="">Legacy (Ilimitado)</option>
                {planes.map(plan => (
                  <option key={plan.id} value={plan.id} className="bg-white dark:bg-[#1e293b]">{plan.nombre.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-[#CCFF00]/5 p-4 rounded-3xl border border-[#CCFF00]/10">
            <p className="text-[9px] font-black text-[#CCFF00] uppercase tracking-widest leading-relaxed">
              * Nota: Cambiar el plan afectará los módulos disponibles para los administradores del club de manera inmediata.
            </p>
          </div>

          <div className="flex gap-4 pt-6">
            <Button type="button" variant="ghost" className="flex-1 h-14 rounded-3xl uppercase font-black" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-[2] h-14 bg-black text-[#CCFF00] font-black uppercase italic tracking-widest rounded-3xl shadow-xl" isLoading={updating === selectedClub?.id}>
              Guardar Cambios
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmación Suspension/Activación */}
      {confirmAction.isOpen && confirmAction.club && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1e293b] rounded-[48px] p-10 max-w-md w-full shadow-2xl text-center animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-[#CCFF00] to-transparent"></div>
            
            <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto mb-8 ${
              confirmAction.action === 'suspender' 
              ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
              : 'bg-[#CCFF00]/10 text-[#CCFF00] border border-[#CCFF00]/20'
            }`}>
               {confirmAction.action === 'suspender' ? <ShieldAlert size={32} /> : <CheckCircle2 size={32} />}
            </div>
            
            <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-3 uppercase italic tracking-tighter">
               {confirmAction.action === 'suspender' ? 'Confirmar Suspensión' : 'Activar Organización'}
            </h3>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-10 leading-relaxed uppercase tracking-wide">
              ¿Estás seguro de que deseas <strong>{confirmAction.action}</strong> el club <span className="text-black dark:text-white underline decoration-[#CCFF00] decoration-2">"{confirmAction.club.nombre}"</span>? 
            </p>
            
            <div className="flex flex-col gap-3">
               <button
                 onClick={executeToggleAction}
                 className={`w-full py-5 px-8 font-black uppercase italic tracking-widest rounded-[24px] shadow-xl transition-all hover:scale-105 active:scale-95 ${
                   confirmAction.action === 'suspender' ? 'bg-red-600 text-white' : 'bg-[#CCFF00] text-black'
                 }`}
               >
                 Sí, {confirmAction.action} ahora
               </button>
               <button
                 onClick={() => setConfirmAction({ isOpen: false, club: null, action: 'suspender' })}
                 className="w-full py-4 px-8 font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
               >
                 Cancelar Operación
               </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Seguridad Crítica - Eliminación */}
      <Modal
        isOpen={deleteSecurity.isOpen}
        onClose={() => setDeleteSecurity({ ...deleteSecurity, isOpen: false })}
        title="Protocolo de Destrucción de Registro"
      >
        <div className="space-y-6 p-2">
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-[32px] flex items-center gap-5">
            <AlertTriangle size={40} className="text-red-500 shrink-0" />
            <div>
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none mb-1">Advertencia de Seguridad</p>
              <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic leading-tight">
                Estás a punto de eliminar permanentemente el club "{deleteSecurity.club?.nombre}".
              </p>
            </div>
          </div>

          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 leading-relaxed">
            Esta acción es irreversible y destruirá todos los registros asociados a esta organización. Se requiere autorización de nivel SuperAdmin.
          </p>

          {deleteSecurity.error && (
            <div className="p-4 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest animate-shake">
              {deleteSecurity.error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirmar Identidad (Password)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                <Lock size={18} />
              </div>
              <input 
                type="password"
                placeholder="INGRESAR CONTRASEÑA DE SUPERADMIN"
                value={deleteSecurity.password}
                onChange={(e) => setDeleteSecurity({ ...deleteSecurity, password: e.target.value as any })}
                className="w-full h-14 bg-gray-50 dark:bg-white/5 border-0 rounded-2xl pl-12 pr-6 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-red-500 outline-none text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              variant="ghost" 
              className="flex-1 h-14 rounded-3xl font-black uppercase"
              onClick={() => setDeleteSecurity({ ...deleteSecurity, isOpen: false })}
            >
              Abortar
            </Button>
            <Button 
              className="flex-[2] h-14 bg-red-600 text-white font-black uppercase italic tracking-widest rounded-3xl shadow-xl shadow-red-500/20"
              onClick={executeSecureDelete}
              isLoading={deleteSecurity.isVerifying}
              disabled={!deleteSecurity.password}
            >
              Confirmar Destrucción
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
