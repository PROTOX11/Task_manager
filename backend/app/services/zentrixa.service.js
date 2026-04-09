const DEFAULT_AI_URL = 'http://127.0.0.1:8001/zentrixa';

export async function classifyIntent(text) {
  const aiUrl = process.env.ZENTRIXA_AI_URL || DEFAULT_AI_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(aiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text }),
      signal: controller.signal
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`AI service responded with ${response.status}: ${message}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}
