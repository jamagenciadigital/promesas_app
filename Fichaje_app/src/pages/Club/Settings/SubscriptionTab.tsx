import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { ShieldCheck, Plus, Trash2, Edit2, CheckCircle2, Package, Calendar, DollarSign, Wallet } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

interface Plan {
  id: string;
  club_id: string;
  nombre: string;
  periodo: string;
  precio: number;
  moneda: string;
  created_at: string;
}

const PERIODS = [
  { value: 'Único', label: 'Pago Único (Inscripción)' },
  { value: '1 mes', label: 'Mensual' },
  { value: '3 meses', label: 'Trimestral' },
  { value: '6 meses', label: 'Semestral' },
  { value: '12 meses', label: 'Anual' }
];

export default function SubscriptionTab() {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [b2bPlan, setB2bPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clubCurrency, setClubCurrency] = useState('COP');

  // Estado para el modal de añadir/editar
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [planForm, setPlanForm] = useState({
    nombre: '',
    periodo: '1 mes',
    precio: 0
  });

  useEffect(() => {
    fetchPlans();
    fetchClubCurrency();
    fetchB2BSubscription();
  }, [profile?.club_id]);

  async function fetchB2BSubscription() {
    if (!profile?.club_id) return;
    try {
      const { data: clubData, error: clubError } = await supabase
        .from('clubes')
        .select('plan_id')
        .eq('id', profile.club_id)
        .single();
      
      if (clubError) throw clubError;
      
      if (clubData?.plan_id) {
        const { data: planData, error: planError } = await supabase
          .from('planes_suscripcion')
          .select('*')
          .eq('id', clubData.plan_id)
          .single();
        
        if (planError) throw planError;
        setB2bPlan(planData);
      }
    } catch (err: any) {
      console.error("Error fetching B2B subscription:", err);
    }
  }

  async function fetchClubCurrency() {
    if (!profile?.club_id) return;
    const { data } = await supabase
      .from('clubes')
      .select('moneda')
      .eq('id', profile.club_id)
      .single();
    if (data?.moneda) {
      const code = data.moneda.split(' ')[0];
      setClubCurrency(code);
    }
  }

  async function fetchPlans() {
    if (!profile?.club_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('planes_club')
        .select('*')
        .eq('club_id', profile.club_id)
        .order('precio', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (err: any) {
      console.error("Error fetching plans:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        nombre: plan.nombre,
        periodo: plan.periodo,
        precio: plan.precio
      });
    } else {
      setEditingPlan(null);
      setPlanForm({
        nombre: '',
        periodo: 'Único',
        precio: 0
      });
    }
    setShowModal(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.club_id) return;

    setSaving(true);
    setError(null);

    try {
      if (editingPlan) {
        const { error } = await supabase
          .from('planes_club')
          .update({
            nombre: planForm.nombre,
            periodo: planForm.periodo,
            precio: planForm.precio
          })
          .eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('planes_club')
          .insert([{
            club_id: profile.club_id,
            nombre: planForm.nombre,
            periodo: planForm.periodo,
            precio: planForm.precio,
            moneda: clubCurrency
          }]);
        if (error) throw error;
      }

      setSuccessMsg(`Plan ${editingPlan ? 'actualizado' : 'creado'} correctamente.`);
      setShowModal(false);
      fetchPlans();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este plan?')) return;
    try {
      const { error } = await supabase.from('planes_club').delete().eq('id', id);
      if (error) throw error;
      setPlans(plans.filter(p => p.id !== id));
      setSuccessMsg('Plan eliminado correctamente.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Cargando planes...</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in pb-24">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#CCFF00]/10 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-[#CCFF00] dark:text-[#daff01]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight font-outfit">Suscripción y Planes</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gestiona los planes que ofreces a tus miembros.</p>
          </div>
        </div>
        
        <Button 
          onClick={() => handleOpenModal()}
          className="bg-gray-900 dark:bg-[#daff01] dark:text-gray-900 font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 border-0"
        >
          <Plus className="w-4 h-4" />
          Nuevo Plan
        </Button>
      </div>

      {successMsg && (
        <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 text-sm text-red-600 dark:text-red-400 font-medium">
          {error}
        </div>
      )}

      {/* TU PLAN B2B (Administrativo) */}
      {b2bPlan && (
        <div className="bg-gray-900 dark:bg-[#1e293b] rounded-[32px] p-8 border border-white/5 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#CCFF00]/5 blur-[80px] -mr-32 -mt-32 rounded-full"></div>
          
          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-2">
                <span className="bg-[#CCFF00]/10 text-[#CCFF00] text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-[#CCFF00]/20 italic">
                  Tu Plan Administrativo
                </span>
              </div>
              <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">
                {b2bPlan.nombre}
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-4">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Límite Equipos</p>
                  <p className="text-xl font-bold text-white italic">{b2bPlan.limite_equipos === -1 ? 'Ilimitado' : b2bPlan.limite_equipos}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Límite Usuarios</p>
                  <p className="text-xl font-bold text-white italic">{b2bPlan.limite_usuarios === -1 ? 'Ilimitado' : b2bPlan.limite_usuarios}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Max Deportistas</p>
                  <p className="text-xl font-bold text-[#CCFF00] italic">{b2bPlan.limite_jugadores === -1 ? 'Ilimitado' : b2bPlan.limite_jugadores}</p>
                </div>
              </div>
            </div>

            <div className="shrink-0 text-center xl:text-right border-t xl:border-t-0 xl:border-l border-white/10 pt-6 xl:pt-0 xl:pl-10">
              <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1.5">Inversión Mensual</p>
              <div className="flex items-end justify-center xl:justify-end gap-1.5">
                <span className="text-4xl font-black text-[#CCFF00] italic leading-none">
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(b2bPlan.precio)}
                </span>
                <span className="text-[10px] font-bold text-white/60 uppercase mb-1">/ mes</span>
              </div>
              <p className="text-[8px] font-bold text-white/30 uppercase mt-3 italic">Facturación Directa vía Fichaje</p>
            </div>
          </div>
        </div>
      )}

      {/* Separador */}
      <div className="flex items-center gap-4 pt-4">
        <div className="h-px bg-gray-200 dark:bg-white/5 flex-1"></div>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Tus Planes para Miembros</span>
        <div className="h-px bg-gray-200 dark:bg-white/5 flex-1"></div>
      </div>

      {/* Lista de Planes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.length > 0 ? (
          plans.map((plan) => (
            <div 
              key={plan.id}
              className={`bg-white dark:bg-[#1e293b]/30 border rounded-2xl p-6 relative group hover:border-[#CCFF00] transition-all shadow-sm hover:shadow-lg ${plan.periodo === 'Único' ? 'border-[#CCFF00]/40 ring-1 ring-[#CCFF00]/10' : 'border-gray-100 dark:border-[#334155]'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${plan.periodo === 'Único' ? 'bg-[#CCFF00]/10 text-[#CCFF00]' : 'bg-gray-50 dark:bg-white/5 text-gray-400'}`}>
                  {plan.periodo === 'Único' ? <Wallet className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleOpenModal(plan)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-400 hover:text-blue-500"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeletePlan(plan.id)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{plan.nombre}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium uppercase tracking-widest text-[10px]">
                {plan.periodo === 'Único' ? (
                   <span className="flex items-center gap-1.5 text-[#daff01] bg-[#CCFF00]/10 px-2 py-0.5 rounded-md">
                     <ShieldCheck size={12} /> INSCRIPCIÓN (ÚNICO PAGO)
                   </span>
                ) : (
                   <span className="flex items-center gap-1.5 opacity-60">
                     <Calendar size={12} /> Periodo: {plan.periodo}
                   </span>
                )}
              </div>

              <div className="pt-4 border-t border-gray-50 dark:border-white/5 flex items-end gap-1">
                <span className="text-2xl font-black text-gray-900 dark:text-[#daff01]">
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: clubCurrency, minimumFractionDigits: 0 }).format(plan.precio)}
                </span>
                <span className="text-xs text-gray-400 mb-1 font-bold uppercase">{clubCurrency}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 bg-gray-50/50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-[#334155] rounded-[32px] flex flex-col items-center justify-center text-center px-6">
            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No has creado ningún plan todavía.</p>
            <p className="text-sm text-gray-400 mt-1">Empieza creando planes para que tus miembros se suscriban.</p>
          </div>
        )}
      </div>

      {/* Modal Añadir/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#16171b] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-[#26282e]">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white font-outfit uppercase tracking-tight">
                {editingPlan ? 'Editar Plan' : 'Nuevo Plan'}
              </h3>
            </div>
            
            <form onSubmit={handleSavePlan} className="p-6 space-y-6">
              <Input
                label="Nombre del Plan"
                placeholder="Ej: Inscripción 2024, Mensualidad, etc."
                required
                value={planForm.nombre}
                onChange={(e) => setPlanForm({ ...planForm, nombre: e.target.value })}
              />

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 font-bold uppercase tracking-widest text-[10px] opacity-60">Tipo de Cobro / Periodo</label>
                <div className="grid grid-cols-1 gap-2">
                  {PERIODS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPlanForm({ ...planForm, periodo: p.value })}
                      className={`flex items-center justify-between px-5 py-4 rounded-xl text-sm font-bold border-2 transition-all ${
                        planForm.periodo === p.value
                          ? 'bg-[#CCFF00]/10 border-[#CCFF00] text-gray-900 dark:text-[#daff01]'
                          : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-500 hover:border-gray-200 dark:hover:border-[#334155]'
                      }`}
                    >
                      <span>{p.label}</span>
                      {p.value === 'Único' && <Wallet size={16} className="text-[#CCFF00]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Input
                  label={`Precio (${clubCurrency})`}
                  type="number"
                  placeholder="0.00"
                  required
                  value={planForm.precio === 0 ? '' : planForm.precio}
                  onChange={(e) => setPlanForm({ ...planForm, precio: parseFloat(e.target.value) || 0 })}
                  icon={<DollarSign className="w-4 h-4" />}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  className="flex-1 font-bold rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  isLoading={saving}
                  className="flex-1 bg-black text-[#CCFF00] font-black uppercase tracking-widest text-xs h-12 rounded-xl"
                >
                  {editingPlan ? 'Actualizar' : 'Crear Plan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
