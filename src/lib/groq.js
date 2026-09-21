const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function isEnabled() {
  return Boolean(process.env.GROQ_API_KEY);
}

const RETIRED = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'llama-3.2-1b-preview',
  'llama-3.2-3b-preview',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
];

function model() {
  const configured = (process.env.GROQ_MODEL || '').trim();
  if (configured && !RETIRED.includes(configured)) {
    return configured;
  }
  return 'openai/gpt-oss-20b';
}

async function chatCompletion({ messages, temperature = 0.7, maxTokens = 300 }) {
  if (!isEnabled()) {
    return null;
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model(),
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const error = new Error(`Groq API ${res.status}: ${res.statusText}`);
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

async function petMessage({ commit, score, summary }) {
  return chatCompletion({
    temperature: 0.9,
    maxTokens: 200,
    messages: [
      {
        role: 'system',
        content:
          'Eres una mascota virtual de desarrollo (tamagotchi) que comenta brevemente cada commit de su proyecto. Hablas en español, con tono juguetón y muy breve (1-2 frases, máx 50 palabras). Usa emojis con moderación. Adjunta el puntaje de calidad del commit.',
      },
      {
        role: 'user',
        content: `Commit: "${commit.message}" (rama ${commit.branch || 'unknown'}, autor ${commit.author || 'alguien'}).\nScore de calidad: ${score}/100.\n${summary ? `Resumen técnico:\n${summary}` : ''}`,
      },
    ],
  });
}

module.exports = { isEnabled, model, chatCompletion, petMessage };