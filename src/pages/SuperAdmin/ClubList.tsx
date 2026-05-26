import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Club } from '../../types';
import {
  Building2, Search, Filter, LayoutDashboard,
  Settings, Eye, ShieldAlert, CheckCircle2,
  MapPin, Globe, Phone, Mail, Trophy, CreditCard,
  Plus, MoreVertical, Hash, Calendar, ArrowLeft,
  Trash2, ShieldCheck, Lock, AlertTriangle, Users
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

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [deportes, setDeportes] = useState<any[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [clubDebts, setClubDebts] = useState<Record<string, { plan: number, commissions: number, total: number }>>({});
  const [clubRevenues, setClubRevenues] = useState<Record<string, number>>({});

  const [editForm, setEditForm] = useState({
    nombre: '',
    deporte_id: '',
    plan_id: ''
  });

  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    club: Club | null;
    action: 'suspender' | 'activar';
  }>({ isOpen: false, club: null, action: 'suspender' });

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
      const planFee = club.planes_suscripcion?.precio || 0;
      let commissionsTotal = 0;
      let currentRevenue = 0;
      const comisionFija = club.planes_suscripcion?.comision || 0;

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
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || '',
        password: deleteSecurity.password
      });

      if (authError) throw new Error("CONTRASEÑA DE AUTORIZACIÓN INCORRECTA");

      const { count: athleteCount } = await supabase.from('deportistas').select('*', { count: 'exact', head: true }).eq('club_id', deleteSecurity.club.id);
      const { count: adminCount } = await supabase.from('perfiles').select('*', { count: 'exact', head: true }).eq('club_id', deleteSecurity.club.id);

      if ((athleteCount || 0) > 0 || (adminCount || 0) > 0) {
        throw new Error(`BLOQUEO DE INTEGRIDAD: El club tiene ${(athleteCount || 0)} deportistas y ${(adminCount || 0)} usuarios asociados. Elimínalos primero.`);
      }

      const { error: deleteError } = await supabase.from('clubes').delete().eq('id', deleteSecurity.club.id);
      if (deleteError) throw deleteError;

      setClubs(clubs.filter(c => c.id !== deleteSecurity.club?.id));
      setDeleteSecurity(prev => ({ ...prev, isOpen: false }));
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
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#182332] tracking-tight">Clubes Deportivos</h1>
          <p className="text-sm text-gray-400 mt-1">Control Maestro de Organizaciones</p>
        </div>
        <div className="flex items-center gap-2 bg-[#182332] px-4 py-2 rounded-full">
          <Building2 size={14} className="text-[var(--primary)]" />
          <span className="text-[11px] font-semibold text-[var(--primary)]">{clubs.length} Clubes</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Buscar club..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 bg-white border border-gray-200 rounded-2xl pl-11 pr-4 text-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none text-gray-900 placeholder-gray-400 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="w-10 h-10 border-3 border-gray-100 border-t-[#182332] rounded-full animate-spin"></div>
          </div>
        ) : filteredClubs.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No se encontraron clubes</h3>
            <p className="text-sm text-gray-400 mt-1">Ajusta los filtros de búsqueda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-6 py-4 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Organización</th>
                  <th className="px-6 py-4 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Deporte / Plan</th>
                  <th className="px-6 py-4 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Registro</th>
                  <th className="px-6 py-4 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Ingresos</th>
                  <th className="px-6 py-4 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Deuda</th>
                  <th className="px-6 py-4 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredClubs.map((club) => (
                  <tr key={club.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#182332] flex items-center justify-center text-white font-bold text-sm">
                          {club.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{club.nombre}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <MapPin size={10} className="text-gray-400" />
                            <p className="text-[10px] font-medium text-gray-400">{club.ciudad || '---'}, {club.pais || '---'}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold ${
                        club.estado === 'suspendido'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${club.estado === 'suspendido' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        {club.estado === 'suspendido' ? 'Suspendido' : 'Activo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-600">{club.deportes?.nombre || 'General'}</p>
                        <p className="text-[10px] text-gray-400">{club.planes_suscripcion?.nombre || 'Plan Legacy'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-gray-400">
                        {format(new Date(club.created_at), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-emerald-600">
                        ${(clubRevenues[club.id] || 0).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-red-600">
                        ${(clubDebts[club.id]?.total || 0).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleVisualize(club)}
                          className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:scale-110 transition-all hover:bg-blue-50 hover:text-blue-500"
                          title="Visualizar Panel"
                        >
                          <LayoutDashboard size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(club)}
                          className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:scale-110 transition-all hover:bg-blue-50 hover:text-blue-500"
                          title="Editar"
                        >
                          <Settings size={16} />
                        </button>
                        <button
                          onClick={() => openViewModal(club)}
                          className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:scale-110 transition-all hover:bg-purple-50 hover:text-purple-500"
                          title="Ver ficha"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleEstado(club)}
                          disabled={updating === club.id}
                          className={`p-2 rounded-lg transition-all hover:scale-110 ${
                            club.estado === 'suspendido'
                            ? 'bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-500'
                            : 'bg-gray-50 text-gray-400 hover:bg-amber-50 hover:text-amber-500'
                          }`}
                        >
                          {club.estado === 'suspendido' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                        </button>
                        <button
                          onClick={() => openDeleteSecurity(club)}
                          className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:scale-110 transition-all hover:bg-red-50 hover:text-red-500"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
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

      {/* Modal: Ver ficha */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Ficha del Club"
      >
        {selectedClub && (
          <div className="modal-form space-y-6">
            <div className="flex items-center gap-4 p-4 bg-[#182332] rounded-xl">
              <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold text-2xl">
                {selectedClub.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{selectedClub.nombre}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    selectedClub.estado === 'suspendido' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {selectedClub.estado === 'suspendido' ? 'SUSPENDIDO' : 'ACTIVO'}
                  </span>
                  <span className="text-[10px] text-white/50">Desde {format(new Date(selectedClub.created_at), 'yyyy')}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Ubicación</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedClub.ciudad || '---'}, {selectedClub.pais || '---'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Deporte</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedClub.deportes?.nombre || 'General'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl col-span-2">
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Dirección</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedClub.direccion || 'No registrada'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Contacto</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedClub.telefono || '---'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Plan Actual</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedClub.planes_suscripcion?.nombre || 'Legacy'}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="ghost" className="rounded-xl" onClick={() => setIsViewModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Editar Club */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Configuración del Club"
      >
        <form onSubmit={handleSaveEdit} className="modal-form space-y-5">
          <Input
            label="Nombre de la organización"
            value={editForm.nombre}
            onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
            className="h-12 bg-gray-50 border border-gray-200 rounded-xl font-medium"
            required
            icon={<Building2 size={18} />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 ml-1">Deporte</label>
              <select
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-gray-900"
                value={editForm.deporte_id}
                onChange={(e) => setEditForm({ ...editForm, deporte_id: e.target.value })}
                required
              >
                <option value="" disabled>Seleccionar...</option>
                {deportes.map(dep => (
                  <option key={dep.id} value={dep.id}>{dep.nombre}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 ml-1">Plan de Suscripción</label>
              <select
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-gray-900"
                value={editForm.plan_id}
                onChange={(e) => setEditForm({ ...editForm, plan_id: e.target.value })}
              >
                <option value="">Legacy (Ilimitado)</option>
                {planes.map(plan => (
                  <option key={plan.id} value={plan.id}>{plan.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="ghost" className="flex-1 h-12 rounded-xl font-bold text-gray-500" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-[2] h-12 bg-black text-white font-bold rounded-xl shadow-sm hover:bg-black/90 transition-all" isLoading={updating === selectedClub?.id}>
              Guardar Cambios
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmación Suspensión/Activación */}
      {confirmAction.isOpen && confirmAction.club && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl text-center animate-in zoom-in-95 duration-300">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
              confirmAction.action === 'suspender'
              ? 'bg-red-50 text-red-500'
              : 'bg-emerald-50 text-emerald-500'
            }`}>
              {confirmAction.action === 'suspender' ? <ShieldAlert size={28} /> : <CheckCircle2 size={28} />}
            </div>
            <h3 className="text-xl font-bold text-[#182332] mb-2">
              {confirmAction.action === 'suspender' ? 'Confirmar Suspensión' : 'Activar Organización'}
            </h3>
            <p className="text-sm text-gray-500 mb-8">
              ¿Estás seguro de que deseas <strong>{confirmAction.action}</strong> el club <span className="font-semibold text-gray-900">"{confirmAction.club.nombre}"</span>?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={executeToggleAction}
                className={`w-full py-4 px-6 font-bold rounded-xl shadow-sm transition-all hover:scale-[1.02] ${
                  confirmAction.action === 'suspender' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-black text-white hover:bg-black/90'
                }`}
              >
                Sí, {confirmAction.action} ahora
              </button>
              <button
                onClick={() => setConfirmAction({ isOpen: false, club: null, action: 'suspender' })}
                className="w-full py-3 px-6 font-semibold text-gray-400 hover:text-gray-900 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Eliminación segura */}
      <Modal
        isOpen={deleteSecurity.isOpen}
        onClose={() => setDeleteSecurity({ ...deleteSecurity, isOpen: false })}
        title="Eliminar Club"
      >
        <div className="modal-form space-y-5">
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-4">
            <AlertTriangle size={24} className="text-red-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Advertencia de Seguridad</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">
                Estás a punto de eliminar permanentemente el club "{deleteSecurity.club?.nombre}".
              </p>
            </div>
          </div>

          <p className="text-xs font-medium text-gray-500 leading-relaxed">
            Esta acción es irreversible y destruirá todos los registros asociados a esta organización. Se requiere autorización de nivel SuperAdmin.
          </p>

          {deleteSecurity.error && (
            <div className="p-3 bg-red-500 text-white rounded-xl text-xs font-semibold">
              {deleteSecurity.error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 ml-1">Confirmar Identidad (Contraseña)</label>
            <input
              type="password"
              placeholder="Ingresar contraseña de SuperAdmin"
              value={deleteSecurity.password}
              onChange={(e) => setDeleteSecurity({ ...deleteSecurity, password: e.target.value as any })}
              className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent text-gray-900"
            />
          </div>

          <div className="flex gap-4 pt-2">
            <Button
              variant="ghost"
              className="flex-1 h-12 rounded-xl font-bold text-gray-500"
              onClick={() => setDeleteSecurity({ ...deleteSecurity, isOpen: false })}
            >
              Abortar
            </Button>
            <Button
              className="flex-[2] h-12 bg-red-600 text-white font-bold rounded-xl shadow-sm hover:bg-red-700 transition-all"
              onClick={executeSecureDelete}
              isLoading={deleteSecurity.isVerifying}
              disabled={!deleteSecurity.password}
            >
              Confirmar Eliminación
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
