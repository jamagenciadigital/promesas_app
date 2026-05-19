import React, { useState } from 'react';
import { Settings, Globe, MessageCircle, Bell, CreditCard, ShieldCheck, Users, FormInput, Info } from 'lucide-react';
import GeneralInfoTab from './GeneralInfoTab';
import RegionalTab from './RegionalTab';
import WhatsAppTab from './WhatsAppTab';
import SedesTab from './SedesTab';
import PaymentsTab from './PaymentsTab';
import SubscriptionTab from './SubscriptionTab';
import UsersTab from './UsersTab';
import NotificacionesTab from './NotificacionesTab';
import { MapPin, CreditCard as CardIcon } from 'lucide-react';

type Tab = 'general' | 'regional' | 'whatsapp' | 'notifications' | 'payments' | 'subscription' | 'users' | 'sedes';

export default function ClubSettings() {
  const [activeTab, setActiveTab] = useState<Tab>('general');

  const tabs = [
    { id: 'general', label: 'Información General', icon: Info },
    { id: 'regional', label: 'Configuración Regional', icon: Globe },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'notifications', label: 'Notificaciones App', icon: Bell },
    { id: 'payments', label: 'Configuración de Pagos', icon: CreditCard },
    { id: 'subscription', label: 'Suscripción y Plan', icon: ShieldCheck },
    { id: 'users', label: 'Gestión de Usuarios', icon: Users },
    { id: 'sedes', label: 'Sedes', icon: MapPin },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in">
      

      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap gap-8">
        {/* Sidebar de Secciones */}
        <div className="md:w-64 flex-shrink-0 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <h2 className="text-sm font-bold text-[#182332] uppercase tracking-wider px-4 pt-4 pb-3">Secciones</h2>
          <nav className="flex flex-col space-y-1 px-3 pb-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-[#182332] text-white' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5 text-gray-400" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenido Principal */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm min-h-[500px]">
          {activeTab === 'general' && <GeneralInfoTab />}
          {activeTab === 'regional' && <RegionalTab />}
          {activeTab === 'whatsapp' && <WhatsAppTab />}
          {activeTab === 'sedes' && <SedesTab />}
          {activeTab === 'payments' && <PaymentsTab />}
          {activeTab === 'subscription' && <SubscriptionTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'notifications' && <NotificacionesTab />}
          {(activeTab !== 'general' && activeTab !== 'regional' && activeTab !== 'whatsapp' && activeTab !== 'sedes' && activeTab !== 'payments' && activeTab !== 'subscription' && activeTab !== 'users' && activeTab !== 'notifications') && (
            <div className="p-12 flex flex-col items-center justify-center text-center h-full text-gray-500">
              <Settings className="w-12 h-12 mb-4 text-gray-300" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Próximamente</h3>
              <p className="max-w-sm">Esta sección de configuración está en desarrollo y estará disponible pronto.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
