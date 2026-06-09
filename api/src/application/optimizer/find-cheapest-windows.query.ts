export class FindCheapestWindowsQuery {
  constructor(
    public readonly origin: string,
    public readonly nights: number,
    public readonly limit: number = 10,
  ) {}
}
