"use client";

import { useState } from "react";

type Dict = {
  step1?: string; step2?: string; step3?: string; step4?: string;
  next?: string; back?: string; submit?: string; [k: string]: unknown;
};

const inputCls = "w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black";

export default function SetupWizard({ dict }: { dict?: Dict }) {
  const d = dict ?? {};
  const [step, setStep] = useState(1);
  const [sysadminEmail, setSysadminEmail] = useState("");
  const [sysadminPassword, setSysadminPassword] = useState("");
  const [coupleEmail, setCoupleEmail] = useState("");
  const [couplePassword, setCouplePassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [previewCode] = useState(() =>
    Array.from({ length: 12 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("")
  );

  async function submitAccount(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const res = await fetch("/api/v1/admin/setup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sysadminEmail, sysadminPassword, coupleEmail, couplePassword }),
    });
    if (res.ok) setStep(2);
    else { const b = await res.json().catch(() => ({})); setError((b as { error?: string }).error ?? "Setup failed"); }
  }

  async function importCsv(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!file) { setStep(4); return; }
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/v1/guests/import", { method: "POST", body: form });
    if (res.ok) setStep(4);
    else { const b = await res.json().catch(() => ({})); setError((b as { error?: string }).error ?? "Import failed"); }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <p className="mb-4 text-sm text-gray-600">Step {step} of 4</p>
      {step === 1 && (
        <form onSubmit={submitAccount} className="flex flex-col gap-3">
          <h1 className="text-xl font-bold">{(d.step1 as string) ?? "Create your account"}</h1>
          <input aria-label="sysadmin email" type="email" required value={sysadminEmail} onChange={(e) => setSysadminEmail(e.target.value)} placeholder="Sysadmin email" className={inputCls} />
          <input aria-label="sysadmin password" type="password" required minLength={12} value={sysadminPassword} onChange={(e) => setSysadminPassword(e.target.value)} placeholder="Sysadmin password (12+ chars)" className={inputCls} />
          <input aria-label="couple email" type="email" required value={coupleEmail} onChange={(e) => setCoupleEmail(e.target.value)} placeholder="Couple email" className={inputCls} />
          <input aria-label="couple password" type="password" required minLength={12} value={couplePassword} onChange={(e) => setCouplePassword(e.target.value)} placeholder="Couple password (12+ chars)" className={inputCls} />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button className="rounded bg-black px-4 py-2 text-sm text-white">{(d.submit as string) ?? "Create accounts"}</button>
        </form>
      )}
      {step === 2 && (
        <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="flex flex-col gap-3">
          <h1 className="text-xl font-bold">{(d.step2 as string) ?? "Wedding details"}</h1>
          <input aria-label="couple names" placeholder="Couple names" className={inputCls} />
          <input aria-label="date" type="date" className={inputCls} />
          <input aria-label="venue" placeholder="Venue" className={inputCls} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="rounded border px-4 py-2 text-sm">{(d.back as string) ?? "Back"}</button>
            <button className="rounded bg-black px-4 py-2 text-sm text-white">{(d.next as string) ?? "Continue"}</button>
          </div>
        </form>
      )}
      {step === 3 && (
        <form onSubmit={importCsv} className="flex flex-col gap-3">
          <h1 className="text-xl font-bold">{(d.step3 as string) ?? "Add guests"}</h1>
          <input aria-label="guest csv" type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={inputCls} />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(2)} className="rounded border px-4 py-2 text-sm">{(d.back as string) ?? "Back"}</button>
            <button className="rounded bg-black px-4 py-2 text-sm text-white">{(d.next as string) ?? "Continue"}</button>
          </div>
        </form>
      )}
      {step === 4 && (
        <div className="flex flex-col gap-3">
          <h1 className="text-xl font-bold">{(d.step4 as string) ?? "Share invite codes"}</h1>
          <p className="text-sm text-gray-600">Example code format:</p>
          <code className="rounded border bg-gray-50 px-3 py-2 text-sm">{previewCode}</code>
          <button onClick={() => setDone(true)} className="rounded bg-black px-4 py-2 text-sm text-white">Finish</button>
          {done && <p className="text-sm text-green-700">Setup complete — please sign in.</p>}
        </div>
      )}
    </div>
  );
}
