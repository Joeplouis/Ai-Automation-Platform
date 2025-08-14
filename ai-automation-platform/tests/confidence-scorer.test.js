import { createConfidenceScorer } from '../src/ai/confidence-scorer.js';

describe('confidence scorer', () => {
  test('scores longer text higher', () => {
    const scorer = createConfidenceScorer({ maxLen: 100 });
    const shortScore = scorer.score({ text: 'hi' });
    const longScore = scorer.score({ text: 'a'.repeat(90) });
    expect(longScore).toBeGreaterThan(shortScore);
  });
});
