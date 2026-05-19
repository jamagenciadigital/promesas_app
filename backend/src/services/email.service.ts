import { PrismaClient } from '../../generated/prisma';

export async function sendEmail(
  prisma: PrismaClient,
  to: string,
  type: 'registro' | 'recuperacion' | 'notificaciones',
  variables: Record<string, any>,
  club_id?: string
) {
  try {
    if (!club_id) {
      console.warn("Email cancelado: No se proporcionó club_id.");
      return false;
    }

    // 1. Fetch email config from club
    const clubes = await prisma.$queryRawUnsafe<any[]>(
      'SELECT resend_api_key, resend_from_email, nombre, template_id_registro, template_id_recuperacion, template_id_notificaciones, activar_correos FROM public.clubes WHERE id = $1 LIMIT 1',
      club_id
    );

    if (!clubes || clubes.length === 0) {
      console.warn(`Email cancelado: No se encontró el club ${club_id}.`);
      return false;
    }

    const cfg = clubes[0];
    const clubName = cfg.nombre || 'Club';

    if (!cfg.activar_correos) {
      console.log(`Email cancelado: Los correos están desactivados para el club ${club_id}.`);
      return false;
    }

    if (!cfg.resend_api_key || !cfg.resend_from_email) {
      console.warn(`Email cancelado: Faltan credenciales de Resend en el club ${club_id}.`);
      return false;
    }

    // 2. Resolve template ID based on type
    let templateId = '';

    if (type === 'registro') {
      templateId = cfg.template_id_registro;
    } else if (type === 'recuperacion') {
      templateId = cfg.template_id_recuperacion;
    } else if (type === 'notificaciones') {
      templateId = cfg.template_id_notificaciones;
    }

    if (!templateId) {
      console.warn(`Email cancelado: No se encontró Template ID para '${type}' en el club ${club_id}.`);
      return false;
    }

    // 3. Send via Resend API
    console.log(`Enviando email a ${to} usando template ${templateId}...`);

    const fromFormatted = cfg.resend_from_email.includes('<')
      ? cfg.resend_from_email
      : clubName + ' <' + cfg.resend_from_email + '>';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.resend_api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromFormatted,
        to: [to],
        template: {
          id: templateId,
          variables: variables
        }
      })
    });

    const data: any = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      return false;
    }

    console.log(`Email enviado con éxito! ID: ${data.id}`);
    return true;

  } catch (error) {
    console.error("Error inesperado enviando email:", error);
    return false;
  }
}

export async function sendNotificationEmail(
  prisma: PrismaClient,
  to: string,
  tipo: string,
  variables: Record<string, any>,
  club_id: string
) {
  try {
    // 1. Fetch email config from club
    const clubes = await prisma.$queryRawUnsafe<any[]>(
      'SELECT resend_api_key, resend_from_email, nombre, template_id_notificaciones, activar_correos FROM public.clubes WHERE id = $1 LIMIT 1',
      club_id
    );

    if (!clubes || clubes.length === 0) {
      console.warn(`Email cancelado: No se encontró el club ${club_id}.`);
      return false;
    }

    const cfg = clubes[0];
    const clubName = cfg.nombre || 'Club';

    if (!cfg.activar_correos) {
      console.log(`Email cancelado: Los correos están desactivados para el club ${club_id}.`);
      return false;
    }

    if (!cfg.resend_api_key || !cfg.resend_from_email || !cfg.template_id_notificaciones) {
      console.warn(`Email cancelado: Faltan credenciales o template de notificaciones en el club ${club_id}.`);
      return false;
    }

    // 2. Fetch plantilla body for this club + tipo
    const plantillas = await prisma.$queryRawUnsafe<any[]>(
      'SELECT asunto, cuerpo FROM public.plantillas_correo WHERE club_id = $1 AND tipo = $2 AND activo = true LIMIT 1',
      club_id,
      tipo
    );

    if (!plantillas || plantillas.length === 0) {
      console.warn(`Email cancelado: No hay plantilla activa para '${tipo}' en el club ${club_id}.`);
      return false;
    }

    const plantilla = plantillas[0];
    let asunto = plantilla.asunto || '';
    let contenido = plantilla.cuerpo || '';

    // 3. Replace variables in body and subject
    const mergedVars: Record<string, any> = {
      ...variables,
      club: clubName,
    };
    for (const [key, value] of Object.entries(mergedVars)) {
      asunto = asunto.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value ?? ''));
      contenido = contenido.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value ?? ''));
    }
    mergedVars.asunto = asunto;

    // 4. Send via Resend using the template
    const fromFormatted = cfg.resend_from_email.includes('<')
      ? cfg.resend_from_email
      : clubName + ' <' + cfg.resend_from_email + '>';

    console.log(`Enviando email de notificación (${tipo}) a ${to} via template...`);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.resend_api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromFormatted,
        to: [to],
        template: {
          id: cfg.template_id_notificaciones,
          variables: {
            ...mergedVars,
            contenido: contenido
          }
        }
      })
    });

    const data: any = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      return false;
    }

    console.log(`Email de notificación enviado con éxito! ID: ${data.id}`);
    return true;

  } catch (error) {
    console.error("Error inesperado enviando email de notificación:", error);
    return false;
  }
}
