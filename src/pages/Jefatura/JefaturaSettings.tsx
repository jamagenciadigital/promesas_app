import { useState } from 'react';
import { Palette, Dumbbell } from 'lucide-react';
import SystemThemeTab from './SystemThemeTab';
import DeportesTab from './DeportesTab';

const TABS = [
  { id: 'theme', label: 'Tema del Sistema', icon: Palette },
  { id: 'deportes', label: 'Configuración de Deportes', icon: Dumbbell },
];

export default function JefaturaSettings() {
  const [activeTab, setActiveTab] = useState('theme');

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in">

      {/* Navegación de pestañas */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-[#182332] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'theme' && <SystemThemeTab />}
      {activeTab === 'deportes' && <DeportesTab />}

    </div>
  );
}
