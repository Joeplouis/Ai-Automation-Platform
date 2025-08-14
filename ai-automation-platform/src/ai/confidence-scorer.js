// Confidence Scoring Stub (Task 1.11)
// Simple heuristic: longer output.draft or output.text yields higher confidence up to 1.0

export function createConfidenceScorer({ maxLen = 2000 } = {}) {
  function extractText(o) {
    if (!o) return '';
    if (typeof o === 'string') return o;
    if (o.text) return String(o.text);
    if (o.draft) return String(o.draft);
    if (o.output && typeof o.output === 'string') return o.output;
    return JSON.stringify(o).slice(0, maxLen);
  }
  function score(output) {
    const text = extractText(output);
    const len = Math.min(text.length, maxLen);
    const base = len / maxLen; // 0..1
    const structural = /\n\n/.test(text) ? 0.1 : 0;
    const capped = Math.min(1, base + structural);
    return Number(capped.toFixed(3));
  }
  return { score };
}

export default createConfidenceScorer;
