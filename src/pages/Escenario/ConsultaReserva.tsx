import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, CheckCircle2, Clock, AlertCircle, ShieldCheck, ChevronLeft, MapPin, Trophy, CalendarDays, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';

type Reserva = {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  monto_total: number;
  codigo_seguimiento: string;
  escenarios: { nombre: string; direccion: string };
};

const ESTADOS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pendiente: {
    label: 'Pendiente',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    icon: Clock
  },
  confirmada: {
    label: 'Confirmada',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    icon: CheckCircle2
  },
  rechazada: {
    label: 'Rechazada',
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    icon: X
  }
};

export default function ConsultaReserva() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' | 'warning' | null }>({ message: '', type: null });

  const showNotification = (message: string, type: 'error' | 'success' | 'warning' = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: null }), 5000);
  };

  const handleSearch = async () => {
    if (!email && !codigo) {
      showNotification('Ingresa tu correo electrónico o código de seguimiento', 'warning');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      let query = supabase
        .from('reserva_escenario')
        .select('*, escenarios!inner(nombre, direccion)')
        .eq('tipo_reserva', 'particular')
        .order('fecha', { ascending: false });

      if (email) {
        query = query.eq('atleta_email', email.trim().toLowerCase());
      }
      if (codigo) {
        query = query.eq('codigo_seguimiento', codigo.trim().toUpperCase());
      }

      const { data, error } = await query;
      if (error) throw error;
      setReservas(data || []);
    } catch (error: any) {
      console.error(error);
      showNotification('Error al consultar. Intenta de nuevo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NOTIFICACIÓN */}
      {notification.type && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 animate-in slide-in-from-top-10 duration-300">
          <div className={`bg-white border shadow-lg rounded-xl p-4 flex items-center gap-3 ${
            notification.type === 'error' ? 'border-red-200' :
            notification.type === 'warning' ? 'border-amber-200' :
            'border-emerald-200'
          }`}>
            <div className={`p-2 rounded-lg ${
              notification.type === 'error' ? 'bg-red-50 text-red-500' :
              notification.type === 'warning' ? 'bg-amber-50 text-amber-500' :
              'bg-emerald-50 text-emerald-500'
            }`}>
              {notification.type === 'error' && <X size={16} />}
              {notification.type === 'warning' && <AlertCircle size={16} />}
              {notification.type === 'success' && <CheckCircle2 size={16} />}
            </div>
            <p className="flex-1 text-xs font-semibold text-gray-700">{notification.message}</p>
            <button onClick={() => setNotification({ message: '', type: null })} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={14} className="text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#E30613] rounded-xl flex items-center justify-center shadow-sm">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#182332]">Consultar Reserva</h1>
              <p className="text-[10px] font-semibold text-gray-400">Verifica el estado de tu solicitud</p>
            </div>
          </div>
          <button onClick={() => navigate('/')} className="text-xs font-semibold text-gray-400 hover:text-[#E30613] transition-colors">
            Volver al inicio
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        {/* Search Form */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-xl font-bold text-[#182332]">Busca tu reserva</h2>
            <p className="text-xs text-gray-500">Ingresa tu correo electrónico o el código de seguimiento</p>
          </div>

          <div className="max-w-lg mx-auto space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Correo electrónico</label>
              <input
                type="email"
                placeholder="tucorreo@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white border border-gray-200 h-11 px-4 rounded-xl text-sm font-semibold text-[#182332] outline-none focus:border-[#E30613] focus:ring-2 focus:ring-red-100 transition-colors placeholder:text-gray-300"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">O</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Código de seguimiento</label>
              <input
                type="text"
                placeholder="ej: A3B7F2"
                value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                className="w-full bg-white border border-gray-200 h-11 px-4 rounded-xl text-sm font-bold text-[#182332] tracking-widest uppercase outline-none focus:border-[#E30613] focus:ring-2 focus:ring-red-100 transition-colors placeholder:text-gray-300 placeholder:tracking-normal"
              />
            </div>

            <Button
              isLoading={loading}
              disabled={loading}
              onClick={handleSearch}
              className="w-full bg-[#E30613] text-white font-bold h-12 rounded-xl hover:bg-red-700 transition-all text-xs uppercase tracking-wider shadow-sm gap-2"
            >
              <Search className="w-4 h-4" /> Consultar
            </Button>
          </div>
        </div>

        {/* Results */}
        {searched && (
          <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-10 duration-500">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-6 h-6 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : reservas.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-lg font-bold text-[#182332]">Sin resultados</p>
                <p className="text-xs text-gray-500 mt-2">No encontramos reservas con esos datos</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold text-gray-500">
                  {reservas.length} reserva{reservas.length !== 1 ? 's' : ''} encontrada{reservas.length !== 1 ? 's' : ''}
                </p>
                {reservas.map(reserva => {
                  const estado = ESTADOS[reserva.estado] || ESTADOS.pendiente;
                  const EstIcon = estado.icon;
                  return (
                    <div key={reserva.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${estado.bg}`}>
                            <EstIcon className={`w-6 h-6 ${estado.color}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className={`text-[10px] font-bold px-3 py-1 rounded-lg ${estado.bg} ${estado.color}`}>
                                {estado.label}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg tracking-wider">
                                {reserva.codigo_seguimiento}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-[#182332]">{reserva.escenarios?.nombre || 'Escenario'}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5">
                              <span className="text-[10px] text-gray-500 font-semibold flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {new Date(reserva.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </span>
                              <span className="text-[10px] text-gray-500 font-semibold">
                                {reserva.hora_inicio.substring(0,5)} - {reserva.hora_fin.substring(0,5)}
                              </span>
                              <span className="text-[10px] font-bold text-[#E30613]">
                                ${new Intl.NumberFormat().format(Number(reserva.monto_total) || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 mt-12 mb-8">
        <div className="flex items-center justify-center gap-3 text-gray-400 border-t border-gray-200 pt-8">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Conexión Segura — Powered by Fichaje.Pro</span>
        </div>
      </div>
    </div>
  );
}
