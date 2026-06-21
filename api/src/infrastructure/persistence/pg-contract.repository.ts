import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from './pg-connection';
import { DateRange } from '../../domain/shared/date-range';
import { Contract } from '../../domain/contract/contract';
import { ContractVariant } from '../../domain/contract/contract-variant';
import { ContractRepository } from '../../domain/contract/contract.repository.port';

interface ContractRow {
  id: string;
  inquiry_id: string;
  variant: string;
  guest_name: string;
  guest_address: string;
  guest_id_number: string;
  guest_birth_date: Date | null;
  arrival: Date;
  departure: Date;
  total_price: string;
  currency: string;
  deposit_amount: string | null;
  deposit_due_date: Date | null;
  pdf: Buffer;
  generated_at: Date;
}

@Injectable()
export class PgContractRepository implements ContractRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private toContract(row: ContractRow): Contract {
    return new Contract(
      row.id,
      row.inquiry_id,
      row.variant as ContractVariant,
      row.guest_name,
      row.guest_address,
      row.guest_id_number,
      row.guest_birth_date ? new Date(row.guest_birth_date) : null,
      new DateRange(new Date(row.arrival), new Date(row.departure)),
      Number(row.total_price),
      row.currency,
      row.deposit_amount != null ? Number(row.deposit_amount) : null,
      row.deposit_due_date ? new Date(row.deposit_due_date) : null,
      new Date(row.generated_at),
    );
  }

  async save(contract: Contract, pdf: Buffer): Promise<void> {
    await this.pool.query(
      `INSERT INTO contracts (id, inquiry_id, variant, guest_name, guest_address,
         guest_id_number, guest_birth_date, arrival, departure, total_price, currency,
         deposit_amount, deposit_due_date, pdf, generated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        contract.id,
        contract.inquiryId,
        contract.variant,
        contract.guestName,
        contract.guestAddress,
        contract.guestIdNumber,
        contract.guestBirthDate,
        contract.range.arrival,
        contract.range.departure,
        contract.totalPrice,
        contract.currency,
        contract.depositAmount,
        contract.depositDueDate,
        pdf,
        contract.generatedAt,
      ],
    );
  }

  async markSent(id: string, sentAt: Date): Promise<void> {
    await this.pool.query(`UPDATE contracts SET sent_at = $2 WHERE id = $1`, [id, sentAt]);
  }

  async get(id: string): Promise<{ contract: Contract; pdf: Buffer } | null> {
    const { rows } = await this.pool.query<ContractRow>(
      `SELECT * FROM contracts WHERE id = $1`,
      [id],
    );
    if (!rows[0]) {
      return null;
    }
    return { contract: this.toContract(rows[0]), pdf: rows[0].pdf };
  }

  async existsForInquiry(inquiryId: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM contracts WHERE inquiry_id = $1 LIMIT 1`,
      [inquiryId],
    );
    return rows.length > 0;
  }

  async latestPdfForInquiry(inquiryId: string): Promise<Buffer | null> {
    const { rows } = await this.pool.query<{ pdf: Buffer }>(
      `SELECT pdf FROM contracts WHERE inquiry_id = $1 ORDER BY generated_at DESC LIMIT 1`,
      [inquiryId],
    );
    return rows[0] ? rows[0].pdf : null;
  }
}
