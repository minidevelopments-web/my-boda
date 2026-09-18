"use client";

import { useEffect, useRef, useState } from "react";
import { makeRsvpSchema } from "@/lib/validators";
import { getDictionary, type Dictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type FormErrors = Record<string, string>;

export default function RsvpForm({ messages = getDictionary("en").rsvp, householdMax, initialName }: { messages?: Dictionary["rsvp"]; householdMax?: number; initialName?: string }) {
  const maxGuests = householdMax ?? 10;
  // Form state
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState("");
  const [attending, setAttending] = useState(true);
  const [headcount, setHeadcount] = useState(1);
  const [mealChoice, setMealChoice] = useState("");
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [plusOne, setPlusOne] = useState(false);
  const [plusOneName, setPlusOneName] = useState("");
  const [message, setMessage] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      summaryRef.current?.focus();
    }
  }, [errors]);

  useEffect(() => {
    if (success) {
      successRef.current?.focus();
    }
  }, [success]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSubmitError(null);

    // Build payload for Zod validation
    // Coerce headcount to number, handle attending false -> headcount 1
    // Clamp to household.maxGuests (household isolation: guests cannot RSVP beyond their invite).
    const rawHeadcount = attending ? Math.min(Number(headcount) || 1, maxGuests) : 1;
    const payload: Record<string, unknown> = {
      name: name.trim(),
      email: email.trim() || undefined,
      attending,
      headcount: Number(rawHeadcount),
      mealChoice: attending && mealChoice ? mealChoice : null,
      dietaryNotes: attending && dietaryNotes ? dietaryNotes : null,
      message: message.trim() || null,
      plusOne,
      plusOneName: plusOne && plusOneName.trim() ? plusOneName.trim() : null,
    };

    const parsed = makeRsvpSchema(messages).safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg =
          typeof json?.error === "string"
            ? json.error
            : messages.submitErrorFallback;
        setSubmitError(msg);
        return;
      }
      setSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : messages.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border bg-green-50 p-6 text-center" role="status" aria-live="polite">
        <h3 ref={successRef} tabIndex={-1} className="text-lg font-semibold text-green-800 focus:outline-none">{messages.successTitle}</h3>
        <p className="mt-2 text-sm text-green-700">{messages.successSubtitle}</p>
        <button
          type="button"
          onClick={() => {
            setSuccess(false);
            setName("");
            setEmail("");
            setMessage("");
          }}
          className="mt-4 text-sm font-medium text-green-800 underline"
        >
          {messages.submitAnother}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6 rounded-lg border bg-white p-6 shadow-sm">
      {Object.keys(errors).length > 0 && (
        <div
          ref={summaryRef}
          role="alert"
          tabIndex={-1}
          aria-labelledby="rsvp-error-summary-heading"
          className="rounded-md border border-red-200 bg-red-50 p-4 focus:outline-none"
        >
          <h2 id="rsvp-error-summary-heading" className="text-sm font-semibold text-red-800">
            {messages.errorSummary}
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
            {Object.values(errors).map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      {/* Name */}
      <Input
        id="rsvp-name"
        type="text"
        label={
          <>
            {messages.name} <span aria-hidden="true" className="text-red-600">*</span>
          </>
        }
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder={messages.namePlaceholder}
        error={errors.name ?? null}
      />

      {/* Email */}
      <Input
        id="rsvp-email"
        type="email"
        label={
          <>
            {messages.email} <span className="text-gray-500 font-normal">{messages.optional}</span>
          </>
        }
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={messages.emailPlaceholder}
        error={errors.email ?? null}
      />

      {/* Attending toggle */}
      <fieldset>
        <legend className="block text-sm font-medium">{messages.attendingQuestion}</legend>
        <div className="mt-2 flex gap-4">
          <label className="flex min-h-[44px] min-w-[44px] items-center gap-2 text-sm">
            <input
              type="radio"
              name="attending"
              value="yes"
              checked={attending === true}
              onChange={() => setAttending(true)}
              aria-label={messages.yes}
            />
            {messages.yes}
          </label>
          <label className="flex min-h-[44px] min-w-[44px] items-center gap-2 text-sm">
            <input
              type="radio"
              name="attending"
              value="no"
              checked={attending === false}
              onChange={() => setAttending(false)}
              aria-label={messages.no}
            />
            {messages.no}
          </label>
        </div>
      </fieldset>

      {/* Conditional: headcount + mealChoice + dietaryNotes when attending */}
      {attending && (
        <>
          <Input
            id="rsvp-headcount"
            type="number"
            label={messages.headcount}
            min={1}
            max={maxGuests}
            value={headcount}
            onChange={(e) => setHeadcount(Number(e.target.value) || 1)}
            aria-label={messages.headcount}
            error={errors.headcount ?? null}
          />

          <div>
            <label htmlFor="rsvp-mealChoice" className="block text-sm font-medium">
              {messages.mealChoice}
            </label>
            <select
              id="rsvp-mealChoice"
              value={mealChoice}
              onChange={(e) => setMealChoice(e.target.value)}
              aria-label={messages.mealChoice}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">{messages.mealPlaceholder}</option>
              <option value="vegetarian">{messages.mealVegetarian}</option>
              <option value="vegan">{messages.mealVegan}</option>
              <option value="meat">{messages.mealMeat}</option>
              <option value="fish">{messages.mealFish}</option>
            </select>
          </div>

          <div>
            <label htmlFor="rsvp-dietaryNotes" className="block text-sm font-medium">
              {messages.dietaryNotes}
            </label>
            <textarea
              id="rsvp-dietaryNotes"
              value={dietaryNotes}
              onChange={(e) => setDietaryNotes(e.target.value)}
              aria-label={messages.dietaryNotes}
              rows={3}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              placeholder={messages.dietaryPlaceholder}
            />
          </div>
        </>
      )}

      {/* Plus one */}
      <div>
        <label htmlFor="rsvp-plusOne" className="flex min-h-[44px] min-w-[44px] items-center gap-2 text-sm font-medium">
          <input
            id="rsvp-plusOne"
            type="checkbox"
            checked={plusOne}
            onChange={(e) => setPlusOne(e.target.checked)}
            aria-label={messages.plusOne}
          />
          {messages.plusOne}
        </label>
      </div>

      {plusOne && (
        <Input
          id="rsvp-plusOneName"
          type="text"
          label={messages.plusOneName}
          value={plusOneName}
          onChange={(e) => setPlusOneName(e.target.value)}
          aria-label={messages.plusOneName}
          placeholder={messages.plusOneNamePlaceholder}
          error={errors.plusOneName ?? null}
        />
      )}

      {/* Message */}
      <div>
        <label htmlFor="rsvp-message" className="block text-sm font-medium">
          {messages.messageLabel} <span className="text-gray-500 font-normal">{messages.optional}</span>
        </label>
        <textarea
          id="rsvp-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-label={messages.messageLabel}
          rows={4}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          placeholder={messages.messagePlaceholder}
        />
        {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message}</p>}
      </div>

      {submitError && (
        <p role="alert" className="text-sm text-red-600">
          {submitError}
        </p>
      )}

      <Button type="submit" loading={submitting} className="w-full">
        {messages.send}
      </Button>
    </form>
  );
}
