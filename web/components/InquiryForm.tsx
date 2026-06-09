'use client';
import { useState } from 'react';
import { submitInquiry } from '@/lib/api';

export default function InquiryForm() {
  const [form, setForm] = useState({ guestName: '', email: '', arrival: '', departure: '', message: '' });
  const [result, setResult] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = await submitInquiry(form);
    setResult(r.ok ? 'Děkujeme, ozveme se vám.' : (r.error ?? 'Chyba'));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 max-w-md">
      <input required placeholder="Jméno" value={form.guestName} onChange={set('guestName')} className="border p-2 rounded" />
      <input required type="email" placeholder="E-mail" value={form.email} onChange={set('email')} className="border p-2 rounded" />
      <label className="text-sm">Příjezd<input required type="date" value={form.arrival} onChange={set('arrival')} className="border p-2 rounded w-full" /></label>
      <label className="text-sm">Odjezd<input required type="date" value={form.departure} onChange={set('departure')} className="border p-2 rounded w-full" /></label>
      <textarea placeholder="Zpráva" value={form.message} onChange={set('message')} className="border p-2 rounded" />
      <button type="submit" className="bg-terracotta text-white py-2 rounded">Odeslat poptávku</button>
      {result && <p className="text-sm">{result}</p>}
    </form>
  );
}
