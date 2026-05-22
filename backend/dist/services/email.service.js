"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TEMPLATES = exports.APP_EMAIL_CONFIG = void 0;
exports.sendEmail = sendEmail;
exports.sendNotificationEmail = sendNotificationEmail;
exports.APP_EMAIL_CONFIG = {
    resend_api_key: 're_5whxtgXY_9j8nza3AcRscadgvfVqHzGWw',
    resend_from_email: 'replay-to@fichaje.com.co',
    template_id_registro: 'bienvenido-fichaje',
    template_id_recuperacion: 'restaurar_fichaje',
    template_id_notificaciones: 'bienvenido-fichaje',
    activar_correos: true
};
exports.DEFAULT_TEMPLATES = {
    cartera: {
        asunto: 'Recordatorio de Pago Pendiente - {{club}}',
        cuerpo: 'Hola {{nombre}},<br><br>Te recordamos que tienes una cuota o pago pendiente en <strong>{{club}}</strong> por un monto de <strong>{{monto}}</strong>.<br><br>Por favor, realiza el pago correspondiente lo antes posible para mantener tu cuenta al día.<br><br>Saludos,<br>El equipo de <strong>{{club}}</strong>'
    },
    pagos: {
        asunto: 'Confirmación de Pago Recibido - {{club}}',
        cuerpo: 'Hola {{nombre}},<br><br>Hemos recibido correctamente tu pago por un monto de <strong>{{monto}}</strong> en <strong>{{club}}</strong>.<br><br>Muchas gracias por tu compromiso y estar al día con tus aportes.<br><br>Saludos,<br>El equipo de <strong>{{club}}</strong>'
    },
    agenda: {
        asunto: 'Novedades en tu Agenda - {{club}}',
        cuerpo: 'Hola {{nombre}},<br><br>Te notificamos que hay novedades o actualizaciones en tu agenda en <strong>{{club}}</strong> para la fecha <strong>{{fecha}}</strong>.<br><br>Por favor, ingresa a la plataforma para revisar los detalles.<br><br>Saludos,<br>El equipo de <strong>{{club}}</strong>'
    },
    entrenamientos: {
        asunto: 'Actualización de Entrenamiento - {{club}}',
        cuerpo: 'Hola {{nombre}},<br><br>Se ha programado o modificado una sesión de entrenamiento para el día <strong>{{fecha}}</strong> en <strong>{{club}}</strong>.<br><br>¡Te esperamos en la cancha para seguir mejorando!<br><br>Saludos,<br>El equipo de <strong>{{club}}</strong>'
    },
    eventos: {
        asunto: 'Nuevo Evento Programado - {{club}}',
        cuerpo: 'Hola {{nombre}},<br><br>Queremos invitarte al evento programado para el día <strong>{{fecha}}</strong> organizado por <strong>{{club}}</strong>.<br><br>¡Esperamos contar con tu valiosa presencia! Revisa los detalles en la aplicación.<br><br>Saludos,<br>El equipo de <strong>{{club}}</strong>'
    },
    partidos: {
        asunto: 'Convocatoria e Información de Partido - {{club}}',
        cuerpo: 'Hola {{nombre}},<br><br>Te informamos que hay novedades y detalles sobre el próximo partido de <strong>{{club}}</strong> programado para la fecha <strong>{{fecha}}</strong>.<br><br>Revisa la aplicación para ver la convocatoria oficial y los detalles del encuentro.<br><br>Saludos,<br>El equipo de <strong>{{club}}</strong>'
    }
};
async function sendEmail(prisma, to, type, variables, club_id) {
    try {
        if (!club_id) {
            console.warn("Email cancelado: No se proporcionó club_id.");
            return false;
        }
        // 1. Fetch email config from club
        const clubes = await prisma.$queryRawUnsafe('SELECT resend_api_key, resend_from_email, nombre, template_id_registro, template_id_recuperacion, template_id_notificaciones, activar_correos FROM public.clubes WHERE id = $1 LIMIT 1', club_id);
        if (!clubes || clubes.length === 0) {
            console.warn(`Email cancelado: No se encontró el club ${club_id}.`);
            return false;
        }
        const cfg = clubes[0];
        const clubName = cfg.nombre || 'Club';
        // Resolve API key and email config (uses club custom if present, else fallback)
        const hasCustomConfig = !!(cfg.resend_api_key && cfg.resend_from_email);
        const api_key = hasCustomConfig ? cfg.resend_api_key : exports.APP_EMAIL_CONFIG.resend_api_key;
        const from_email = hasCustomConfig ? cfg.resend_from_email : exports.APP_EMAIL_CONFIG.resend_from_email;
        const is_active = hasCustomConfig ? cfg.activar_correos : exports.APP_EMAIL_CONFIG.activar_correos;
        if (!is_active) {
            console.log(`Email cancelado: Los correos están desactivados para el club ${club_id}.`);
            return false;
        }
        if (!api_key || !from_email) {
            console.warn(`Email cancelado: Faltan credenciales de Resend en el club ${club_id}.`);
            return false;
        }
        // 2. Resolve template ID based on type
        let templateId = '';
        if (type === 'registro') {
            templateId = cfg.template_id_registro || exports.APP_EMAIL_CONFIG.template_id_registro;
        }
        else if (type === 'recuperacion') {
            templateId = cfg.template_id_recuperacion || exports.APP_EMAIL_CONFIG.template_id_recuperacion;
        }
        else if (type === 'notificaciones') {
            templateId = cfg.template_id_notificaciones || exports.APP_EMAIL_CONFIG.template_id_notificaciones;
        }
        if (!templateId) {
            console.warn(`Email cancelado: No se encontró Template ID para '${type}' en el club ${club_id}.`);
            return false;
        }
        // 3. Send via Resend API
        console.log(`Enviando email a ${to} usando template ${templateId}...`);
        const fromFormatted = from_email.includes('<')
            ? from_email
            : clubName + ' <' + from_email + '>';
        const frontendUrl = process.env.FRONTEND_URL || 'https://fichaje.com.co';
        const loginLink = `${frontendUrl}/login?club=${club_id}`;
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${api_key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: fromFormatted,
                to: [to],
                template: {
                    id: templateId,
                    variables: {
                        club: clubName,
                        enlace_login: loginLink,
                        ...variables
                    }
                }
            })
        });
        const data = await response.json();
        if (!response.ok) {
            console.error("Resend API error:", data);
            return false;
        }
        console.log(`Email enviado con éxito! ID: ${data.id}`);
        return true;
    }
    catch (error) {
        console.error("Error inesperado enviando email:", error);
        return false;
    }
}
async function sendNotificationEmail(prisma, to, tipo, variables, club_id) {
    try {
        // 1. Fetch email config from club
        const clubes = await prisma.$queryRawUnsafe('SELECT resend_api_key, resend_from_email, nombre, template_id_notificaciones, activar_correos FROM public.clubes WHERE id = $1 LIMIT 1', club_id);
        if (!clubes || clubes.length === 0) {
            console.warn(`Email cancelado: No se encontró el club ${club_id}.`);
            return false;
        }
        const cfg = clubes[0];
        const clubName = cfg.nombre || 'Club';
        // Resolve API key and email config (uses club custom if present, else fallback)
        const hasCustomConfig = !!(cfg.resend_api_key && cfg.resend_from_email);
        const api_key = hasCustomConfig ? cfg.resend_api_key : exports.APP_EMAIL_CONFIG.resend_api_key;
        const from_email = hasCustomConfig ? cfg.resend_from_email : exports.APP_EMAIL_CONFIG.resend_from_email;
        const is_active = hasCustomConfig ? cfg.activar_correos : exports.APP_EMAIL_CONFIG.activar_correos;
        const template_id_notificaciones = (hasCustomConfig ? cfg.template_id_notificaciones : null) || exports.APP_EMAIL_CONFIG.template_id_notificaciones;
        if (!is_active) {
            console.log(`Email cancelado: Los correos están desactivados para el club ${club_id}.`);
            return false;
        }
        if (!api_key || !from_email || !template_id_notificaciones) {
            console.warn(`Email cancelado: Faltan credenciales o template de notificaciones en el club ${club_id}.`);
            return false;
        }
        // 2. Fetch plantilla body for this club + tipo
        const plantillas = await prisma.$queryRawUnsafe('SELECT asunto, cuerpo FROM public.plantillas_correo WHERE club_id = $1 AND tipo = $2 AND activo = true LIMIT 1', club_id, tipo);
        let asunto = '';
        let contenido = '';
        if (plantillas && plantillas.length > 0) {
            asunto = plantillas[0].asunto || '';
            contenido = plantillas[0].cuerpo || '';
        }
        else {
            // Fallback a plantilla por defecto
            const def = exports.DEFAULT_TEMPLATES[tipo];
            if (!def) {
                console.warn(`Email cancelado: No hay plantilla para '${tipo}' en el club ${club_id} ni plantilla por defecto.`);
                return false;
            }
            asunto = def.asunto;
            contenido = def.cuerpo;
            console.log(`Usando plantilla por defecto para '${tipo}' en el club ${club_id}.`);
        }
        // 3. Replace variables in body and subject
        const frontendUrl = process.env.FRONTEND_URL || 'https://fichaje.com.co';
        const loginLink = `${frontendUrl}/login?club=${club_id}`;
        const mergedVars = {
            ...variables,
            club: clubName,
            enlace_login: loginLink,
        };
        for (const [key, value] of Object.entries(mergedVars)) {
            asunto = asunto.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value ?? ''));
            contenido = contenido.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value ?? ''));
        }
        mergedVars.asunto = asunto;
        // 4. Send via Resend using the template
        const fromFormatted = from_email.includes('<')
            ? from_email
            : clubName + ' <' + from_email + '>';
        console.log(`Enviando email de notificación (${tipo}) a ${to} via template...`);
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${api_key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: fromFormatted,
                to: [to],
                template: {
                    id: template_id_notificaciones,
                    variables: {
                        ...mergedVars,
                        contenido: contenido
                    }
                }
            })
        });
        const data = await response.json();
        if (!response.ok) {
            console.error("Resend API error:", data);
            return false;
        }
        console.log(`Email de notificación enviado con éxito! ID: ${data.id}`);
        return true;
    }
    catch (error) {
        console.error("Error inesperado enviando email de notificación:", error);
        return false;
    }
}
