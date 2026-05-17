/**
 * Utilidades para formateo de Moneda y Fechas respetando la configuración del Club
 */

/**
 * Formatea un monto numérico a la moneda del club
 * @param amount Monto a formatear
 * @param currencyString String de moneda (ej: "COP - Peso Colombiano")
 */
export function formatCurrency(amount: number, currencyString: string = 'COP') {
  const code = currencyString.split(' ')[0] || 'COP';
  const locale = code === 'COP' ? 'es-CO' : code === 'EUR' ? 'de-DE' : 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Obtiene el offset numérico de un string de zona horaria (ej: "Colombia (UTC-5)")
 * @param timezoneString String de zona horaria
 */
export function getTimezoneOffset(timezoneString: string): number {
  const match = timezoneString?.match(/UTC([+-]\d+)/);
  return match ? parseInt(match[1]) : -5; // Default a Colombia si falla
}

/**
 * Obtiene la fecha actual (YYYY-MM-DD) en la zona horaria del club
 * @param timezoneString String de zona horaria del club
 */
export function getClubLocalDate(timezoneString: string): string {
  const offset = getTimezoneOffset(timezoneString);
  const now = new Date();
  // El timezoneOffset de JS es en minutos y con signo invertido
  // Para UTC-5, getTimezoneOffset() devuelve 300.
  // Queremos forzar el offset del club.
  
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const clubTime = new Date(utc + (3600000 * offset));
  
  return clubTime.toISOString().split('T')[0];
}

/**
 * Convierte una fecha/hora UTC a la hora local del club para mostrarla
 * @param date Fecha en cualquier formato
 * @param timezoneString Zona horaria del club
 */
export function formatToClubTime(date: string | Date, timezoneString: string): string {
  if (!date) return '';
  const d = new Date(date);
  const offset = getTimezoneOffset(timezoneString);
  
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const clubTime = new Date(utc + (3600000 * offset));
  
  return clubTime.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
}

/**
 * Parsea una fecha YYYY-MM-DD sin desplazamientos de zona horaria
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
