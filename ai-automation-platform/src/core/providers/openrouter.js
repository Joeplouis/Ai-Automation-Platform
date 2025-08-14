import fetch from 'node-fetch';

export async function listModels(baseUrl, apiKey) {
  try {
    const r = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return (d.data || []).map(m => ({
      provider: 'openrouter',
      model: m.id,
      status: 'online',
      description: m.description || '',
      context_length: m.context_length || null
    }));
  } catch (e) {
    return [{ provider: 'openrouter', model: 'unavailable', status: 'error', description: e.message, context_length: null }];
  }
}

export async function streamChat(baseUrl, apiKey, model, messages, onChunk) {
  try {
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, stream: true })
    });
    if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
    const reader = r.body.getReader();
    const dec = new TextDecoder();
  // eslint-disable-next-line no-constant-condition
  while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = dec.decode(value, { stream: true });
      chunk.split(/\n\n/).filter(Boolean).forEach(l => onChunk(l));
    }
  } catch (e) {
    onChunk(JSON.stringify({ choices: [{ delta: { content: `[openrouter simulated: ${e.message}]` } }] }));
  }
}
