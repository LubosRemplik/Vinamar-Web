export class UpdateInquiryContactCommand {
  constructor(
    public readonly id: string,
    public readonly guestName: string,
    public readonly email: string,
    public readonly phone: string,
  ) {}
}
