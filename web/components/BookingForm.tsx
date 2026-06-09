'use client';

import { useState } from 'react';
import { submitInquiry } from '@/lib/api';

// Renders bare (no card) — the parent (the sticky bottom bar) provides the surface.
export default function BookingForm({
  arrival,
  departure,
  nights,
  onReset,
}: {
  arrival: string;
  departure: string;
  nights: number;
  onReset: () => void;
}) {
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    setError('');
    const result = await submitInquiry({ guestName, email, arrival, departure, message });
    if (result.ok) {
      setState('done');
    } else {
      setState('error');
      setError(result.error ?? 'Odeslání se nezdařilo.');
    }
  }

  if (state === 'done') {
    return (
      <div className="text-center">
        <p className="font-semibold text-ink">Děkujeme, ozveme se vám.</p>
        <p className="mt-1 text-sm text-ink/60">
          Poptávku na termín {arrival} → {departure} jsme přijali.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-3 rounded-xl border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
        >
          Rezervovat další termín
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">
          {arrival} <span className="text-ink/30">→</span> {departure}{' '}
          <span className="font-normal text-ink/50">· {nights} nocí</span>
        </p>
        <button type="button" onClick={onReset} className="text-sm text-ink/55 transition-colors hover:text-ink">
          Zrušit
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          required
          suppressHydrationWarning
          placeholder="Jméno"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-sea focus:outline-none focus-visible:ring-2 focus-visible:ring-sea/30"
        />
        <input
          required
          suppressHydrationWarning
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-sea focus:outline-none focus-visible:ring-2 focus-visible:ring-sea/30"
        />
      </div>
      <textarea
        suppressHydrationWarning
        placeholder="Zpráva (nepovinné)"
        value={message}
        rows={2}
        onChange={(e) => setMessage(e.target.value)}
        className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-sea focus:outline-none focus-visible:ring-2 focus-visible:ring-sea/30"
      />

      {state === 'error' && <p className="mt-2 text-sm font-medium text-terracotta">{error}</p>}

      <button
        type="submit"
        disabled={state === 'sending'}
        className="mt-3 w-full rounded-xl bg-terracotta px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-terracotta/90 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/50"
      >
        {state === 'sending' ? 'Odesílám…' : 'Odeslat poptávku'}
      </button>
    </form>
  );
}
