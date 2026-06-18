'use client';

import { useState } from 'react';
import { submitInquiry } from '@/lib/api';
import { getAdminToken } from '@/lib/admin';
import { formatCzDate } from '@/lib/date';
import { totalPrice } from '@/lib/price';

const MESSAGE_MAX = 500;
// Forbid angle brackets (avoid HTML-looking content) and non-printable control
// characters, while allowing normal text, diacritics and line breaks (tab/LF/CR).
const MESSAGE_FORBIDDEN = /[<>\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

function messageError(message: string): string | null {
  if (message.length > MESSAGE_MAX) {
    return `Zpráva může mít nejvýše ${MESSAGE_MAX} znaků.`;
  }
  if (MESSAGE_FORBIDDEN.test(message)) {
    return 'Zpráva obsahuje nepovolené znaky (např. < nebo >).';
  }
  return null;
}

// Renders bare (no card) — the parent (the sticky bottom bar) provides the surface.
export default function BookingForm({
  arrival,
  departure,
  nights,
  onReset,
  isAdmin = false,
  onBooked,
}: {
  arrival: string;
  departure: string;
  nights: number;
  onReset: () => void;
  isAdmin?: boolean;
  onBooked?: () => void;
}) {
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const price = totalPrice(arrival, departure);
  const messageProblem = messageError(message);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Name, e-mail and phone are enforced as required by the inputs; the optional
    // message still needs its own length/character check before we submit.
    if (messageProblem) {
      setState('error');
      setError(messageProblem);
      return;
    }
    setState('sending');
    setError('');
    const token = isAdmin ? getAdminToken() ?? undefined : undefined;
    const result = await submitInquiry({ guestName, email, phone, arrival, departure, message }, token);
    if (result.ok) {
      setState('done');
      onBooked?.();
    } else {
      setState('error');
      setError(result.error ?? 'Odeslání se nezdařilo.');
    }
  }

  if (state === 'done') {
    return (
      <div className="text-center">
        <p className="font-semibold text-ink">
          {isAdmin ? 'Rezervace vytvořena.' : 'Děkujeme, ozveme se vám.'}
        </p>
        <p className="mt-1 text-sm text-ink/60">
          {isAdmin ? 'Rezervaci' : 'Poptávku'} na termín {formatCzDate(arrival)} → {formatCzDate(departure)} ({price} €){' '}
          {isAdmin ? 'jsme uložili.' : 'jsme přijali.'}
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
          {formatCzDate(arrival)} <span className="text-ink/30">→</span> {formatCzDate(departure)}{' '}
          <span className="font-normal text-ink/50">· {nights} nocí</span>{' '}
          <span className="text-terracotta">· {price} €</span>
        </p>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-ink/15 bg-ink/5 px-3 py-1.5 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/10"
        >
          Zrušit
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          required
          suppressHydrationWarning
          placeholder="Jméno a příjmení"
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
        <input
          required
          suppressHydrationWarning
          type="tel"
          placeholder="Telefonní číslo"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-sea focus:outline-none focus-visible:ring-2 focus-visible:ring-sea/30 sm:col-span-2"
        />
      </div>
      <textarea
        suppressHydrationWarning
        placeholder="Zpráva (nepovinné)"
        value={message}
        rows={2}
        maxLength={MESSAGE_MAX}
        aria-invalid={messageProblem ? true : undefined}
        onChange={(e) => setMessage(e.target.value)}
        className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-sea focus:outline-none focus-visible:ring-2 focus-visible:ring-sea/30"
      />
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="font-medium text-red-600">{messageProblem ?? ''}</span>
        <span className="text-ink/45">
          {message.length}/{MESSAGE_MAX}
        </span>
      </div>

      {state === 'error' && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={state === 'sending' || messageProblem !== null}
        className="mt-3 w-full rounded-xl bg-terracotta px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-terracotta/90 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/50"
      >
        {state === 'sending' ? 'Odesílám…' : isAdmin ? 'Vytvořit rezervaci' : 'Odeslat poptávku'}
      </button>
    </form>
  );
}
