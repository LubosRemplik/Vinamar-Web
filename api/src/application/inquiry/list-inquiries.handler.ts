import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListInquiriesQuery } from './list-inquiries.query';
import {
  INQUIRY_REPOSITORY,
  InquiryRepository,
} from '../../domain/inquiry/inquiry.repository.port';

@QueryHandler(ListInquiriesQuery)
export class ListInquiriesHandler implements IQueryHandler<ListInquiriesQuery> {
  constructor(@Inject(INQUIRY_REPOSITORY) private readonly inquiries: InquiryRepository) {}
  async execute() {
    const items = await this.inquiries.list();
    return items
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((i) => ({
        id: i.id,
        guestName: i.guestName,
        email: i.email.value,
        arrival: i.range.arrival.toISOString().slice(0, 10),
        departure: i.range.departure.toISOString().slice(0, 10),
        message: i.message,
        status: i.status,
      }));
  }
}
