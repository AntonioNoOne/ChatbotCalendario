import React, { useState } from 'react';
import { Settings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (newSettings: Settings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [currentSettings, setCurrentSettings] = useState(settings);

  if (!isOpen) return null;
  
  const handleSave = () => {
    onSave(currentSettings);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setCurrentSettings(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl shadow-xl p-8 w-full max-w-md m-4 border border-slate-700" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-slate-100 mb-6">Impostazioni</h2>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="wakeWord" className="block text-sm font-medium text-slate-300 mb-1">Parola di Attivazione Vocale</label>
            <input
              type="text"
              id="wakeWord"
              name="wakeWord"
              value={currentSettings.wakeWord}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-600 bg-slate-800 text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
             <p className="text-xs text-slate-400 mt-1">La parola da pronunciare per attivare i comandi vocali.</p>
          </div>
          
          <div className="border-t border-slate-700 pt-6">
             <label className="flex items-center justify-between cursor-pointer">
                <span className="font-medium text-slate-300">Abilita Riepilogo Giornaliero</span>
                <div className="relative">
                    <input
                      type="checkbox"
                      name="dailySummaryEnabled"
                      checked={currentSettings.dailySummaryEnabled}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-300 after:border-slate-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
            </label>
             <p className="text-xs text-slate-400 mt-1">Ricevi un riepilogo dei tuoi impegni ogni giorno all'ora specificata.</p>
          </div>

          {currentSettings.dailySummaryEnabled && (
            <div>
              <label htmlFor="dailySummaryTime" className="block text-sm font-medium text-slate-300 mb-1">Ora del Riepilogo</label>
              <input
                type="time"
                id="dailySummaryTime"
                name="dailySummaryTime"
                value={currentSettings.dailySummaryTime}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-600 bg-slate-800 text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          )}
        </div>
        
        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg font-semibold hover:bg-slate-600 transition-colors">
            Annulla
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
            Salva Impostazioni
          </button>
        </div>
      </div>
    </div>
  );
};