export type Role = 'superadmin' | 'admin_club' | 'direccion_deportiva' | 'admin_equipo' | 'entrenador' | 'cartera' | 'comunicaciones' | 'padre' | 'escenario_deportivo' | 'admin_escenario' | 'atleta' | 'deportista' | 'jefatura';

export interface UserProfile {
  id: string;
  email: string;
  rol: Role;
  club_id?: string;
  deportista_id?: string;
  nombre?: string;
  apellido?: string;
  documento?: string;
  telefono?: string;
  fecha_nacimiento?: string;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  foto_url?: string;
}

export interface ClubTheme {
  sidebar_bg?: string;
  sidebar_text?: string;
  sidebar_hover_bg?: string;
  sidebar_active_bg?: string;
  sidebar_active_text?: string;
  button_bg?: string;
  button_text?: string;
  button_hover?: string;
  login_bg?: string;
}

export interface Club {
  id: string;
  nombre: string;
  logo_url?: string;
  color_principal?: string;
  theme?: ClubTheme;
  descripcion?: string;
  zona_horaria?: string;
  moneda?: string;
  whatsapp_notif_bienvenida?: boolean;
  whatsapp_notif_cargos?: boolean;
  whatsapp_notif_recordatorios?: boolean;
  estado?: string;
  pais?: string;
  ciudad?: string;
  direccion?: string;
  telefono?: string;
  email_corporativo?: string;
  website?: string;
  deporte_id?: string;
  deportes?: { nombre: string };
  qr_url?: string;
  pago_instrucciones?: string;
  temporada_inicio?: string;
  temporada_fin?: string;
  created_at: string;
  plan_id?: string;
  nit?: string;
  planes_suscripcion?: {
    nombre: string;
    precio: number;
    comision?: number;
  };
}

export interface PlanSuscripcion {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  estado: boolean;
  limite_equipos: number;
  limite_jugadores: number;
  limite_usuarios: number;
  modulos_activos: string[];
  comision?: number;
  created_at: string;
}

export interface Equipo {
  id: string;
  club_id: string;
  nombre: string;
  descripcion?: string;
  nivel_habilidad?: 'Principiante' | 'Intermedio' | 'Competitivo' | 'Elite';
  categoria_id?: string;
  edad_minima?: number;
  edad_maxima?: number;
  capacidad_maxima?: number;
  dias_entrenamiento?: string[];
  hora_inicio?: string;
  hora_fin?: string;
  sede_id?: string;
  codigo: string;
  coordinador_id?: string;
  estado?: 'activo' | 'suspendido' | 'bloqueado';
  created_at: string;
}

export interface TrayectoriaDeportiva {
  id: string;
  deportista_id: string;
  equipo_nombre: string;
  temporada_inicio?: string;
  temporada_fin?: string;
  es_actual: boolean;
  created_at: string;
}

export interface Deportista {
  id: string;
  club_id: string;
  nombre_completo: string;
  apellidos: string;
  alias?: string;
  dorsal?: string;
  fecha_nacimiento: string;
  lugar_nacimiento?: string;
  tipo_documento: string;
  numero_documento: string;
  genero?: string;
  foto_url?: string;
  rh?: string;
  peso?: number;
  estatura?: number;
  municipio?: string;
  barrio?: string;
  direccion?: string;
  celular_deportista?: string;
  email_deportista?: string;
  eps?: string;
  colegio?: string;
  tutor_nombre?: string;
  tutor_apellidos?: string;
  tutor_email?: string;
  tutor_celular?: string;
  tutor_numero_documento?: string;
  emergencia_nombre?: string;
  emergencia_celular?: string;
  url_registro_civil?: string;
  url_documento_id?: string;
  url_contrato?: string;
  posicion?: { valor: string };
  trayectorias?: TrayectoriaDeportiva[];
  created_at: string;
}

export interface ProductoEvento {
  id: string;
  club_id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  link_pago?: string;
  imagen_url?: string;
  equipos?: string[]; // Array of team ids
  created_at: string;
}

export type TipoPQRS = 'pregunta' | 'queja' | 'reclamo' | 'sugerencia';
export type EstadoPQRS = 'pendiente' | 'en_revision' | 'respondida' | 'cerrada';
export type FeedbackPQRS = 'aceptada' | 'rechazada';

export interface PQRS {
  id: string;
  codigo: string;
  solicitante_id: string;
  solicitante_nombre: string;
  solicitante_documento?: string;
  solicitante_email?: string;
  tipo: TipoPQRS;
  descripcion: string;
  adjunto_url?: string;
  destino_tipo: 'escenario' | 'club';
  destino_id: string;
  estado: EstadoPQRS;
  respuesta?: string;
  fecha_respuesta?: string;
  respondido_por?: string;
  feedback_usuario?: FeedbackPQRS;
  feedback_motivo?: string;
  created_at: string;
}

export type TipoNotificacionCorreo = 'cartera' | 'pagos' | 'agenda' | 'entrenamientos' | 'eventos' | 'partidos';

export interface PlantillaCorreo {
  id: string;
  club_id: string;
  tipo: TipoNotificacionCorreo;
  asunto?: string;
  cuerpo: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export type EstadoInventario = 'bueno' | 'regular' | 'mal_estado';

export interface InventarioItem {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  cantidad_total: number;
  cantidad_disponible: number;
  estado: EstadoInventario;
  imagen_url?: string;
  pertenece_a_tipo: 'escenario' | 'club';
  pertenece_a_id: string;
  created_at: string;
  updated_at: string;
}
