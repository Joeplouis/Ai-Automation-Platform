import fetch from 'node-fetch';

export async function listModels(baseUrl) {
  try {
    const r = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return (d.models || []).map(m => ({ provider: 'ollama', model: m.name, status: 'online', description: 'Ollama model', context_length: null }));
  } catch (e) {
    return [{ provider: 'ollama', model: 'unavailable', status: 'error', description: e.message, context_length: null }];
  }
}

export async function streamChat(baseUrl, model, messages, onChunk) {
  try {
    const r = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      chunk.split(/\n/).filter(Boolean).forEach(l => onChunk(l));
    }
  } catch (e) {
    onChunk(JSON.stringify({ choices: [{ delta: { content: `[ollama simulated: ${e.message}]` } }] }));
  }
}
