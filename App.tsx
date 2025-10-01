import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CalendarView } from './components/CalendarView';
import { ChatPanel } from './components/ChatPanel';
import { SettingsModal } from './components/SettingsModal';
import { useCalendar } from './hooks/useCalendar';
import { useVoiceControl } from './hooks/useVoiceControl';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { processUserCommand, getDailySummary } from './services/geminiService';
import { CalendarEvent, ChatMessage, Settings, AiAction } from './types';

const App: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: 'initial', sender: 'ai', text: 'Ciao! Sono il tuo assistente. Clicca ovunque per attivare le risposte vocali.' }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settings, setSettings] = useState<Settings>(() => {
        const savedSettings = localStorage.getItem('smartCalendarSettings');
        return savedSettings ? JSON.parse(savedSettings) : {
            wakeWord: 'assistente',
            dailySummaryEnabled: false,
            dailySummaryTime: '08:00',
        };
    });

    const { events, addEvent, deleteEventByTitle, getEventsForDate } = useCalendar();
    const { speak, isSpeaking, init: initTTS } = useTextToSpeech();
    
    const wasLastCommandVoice = useRef(false);
    const summaryIntervalRef = useRef<number | null>(null);
    const lastSummaryDateRef = useRef<string | null>(null);

    const handleNewMessage = (sender: 'user' | 'ai' | 'system', text: string, isHtml: boolean = false) => {
        setMessages(prev => [...prev, { id: Date.now().toString(), sender, text, isHtml }]);
    };
    
    const handleAiResponse = useCallback(async (command: string) => {
        setIsLoading(true);
        let spokenResponse = '';
        try {
            const aiResponse = await processUserCommand(command, events);
            spokenResponse = aiResponse.responseText;
            
            switch (aiResponse.action) {
                case AiAction.CREATE_EVENT: {
                    const params = aiResponse.params as { title: string, date: string, time: string, description?: string };
                    if (params.title && params.date && params.time) {
                        addEvent(params);
                    }
                    handleNewMessage('ai', aiResponse.responseText);
                    break;
                }
                case AiAction.READ_EVENTS: {
                    const params = aiResponse.params as { date: string };
                    const toYYYYMMDD = (d: Date): string => d.toISOString().split('T')[0];
                    
                    const dateToRead = params.date || toYYYYMMDD(new Date());
                    const eventsForDay = getEventsForDate(dateToRead);
                    // Aggiunge un offset per evitare problemi di fuso orario
                    const formattedDate = new Date(dateToRead + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    
                    let responseText = `Ecco gli eventi per ${formattedDate}:<br/>`;
                    let spokenText = `Per ${formattedDate}, hai i seguenti impegni: `;

                    if (eventsForDay.length > 0) {
                        responseText += `<ul class="list-disc list-inside mt-2">${eventsForDay.map(e => `<li><b>${e.time}</b>: ${e.title}</li>`).join('')}</ul>`;
                        spokenText += eventsForDay.map(e => `alle ${e.time}, ${e.title}`).join('; ');
                    } else {
                        responseText = `Nessun evento trovato per ${formattedDate}.`;
                        spokenText = `Non hai nessun evento per ${formattedDate}.`;
                    }
                    spokenResponse = spokenText;
                    handleNewMessage('ai', responseText, true);
                    break;
                }
                 case AiAction.SUMMARIZE_EVENTS: {
                    handleNewMessage('ai', aiResponse.responseText);
                    break;
                }
                case AiAction.DELETE_EVENT: {
                    const params = aiResponse.params as { title: string };
                    const deletedEvent = deleteEventByTitle(params.title);
                    if (deletedEvent) {
                        spokenResponse = `Ho cancellato l'evento: "${deletedEvent.title}".`;
                    } else {
                        spokenResponse = `Non ho trovato un evento con il titolo "${params.title}" da cancellare.`;
                    }
                    handleNewMessage('ai', spokenResponse);
                    break;
                }
                case AiAction.OPEN_PROGRAM: {
                    const params = aiResponse.params as { program: string };
                    handleNewMessage('ai', aiResponse.responseText);
                    try {
                        window.location.href = `${params.program}://`;
                    } catch (e) {
                        console.error(`Failed to open program ${params.program}`, e);
                        const errorMsg = `Non è stato possibile aprire "${params.program}".`;
                        handleNewMessage('system', errorMsg);
                        spokenResponse = errorMsg;
                    }
                    break;
                }
                case AiAction.GENERAL_CONVERSATION:
                case AiAction.UNSURE:
                default:
                    handleNewMessage('ai', aiResponse.responseText);
                    break;
            }
        } catch (error) {
            console.error(error);
            spokenResponse = 'Si è verificato un errore. Riprova.';
            handleNewMessage('system', spokenResponse);
        } finally {
            setIsLoading(false);
            if (wasLastCommandVoice.current && spokenResponse) {
                const plainText = spokenResponse.replace(/<[^>]*>/g, ' ');
                return plainText;
            }
            return null;
        }
    }, [addEvent, deleteEventByTitle, events, getEventsForDate]);

    const { startListening, stopListening, isListening, isAwake, statusMessage } = useVoiceControl(
        settings.wakeWord,
        (command) => {
            console.log(`[App] Comando vocale ricevuto: "${command}". Gestione risposta AI.`);
            handleNewMessage('user', `${command} (via voce)`);
            wasLastCommandVoice.current = true;
            handleAiResponse(command).then(textToSpeak => {
                if(textToSpeak) {
                    console.log('[App] Risposta AI generata. Fermo l\'ascolto per parlare.');
                    stopListening();
                    speak(textToSpeak, () => {
                         console.log('[App] TTS (Text-to-Speech) terminato.');
                         if (wasLastCommandVoice.current) {
                            console.log('[App] Riavvio l\'ascolto dopo la risposta vocale.');
                            startListening();
                         } else {
                            console.log('[App] Non riavvio l\'ascolto perché l\'ultimo comando non era vocale.');
                         }
                    });
                }
            });
        }
    );

    useEffect(() => {
        const initAudio = () => {
            console.log('[App] Interazione utente rilevata. Inizializzazione audio...');
            initTTS();
            setMessages(prev => prev.map(m => m.id === 'initial' ? { ...m, text: 'Ciao! Sono il tuo assistente per il calendario. Come posso aiutarti oggi?' } : m));
            handleNewMessage('system', 'Audio attivato. Sono pronta ad ascoltare.');
            window.removeEventListener('click', initAudio);
            window.removeEventListener('keydown', initAudio);
        };
        window.addEventListener('click', initAudio, { once: true });
        window.addEventListener('keydown', initAudio, { once: true });
        
        return () => {
            window.removeEventListener('click', initAudio);
            window.removeEventListener('keydown', initAudio);
        };
    }, [initTTS]);

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmedInput = userInput.trim();
        if (!trimmedInput || isLoading) return;
        
        console.log('[App] Invio messaggio testuale. Elaborazione...');
        const wasListening = isListening; // Cattura lo stato prima di fermarlo
        wasLastCommandVoice.current = false;

        if (wasListening) {
            console.log('[App] Il controllo vocale era attivo, lo fermo per l\'invio del testo.');
            stopListening(); 
        }

        handleNewMessage('user', trimmedInput);
        setUserInput('');
        handleAiResponse(trimmedInput).then(() => {
            if(wasListening) {
                console.log('[App] Riavvio l\'ascolto dopo la risposta al testo.');
                startListening();
            } else {
                console.log('[App] L\'ascolto non era attivo, quindi non lo riavvio.');
            }
        });
    };
    
    const saveSettings = (newSettings: Settings) => {
        setSettings(newSettings);
        localStorage.setItem('smartCalendarSettings', JSON.stringify(newSettings));
    };

    const runDailySummary = useCallback(async () => {
        const todayStr = new Date().toISOString().split('T')[0];
        if (lastSummaryDateRef.current === todayStr) return; 

        const eventsToday = getEventsForDate(todayStr);
        const summary = await getDailySummary(eventsToday, new Date().toLocaleDateString('it-IT'));
        
        handleNewMessage('system', `🔔 <b>Riepilogo Giornaliero</b><br/>${summary}`, true);
        
        stopListening();
        speak(`Ecco il riepilogo di oggi: ${summary}`, () => {
            startListening();
        });
        lastSummaryDateRef.current = todayStr;
    }, [getEventsForDate, speak, startListening, stopListening]);

    useEffect(() => {
        if (summaryIntervalRef.current) {
            clearInterval(summaryIntervalRef.current);
        }
        if (settings.dailySummaryEnabled) {
            summaryIntervalRef.current = window.setInterval(() => {
                const now = new Date();
                const [hour, minute] = settings.dailySummaryTime.split(':');
                if (now.getHours() === parseInt(hour, 10) && now.getMinutes() === parseInt(minute, 10)) {
                    runDailySummary();
                }
            }, 60000); 
        }

        return () => {
            if (summaryIntervalRef.current) {
                clearInterval(summaryIntervalRef.current);
            }
        };
    }, [settings.dailySummaryEnabled, settings.dailySummaryTime, runDailySummary]);

    return (
        <div className="h-full w-full p-4 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6 font-sans">
            <main className="lg:w-1/2 h-1/2 lg:h-full">
                <CalendarView 
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    events={events}
                />
            </main>
            <aside className="lg:w-1/2 h-1/2 lg:h-full">
                <ChatPanel 
                    messages={messages}
                    userInput={userInput}
                    setUserInput={setUserInput}
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    voiceStatus={statusMessage}
                    isListening={isListening}
                    isRecordingCommand={isAwake}
                    isSpeaking={isSpeaking}
                    onSettingsClick={() => setIsSettingsOpen(true)}
                />
            </aside>
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                settings={settings}
                onSave={saveSettings}
            />
        </div>
    );
};

export default App;