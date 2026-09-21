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

  const mod = model();
  const body = {
    model: mod,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  // Los modelos GPT-OSS razonan por defecto y pueden agotar el presupuesto de
  // tokens en el "pensamiento" dejando la respuesta final vacía. Bajar el
  // esfuerzo garantiza que quede texto en content.
  if (['openai/gpt-oss-20b', 'openai/gpt-oss-120b'].includes(mod)) {
    body.reasoning_effort = process.env.GROQ_REASONING_EFFORT || 'low';
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = new Error(`Groq API ${res.status}: ${res.statusText}`);
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  const text = msg?.content || msg?.reasoning || '';
  return text.trim() || null;
}

async function petMessage({ commit, score, findings }) {
  return chatCompletion({
    temperature: 0.9,
    maxTokens: 300,
    messages: [
      {
        role: 'system',
        content:
          'Eres una mascota virtual de desarrollo (tamagotchi) que evalúa CON HONESTIDAD cada commit de su proyecto. Hablas en español, tono juguetón pero CRÍTICO. Debes: (1) decir qué tan bueno estuvo el commit con una frase clara y directa (ej: "¡Buen commit!" o "Este commit dejó que desear"), (2) señalar algo positivo CONCRETO y (3) dar UNA mejora específica y accionable. Máximo 2-3 frases (60 palabras). NO repitas ni parafrasees el mensaje del commit. NO describas lo que se hizo en el commit; VALÓRALO. Usa emojis con moderación. Cierra indicando el puntaje del commit.',
      },
      {
        role: 'user',
        content: `Commit: "${commit.message}" (rama ${commit.branch || 'unknown'}).\nScore de calidad: ${score}/100.\n${findings && findings.length > 0 ? `Señales de calidad:\n- ${findings.join('\n- ')}` : ''}`,
      },
    ],
  });
}

module.exports = { isEnabled, model, chatCompletion, petMessage };