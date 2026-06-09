export const DESTINATION = 'ALC';
export type OriginCode = 'PED' | 'WRO' | 'PRG';

const NAMES: Record<OriginCode, string> = {
  PED: 'Pardubice',
  WRO: 'Vratislav',
  PRG: 'Praha',
};

export class Origin {
  private constructor(public readonly code: OriginCode) {}

  static fromCode(code: string): Origin {
    if (code !== 'PED' && code !== 'WRO' && code !== 'PRG') {
      throw new Error(`unknown origin ${code}`);
    }
    return new Origin(code);
  }

  static all(): Origin[] {
    return (['PED', 'WRO', 'PRG'] as OriginCode[]).map((c) => new Origin(c));
  }

  get name(): string {
    return NAMES[this.code];
  }
}
