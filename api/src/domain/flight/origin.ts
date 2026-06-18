export const DESTINATION = 'ALC';
export type OriginCode =
  | 'PED'
  | 'BTS'
  | 'VIE'
  | 'LNZ'
  | 'WRO'
  | 'KTW'
  | 'NUE'
  | 'KRK'
  | 'BER';

interface OriginInfo {
  name: string;
  order: number;
}

// Airports we track for direct flights to Alicante, best-to-worst preference.
const ORIGINS: Record<OriginCode, OriginInfo> = {
  PED: { name: 'Pardubice', order: 1 },
  BTS: { name: 'Bratislava', order: 2 },
  VIE: { name: 'Vídeň', order: 3 },
  LNZ: { name: 'Linz', order: 4 },
  WRO: { name: 'Wrocław', order: 5 },
  KTW: { name: 'Katovice', order: 6 },
  NUE: { name: 'Norimberk', order: 7 },
  KRK: { name: 'Kraków', order: 8 },
  BER: { name: 'Berlín', order: 9 },
};

// Legacy price slice (Travelpayouts) only covers these.
const PRICED_CODES: OriginCode[] = ['PED', 'WRO'];

function isOriginCode(code: string): code is OriginCode {
  return Object.prototype.hasOwnProperty.call(ORIGINS, code);
}

export class Origin {
  private constructor(public readonly code: OriginCode) {}

  static fromCode(code: string): Origin {
    if (!isOriginCode(code)) {
      throw new Error(`unknown origin ${code}`);
    }
    return new Origin(code);
  }

  static all(): Origin[] {
    return PRICED_CODES.map((c) => new Origin(c));
  }

  static allByPreference(): Origin[] {
    return (Object.keys(ORIGINS) as OriginCode[])
      .map((c) => new Origin(c))
      .sort((a, b) => a.order - b.order);
  }

  get name(): string {
    return ORIGINS[this.code].name;
  }

  get order(): number {
    return ORIGINS[this.code].order;
  }
}
