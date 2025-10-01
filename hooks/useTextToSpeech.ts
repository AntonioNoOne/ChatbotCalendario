import { useState, useCallback, useRef, useEffect } from 'react';

export const useTextToSpeech = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const synthRef = useRef<SpeechSynthesis | null>(null);

    const init = useCallback(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && !synthRef.current) {
            synthRef.current = window.speechSynthesis;
            // Workaround per alcuni browser (es. Chrome) che richiedono un'interazione utente per avviare l'audio.
            // Si pronuncia una stringa vuota per "sbloccare" l'engine.
            const utterance = new SpeechSynthesisUtterance('');
            utterance.volume = 0;
            synthRef.current.speak(utterance);
        }
    }, []);

    // Popola le voci quando disponibili
    useEffect(() => {
        const loadVoices = () => {
            if (synthRef.current) {
                const availableVoices = synthRef.current.getVoices();
                if (availableVoices.length > 0) {
                    setVoices(availableVoices);
                }
            }
        };

        // Questo blocco viene eseguito solo una volta al montaggio del componente.
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const synth = window.speechSynthesis;
            synthRef.current = synth;
            
            // Prova a caricare le voci subito, potrebbero essere già nella cache.
            loadVoices();

            // L'evento 'voiceschanged' è il modo più affidabile per sapere quando le voci sono pronte,
            // specialmente al primo caricamento della pagina.
            synth.onvoiceschanged = loadVoices;

            return () => {
                // Pulisce il listener quando il componente viene smontato.
                if (synth) {
                    synth.onvoiceschanged = null;
                }
            };
        }
    }, []);

    const speak = useCallback((text: string, onEnd?: () => void) => {
        const synth = synthRef.current;
        if (!synth) {
            console.warn('Sintesi vocale non inizializzata o non supportata.');
            onEnd?.(); // Non bloccare il flusso
            return;
        }
        
        // Interrompe qualsiasi discorso precedente per dare priorità al nuovo messaggio
        if (synth.speaking) {
            synth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'it-IT';
        
        // Seleziona una voce italiana, dando priorità a quelle di "Google" che spesso sono di qualità migliore.
        if (voices.length > 0) {
            const googleItalianVoice = voices.find(voice => voice.lang === 'it-IT' && voice.name.toLowerCase().includes('google'));
            const defaultItalianVoice = voices.find(voice => voice.lang === 'it-IT');

            if (googleItalianVoice) {
                utterance.voice = googleItalianVoice;
            } else if (defaultItalianVoice) {
                utterance.voice = defaultItalianVoice;
            } else {
                console.warn("Nessuna voce italiana trovata. Utilizzo la voce predefinita del browser.");
            }
        }

        utterance.onstart = () => {
            setIsSpeaking(true);
        };

        utterance.onend = () => {
            setIsSpeaking(false);
            onEnd?.();
        };

        utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
            // L'errore 'canceled' è un effetto collaterale normale quando si interrompe un discorso per iniziarne uno nuovo.
            // Lo ignoriamo per non intasare la console con errori non critici.
            if (event.error !== 'canceled') {
                console.error(`Errore nella sintesi vocale: ${event.error}`, event);
            }
            setIsSpeaking(false);
            // Assicurati che il flusso dell'app continui anche in caso di errore (es. riavvio dell'ascolto).
            onEnd?.();
        };
        
        // Un piccolo ritardo dopo `cancel()` può aiutare a prevenire race conditions su alcuni browser.
        setTimeout(() => {
            if (synthRef.current) {
                synthRef.current.speak(utterance);
            }
        }, 50);

    }, [voices]);
    
    return { speak, isSpeaking, init };
};