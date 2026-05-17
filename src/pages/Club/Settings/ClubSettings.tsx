import React, { useState } from 'react';
import { Settings, Globe, MessageCircle, Bell, CreditCard, ShieldCheck, Users, FormInput, Info } from 'lucide-react';
import GeneralInfoTab from './GeneralInfoTab';
import RegionalTab from './RegionalTab';
import WhatsAppTab from './WhatsAppTab';
import SedesTab from './SedesTab';
import PaymentsTab from './PaymentsTab';
import SubscriptionTab from './SubscriptionTab';
import UsersTab from './UsersTab';
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
        <div className="md:w-64 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 px-2">Secciones</h2>
          <nav className="flex flex-col space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-gray-100 dark:bg-[#1e293b] text-gray-900 dark:text-[#daff01]' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-gray-900 dark:text-[#daff01]' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenido Principal */}
        <div className="flex-1 bg-white dark:bg-[#16171b] border border-gray-200 dark:border-[#26282e] rounded-2xl shadow-sm min-h-[500px]">
          {activeTab === 'general' && <GeneralInfoTab />}
          {activeTab === 'regional' && <RegionalTab />}
          {activeTab === 'whatsapp' && <WhatsAppTab />}
          {activeTab === 'sedes' && <SedesTab />}
          {activeTab === 'payments' && <PaymentsTab />}
          {activeTab === 'subscription' && <SubscriptionTab />}
          {activeTab === 'users' && <UsersTab />}
          {(activeTab !== 'general' && activeTab !== 'regional' && activeTab !== 'whatsapp' && activeTab !== 'sedes' && activeTab !== 'payments' && activeTab !== 'subscription' && activeTab !== 'users') && (
            <div className="p-12 flex flex-col items-center justify-center text-center h-full text-gray-500 dark:text-gray-400">
              <Settings className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Próximamente</h3>
              <p className="max-w-sm">Esta sección de configuración está en desarrollo y estará disponible pronto.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
