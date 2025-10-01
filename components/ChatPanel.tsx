import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { MicIcon, SendIcon, SettingsIcon } from './icons';

interface ChatPanelProps {
  messages: ChatMessage[];
  userInput: string;
  setUserInput: (input: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  voiceStatus: string;
  isListening: boolean;
  isRecordingCommand: boolean;
  isSpeaking: boolean; // Nuovo stato per il feedback
  onSettingsClick: () => void;
}

const TypingIndicator = () => (
    <div className="flex items-center space-x-1.5 p-3">
        <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>
    </div>
);

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, userInput, setUserInput, onSubmit, isLoading, voiceStatus, isListening, isRecordingCommand, isSpeaking, onSettingsClick }) => {
  const chatWindowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const getMicStatusInfo = () => {
    if (isRecordingCommand) {
      return {
        text: "Comando in ascolto...",
        bgColor: "bg-red-500",
        iconColor: "text-white animate-pulse",
      };
    }
    if (isSpeaking) {
      return {
        text: "L'assistente sta parlando...",
        bgColor: "bg-teal-500",
        iconColor: "text-slate-100",
      };
    }
    if (isListening) {
      return {
        text: voiceStatus,
        bgColor: "bg-slate-600",
        iconColor: "text-slate-200",
      };
    }
    return {
      text: voiceStatus,
      bgColor: "bg-slate-700",
      iconColor: "text-slate-400",
    };
  };

  const micStatus = getMicStatusInfo();

  return (
    <div className="rounded-2xl p-px bg-gradient-to-br from-teal-400 to-blue-600 h-full shadow-2xl shadow-blue-500/10">
        <div className="bg-slate-900 rounded-[15px] flex flex-col h-full">
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
            <h2 className="text-xl font-bold text-slate-100">Assistente AI</h2>
            <button onClick={onSettingsClick} className="p-2 rounded-full text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors" title="Impostazioni">
                <SettingsIcon className="w-5 h-5"/>
            </button>
        </header>
        
        <div ref={chatWindowRef} className="flex-grow p-4 md:p-6 space-y-4 overflow-y-auto">
            {messages.map((msg) => (
            <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm flex-shrink-0">AI</div>}
                <div className={`max-w-sm md:max-w-md p-3 rounded-2xl text-sm
                ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : ''}
                ${msg.sender === 'ai' ? 'bg-slate-800 text-slate-200 rounded-bl-none' : ''}
                ${msg.sender === 'system' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 text-center w-full max-w-full' : ''}`}
                >
                {msg.isHtml ? <div className="prose prose-sm prose-invert" dangerouslySetInnerHTML={{ __html: msg.text }} /> : <p>{msg.text}</p>}
                </div>
            </div>
            ))}
            {isLoading && !isSpeaking && (
                <div className="flex items-end gap-2 justify-start">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm flex-shrink-0">AI</div>
                    <div className="bg-slate-800 rounded-2xl rounded-bl-none">
                        <TypingIndicator />
                    </div>
                </div>
            )}
        </div>

        <footer className="p-4 border-t border-slate-700 flex-shrink-0">
            <form onSubmit={onSubmit} className="flex items-center gap-3">
            <div className="flex-grow relative">
                <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={isLoading ? "In attesa della risposta..." : "Chiedi qualcosa..."}
                disabled={isLoading}
                className="w-full pl-4 pr-12 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <div 
                    className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full transition-colors ${micStatus.bgColor}`}
                    title={micStatus.text}
                >
                    <MicIcon className={`w-4 h-4 transition-colors ${micStatus.iconColor}`} />
                </div>
            </div>
            <button type="submit" disabled={isLoading || !userInput} className="bg-blue-600 text-white rounded-lg p-2.5 disabled:bg-slate-700 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <SendIcon className="w-5 h-5" />
            </button>
            </form>
            <p className="text-xs text-slate-500 mt-2 text-center h-4">{micStatus.text}</p>
        </footer>
        </div>
    </div>
  );
};