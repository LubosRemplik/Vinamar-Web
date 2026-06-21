import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { Contract } from '../../domain/contract/contract';

// TODO: doplnit reálné údaje pronajímatele (vymyšlené placeholdery).
const LANDLORD = {
  name: 'Jan Vinař',
  address: 'Na Stráni 123, 110 00 Praha 1, Česká republika',
  idNumber: 'r. č. 700101/1234',
  contact: 'tel. +420 600 000 000, e-mail info@vinamar.cz',
};

// TODO: doplnit reálný popis apartmánu.
const PROPERTY = {
  description:
    'Plně vybavený apartmán pro 4 osoby v La Mata, Torrevieja (Alicante, Španělsko): ' +
    'obývací pokoj s kuchyňským koutem, oddělená ložnice, koupelna a balkon. ' +
    'Vybavení: klimatizace, Wi-Fi, plně vybavená kuchyně, lůžkoviny a ručníky.',
  address: 'La Mata, 03188 Torrevieja, Alicante, Španělsko',
};

const HOUSE_RULES = [
  'Apartmán slouží výhradně k přechodnému rekreačnímu ubytování nájemce a osob v jeho doprovodu.',
  'V apartmánu platí zákaz kouření a noční klid od 22:00 do 8:00.',
  'Nájemce je povinen dodržovat pravidla domu a společných prostor (bazén, parkování).',
  'Počet ubytovaných osob nesmí překročit kapacitu apartmánu (4 osoby).',
];

const formatDate = (date: Date): string => {
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${d}.${m}.${date.getUTCFullYear()}`;
};

const money = (amount: number, currency: string): string =>
  `${amount.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;

const heading = (text: string): Content => ({
  text,
  style: 'h2',
  margin: [0, 12, 0, 4],
});

const parties = (contract: Contract): Content => ({
  stack: [
    { text: 'Pronajímatel:', style: 'label' },
    {
      text: `${LANDLORD.name}, ${LANDLORD.address}, ${LANDLORD.idNumber}, ${LANDLORD.contact}`,
      margin: [0, 0, 0, 8],
    },
    { text: 'Nájemce:', style: 'label' },
    {
      text:
        `${contract.guestName}, ${contract.guestAddress}, ` +
        `č. dokladu ${contract.guestIdNumber}` +
        (contract.guestBirthDate ? `, nar. ${formatDate(contract.guestBirthDate)}` : ''),
    },
  ],
  margin: [0, 0, 0, 4],
});

const subject = (): Content => ({
  text: [
    { text: 'Předmět nájmu: ', bold: true },
    `${PROPERTY.description} Adresa: ${PROPERTY.address}.`,
  ],
});

const duration = (contract: Contract): Content => ({
  text: [
    { text: 'Doba nájmu: ', bold: true },
    `Nájem se sjednává jako krátkodobý nájem na dobu určitou v délce 10 nocí (11 dní), ` +
      `od ${formatDate(contract.range.arrival)} do ${formatDate(contract.range.departure)}. ` +
      `Jde o přechodný nájem k rekreačnímu účelu (arrendamiento de temporada dle španělského práva, LAU).`,
  ],
});

const price = (contract: Contract): Content => ({
  text: [
    { text: 'Nájemné: ', bold: true },
    `Celkové nájemné za sjednanou dobu činí ${money(contract.totalPrice, contract.currency)}.`,
  ],
});

const depositClause = (contract: Contract): Content => ({
  text: [
    { text: 'Kauce (záloha): ', bold: true },
    `Nájemce uhradí vratnou kauci ve výši ${money(contract.depositAmount ?? 0, contract.currency)}` +
      (contract.depositDueDate ? ` se splatností do ${formatDate(contract.depositDueDate)}` : '') +
      `. Kauce slouží k zajištění případných škod a bude vrácena do 14 dnů po skončení nájmu, ` +
      `pokud nedojde k jejímu započtení na škody či nedoplatky.`,
  ],
});

const obligations = (): Content => ({
  ul: [
    'Nájemce užívá apartmán řádně a v souladu s jeho určením a vrací jej ve stavu, v jakém jej převzal.',
    'Nájemce odpovídá za škody způsobené jím nebo osobami v jeho doprovodu.',
    'Pronajímatel předá apartmán čistý, vybavený a způsobilý k užívání.',
  ],
});

const houseRules = (): Content => ({ ul: [...HOUSE_RULES] });

const penalties = (): Content => ({
  text:
    'Sankce: Při pozdním předání apartmánu (pozdní odjezd) bez dohody náleží pronajímateli ' +
    'náhrada ve výši jednodenního nájemného za každý započatý den prodlení. Náhrada škody na vybavení ' +
    'se řídí skutečnou výší škody.',
});

const signatures = (): Content => ({
  columns: [
    { text: '\n\n_____________________\nPronajímatel', alignment: 'center' },
    { text: '\n\n_____________________\nNájemce', alignment: 'center' },
  ],
  margin: [0, 30, 0, 0],
});

const styles: TDocumentDefinitions['styles'] = {
  title: { fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 12] },
  h2: { fontSize: 12, bold: true },
  label: { bold: true },
};

const baseDoc = (title: string, body: Content[]): TDocumentDefinitions => ({
  pageSize: 'A4',
  pageMargins: [50, 50, 50, 50],
  defaultStyle: { fontSize: 10, lineHeight: 1.2 },
  styles,
  content: [{ text: title, style: 'title' }, ...body],
});

export const withDepositDocDefinition = (contract: Contract): TDocumentDefinitions =>
  baseDoc('Nájemní smlouva o krátkodobém nájmu (se zálohou)', [
    parties(contract),
    heading('1. Předmět nájmu'),
    subject(),
    heading('2. Doba nájmu'),
    duration(contract),
    heading('3. Nájemné'),
    price(contract),
    heading('4. Kauce'),
    depositClause(contract),
    heading('5. Práva a povinnosti'),
    obligations(),
    heading('6. Pravidla domu'),
    houseRules(),
    heading('7. Sankce'),
    penalties(),
    signatures(),
  ]);

export const withoutDepositDocDefinition = (contract: Contract): TDocumentDefinitions =>
  baseDoc('Nájemní smlouva o krátkodobém nájmu (bez zálohy)', [
    parties(contract),
    heading('1. Předmět nájmu'),
    subject(),
    heading('2. Doba nájmu'),
    duration(contract),
    heading('3. Nájemné'),
    price(contract),
    heading('4. Práva a povinnosti'),
    obligations(),
    heading('5. Pravidla domu'),
    houseRules(),
    heading('6. Sankce'),
    penalties(),
    signatures(),
  ]);
