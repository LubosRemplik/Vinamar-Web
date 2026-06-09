export class SubmitInquiryCommand {
  constructor(
    public readonly guestName: string,
    public readonly email: string,
    public readonly arrival: string,
    public readonly departure: string,
    public readonly message: string,
  ) {}
}
