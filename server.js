// Carica le variabili d'ambiente
require('dotenv').config();

// Importa le librerie
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');

// Inizializza Express (QUESTA PARTE MANCAVA)
const app = express();
app.use(cors());
app.use(express.json());

// Inizializza i client di Supabase e OpenAI
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Definisce l'endpoint principale "/ask"
app.post('/ask', async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'La domanda è obbligatoria.' });
  }

  try {
    // 1. Crea l'embedding della domanda dell'utente
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: question,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2. Cerca i documenti pertinenti nel database Supabase
    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: 5,
      filter: {}
    });

    if (error) throw error;

    // 3. Costruisci il contesto da passare a OpenAI
    const contextText = documents.map(doc => doc.content).join('\n---\n');
    
    const prompt = `Sei un assistente sindacale di nome Virgilio. Sei un esperto e rispondi in modo chiaro e preciso. Basandoti ESCLUSIVAMENTE sul seguente contesto fornito, rispondi alla domanda dell'utente. Se la risposta non è nel contesto, rispondi "Mi dispiace, ma non ho trovato informazioni su questo argomento nei documenti a mia disposizione."

Contesto:
${contextText}

Domanda dell'utente:
${question}`;

    // 4. Genera la risposta con il modello di chat di OpenAI
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    const answer = chatResponse.choices[0].message.content;
    res.json({ answer });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Si è verificato un errore nel processare la richiesta.' });
  }
});

// Avvia il server (QUESTA PARTE MANCAVA)
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Virgilio è in ascolto sulla porta ${PORT}`);
});