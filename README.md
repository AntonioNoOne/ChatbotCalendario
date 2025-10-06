# Calendario AI Smart

Un calendario intelligente con assistente AI per la gestione degli eventi.

## Configurazione per Produzione (Render)

### Variabili d'Ambiente Richieste

Imposta la seguente variabile d'ambiente su Render:

```
VITE_GEMINI_API_KEY=your_google_gemini_api_key_here
```

### Come ottenere l'API Key di Google Gemini

1. Vai su [Google AI Studio](https://aistudio.google.com/)
2. Crea un nuovo progetto
3. Genera una nuova API key
4. Copia l'API key e impostala come variabile d'ambiente su Render

### Deploy su Render

1. Collega il repository GitHub a Render
2. Usa questi comandi:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
3. Imposta la variabile d'ambiente `VITE_GEMINI_API_KEY`
4. Fai il deploy

## Sviluppo Locale

```bash
npm install
npm run dev
```

Crea un file `.env` locale con:
```
VITE_GEMINI_API_KEY=your_api_key_here
```

## Funzionalità

- 📅 Gestione eventi del calendario
- 🤖 Assistente AI per comandi vocali e testuali
- 🎤 Controllo vocale
- 🔊 Sintesi vocale
- 📱 Interfaccia responsive