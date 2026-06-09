export const DESTINATION = 'ALC';
export type OriginCode = 'PED' | 'WRO' | 'PRG' | 'LNZ' | 'BTS' | 'VIE' | 'KTW';

interface OriginInfo {
  name: string;
  order: number;
}

const ORIGINS: Record<OriginCode, OriginInfo> = {
  PED: { name: 'Pardubice', order: 1 },
  PRG: { name: 'Praha', order: 2 },
  WRO: { name: 'Vratislav', order: 3 },
  LNZ: { name: 'Linec', order: 4 },
  BTS: { name: 'Bratislava', order: 5 },
  VIE: { name: 'Vídeň', order: 6 },
  KTW: { name: 'Katovice', order: 7 },
};

// Legacy price slice (Travelpayouts) only covers these three.
const PRICED_CODES: OriginCode[] = ['PED', 'WRO', 'PRG'];

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
