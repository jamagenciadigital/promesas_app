import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Wallet, Search, Filter, CheckCircle2, 
  Clock, XCircle, Trash2, ArrowUpRight, 
  DollarSign, User, Upload, Eye, FileText, X,
  Download
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { ProductoEvento } from '../../types';
import { approveAthleteDocuments, rejectAthleteDocuments } from '../../lib/cartera';

interface Charge {
  id: string;
  club_id: string;
  deportista_id: string;
  titulo: string;
  monto: number;
  fecha_vencimiento: string;
  estado: 'pendiente' | 'pagado' | 'vencido' | 'anulado' | 'por validar';
  comprobante_url?: string;
  fecha_pago?: string;
  producto_evento_id?: string;
  created_at: string;
}

export default function Cartera() {
  const { profile, activeClubId } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'resumen' | 'eventos' | 'validacion'>('resumen');
  
  const [loading, setLoading] = useState(true);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [clubCurrency, setClubCurrency] = useState('COP');
  const [playersMap, setPlayersMap] = useState<Record<string, { nombre: string, equipo: string }>>({});
  const [equipos, setEquipos] = useState<{id: string, nombre: string}[]>([]);

  // Estado para el modal de aprobación
  const [approvingCharge, setApprovingCharge] = useState<Charge | null>(null);
  const [uploading, setUploading] = useState(false);
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Ver comprobante
  const [viewingComprobante, setViewingComprobante] = useState<string | null>(null);

  const [productos, setProductos] = useState<ProductoEvento[]>([]);
  const [creatingGroupEvent, setCreatingGroupEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    nombre: '',
    descripcion: '',
    precio: 0,
    link_pago: '',
    equipos: [] as string[],
    tipo: 'evento' as 'evento' | 'producto'
  });
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [eventPreview, setEventPreview] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [assignMode, setAssignMode] = useState<'all' | 'manual'>('all');
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [teamPlayers, setTeamPlayers] = useState<Record<string, {id: string, nombre_completo: string, apellidos: string}[]>>({});
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  
  // Document Validation State
  const [pendingAthletes, setPendingAthletes] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [validatingAthlete, setValidatingAthlete] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionField, setShowRejectionField] = useState(false);
  const [processingValidation, setProcessingValidation] = useState(false);

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [searchTermDoc, setSearchTermDoc] = useState('');

  const handleSearchByDoc = async () => {
    if (!searchTermDoc) return;
    try {
      setLoadingPending(true);
      const { data, error } = await supabase
        .from('deportistas')
        .select('*, equipo:equipos!equipo_id(nombre)')
        .eq('numero_documento', searchTermDoc.trim())
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPendingAthletes([data]);
      } else {
        alert("No se encontró ningún deportista con ese documento.");
      }
    } catch (err: any) {
      alert("Error en búsqueda: " + err.message);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    if (activeClubId || profile?.club_id) {
      fetchInitialData();
      fetchClubCurrency();
    }
  }, [activeClubId, profile?.club_id]);

  async function fetchClubCurrency() {
    const { data } = await supabase.from('clubes').select('moneda').eq('id', activeClubId || profile?.club_id).single();
    if (data?.moneda) setClubCurrency(data.moneda.split(' ')[0]);
  }

  async function fetchInitialData() {
    try {
      setLoading(true);
      
      // 1. Fetch Players and Teams first for robust naming
      const [{ data: playersData, error: pError }, { data: teamsData, error: tError }] = await Promise.all([
        supabase.from('deportistas').select('id, nombre_completo, apellidos, equipo_id').eq('club_id', activeClubId || profile?.club_id),
        supabase.from('equipos').select('id, nombre').eq('club_id', activeClubId || profile?.club_id)
      ]);
      
      if (pError) console.error("Error cargando deportistas (posible RLS):", pError);
      if (tError) console.error("Error cargando equipos:", tError);
      
      const tMap: Record<string, string> = {};
      if (teamsData) {
        teamsData.forEach(t => tMap[t.id] = t.nombre);
        setEquipos(teamsData);
      }
      
      const pMap: Record<string, { nombre: string, equipo: string }> = {};
      if (playersData) {
        playersData.forEach(p => {
          pMap[p.id] = { 
            nombre: `${p.nombre_completo || ''} ${p.apellidos || ''}`.trim(),
            equipo: p.equipo_id ? (tMap[p.equipo_id] || 'Club') : 'Sin Equipo'
          };
        });
      }
      setPlayersMap(pMap);

      // 2. Fetch Charges
      const { data: chargesData, error: cError } = await supabase
        .from('cartera')
        .select('*')
        .eq('club_id', activeClubId || profile?.club_id)
        .order('fecha_vencimiento', { ascending: true });

      if (cError) throw cError;
      setCharges(chargesData || []);

      // 3. Fetch Productos
      const { data: qProductos, error: prError } = await supabase
        .from('productos_eventos')
        .select('*')
        .eq('club_id', activeClubId || profile?.club_id)
        .order('created_at', { ascending: false });
        
      if (prError) console.error("Error fetching productos", prError);
      if (qProductos) setProductos(qProductos as any);

    } catch (err) {
      console.error("Error fetching initial data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPendingAthletes() {
    if (!activeClubId && !profile?.club_id) return;
    try {
      setLoadingPending(true);
      const { data, error } = await supabase
        .from('deportistas')
        .select(`
          *,
          equipo:equipos!equipo_id(nombre)
        `)
        .eq('club_id', activeClubId || profile?.club_id)
        .eq('estado', 'pendiente_validacion')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingAthletes(data || []);
    } catch (err) {
      console.error("Error fetching pending athletes:", err);
    } finally {
      setLoadingPending(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'validacion') {
      fetchPendingAthletes();
    }
  }, [activeTab, activeClubId, profile?.club_id]);

  const fetchTeamPlayers = useCallback(async (teamIds: string[]) => {
    if (teamIds.length === 0) {
      setTeamPlayers({});
      return;
    }
    try {
      setLoadingPlayers(true);
      const { data, error } = await supabase
        .from('deportistas')
        .select('id, nombre_completo, apellidos, equipo_id')
        .eq('club_id', activeClubId || profile?.club_id)
        .in('equipo_id', teamIds)
        .order('nombre_completo', { ascending: true });

      if (error) throw error;

      const grouped: Record<string, {id: string, nombre_completo: string, apellidos: string}[]> = {};
      teamIds.forEach(tid => grouped[tid] = []);
      data?.forEach(p => {
        if (grouped[p.equipo_id]) {
          grouped[p.equipo_id].push({ id: p.id, nombre_completo: p.nombre_completo, apellidos: p.apellidos });
        }
      });
      setTeamPlayers(grouped);
    } catch (err) {
      console.error("Error fetching team players:", err);
    } finally {
      setLoadingPlayers(false);
    }
  }, [activeClubId, profile?.club_id]);

  useEffect(() => {
    if (creatingGroupEvent && eventForm.equipos.length > 0) {
      fetchTeamPlayers(eventForm.equipos);
    }
  }, [eventForm.equipos, creatingGroupEvent, fetchTeamPlayers]);

  const handleApproveDocs = async (athlete: any) => {
    try {
      setProcessingValidation(true);
      await approveAthleteDocuments(athlete);
      setValidatingAthlete(null);
      fetchPendingAthletes();
      alert("Deportista activado y cartera generada con éxito.");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setProcessingValidation(false);
    }
  };

  const handleRejectDocs = async () => {
    if (!validatingAthlete || !rejectionReason.trim()) {
      alert("Por favor ingresa un motivo de rechazo.");
      return;
    }

    try {
      setProcessingValidation(true);
      const athleteName = `${validatingAthlete.nombre_completo} ${validatingAthlete.apellidos || ''}`.trim();
      await rejectAthleteDocuments(validatingAthlete.id, athleteName, rejectionReason.trim());
      setValidatingAthlete(null);
      setRejectionReason('');
      setShowRejectionField(false);
      fetchPendingAthletes();
      alert("Rechazo procesado y notificado.");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setProcessingValidation(false);
    }
  };

  const handleEventImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEventImage(file);
      setEventPreview(URL.createObjectURL(file));
    }
  };

  const openEditModal = (evento: ProductoEvento) => {
    setEditingEventId(evento.id);
    setEventForm({
      nombre: evento.nombre,
      descripcion: evento.descripcion || '',
      precio: evento.precio,
      link_pago: evento.link_pago || '',
      equipos: evento.equipos || [],
      tipo: evento.tipo || 'evento'
    });
    setEventPreview(evento.imagen_url || null);
    setEventImage(null);
    setAssignMode('all');
    setSelectedAthletes([]);
    setCreatingGroupEvent(true);
  };

  const initCreateEvent = () => {
    setEditingEventId(null);
    setEventForm({ nombre: '', descripcion: '', precio: 0, link_pago: '', equipos: [], tipo: 'evento' });
    setEventImage(null);
    setEventPreview(null);
    setAssignMode('all');
    setSelectedAthletes([]);
    setCreatingGroupEvent(true);
  };

  const submitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.club_id) return;
    
    if (!eventForm.nombre || eventForm.precio <= 0) {
      alert("Por favor completa el nombre y el precio.");
      return;
    }
    if (assignMode === 'manual' && selectedAthletes.length === 0) {
      alert("Debes seleccionar al menos un jugador en modo 'Seleccionar individualmente'.");
      return;
    }
    if (assignMode === 'all' && eventForm.equipos.length === 0) {
      alert("Debes seleccionar al menos un equipo.");
      return;
    }

    try {
      setUploading(true);
      
      let imageUrl = eventPreview && !eventImage ? eventPreview : null;
      if (eventImage) {
        const fileExt = eventImage.name.split('.').pop();
        const fileName = `banner_${Date.now()}.${fileExt}`;
        const filePath = `${profile.club_id}/productos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('eventos-productos')
          .upload(filePath, eventImage);

        if (uploadError) throw new Error("Error al subir banner. ¿Existe el bucket 'eventos-productos' en Supabase Storage?");

        const { data: { publicUrl } } = supabase.storage
          .from('eventos-productos')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      let eventId = editingEventId;

      if (editingEventId) {
        // UPDATE Existing
        const { error: updError } = await supabase
          .from('productos_eventos')
          .update({
            nombre: eventForm.nombre,
            descripcion: eventForm.descripcion,
            precio: eventForm.precio,
            link_pago: eventForm.link_pago,
            equipos: eventForm.equipos,
            imagen_url: imageUrl,
            tipo: eventForm.tipo
          }).eq('id', editingEventId);
        if (updError) throw updError;

        // Update active cartera records gracefully (do not touch paid ones)
        const { error: cUpdError } = await supabase
          .from('cartera')
          .update({ titulo: eventForm.nombre, monto: eventForm.precio })
          .eq('producto_evento_id', editingEventId)
          .in('estado', ['pendiente', 'vencido']);
        
        if (cUpdError) throw cUpdError;

      } else {
        // INSERT New
        const { data: newEvent, error: evError } = await supabase
          .from('productos_eventos')
          .insert({
            club_id: profile.club_id,
            nombre: eventForm.nombre,
            descripcion: eventForm.descripcion,
            precio: eventForm.precio,
            link_pago: eventForm.link_pago,
            equipos: eventForm.equipos,
            imagen_url: imageUrl,
            tipo: eventForm.tipo
          }).select().single();
        
        if (evError) throw evError;
        eventId = newEvent.id;
      }

      // Assign Charges
      let athletesToCharge: { id: string }[];

      if (assignMode === 'manual') {
        if (selectedAthletes.length === 0) {
          alert("Debes seleccionar al menos un jugador.");
          return;
        }
        athletesToCharge = selectedAthletes.map(id => ({ id }));
      } else {
        const { data, error: pError } = await supabase
          .from('deportistas')
          .select('id')
          .eq('club_id', profile.club_id)
          .in('equipo_id', eventForm.equipos);

        if (pError) throw pError;
        athletesToCharge = data || [];
      }

      if (athletesToCharge.length > 0) {
         // Prevent redundant assigning
         const { data: existingCharges } = await supabase
           .from('cartera')
           .select('deportista_id')
           .eq('producto_evento_id', eventId);
           
         const existingIds = new Set(existingCharges?.map(c => c.deportista_id) || []);
         const newAthletes = athletesToCharge.filter(ath => !existingIds.has(ath.id));

          if (newAthletes.length > 0) {
            const nextMonth = new Date();
            nextMonth.setDate(1);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            const chargesToInsert = newAthletes.map(ath => ({
               club_id: profile.club_id,
               deportista_id: ath.id,
               producto_evento_id: eventId,
               titulo: eventForm.nombre,
               monto: eventForm.precio,
               estado: 'pendiente',
               fecha_vencimiento: nextMonth.toISOString().split('T')[0]
            }));

           const { error: cError } = await supabase.from('cartera').insert(chargesToInsert);
           if (cError) throw cError;
         }

         // Send Push Notification to affected parents
         let affectedAthleteIds = athletesToCharge.map(a => a.id);

         // En edición, también notificar a padres de cobros existentes modificados
         if (editingEventId) {
           const { data: existingChargeAthletes } = await supabase
             .from('cartera')
             .select('deportista_id')
             .eq('producto_evento_id', editingEventId);
           const existingIds = existingChargeAthletes?.map(c => c.deportista_id) || [];
           affectedAthleteIds = [...new Set([...affectedAthleteIds, ...existingIds])];
         }

         const { data: padres } = await supabase
           .from('perfiles')
           .select('id')
           .in('deportista_id', affectedAthleteIds)
           .eq('rol', 'padre');

         if (padres && padres.length > 0) {
            const notifs = padres.map(p => ({
              user_id: p.id,
              titulo: editingEventId ? 'Evento Modificado 📝' : 'Nuevo Cobro de Evento 💳',
              mensaje: editingEventId 
                ? `El evento "${eventForm.nombre}" ha sido actualizado. Por favor verifica tu cartera de pagos en la plataforma.` 
                : `Se ha generado un nuevo cobro en tu cartera para el evento: "${eventForm.nombre}".`,
              tipo: 'sistema',
              leida: false
            }));
            await supabase.from('notificaciones').insert(notifs);
         }

         // 3. Send Email notifications for new charges (cartera template → Template Notificaciones en Resend)
         if (newAthletes.length > 0) {
           const { data: padresMail } = await supabase
             .from('perfiles')
             .select('email, nombre, deportista_id')
             .in('deportista_id', newAthletes.map(a => a.id))
             .eq('rol', 'padre');

           const { data: athletesMail } = await supabase
             .from('deportistas')
             .select('id, nombre_completo, apellidos, email_deportista')
             .in('id', newAthletes.map(a => a.id));

           const fmt = (amount: number) =>
             new Intl.NumberFormat('es-CO', { style: 'currency', currency: clubCurrency, minimumFractionDigits: 0 }).format(amount);

           for (const p of padresMail || []) {
             if (p.email) {
               try {
                 await fetch(`${import.meta.env.VITE_SUPABASE_URL}/api/notifications/send`, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({
                     to: p.email,
                     tipo: 'cartera',
                     club_id: profile?.club_id,
                     variables: { nombre: p.nombre || 'Acudiente', monto: fmt(eventForm.precio) }
                   })
                 });
               } catch (err) {
                 console.error("Error sending cartera email to parent:", err);
               }
             }
           }

           for (const a of athletesMail || []) {
             if (a.email_deportista) {
               try {
                 await fetch(`${import.meta.env.VITE_SUPABASE_URL}/api/notifications/send`, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({
                     to: a.email_deportista,
                     tipo: 'cartera',
                     club_id: profile?.club_id,
                     variables: {
                       nombre: `${a.nombre_completo || ''} ${a.apellidos || ''}`.trim() || 'Deportista',
                       monto: fmt(eventForm.precio)
                     }
                   })
                 });
               } catch (err) {
                 console.error("Error sending cartera email to athlete:", err);
               }
             }
           }
         }
      }

      await fetchInitialData();
      setCreatingGroupEvent(false);
      setEventForm({ nombre: '', descripcion: '', precio: 0, link_pago: '', equipos: [], tipo: 'evento' });
      setEventImage(null);
      setEventPreview(null);
      setEditingEventId(null);
      setShowSuccessModal(true);
    } catch(err: any) {
      alert("Error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setComprobanteFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const processApproval = async () => {
    if (!approvingCharge || !comprobanteFile) return;

    try {
      setUploading(true);
      
      // 1. Subir Comprobante a Storage
      const fileExt = comprobanteFile.name.split('.').pop();
      const fileName = `pago_${approvingCharge.id}_${Date.now()}.${fileExt}`;
      const filePath = `${profile?.club_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('comprobantes-pagos') // Asegúrate de crear este bucket en Supabase
        .upload(filePath, comprobanteFile);

      if (uploadError) throw new Error("Error al subir comprobante. ¿Existe el bucket 'comprobantes-pagos'?");

      const { data: { publicUrl } } = supabase.storage
        .from('comprobantes-pagos')
        .getPublicUrl(filePath);

      // 2. Actualizar Cartera
      const { error: updateError } = await supabase
        .from('cartera')
        .update({ 
          estado: 'pagado',
          comprobante_url: publicUrl,
          fecha_pago: new Date().toISOString()
        })
        .eq('id', approvingCharge.id);

      if (updateError) throw updateError;
      
      // 3. Sync UI
      setCharges(charges.map(c => c.id === approvingCharge.id ? { 
        ...c, 
        estado: 'pagado', 
        comprobante_url: publicUrl,
        fecha_pago: new Date().toISOString()
      } : c));

      setApprovingCharge(null);
      setComprobanteFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (newStatus === 'pagado') return; // Bloqueado, requiere modal
    try {
      const { error } = await supabase.from('cartera').update({ estado: newStatus }).eq('id', id);
      if (error) throw error;
      setCharges(charges.map(c => c.id === id ? { ...c, estado: newStatus as any } : c));
    } catch (err) {
      console.error(err);
    }
  };

  // Agrupar cobros por deportista
  const groupedByPlayer = charges.reduce((acc, charge) => {
    const pId = charge.deportista_id;
    if (!acc[pId]) {
      acc[pId] = {
        id: pId,
        nombre: playersMap[pId]?.nombre || 'Nombre Oculto (Conflicto RLS o Falta de Datos)',
        equipo: playersMap[pId]?.equipo || 'Club / Sin Equipo',
        charges: [],
        totalPending: 0,
        totalPaid: 0
      };
    }
    acc[pId].charges.push(charge);
    if (charge.estado === 'pagado') acc[pId].totalPaid += charge.monto;
    else if (charge.estado === 'pendiente' || charge.estado === 'vencido') acc[pId].totalPending += charge.monto;
    return acc;
  }, {} as Record<string, { id: string, nombre: string, equipo: string, charges: Charge[], totalPending: number, totalPaid: number }>);

  const playerStats = Object.values(groupedByPlayer).filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalPending: charges.filter(c => c.estado === 'pendiente').reduce((acc, curr) => acc + curr.monto, 0),
    totalPaid: charges.filter(c => c.estado === 'pagado').reduce((acc, curr) => acc + curr.monto, 0),
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: clubCurrency, minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in pb-20">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[var(--primary-10)] rounded-2xl"><Wallet className="w-8 h-8 text-[var(--primary)]" /></div>
          <div><h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-none">{t('nav.cartera')}</h1><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Gestión de Cobros por Deportista</p></div>
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => setActiveTab('resumen')}
          className={`flex-1 py-4 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'resumen' ? 'bg-black text-[var(--primary)] shadow-xl' : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-black dark:hover:text-white'}`}
        >
          Resumen de Cobros
        </button>
        <button 
          onClick={() => setActiveTab('eventos')}
          className={`flex-1 py-4 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'eventos' ? 'bg-black text-[var(--primary)] shadow-xl' : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-black dark:hover:text-white'}`}
        >
          Productos y Eventos
        </button>
        <button 
          onClick={() => setActiveTab('validacion')}
          className={`flex-1 py-4 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'validacion' ? 'bg-black text-[var(--primary)] shadow-xl' : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-black dark:hover:text-white'}`}
        >
          Validación Documental
        </button>
      </div>

      {activeTab === 'resumen' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-black p-6 rounded-[32px] border border-white/5 shadow-2xl shadow-black/20">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('finance.pending')}</p>
              <h2 className="text-3xl font-black text-white italic">{formatCurrency(stats.totalPending)}</h2>
            </div>
            <div className="bg-white dark:bg-[#1e1f24] p-6 rounded-[32px] border border-gray-100 dark:border-white/5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('finance.paid')}</p>
              <h2 className="text-3xl font-black text-emerald-500 italic">{formatCurrency(stats.totalPaid)}</h2>
            </div>
            <div className="bg-emerald-500 p-6 rounded-[32px] flex items-center justify-between shadow-xl shadow-emerald-500/20">
               <div>
                 <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-2">{t('finance.effectiveness')}</p>
                 <h2 className="text-3xl font-black text-white italic">{charges.length > 0 ? Math.round((stats.totalPaid / (stats.totalPaid + stats.totalPending)) * 100) : 0}%</h2>
                </div>
               <ArrowUpRight size={40} className="text-white/20" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap gap-4 bg-white dark:bg-[#1e1f24] p-4 rounded-3xl border border-gray-100 dark:border-white/5">
            <div className="flex-1 relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="text" placeholder="Buscar por nombre de deportista..." className="w-full pl-12 pr-4 h-14 bg-gray-50 dark:bg-white/5 rounded-2xl outline-none text-sm transition-all focus:ring-2 focus:ring-[var(--primary)]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playerStats.map((player) => (
              <div key={player.id} className="group bg-white dark:bg-[#1e1f24] border border-gray-100 dark:border-white/5 rounded-[40px] p-8 shadow-sm hover:shadow-2xl hover:border-[var(--primary)] transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <User size={80} />
                </div>
                
                <div className="space-y-6 relative">
                  <div>
                    <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest mb-1">{player.equipo}</p>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-tight line-clamp-2">{player.nombre}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-[24px]">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Pagado</p>
                      <p className="text-sm font-black text-emerald-500">{formatCurrency(player.totalPaid)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-[24px]">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Pendiente</p>
                      <p className="text-sm font-black text-amber-500">{formatCurrency(player.totalPending)}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-gray-400">
                      <span>Progreso de Pago</span>
                      <span>{player.totalPaid + player.totalPending > 0 ? Math.round((player.totalPaid / (player.totalPaid + player.totalPending)) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[var(--primary)] transition-all duration-1000" 
                        style={{ width: `${player.totalPaid + player.totalPending > 0 ? (player.totalPaid / (player.totalPaid + player.totalPending)) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={() => {
                      const basePath = profile?.rol === 'cartera' ? '/finance-admin' : '/club/finance';
                      navigate(`${basePath}/${player.id}`);
                    }}
                    className="w-full h-14 bg-gray-900 dark:bg-white text-white dark:text-black rounded-[24px] font-black uppercase text-[10px] tracking-widest italic flex items-center justify-center gap-2 group-hover:bg-[var(--primary)] group-hover:text-black transition-all"
                  >
                    Ver Detalles <ArrowUpRight size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'eventos' && (
        <div className="space-y-6">
           <div className="flex justify-end">
              <Button onClick={() => initCreateEvent()} className="h-14 px-8 bg-[var(--primary)] text-black font-black uppercase italic tracking-widest text-[10px] rounded-[24px]">Crear Evento / Producto</Button>
           </div>
           
           {productos.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {productos.map(p => (
                   <div key={p.id} className="bg-white dark:bg-[#1e1f24] rounded-[32px] border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col">
                      {p.imagen_url ? (
                         <div className="w-full h-40 bg-gray-100 dark:bg-black relative group flex-shrink-0">
                            <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover opacity-80" />
                         </div>
                      ) : (
                         <div className="w-full h-40 bg-gray-50 dark:bg-white/5 flex flex-shrink-0 items-center justify-center">
                            <FileText className="text-gray-300 w-12 h-12" />
                         </div>
                      )}
                      <div className="p-6 flex-1 flex flex-col">
                         <div className="flex justify-between items-start mb-2">
                           <h3 className="text-xl font-black italic uppercase leading-tight">{p.nombre}</h3>
                           <p className="text-lg font-black text-[var(--primary)] tabular-nums">{formatCurrency(p.precio)}</p>
                         </div>
                         <p className="text-xs text-gray-500 line-clamp-2 mt-2 flex-1">{p.descripcion}</p>
                         <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
                            <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest">
                              {p.equipos?.length} Equipo(s) Asociado(s)
                            </p>
                            <Button variant="ghost" onClick={() => openEditModal(p)} className="h-8 px-4 rounded-xl text-[10px] uppercase font-black tracking-widest group relative overflow-hidden">
                                <span className="relative z-10 group-hover:text-black dark:group-hover:text-black">Editar</span>
                                <div className="absolute inset-0 bg-[var(--primary)] -translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            </Button>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
           ) : (
             <div className="py-20 text-center flex flex-col items-center">
                <FileText className="w-16 h-16 text-gray-200 dark:text-white/10 mb-4" />
                <p className="text-gray-500 font-black uppercase tracking-widest text-xs">No hay productos ni eventos creados.</p>
             </div>
           )}
        </div>
      )}

      {activeTab === 'validacion' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-[var(--primary-5)] border border-[var(--primary-10)] p-6 rounded-[32px] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[var(--primary)] text-black rounded-2xl">
                <Clock size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black italic uppercase text-gray-900 dark:text-white">Pendientes de Validación</h2>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Revisa y activa a los nuevos deportistas registrados</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Buscar por documento..."
                value={searchTermDoc}
                onChange={(e) => setSearchTermDoc(e.target.value)}
                className="max-w-[200px]"
              />
              <Button 
                onClick={handleSearchByDoc}
                variant="secondary"
                className="h-12 px-6"
              >
                Buscar
              </Button>
            </div>
          </div>

          {loadingPending ? (
            <div className="py-20 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto"></div>
            </div>
          ) : pendingAthletes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingAthletes.map((athlete) => (
                <div key={athlete.id} className="bg-white dark:bg-[#1e1f24] rounded-[40px] p-8 border border-gray-100 dark:border-white/5 shadow-sm hover:border-[var(--primary)] transition-all group">
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-[var(--primary)] transition-all">
                        {athlete.foto_url ? (
                          <img src={athlete.foto_url} className="w-full h-full object-cover" />
                        ) : (
                          <User size={32} className="text-gray-300" />
                        )}
                      </div>
                      <Badge variant="warning" className="uppercase text-[8px] font-black tracking-widest">Pendiente</Badge>
                    </div>

                    <div>
                      <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest mb-1">{athlete.equipo?.nombre || 'Sin Equipo'}</p>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-tight line-clamp-1">{athlete.nombre_completo} {athlete.apellidos}</h3>
                      <p className="text-xs font-bold text-gray-400 mt-1">{athlete.tipo_documento?.toUpperCase()}: {athlete.numero_documento}</p>
                    </div>

                    <div className="pt-4 border-t border-gray-50 dark:border-white/5">
                      <Button 
                        onClick={() => setValidatingAthlete(athlete)}
                        className="w-full h-14 bg-black text-[var(--primary)] rounded-2xl font-black uppercase text-[10px] tracking-widest italic flex items-center justify-center gap-2"
                      >
                        Validar Documentos <FileText size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center bg-white dark:bg-[#1e1f24] rounded-[40px] border-2 border-dashed border-gray-100 dark:border-white/5">
              <CheckCircle2 size={48} className="text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No hay validaciones pendientes.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL PARA APROBAR PAGO */}
      <Modal isOpen={!!approvingCharge} onClose={() => { setApprovingCharge(null); setComprobanteFile(null); setPreviewUrl(null); }} title="Aprobar Pago">
         {approvingCharge && (
            <div className="space-y-6">
               <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Concepto</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white uppercase italic">{approvingCharge.titulo}</p>
                  <p className="text-xl font-black text-[var(--primary)] mt-1">{formatCurrency(approvingCharge.monto)}</p>
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Subir Comprobante de Pago (Obligatorio)</label>
                  <div className="relative group">
                     {previewUrl ? (
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-[var(--primary)]">
                           <img src={previewUrl} className="w-full h-full object-cover" />
                           <button onClick={() => { setComprobanteFile(null); setPreviewUrl(null); }} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full"><X size={16}/></button>
                        </div>
                     ) : (
                        <label className="flex flex-col items-center justify-center w-full aspect-video bg-gray-50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl cursor-pointer hover:border-[var(--primary)] transition-colors">
                           <Upload size={32} className="text-gray-300 mb-2" />
                           <span className="text-[10px] font-black text-gray-400 uppercase">Seleccionar Imagen</span>
                           <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                        </label>
                     )}
                  </div>
               </div>

               <div className="flex gap-3 pt-4">
                  <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-black uppercase text-xs" onClick={() => setApprovingCharge(null)}>Cancelar</Button>
                  <Button 
                    className="flex-[2] h-14 bg-[var(--primary)] text-black rounded-2xl font-black uppercase text-xs gap-2" 
                    disabled={!comprobanteFile || uploading}
                    isLoading={uploading}
                    onClick={processApproval}
                  >
                    Confirmar Pago <CheckCircle2 size={16} />
                  </Button>
               </div>
            </div>
         )}
      </Modal>

      {/* MODAL PARA VER COMPROBANTE / DOCUMENTO */}
      <Modal isOpen={!!viewingComprobante} onClose={() => setViewingComprobante(null)} title="Ver Documento">
         <div className="space-y-4">
            {viewingComprobante?.toLowerCase().includes('.pdf') ? (
              <iframe 
                src={viewingComprobante} 
                className="w-full h-[65vh] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/5" 
                title="Visor de PDF"
              />
            ) : (
              <img src={viewingComprobante || ''} className="w-full rounded-2xl shadow-2xl max-h-[70vh] object-contain" alt="Documento" />
            )}
            <Button className="w-full h-14 bg-black text-white rounded-2xl font-black uppercase text-xs" onClick={() => setViewingComprobante(null)}>Cerrar</Button>
         </div>
      </Modal>

      {/* MODAL CREAR EVENTO/PRODUCTO */}
      <Modal isOpen={creatingGroupEvent} onClose={() => setCreatingGroupEvent(false)} title="Crear Producto o Evento">
        <form onSubmit={submitEvent} className="space-y-6">
          <Input 
            label="Nombre *" 
            placeholder={eventForm.tipo === 'evento' ? "Ej. Torneo de Verano, Copa Navidad" : "Ej. Uniforme Visitante, Buzo"} 
            value={eventForm.nombre}
            onChange={e => setEventForm({...eventForm, nombre: e.target.value})}
            required
          />

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tipo *</label>
            <div className="flex gap-2">
              {(['evento', 'producto'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEventForm({...eventForm, tipo: t})}
                  className={`flex-1 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
                    eventForm.tipo === t
                      ? 'bg-black text-[var(--primary)] shadow-xl'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-400'
                  }`}
                >
                  {t === 'evento' ? 'Evento / Torneo' : 'Producto'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Descripción</label>
            <textarea
              className="w-full bg-gray-50 dark:bg-[#1e293b]/50 border border-gray-200 dark:border-[#334155] rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="Detalles sobre este cobro..."
              value={eventForm.descripcion}
              onChange={e => setEventForm({...eventForm, descripcion: e.target.value})}
              rows={3}
            />
          </div>

          <Input 
            label="Precio (Monto a cobrar) *" 
            type="number"
            placeholder="Ej. 150000" 
            value={eventForm.precio || ''}
            onChange={e => setEventForm({...eventForm, precio: Number(e.target.value)})}
            required
          />

          <Input 
            label="Link externo de Pago (Wompi, ePayco, etc.) Opcional" 
            placeholder="https://checkout.wompi.co/l/..." 
            value={eventForm.link_pago}
            onChange={e => setEventForm({...eventForm, link_pago: e.target.value})}
          />

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Equipos a Cobrar *</label>
            <div className="space-y-2 max-h-60 overflow-y-auto p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
              {equipos.map(eq => {
                const isSelected = eventForm.equipos.includes(eq.id);
                const players = teamPlayers[eq.id] || [];
                return (
                  <div key={eq.id} className="bg-white dark:bg-[#1e1f24] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
                    <label className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-[var(--primary)] rounded focus:ring-[var(--primary)]"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEventForm({...eventForm, equipos: [...eventForm.equipos, eq.id]});
                          } else {
                            setEventForm({...eventForm, equipos: eventForm.equipos.filter(id => id !== eq.id)});
                            setSelectedAthletes(prev => prev.filter(aid => !players.some(p => p.id === aid)));
                          }
                        }}
                      />
                      <span className="text-sm font-bold text-gray-900 dark:text-white uppercase">{eq.nombre}</span>
                      <span className="ml-auto text-[10px] font-black text-gray-400 uppercase tracking-widest">{players.length} jugadores</span>
                    </label>

                    {isSelected && assignMode === 'manual' && players.length > 0 && (
                      <div className="border-t border-gray-100 dark:border-white/10 px-4 py-3 space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer py-1">
                          <input 
                            type="checkbox"
                            className="w-3.5 h-3.5 text-[var(--primary)] rounded focus:ring-[var(--primary)]"
                            checked={players.every(p => selectedAthletes.includes(p.id))}
                            onChange={() => {
                              const allSelected = players.every(p => selectedAthletes.includes(p.id));
                              if (allSelected) {
                                setSelectedAthletes(prev => prev.filter(aid => !players.some(p => p.id === aid)));
                              } else {
                                const newIds = players.map(p => p.id);
                                setSelectedAthletes(prev => [...new Set([...prev, ...newIds])]);
                              }
                            }}
                          />
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seleccionar todos</span>
                        </label>
                        {players.map(p => (
                          <label key={p.id} className="flex items-center gap-2 cursor-pointer py-1 pl-4">
                            <input 
                              type="checkbox"
                              className="w-3.5 h-3.5 text-[var(--primary)] rounded focus:ring-[var(--primary)]"
                              checked={selectedAthletes.includes(p.id)}
                              onChange={() => {
                                setSelectedAthletes(prev =>
                                  prev.includes(p.id)
                                    ? prev.filter(id => id !== p.id)
                                    : [...prev, p.id]
                                );
                              }}
                            />
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{p.nombre_completo} {p.apellidos}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {equipos.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4 font-bold uppercase tracking-widest">No hay equipos disponibles</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Asignar Cobros</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setAssignMode('all'); setSelectedAthletes([]); }}
                className={`flex-1 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
                  assignMode === 'all'
                    ? 'bg-black text-[var(--primary)] shadow-xl'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-400'
                }`}
              >
                Todos los jugadores
              </button>
              <button
                type="button"
                onClick={() => setAssignMode('manual')}
                className={`flex-1 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
                  assignMode === 'manual'
                    ? 'bg-black text-[var(--primary)] shadow-xl'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-400'
                }`}
              >
                Seleccionar individualmente
              </button>
            </div>
            {assignMode === 'manual' && eventForm.equipos.length > 0 && (
              <p className="text-[8px] text-gray-400 uppercase tracking-widest text-center">
                {loadingPlayers ? 'Cargando jugadores...' : `${selectedAthletes.length} jugador(es) seleccionado(s)`}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Banner o Imagen (Opcional)</label>
            <div className="relative group w-full aspect-video bg-gray-50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-[var(--primary)] overflow-hidden">
               {eventPreview ? (
                  <>
                    <img src={eventPreview} className="w-full h-full object-cover" />
                    <button type="button" onClick={(e) => { e.preventDefault(); setEventImage(null); setEventPreview(null); }} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full z-20"><X size={16}/></button>
                  </>
               ) : (
                  <>
                     <Upload size={32} className="text-gray-300 mb-2 group-hover:text-[var(--primary)] transition-colors" />
                     <span className="text-[10px] font-black text-gray-400 uppercase">Subir Imagen</span>
                  </>
               )}
               <input type="file" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" accept="image/*" onChange={handleEventImageSelect} />
            </div>
          </div>

          <Button 
            type="submit"
            className="w-full h-14 bg-[var(--primary)] text-black rounded-2xl font-black uppercase text-xs"
            disabled={uploading}
            isLoading={uploading}
          >
            Guardar y Generar Cobros
          </Button>
        </form>
      </Modal>

      {/* MODAL VALIDACIÓN DOCUMENTAL */}
      <Modal 
         isOpen={!!validatingAthlete} 
         onClose={() => { if(!processingValidation) setValidatingAthlete(null); }} 
         title="Validación de Documentos"
       >
         {validatingAthlete && (
           <div className="space-y-8">
             <div className="flex items-center gap-4 p-6 bg-gray-50 dark:bg-white/5 rounded-[32px] border border-gray-100 dark:border-white/5">
               <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-200 shrink-0">
                 {validatingAthlete.foto_url ? <img src={validatingAthlete.foto_url} className="w-full h-full object-cover" /> : <User className="w-full h-full p-4 text-gray-400" />}
               </div>
               <div>
                 <h4 className="text-xl font-black uppercase italic leading-none">{validatingAthlete.nombre_completo}</h4>
                 <p className="text-xs font-bold text-gray-500 mt-1 uppercase">{validatingAthlete.equipo?.nombre}</p>
               </div>
             </div>

             <div className="space-y-4">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Documentos Cargados</p>
               <div className="grid grid-cols-1 gap-3">
                 {[
                   { label: 'Registro Civil', url: validatingAthlete.url_registro_civil },
                   { label: 'Documento Identidad', url: validatingAthlete.url_documento_id },
                   { label: 'Contrato Firmado', url: validatingAthlete.url_contrato },
                   { label: 'Certificado Salud', url: validatingAthlete.url_certificado_salud },
                   ...(validatingAthlete.viene_de_otro_club ? [{ label: 'Carta Traspaso', url: validatingAthlete.url_carta_traspaso }] : [])
                 ].map((doc, idx) => (
                   <div key={idx} className="flex items-center justify-between p-5 rounded-3xl bg-white dark:bg-[#1e1f24] border border-gray-100 dark:border-white/5 group hover:border-[var(--primary)] transition-all">
                     <div className="flex items-center gap-3">
                       <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-xl group-hover:bg-[var(--primary-10)] group-hover:text-[var(--primary)] transition-all">
                         <FileText size={20} />
                       </div>
                       <span className="text-xs font-black uppercase italic tracking-tight">{doc.label}</span>
                     </div>
                     {doc.url ? (
                       <div className="flex gap-2">
                         <button 
                           onClick={() => setViewingComprobante(doc.url)}
                           className="p-2 text-gray-400 hover:text-black dark:hover:text-white transition-all"
                           title="Vista Rápida"
                         >
                           <Eye size={20} />
                         </button>
                         <a 
                           href={doc.url} 
                           target="_blank" 
                           rel="noreferrer" 
                           className="p-2 text-[var(--primary)] hover:scale-110 transition-transform"
                           title="Descargar"
                         >
                           <Download size={20} />
                         </a>
                       </div>
                     ) : (
                       <Badge variant="default" className="text-[8px] opacity-30 uppercase bg-gray-200 text-gray-500 border-dashed">No Cargado</Badge>
                     )}
                   </div>
                 ))}
               </div>
             </div>

             <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Acciones de Validación</p>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    onClick={() => handleApproveDocs(validatingAthlete)}
                    isLoading={processingValidation}
                    className="h-16 bg-[var(--primary)] text-black rounded-3xl font-black uppercase italic tracking-widest text-[10px] gap-2 shadow-xl shadow-[var(--primary-10)]"
                  >
                    Aprobar y Activar <CheckCircle2 size={16} />
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowRejectionField(true)}
                    className={`h-16 border-2 border-red-500/20 text-red-500 rounded-3xl font-black uppercase italic tracking-widest text-[10px] gap-2 hover:bg-red-500 hover:text-white transition-all ${showRejectionField ? 'bg-red-500 text-white' : ''}`}
                  >
                    Rechazar Documentos <XCircle size={16} />
                  </Button>
                </div>

                {showRejectionField && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <textarea 
                      className="w-full bg-red-500/5 border-2 border-red-500/20 rounded-3xl p-5 text-sm outline-none focus:border-red-500 transition-all dark:text-white"
                      placeholder="Indica el motivo del rechazo (ej. Documento borroso, contrato sin firma)..."
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                    <Button 
                      onClick={handleRejectDocs}
                      isLoading={processingValidation}
                      className="w-full h-12 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest"
                    >
                      Confirmar Rechazo y Notificar
                    </Button>
                  </div>
                )}
             </div>
           </div>
         )}
       </Modal>

      {/* MODAL ÉXITO CREACIÓN EVENTO */}
      <Modal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} title="">
         <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="w-24 h-24 bg-[var(--primary-10)] rounded-full flex items-center justify-center">
               <CheckCircle2 size={64} className="text-[var(--primary)]" />
            </div>
            <div className="space-y-2">
               <h3 className="text-2xl font-black italic uppercase text-gray-900 dark:text-white leading-tight">
                 ¡Evento Creado y Facturado!
               </h3>
               <p className="text-sm font-bold text-gray-500">
                 Se ha generado la deuda en la cartera de todos los deportistas de los equipos seleccionados. Todo listo para empezar a recibir cobros.
               </p>
            </div>
            <Button 
               onClick={() => setShowSuccessModal(false)}
               className="w-full h-14 bg-black text-white dark:bg-white dark:text-black rounded-2xl font-black uppercase tracking-widest text-[10px]"
            >
               Continuar
            </Button>
         </div>
      </Modal>

    </div>
  );
}
