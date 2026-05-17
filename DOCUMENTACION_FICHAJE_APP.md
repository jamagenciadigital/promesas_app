# Resumen Funcional y Técnico - Fichaje App

## 1. Visión General
**Fichaje App** es una plataforma SaaS (Software as a Service) integral diseñada para la gestión operativa, deportiva y administrativa de clubes deportivos y escenarios recreativos. La aplicación centraliza la interacción entre administradores, entrenadores, deportistas (y sus padres) y gestores de instalaciones.

---

## 2. Arquitectura Técnica

### Stack de Tecnologías
*   **Frontend:** [React.js](https://react.dev/) (v18) con [TypeScript](https://www.typescriptlang.org/) para un desarrollo tipado y seguro.
*   **Construcción (Build Tool):** [Vite](https://vitejs.dev/) para una experiencia de desarrollo ultra rápida.
*   **Estilos:** [Tailwind CSS](https://tailwindcss.com/) para un diseño responsivo, moderno y altamente personalizado.
*   **Base de Datos y Backend:** [Supabase](https://supabase.com/) (PostgreSQL), utilizando:
    *   **Auth:** Gestión de sesiones y roles.
    *   **Database:** Almacenamiento relacional.
    *   **Realtime:** Notificaciones y actualizaciones en vivo.
    *   **RLS (Row Level Security):** Seguridad a nivel de fila para garantizar la privacidad de los datos por club y usuario.
*   **Iconografía:** [Lucide React](https://lucide.dev/).
*   **Funcionalidades Especiales:**
    *   `html5-qrcode` & `qrcode.react`: Generación y escaneo de códigos QR para control de acceso.
    *   `date-fns`: Manipulación avanzada de fechas y horarios.

---

## 3. Módulos Funcionales por Rol

### A. Super Administrador (Plataforma)
*   **Gestión de Clubes:** Creación y supervisión de organizaciones suscritas.
*   **Configuración Global:** Definición de deportes, categorías y tipos de documentos.
*   **Planes y Suscripciones:** Control de los niveles de servicio ofrecidos a los clubes.
*   **Dashboard Global:** Métricas de uso de la plataforma a nivel macro.

### B. Administrador de Club / Dirección Deportiva
*   **Gestión de Equipos:** Creación de categorías, asignación de entrenadores y gestión de nóminas.
*   **Registro de Jugadores Élite:** Proceso especializado para deportistas de alto rendimiento con campos adicionales (salario, RH, documentos legales).
*   **Cartera Financiera:** Seguimiento de pagos, estados de cuenta de los jugadores y saldos del club.
*   **Planificación Operativa:** Calendario de entrenamientos y eventos.
*   **Logística:** Control de inventario de implementos deportivos (balones, conos, uniformes).

### C. Entrenador (Coach)
*   **Dashboard de Equipo:** Vista rápida de sus jugadores y próximos eventos.
*   **Planeación Deportiva:** Registro de sesiones de entrenamiento y objetivos.
*   **Asistencia y Seguimiento:** Control de presencia y evolución del deportista.
*   **Reservas:** Capacidad de solicitar escenarios para sesiones específicas.

### D. Deportista / Padre de Familia
*   **Perfil Personal:** Gestión de datos personales y documentos (Certificado de salud, Carta de traspaso).
*   **Mis Reservas:** Panel para solicitar y ver el estado de reservas de escenarios.
*   **Calendario:** Visualización de entrenamientos y partidos programados.
*   **Cartera Personal:** Consulta de estados de pago y mensualidades.
*   **PQRS:** Canal directo para peticiones, quejas, reclamos o sugerencias.

### E. Gestor de Escenario (Control de Acceso)
*   **Control de Acceso mediante QR:** Validación en tiempo real de deportistas y visitantes autorizados.
*   **Gestión de Disponibilidad:** Configuración de horarios y espacios (canchas, gimnasios).
*   **Reservas Públicas:** Interfaz para que usuarios externos reserven espacios mediante un link público.
*   **Inventario del Escenario:** Control de activos propios de la instalación.

---

## 4. Funcionalidades Clave

1.  **Sistema de Reservas Inteligente:**
    *   Validación de disponibilidad en tiempo real.
    *   Flujo de aprobación para administradores.
    *   Asociación automática con equipos o individuos.

2.  **Control de Acceso Operativo:**
    *   Generación de tickets con QR únicos.
    *   Dashboard de validación para personal de seguridad/escenario.
    *   Registro de historial de entradas y salidas.

3.  **Gestión de Inventario Dinámica:**
    *   Categorización (Balones, Oficina, Aseo, etc.).
    *   Alertas de stock bajo y control de estado (Bueno/Regular/Mal Estado).
    *   Gestión separada por club o por escenario físico.

4.  **Seguridad y Privacidad:**
    *   Aislamiento total de datos: Un club no puede ver los datos de otro.
    *   Políticas RLS estrictas en Supabase que protegen la integridad de la información sensible de menores de edad.

---

## 5. Flujos Principales del Sistema

1.  **Registro y Onboarding:** Club -> Equipos -> Entrenadores -> Deportistas.
2.  **Ciclo de Reserva:** Solicitud (Jugador/Club) -> Verificación de Disponibilidad -> Aprobación -> Notificación.
3.  **Control de Día de Juego/Entrenamiento:** Generación de QR -> Escaneo en Puerta -> Registro de Bitácora.
4.  **Gestión Financiera:** Registro de Pago -> Actualización de Saldo -> Notificación de Paz y Salvo.

---
**Documento generado por:** Antigravity AI
**Fecha:** 2026-05-05
