import { GoogleGenAI, Type } from "@google/genai";
import { CalendarEvent, AiAction } from '../types';

// Debug: controlla se l'API key è disponibile
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
console.log('API Key disponibile:', !!apiKey);

if (!apiKey) {
    console.error('VITE_GEMINI_API_KEY non è configurata!');
    throw new Error('API Key di Google Gemini non configurata. Imposta VITE_GEMINI_API_KEY nelle variabili d\'ambiente.');
}

const ai = new GoogleGenAI({ apiKey });

const model = 'gemini-2.5-flash';

const systemInstruction = `Sei un assistente per un calendario intelligente. Il tuo compito è aiutare l'utente a gestire i propri eventi.
Interpreta le richieste dell'utente e rispondi in formato JSON utilizzando lo schema fornito.
Rispondi sempre e solo in italiano.
La data e l'ora correnti sono: ${new Date().toLocaleString('it-IT')}.

Le azioni possibili sono:
- 'create_event': Quando l'utente vuole aggiungere un nuovo evento. Estrai titolo, data (in formato YYYY-MM-DD), ora (in formato HH:MM) e una descrizione se fornita.
- 'read_events': Quando l'utente chiede quali sono i suoi impegni in una data specifica. Estrai la data. Se non specifica una data, assumi oggi.
- 'summarize_events': Quando l'utente chiede un riassunto dei suoi impegni per un periodo (es. 'oggi', 'domani', 'questa settimana'). Estrai il periodo.
- 'delete_event': Quando l'utente vuole cancellare un evento. Estrai il titolo dell'evento o un identificatore per trovarlo.
- 'open_program': Quando l'utente vuole aprire un programma (es. 'apri obsidian'). Estrai il nome del programma.
- 'general_conversation': Per qualsiasi altra domanda o conversazione che non rientra nelle categorie precedenti.
- 'unsure': Se la richiesta non è chiara o non riesci a determinare un'azione.

Esempi di input -> output atteso:
- "Aggiungi un appuntamento domani alle 10 per una riunione di progetto" -> { "action": "create_event", "params": { "title": "Riunione di progetto", "date": "[data di domani]", "time": "10:00" } }
- "Cosa ho da fare oggi?" -> { "action": "read_events", "params": { "date": "[data di oggi]" } }
- "Riassumi la mia settimana" -> { "action": "summarize_events", "params": { "period": "settimana" } }
- "Apri vscode" -> { "action": "open_program", "params": { "program": "vscode" } }
- "Come stai?" -> { "action": "general_conversation", "params": { "text": "Come stai?" } }
`;

export const processUserCommand = async (prompt: string, events: CalendarEvent[]) => {
    try {
        const fullPrompt = `Richiesta utente: "${prompt}"\n\nEventi esistenti nel calendario (per contesto, se necessario per rispondere): ${JSON.stringify(events)}`;

        const response = await ai.models.generateContent({
            model,
            contents: fullPrompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        action: { type: Type.STRING, enum: Object.values(AiAction) },
                        params: { 
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING, description: "Il titolo dell'evento." },
                                date: { type: Type.STRING, description: "La data dell'evento in formato YYYY-MM-DD." },
                                time: { type: Type.STRING, description: "L'ora dell'evento in formato HH:MM." },
                                description: { type: Type.STRING, description: "Una descrizione opzionale dell'evento." },
                                period: { type: Type.STRING, description: "Il periodo da riassumere (es. 'oggi', 'domani', 'settimana')." },
                                program: { type: Type.STRING, description: "Il nome del programma da aprire." },
                                text: { type: Type.STRING, description: "Il testo della conversazione generale." }
                            }
                        },
                        responseText: { type: Type.STRING, description: "Una risposta testuale amichevole da mostrare all'utente." }
                    }
                }
            }
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Errore durante la chiamata a Gemini:", error);
        return {
            action: AiAction.GENERAL_CONVERSATION,
            responseText: "Mi dispiace, si è verificato un errore durante l'elaborazione della tua richiesta. Riprova."
        };
    }
};

export const getDailySummary = async (events: CalendarEvent[], date: string) => {
    const prompt = `Fornisci un riepilogo conciso e amichevole degli eventi di oggi, ${date}. Se non ci sono eventi, dillo in modo positivo. Eventi di oggi: ${JSON.stringify(events)}`;
    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                systemInstruction: "Sei un assistente personale che fornisce un riassunto giornaliero degli impegni."
            }
        });
        return response.text;
    } catch(error) {
        console.error("Errore durante la generazione del riassunto giornaliero:", error);
        return "Non è stato possibile generare il riassunto di oggi a causa di un errore.";
    }
}