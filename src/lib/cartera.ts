import { supabase } from './supabase';

export const generateCarteraForAthlete = async (athlete: {
  id: string;
  club_id: string;
  plan_inscripcion_id?: string | null;
  plan_id?: string | null;
  nombre_completo?: string;
  apellidos?: string;
}) => {
  try {
    // 1. Obtener datos del club y planes
    const { data: club } = await supabase.from('clubes').select('*').eq('id', athlete.club_id).single();
    const { data: planes } = await supabase.from('planes_club').select('*').eq('club_id', athlete.club_id);

    if (!club || !planes) return;

    const activeInscPlan = planes.find(p => p.id === athlete.plan_inscripcion_id);
    const activeRegularPlan = planes.find(p => p.id === athlete.plan_id);
    const cobros = [];

    // A. Cobro de Inscripción
    if (activeInscPlan) {
      cobros.push({
        club_id: athlete.club_id,
        deportista_id: athlete.id,
        titulo: `PAGO INSCRIPCIÓN: ${activeInscPlan.nombre}`,
        monto: activeInscPlan.precio,
        fecha_vencimiento: new Date().toISOString().split('T')[0],
        estado: 'pendiente',
        plan_id: activeInscPlan.id
      });
    }

    // B. Generar Cobros de Plan durante la temporada
    if (activeRegularPlan && club.temporada_inicio && club.temporada_fin) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const seasonStart = new Date(club.temporada_inicio + 'T00:00:00');
      const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      let current = seasonStart < startOfCurrentMonth ? startOfCurrentMonth : seasonStart;

      const end = new Date(club.temporada_fin + 'T23:59:59');
      let mesesSalto = activeRegularPlan.periodo === '3 meses' ? 3 : activeRegularPlan.periodo === '6 meses' ? 6 : activeRegularPlan.periodo === '12 meses' ? 12 : 1;

      let esPrimerMes = true;

      while (current <= end) {
        const monthName = current.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
        let monto = activeRegularPlan.precio;

        if (esPrimerMes) {
          if (current.getMonth() === today.getMonth() && current.getFullYear() === today.getFullYear()) {
            const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
            const daysRemaining = daysInMonth - today.getDate() + 1;
            monto = Math.round((activeRegularPlan.precio / daysInMonth) * daysRemaining);
          }
          esPrimerMes = false;
        }

        cobros.push({
          club_id: athlete.club_id,
          deportista_id: athlete.id,
          titulo: `${activeRegularPlan.nombre.toUpperCase()} - ${monthName} ${current.getFullYear()}`,
          monto,
          fecha_vencimiento: current.toISOString().split('T')[0],
          estado: 'pendiente',
          plan_id: activeRegularPlan.id
        });

        current.setMonth(current.getMonth() + mesesSalto);
      }
    }

    if (cobros.length > 0) {
      const { error } = await supabase.from('cartera').insert(cobros);
      if (error) throw error;
    }
  } catch (err) {
    console.error("Error generating cartera on approval:", err);
    throw err;
  }
};

export const approveAthleteDocuments = async (athlete: {
  id: string;
  club_id: string;
  plan_inscripcion_id?: string | null;
  plan_id?: string | null;
  nombre_completo?: string;
  apellidos?: string;
}) => {
  try {
    // GENERAR CARTERA PRIMERO antes de activar (para evitar quedar activo sin cobros si falla)
    await generateCarteraForAthlete(athlete);

    const { error } = await supabase
      .from('deportistas')
      .update({ 
        estado: 'activo',
        plan_id: athlete.plan_id,
        plan_inscripcion_id: athlete.plan_inscripcion_id
      })
      .eq('id', athlete.id);

    if (error) throw error;

    // Notificar al padre/tutor
    try {
      const { data: padre } = await supabase
        .from('perfiles')
        .select('id')
        .eq('deportista_id', athlete.id)
        .eq('rol', 'padre')
        .maybeSingle();

      if (padre) {
        const nombreMostrar = athlete.nombre_completo || 'deportista';
        await supabase.from('notificaciones').insert({
          user_id: padre.id,
          titulo: 'Documentación Aprobada ✅',
          mensaje: `Los documentos de ${nombreMostrar} han sido validados. El deportista ya se encuentra activo.`,
          tipo: 'sistema'
        });
      }
    } catch (notifErr) {
      console.error("Error sending approval notification:", notifErr);
    }
  } catch (err) {
    console.error("Error in approveAthleteDocuments:", err);
    throw err;
  }
};

export const rejectAthleteDocuments = async (
  athleteId: string,
  athleteName: string,
  reason: string
) => {
  try {
    const { error } = await supabase
      .from('deportistas')
      .update({ 
        estado: 'rechazado',
        observaciones_validacion: reason
      })
      .eq('id', athleteId);

    if (error) throw error;

    // Notificar al padre/tutor
    try {
      const { data: padre } = await supabase
        .from('perfiles')
        .select('id')
        .eq('deportista_id', athleteId)
        .eq('rol', 'padre')
        .maybeSingle();

      if (padre) {
        await supabase.from('notificaciones').insert({
          user_id: padre.id,
          titulo: 'Documentación Rechazada ❌',
          mensaje: `Los documentos de ${athleteName} han sido rechazados. Motivo: ${reason}. Por favor sube los documentos corregidos.`,
          tipo: 'sistema'
        });
      }
    } catch (notifErr) {
      console.error("Error sending rejection notification:", notifErr);
    }
  } catch (err) {
    console.error("Error in rejectAthleteDocuments:", err);
    throw err;
  }
};
