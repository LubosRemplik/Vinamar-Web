import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const DEFAULT_CONTENT_DIR = path.join(process.cwd(), 'content');

export interface TripTip {
  slug: string;
  title: string;
  category: 'plaze' | 'mesta' | 'priroda' | 'restaurace' | 'vylety';
  image: string;
  summary: string;
  order: number;
  externalLink?: string;
  distanceKm?: number;
}

export interface PageContent {
  data: Record<string, unknown>;
  body: string;
}

export async function renderMarkdown(body: string): Promise<string> {
  const processed = await remark().use(html).process(body);
  return processed.toString();
}

export function readPage(file: string, baseDir = DEFAULT_CONTENT_DIR): PageContent {
  const raw = fs.readFileSync(path.join(baseDir, file), 'utf8');
  const { data, content } = matter(raw);
  return { data, body: content };
}

export function getTrip(
  slug: string,
  baseDir = DEFAULT_CONTENT_DIR,
): { meta: TripTip; body: string } {
  const raw = fs.readFileSync(path.join(baseDir, 'trips', `${slug}.md`), 'utf8');
  const { data, content } = matter(raw);
  return { meta: { slug, ...(data as Omit<TripTip, 'slug'>) }, body: content };
}

export function getTripSlugs(baseDir = DEFAULT_CONTENT_DIR): string[] {
  const dir = path.join(baseDir, 'trips');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

export function getAllTrips(baseDir = DEFAULT_CONTENT_DIR): TripTip[] {
  return getTripSlugs(baseDir)
    .map((slug) => getTrip(slug, baseDir).meta)
    .sort((a, b) => a.order - b.order);
}
