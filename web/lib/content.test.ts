import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { renderMarkdown, getAllTrips, getTrip, readPage } from './content';

const fixtures = path.join(__dirname, '__fixtures__');
const contentDir = path.join(__dirname, '..', 'content');

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

describe('z-letiste page content', () => {
  it('má frontmatter a všechny 4 sekce', () => {
    const { data, body } = readPage('z-letiste.md', contentDir);
    expect(data.title).toBe('Z letiště');
    expect(body).toContain('Půjčení auta');
    expect(body).toContain('Veřejná doprava');
    expect(body).toContain('Taxi');
    expect(body).toContain('Mapa');
  });
});
