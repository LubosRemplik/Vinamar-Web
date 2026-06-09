import { RefreshFlightPricesHandler } from '../../src/application/flight/refresh-flight-prices.handler';
import { RefreshFlightPricesCommand } from '../../src/application/flight/refresh-flight-prices.command';
import { GetCheapestPerOriginHandler } from '../../src/application/flight/get-cheapest-per-origin.handler';
import { StubProvider, InMemoryFlightQuotes } from '../fakes/flight';

describe('RefreshFlightPrices', () => {
  it('stores quotes for every origin', async () => {
    const repo = new InMemoryFlightQuotes();
    const provider = new StubProvider({ PED: 80, WRO: 58, PRG: 70 });
    await new RefreshFlightPricesHandler(provider, repo).execute(new RefreshFlightPricesCommand(9));
    const cheapest = await new GetCheapestPerOriginHandler(repo).execute();
    expect(cheapest).toHaveLength(3);
    expect(cheapest.find((c) => c.origin === 'WRO')!.price).toBe(58);
  });

  it('continues when one origin fails', async () => {
    const repo = new InMemoryFlightQuotes();
    const provider = new StubProvider({ PED: 80, PRG: 70 }, 'WRO');
    await new RefreshFlightPricesHandler(provider, repo).execute(new RefreshFlightPricesCommand(9));
    const cheapest = await new GetCheapestPerOriginHandler(repo).execute();
    expect(cheapest.map((c) => c.origin).sort()).toEqual(['PED', 'PRG']);
  });
});
