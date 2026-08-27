import path from 'node:path';
import type { PhrasingContent, RootContent } from 'mdast';
import PDFDocument from 'pdfkit';
import { remark } from 'remark';
import { readPage } from '@/lib/content';

// Fonts live in public/ so the standalone Docker image ships them without an
// extra COPY step (files read via process.cwd() are invisible to tracing).
const FONT_DIR = path.join(process.cwd(), 'public', 'fonts');
const FONT_FILES = {
  Jost: 'Jost-Regular.ttf',
  'Jost-Medium': 'Jost-Medium.ttf',
  Cormorant: 'CormorantGaramond-Regular.ttf',
  'Cormorant-SemiBold': 'CormorantGaramond-SemiBold.ttf',
} as const;

const INK = '#1F3A34';
const PAPER = '#FBF8F3';
const SAGE = '#61716A';
const BRASS = '#A9885A';
const LINE = '#E4DCCF';

const BODY_SIZE = 10.5;
const BODY_LINE_GAP = 3;
const BULLET_INDENT = 16;

interface Run {
  text: string;
  bold?: boolean;
  muted?: boolean;
  link?: string;
}

// Markdown paragraphs are hard-wrapped in the source file; keep them as one line.
function flattenText(value: string): string {
  return value.replace(/\s*\n\s*/g, ' ');
}

function inlineRuns(nodes: PhrasingContent[], inherited: Omit<Run, 'text'> = {}): Run[] {
  const runs: Run[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        runs.push({ ...inherited, text: flattenText(node.value) });
        break;
      case 'strong':
        runs.push(...inlineRuns(node.children, { ...inherited, bold: true }));
        break;
      case 'emphasis':
        runs.push(...inlineRuns(node.children, { ...inherited, muted: true }));
        break;
      case 'link':
        runs.push(...inlineRuns(node.children, { ...inherited, link: node.url }));
        break;
      default:
        break;
    }
  }
  return runs;
}

function contentWidth(doc: PDFKit.PDFDocument): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function writeRuns(
  doc: PDFKit.PDFDocument,
  runs: Run[],
  position?: { x: number; y: number; width: number },
): void {
  runs.forEach((run, i) => {
    doc
      .font(run.bold ? 'Jost-Medium' : 'Jost')
      .fontSize(BODY_SIZE)
      .fillColor(run.muted ? SAGE : INK);
    const options: PDFKit.Mixins.TextOptions = {
      lineGap: BODY_LINE_GAP,
      continued: i < runs.length - 1,
      underline: Boolean(run.link),
      // Explicit null resets the annotation — with `continued`, a link would
      // otherwise leak into the following run.
      link: run.link ?? null,
    };
    if (position) {
      options.width = position.width;
    }
    if (i === 0 && position) {
      doc.text(run.text, position.x, position.y, options);
    } else {
      doc.text(run.text, options);
    }
  });
}

function brassRule(doc: PDFKit.PDFDocument, x: number, y: number, width: number): void {
  doc
    .moveTo(x, y)
    .lineTo(x + width, y)
    .lineWidth(0.8)
    .strokeColor(BRASS)
    .stroke();
}

function renderBlocks(doc: PDFKit.PDFDocument, blocks: RootContent[]): void {
  const left = doc.page.margins.left;
  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        // Keep the heading together with at least a couple of lines below it.
        ensureSpace(doc, 90);
        doc.y += 10;
        doc
          .font('Cormorant-SemiBold')
          .fontSize(16)
          .fillColor(INK)
          .text(inlineRuns(block.children).map((r) => r.text).join(''), left, doc.y, {
            width: contentWidth(doc),
          });
        brassRule(doc, left, doc.y + 3, 32);
        doc.y += 12;
        break;
      }
      case 'paragraph': {
        ensureSpace(doc, 40);
        writeRuns(doc, inlineRuns(block.children), {
          x: left,
          y: doc.y,
          width: contentWidth(doc),
        });
        doc.y += 6;
        break;
      }
      case 'list': {
        for (const item of block.children) {
          ensureSpace(doc, 30);
          const itemRuns = item.children.flatMap((child) =>
            child.type === 'paragraph' ? inlineRuns(child.children) : [],
          );
          const y = doc.y;
          doc
            .font('Jost')
            .fontSize(BODY_SIZE)
            .fillColor(BRASS)
            .text('—', left, y, { width: BULLET_INDENT, lineBreak: false });
          writeRuns(doc, itemRuns, {
            x: left + BULLET_INDENT,
            y,
            width: contentWidth(doc) - BULLET_INDENT,
          });
          doc.y += 3;
        }
        doc.y += 4;
        break;
      }
      default:
        break;
    }
  }
}

function renderHeader(doc: PDFKit.PDFDocument, title: string): void {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  doc
    .font('Jost')
    .fontSize(8)
    .fillColor(SAGE)
    .text('VIÑAMAR · LA MATA · TORREVIEJA', left, doc.y, {
      width,
      align: 'center',
      characterSpacing: 3.4,
    });
  doc.y += 10;
  doc.font('Cormorant').fontSize(30).fillColor(INK).text(title, left, doc.y, {
    width,
    align: 'center',
  });
  brassRule(doc, left + width / 2 - 24, doc.y + 12, 48);
  doc.y += 32;
}

function renderFooters(doc: PDFKit.PDFDocument): void {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // Writing inside the bottom margin would trigger a new page — lift it.
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const left = doc.page.margins.left;
    const width = contentWidth(doc);
    const y = doc.page.height - 44;
    doc
      .moveTo(left, y)
      .lineTo(left + width, y)
      .lineWidth(0.8)
      .strokeColor(LINE)
      .stroke();
    doc
      .font('Jost')
      .fontSize(8)
      .fillColor(SAGE)
      .text('www.vinamar.cz', left, y + 8, { characterSpacing: 1.5, lineBreak: false });
    doc.text(`${i + 1} / ${range.count}`, left, y + 8, {
      width,
      align: 'right',
      characterSpacing: 1.5,
    });
    doc.page.margins.bottom = bottomMargin;
  }
}

export function renderPokynyPdf(): Promise<Buffer> {
  const { data, body } = readPage('pokyny.md');
  const title = data.title as string;
  const tree = remark().parse(body);

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 56, bottom: 72, left: 64, right: 64 },
    bufferPages: true,
    // Skip the built-in Helvetica default — its metrics file is not bundled.
    font: path.join(FONT_DIR, FONT_FILES.Jost),
    info: { Title: `${title} — ViñaMar` },
    lang: 'cs',
    displayTitle: true,
  });
  for (const [name, file] of Object.entries(FONT_FILES)) {
    doc.registerFont(name, path.join(FONT_DIR, file));
  }

  const paintBackground = () => {
    doc.save();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(PAPER);
    doc.restore();
  };
  paintBackground();
  doc.on('pageAdded', paintBackground);

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  renderHeader(doc, title);
  renderBlocks(doc, tree.children);
  renderFooters(doc);
  doc.end();

  return done;
}
