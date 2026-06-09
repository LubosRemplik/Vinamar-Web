import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { renderMarkdown, getAllTrips, getTrip } from './content';

const fixtures = path.join(__dirname, '__fixtures__');

describe('renderMarkdown', () => {
  it('renders markdown body to html', async () => {
    const html = await renderMarkdown('Body **text**');
    expect(html).toContain('<strong>text</strong>');
  });
});

describe('trip content', () => {
  it('lists trips with parsed frontmatter', () => {
    const trips = getAllTrips(fixtures);
    expect(trips).toHaveLength(1);
    expect(trips[0]).toMatchObject({
      slug: 'sample',
      title: 'Sample Trip',
      category: 'plaze',
      order: 1,
    });
  });

  it('loads a single trip with its body', () => {
    const { meta, body } = getTrip('sample', fixtures);
    expect(meta.title).toBe('Sample Trip');
    expect(body).toContain('Body');
  });
});
