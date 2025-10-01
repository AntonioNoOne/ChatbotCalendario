import { useState, useEffect, useRef, useCallback } from 'react';

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useVoiceControl = (wakeWord: string, onCommand: (command: string) => void) => {
  // State for UI feedback
  const [isListening, setIsListening] = useState(false);
  const [isAwake, setIsAwake] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Inizializzazione...');
  
  // Refs for managing the recognition instance and state
  const recognitionRef = useRef<any | null>(null);
  const awakeTimerRef = useRef<number | null>(null);
  const manuallyStoppedRef = useRef(false);
  
  const serviceStateRef = useRef({ isRunning: false });

  // Use a ref to hold the latest `onCommand` callback.
  // This avoids adding `onCommand` to the main useEffect's dependency array.
  const onCommandRef = useRef(onCommand);
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  const startListening = useCallback(() => {
    console.log('[VoiceControl] Tentativo di AVVIARE l\'ascolto...');
    if (recognitionRef.current && !serviceStateRef.current.isRunning) {
      try {
        manuallyStoppedRef.current = false;
        serviceStateRef.current.isRunning = true;
        recognitionRef.current.start();
        console.log('[VoiceControl] recognition.start() chiamato con successo.');
      } catch (error) {
        // Checking for 'invalid-state' which can happen if start is called too quickly after a stop.
        if (error instanceof DOMException && error.name === 'InvalidStateError') {
             console.warn('[VoiceControl] recognition.start() chiamato in stato non valido, riprovando tra poco...');
             setTimeout(() => {
                if(recognitionRef.current) { // check if still mounted
                    serviceStateRef.current.isRunning = false; // reset state before retry
                    startListening();
                }
             }, 250);
        } else {
            console.error("[VoiceControl] Errore durante la chiamata a recognition.start():", error);
            setStatusMessage('Errore avvio microfono.');
            serviceStateRef.current.isRunning = false;
        }
      }
    } else {
        console.warn(`[VoiceControl] AVVIO bloccato. In esecuzione: ${serviceStateRef.current.isRunning}, Riconoscimento esiste: ${!!recognitionRef.current}`);
    }
  }, []); // Empty dependencies are correct here.

  const stopListening = useCallback(() => {
    console.log('[VoiceControl] Tentativo di FERMARE l\'ascolto...');
    if (recognitionRef.current && serviceStateRef.current.isRunning) {
      manuallyStoppedRef.current = true;
      recognitionRef.current.stop();
      console.log('[VoiceControl] recognition.stop() chiamato con successo.');
    } else {
        console.warn(`[VoiceControl] STOP bloccato. In esecuzione: ${serviceStateRef.current.isRunning}`);
    }
  }, []);
  
  useEffect(() => {
    if (!SpeechRecognition) {
      setIsSupported(false);
      setStatusMessage('Riconoscimento vocale non supportato.');
      return;
    }

    console.log('[VoiceControl] Setup useEffect in corso.');
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'it-IT';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      console.log('[VoiceControl] Evento: onstart. Il servizio è in ascolto.');
      setIsListening(true);
      setStatusMessage(`In ascolto... Pronuncia "${wakeWord}" per attivare.`);
    };

    recognition.onend = () => {
      const wasManuallyStopped = manuallyStoppedRef.current;
      console.log(`[VoiceControl] Evento: onend. È stato fermato manualmente? ${wasManuallyStopped}`);
      serviceStateRef.current.isRunning = false;
      setIsListening(false);
      setIsAwake(false);

      if (!wasManuallyStopped) {
        setStatusMessage('Riavvio ascolto...');
        console.log('[VoiceControl] onend: riavvio automatico in 100ms...');
        setTimeout(() => startListening(), 100);
      } else {
        setStatusMessage('Ascolto disattivato.');
        console.log('[VoiceControl] onend: l\'ascolto rimane fermo.');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[VoiceControl] Evento: onerror. Errore:', event.error, event);
      // 'no-speech' and 'aborted' are common and we can just let it restart.
      if (['no-speech', 'aborted'].includes(event.error)) {
        console.warn(`[VoiceControl] Errore gestito (${event.error}), lascio che si riavvii.`);
        return;
      }
      
      if (event.error === 'audio-capture') {
        console.warn('[VoiceControl] Errore cattura audio. Forse un\'altra app sta usando il microfono.');
        setStatusMessage('Problema con il microfono.');
        // Don't mark as manually stopped, let it try to recover.
        return;
      }
      
      if (event.error === 'not-allowed') {
        setStatusMessage('Permesso microfono negato.');
        manuallyStoppedRef.current = true; // This is a permanent error, stop retrying.
      } else {
        setStatusMessage(`Errore: ${event.error}`);
      }
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('')
        .trim()
        .toLowerCase();
      
      if (!transcript) {
          return; // Ignore empty results
      }

      console.log(`[VoiceControl] Evento: onresult. Trascrizione: "${transcript}"`);
      
      const wakeWordLower = wakeWord.toLowerCase();
      
      if (isAwake || transcript.includes(wakeWordLower)) { // Also listen for commands if already awake
        const command = transcript.split(wakeWordLower).pop()?.trim();
        if (command) {
            console.log(`[VoiceControl] Parola di attivazione rilevata. Comando: "${command}"`);
            setIsAwake(true);
            onCommandRef.current(command); // Use the ref to call the latest callback

            if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
            awakeTimerRef.current = window.setTimeout(() => {
                setIsAwake(false);
            }, 5000); // Increased timeout to allow for follow-up commands
        }
      }
    };

    startListening();

    return () => {
      console.log('[VoiceControl] Cleanup useEffect. Smantellamento...');
      if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
      const rec = recognitionRef.current;
      if (rec) {
        // Unsubscribe from all events to prevent memory leaks
        rec.onstart = null;
        rec.onend = null;
        rec.onerror = null;
        rec.onresult = null;

        manuallyStoppedRef.current = true; // Ensure it doesn't auto-restart after cleanup
        
        if (serviceStateRef.current.isRunning) {
            rec.stop();
        }
        recognitionRef.current = null;
      }
    };
  }, [wakeWord, startListening, stopListening]); // Removed `onCommand` from dependencies.

  return { isListening, isAwake, isSupported, statusMessage, startListening, stopListening };
};