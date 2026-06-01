import { describe, it, expect } from 'vitest';
import { analyzeContentForTags } from './emotionLexicon';

describe('analyzeContentForTags', () => {
  it('should return empty list for empty/null content', () => {
    expect(analyzeContentForTags(null)).toEqual([]);
    expect(analyzeContentForTags('')).toEqual([]);
  });

  it('should auto-tag based on emotional keywords', () => {
    const content = '<p>I was so happy and cheerful today! The sun was shining bright.</p>';
    const tags = analyzeContentForTags(content);
    expect(tags).toContain('joy');
  });

  it('should strip HTML tags successfully before processing', () => {
    const content = '<div class="happy">I am feeling very anxious and stressed about school.</div>';
    const tags = analyzeContentForTags(content);
    // Should NOT match 'happy' from class name, only from body
    expect(tags).toContain('anxiety');
    expect(tags).toContain('school');
    expect(tags).not.toContain('joy'); // Since 'happy' was in the HTML tag class
  });

  it('should respect word boundaries and avoid substring matches', () => {
    const content = '<p>The dynamic energy of the room was amazing.</p>';
    const tags = analyzeContentForTags(content);
    expect(tags).toContain('energy');
  });

  it('should rank tags by keyword hit frequency', () => {
    const content = `
      <p>I worked all day at the office on a tough work project. I had three work meetings.</p>
      <p>I felt a little stressed and anxious, but home with the kids and family made me peaceful.</p>
    `;
    const tags = analyzeContentForTags(content);
    
    // 'work' occurs 4 times (worked, office, work, work - wait, 'work' and 'working' are in the list.
    // Let's check: 'worked' is not in 'work' list, but 'work' and 'office' are.
    // 'work' is matched 3 times. 'office' is matched 1 time. Total work = 4 hits.
    // 'kids' and 'family' match 'family' (2 hits).
    // 'stressed' and 'anxious' match 'anxiety' (2 hits).
    // 'peaceful' matches 'peace' (1 hit).
    // 'home' matches 'home' (1 hit).
    
    expect(tags[0]).toBe('work'); // Highest frequency should be first
    expect(tags.length).toBeLessThanOrEqual(3);
  });

  it('should return at most 3 tags', () => {
    const content = '<p>happy calm energy reflect anxious sad hate work family school home</p>';
    const tags = analyzeContentForTags(content);
    expect(tags.length).toBe(3);
  });
});
