"use client";
import { useState } from "react";
export default function InviteGate({ dict }: { dict: any }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const res = await fetch("/api/v1/guest/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, name }) });
    if (res.ok) window.location.reload();
    else setError(dict.invalidCode ?? "We couldn't find that invitation — check spelling.");
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-md rounded border p-6">
      <h2 className="mb-4 text-xl font-bold">{dict.findInvitation ?? "Find your invitation"}</h2>
      <input aria-label="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="INVITE-CODE" className="mb-2 w-full rounded border px-3 py-2 text-sm" />
      <input aria-label="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={dict.yourName ?? "Your name"} className="mb-2 w-full rounded border px-3 py-2 text-sm" />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button className="mt-2 w-full rounded bg-black px-4 py-2 text-sm text-white">{dict.continue ?? "Continue"}</button>
    </form>
  );
}
