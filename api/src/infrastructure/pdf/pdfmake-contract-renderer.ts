import { Injectable } from '@nestjs/common';
import { dirname, join } from 'node:path';
import { Contract } from '../../domain/contract/contract';
import { ContractPdfRenderer } from '../../domain/contract/contract-pdf-renderer.port';
import {
  withDepositDocDefinition,
  withoutDepositDocDefinition,
} from './contract-templates';

// pdfmake exports a singleton instance (module.exports = new pdfmake()), so its
// methods must be called on that instance to keep `this` — a destructured
// `createPdf` loses the binding. require() gives us the instance directly.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import pdfMake = require('pdfmake');

// Server-side pdfmake ships no font data (vfs_fonts is browser-only). Point the
// Roboto family at the TTFs bundled with the package; Medium doubles as bold.
const robotoDir = join(dirname(require.resolve('pdfmake/package.json')), 'build/fonts/Roboto');
pdfMake.setFonts({
  Roboto: {
    normal: join(robotoDir, 'Roboto-Regular.ttf'),
    bold: join(robotoDir, 'Roboto-Medium.ttf'),
    italics: join(robotoDir, 'Roboto-Italic.ttf'),
    bolditalics: join(robotoDir, 'Roboto-MediumItalic.ttf'),
  },
});

// The contract is built from trusted data only — forbid any external fetch and
// restrict local reads to the bundled font directory.
pdfMake.setUrlAccessPolicy(() => false);
pdfMake.setLocalAccessPolicy((path) => path.startsWith(robotoDir));

@Injectable()
export class PdfmakeContractRenderer implements ContractPdfRenderer {
  async render(contract: Contract): Promise<Buffer> {
    const docDefinition =
      contract.variant === 'with-deposit'
        ? withDepositDocDefinition(contract)
        : withoutDepositDocDefinition(contract);
    return pdfMake.createPdf(docDefinition).getBuffer();
  }
}
