#!/usr/bin/env node
// Proof of concept: fetch Ryanair direct-flight schedules (days + times, no price)
// from the requested origin airports to Alicante (ALC), for a chosen date range.
//
// Data source: Ryanair's public (unofficial) timetable endpoints. No API key, no
// account, no cost. Returns scheduled departure/arrival times per day.
//
// Usage:
//   node docs/research/flight-schedules-poc.mjs 2026-07-01 2026-07-31
//   node docs/research/flight-schedules-poc.mjs            (defaults to next 30 days)

const DESTINATION = 'ALC';

// Requested airports, in the preference order the owner gave.
const ORIGINS = [
  { code: 'PED', name: 'Pardubice' },
  { code: 'PRG', name: 'Praha' },
  { code: 'WRO', name: 'Vratislav (Wrocław)' },
  { code: 'LNZ', name: 'Linec (Linz)' },
  { code: 'BTS', name: 'Bratislava' },
  { code: 'VIE', name: 'Vídeň (Wien)' },
  { code: 'KTW', name: 'Katovice (Katowice)' },
];

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

function parseArgs() {
  const [, , fromArg, toArg] = process.argv;
  const from = fromArg ?? iso(new Date());
  let to = toArg;
  if (!to) {
    const d = new Date(`${from}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 30);
    to = iso(d);
  }
  return { from, to };
}

// All (year, month) pairs the [from, to] range touches.
function monthsInRange(from, to) {
  const out = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth() + 1;
  while (y < end.getUTCFullYear() || (y === end.getUTCFullYear() && m <= end.getUTCMonth() + 1)) {
    out.push({ year: y, month: m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// Returns [{ date, carrierCode, number, departureTime, arrivalTime }] within [from, to].
async function fetchSchedule(originCode, from, to) {
  const flights = [];
  for (const { year, month } of monthsInRange(from, to)) {
    const url =
      `https://www.ryanair.com/api/timtbl/3/schedules/${originCode}/${DESTINATION}` +
      `/years/${year}/months/${month}`;
    let payload;
    try {
      payload = await getJson(url);
    } catch {
      continue; // route not operated that month
    }
    for (const day of payload.days ?? []) {
      const date = `${year}-${pad(month)}-${pad(day.day)}`;
      if (date < from || date > to) continue;
      for (const f of day.flights ?? []) {
        flights.push({
          date,
          carrierCode: f.carrierCode,
          number: f.number,
          departureTime: f.departureTime,
          arrivalTime: f.arrivalTime,
        });
      }
    }
  }
  flights.sort((a, b) => (a.date + a.departureTime).localeCompare(b.date + b.departureTime));
  return flights;
}

const CZ_DOW = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
const dow = (date) => CZ_DOW[new Date(`${date}T00:00:00Z`).getUTCDay()];

async function main() {
  const { from, to } = parseArgs();
  console.log(`\nPřímé lety do Alicante (${DESTINATION}) — ${from} … ${to}`);
  console.log('Zdroj: Ryanair timetable API (jen přímé lety, bez ceny)\n');

  for (const origin of ORIGINS) {
    let flights;
    try {
      flights = await fetchSchedule(origin.code, from, to);
    } catch (err) {
      console.log(`■ ${origin.name} (${origin.code}) — chyba: ${err.message}\n`);
      continue;
    }
    if (flights.length === 0) {
      console.log(`■ ${origin.name} (${origin.code}) — žádné přímé lety Ryanairu v tomto období`);
      console.log(`    (může existovat spojení jiného dopravce — viz spec)\n`);
      continue;
    }
    console.log(`■ ${origin.name} (${origin.code}) — ${flights.length} přímých letů:`);
    for (const f of flights) {
      console.log(
        `    ${f.date} ${dow(f.date)}  odlet ${f.departureTime} → přílet ${f.arrivalTime}  ${f.carrierCode}${f.number}`,
      );
    }
    console.log('');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
