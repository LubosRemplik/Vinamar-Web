'use client';
import { useState } from 'react';
import { generateContract, type ContractInput } from '@/lib/api';
import { formatCzDate } from '@/lib/date';

const CONTRACT_NIGHTS = 10;

// departure = arrival + 10 nights, as an ISO date string (the contract is always
// exactly 10 nights regardless of the reservation's own length).
function plusNights(iso: string, nights: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + nights);
  return d.toISOString().slice(0, 10);
}

const FIELD =
  'w-full rounded-lg border border-ink/20 px-3 py-2 text-sm focus:border-sea focus:outline-none';
const LABEL = 'block text-xs font-medium text-ink/60 mb-1';

export function ContractModal({
  token,
  inquiry,
  onClose,
  onDone,
}: {
  token: string;
  inquiry: { id: string; guestName: string; arrival: string };
  onClose: () => void;
  onDone: () => void;
}) {
  const departure = plusNights(inquiry.arrival, CONTRACT_NIGHTS);
  const [variant, setVariant] = useState<ContractInput['variant']>('without-deposit');
  const [guestAddress, setGuestAddress] = useState('');
  const [guestIdNumber, setGuestIdNumber] = useState('');
  const [guestBirthDate, setGuestBirthDate] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDueDate, setDepositDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await generateContract(token, inquiry.id, {
        variant,
        guestAddress,
        guestIdNumber,
        guestBirthDate: guestBirthDate || null,
        totalPrice: Number(totalPrice),
        currency,
        depositAmount: variant === 'with-deposit' ? Number(depositAmount) : null,
        depositDueDate: variant === 'with-deposit' && depositDueDate ? depositDueDate : null,
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nastala chyba.');
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-lg font-semibold text-ink">Vygenerovat smlouvu</h3>
        <p className="mb-4 text-sm text-ink/60">
          {inquiry.guestName} · {formatCzDate(inquiry.arrival)} → {formatCzDate(departure)} (10 nocí)
        </p>

        <div className="space-y-3">
          <div>
            <span className={LABEL}>Varianta</span>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={variant === 'without-deposit'}
                  onChange={() => setVariant('without-deposit')}
                />
                Bez zálohy
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={variant === 'with-deposit'}
                  onChange={() => setVariant('with-deposit')}
                />
                Se zálohou
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="guestAddress" className={LABEL}>Adresa hosta</label>
            <input id="guestAddress" className={FIELD} value={guestAddress} onChange={(e) => setGuestAddress(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="guestIdNumber" className={LABEL}>Číslo OP / pasu</label>
              <input id="guestIdNumber" className={FIELD} value={guestIdNumber} onChange={(e) => setGuestIdNumber(e.target.value)} />
            </div>
            <div className="flex-1">
              <label htmlFor="guestBirthDate" className={LABEL}>Datum narození</label>
              <input id="guestBirthDate" type="date" className={FIELD} value={guestBirthDate} onChange={(e) => setGuestBirthDate(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="totalPrice" className={LABEL}>Celková cena</label>
              <input id="totalPrice" type="number" min="0" className={FIELD} value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} />
            </div>
            <div className="w-24">
              <label htmlFor="currency" className={LABEL}>Měna</label>
              <input id="currency" className={FIELD} value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
          </div>

          {variant === 'with-deposit' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="depositAmount" className={LABEL}>Výše zálohy</label>
                <input id="depositAmount" type="number" min="0" className={FIELD} value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
              </div>
              <div className="flex-1">
                <label htmlFor="depositDueDate" className={LABEL}>Splatnost zálohy</label>
                <input id="depositDueDate" type="date" className={FIELD} value={depositDueDate} onChange={(e) => setDepositDueDate(e.target.value)} />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-ink/20 px-3 py-1.5 text-sm font-medium text-ink/70 hover:bg-ink/5"
          >
            Zrušit
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-lg bg-sea px-4 py-1.5 text-sm font-medium text-white hover:bg-sea/90 disabled:opacity-50"
          >
            {busy ? 'Odesílám…' : 'Vygenerovat a odeslat'}
          </button>
        </div>
      </div>
    </div>
  );
}
