/**
 * Traduce los mensajes de error de Supabase Auth al español.
 */
export const getAuthErrorMessage = (error: any): string => {
  if (!error) return 'Ocurrió un error inesperado.';
  
  const message = error.message || '';
  const code = error.code || '';

  // Mensajes comunes de Supabase Auth
  if (message.includes('Email not confirmed') || code === 'email_not_confirmed') {
    return 'Tu correo electrónico aún no ha sido verificado. Por favor, revisa tu bandeja de entrada.';
  }

  if (message.includes('Invalid login credentials') || code === 'invalid_credentials') {
    return 'El correo electrónico o la contraseña son incorrectos.';
  }

  if (message.includes('User not found') || code === 'user_not_found') {
    return 'No existe una cuenta con este correo electrónico.';
  }

  if (message.includes('Password is too short') || code === 'password_too_short') {
    return 'La contraseña es demasiado corta.';
  }

  if (message.includes('User already registered') || code === 'user_already_exists') {
    return 'Ya existe una cuenta con este correo electrónico.';
  }

  if (message.includes('Rate limit exceeded') || code === 'over_confirmation_rate_limit') {
    return 'Demasiados intentos. Por favor, inténtalo de nuevo más tarde.';
  }

  // Fallback para otros errores
  return 'Ocurrió un error al intentar iniciar sesión. Por favor, verifica tus datos.';
};
