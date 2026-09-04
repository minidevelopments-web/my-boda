"use client";

import { useEffect, useRef, useState } from "react";
import { rsvpSchema } from "@/lib/validators";
import { Button } from "@/components/ui/Button";

type FormErrors = Record<string, string>;

export default function RsvpForm() {
  // Form state
  const [name, setName] = useState("");
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
    const rawHeadcount = attending ? headcount : 1;
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

    const parsed = rsvpSchema.safeParse(payload);
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
            : "Something went wrong sending your RSVP. Please check your details and try again.";
        setSubmitError(msg);
        return;
      }
      setSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border bg-green-50 p-6 text-center" role="status" aria-live="polite">
        <h3 ref={successRef} tabIndex={-1} className="text-lg font-semibold text-green-800 focus:outline-none">Thank you! Your RSVP has been received.</h3>
        <p className="mt-2 text-sm text-green-700">We can&apos;t wait to celebrate with you.</p>
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
          Submit another response
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
            Please fix the following before sending:
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
            {Object.values(errors).map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      {/* Name */}
      <div>
        <label htmlFor="rsvp-name" className="block text-sm font-medium">
          Name <span aria-hidden="true" className="text-red-600">*</span>
        </label>
        <input
          id="rsvp-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "error-name" : undefined}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="Your full name"
        />
        {errors.name && (
          <p id="error-name" className="mt-1 text-sm text-red-600">
            {errors.name}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="rsvp-email" className="block text-sm font-medium">
          Email <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <input
          id="rsvp-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "error-email" : undefined}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="you@example.com"
        />
        {errors.email && (
          <p id="error-email" className="mt-1 text-sm text-red-600">
            {errors.email}
          </p>
        )}
      </div>

      {/* Attending toggle */}
      <fieldset>
        <legend className="block text-sm font-medium">Will you be attending?</legend>
        <div className="mt-2 flex gap-4">
          <label className="flex min-h-[44px] min-w-[44px] items-center gap-2 text-sm">
            <input
              type="radio"
              name="attending"
              value="yes"
              checked={attending === true}
              onChange={() => setAttending(true)}
              aria-label="Yes"
            />
            Yes
          </label>
          <label className="flex min-h-[44px] min-w-[44px] items-center gap-2 text-sm">
            <input
              type="radio"
              name="attending"
              value="no"
              checked={attending === false}
              onChange={() => setAttending(false)}
              aria-label="No"
            />
            No
          </label>
        </div>
      </fieldset>

      {/* Conditional: headcount + mealChoice + dietaryNotes when attending */}
      {attending && (
        <>
          <div>
            <label htmlFor="rsvp-headcount" className="block text-sm font-medium">
              Number of Guests
            </label>
            <input
              id="rsvp-headcount"
              type="number"
              min={1}
              max={10}
              value={headcount}
              onChange={(e) => setHeadcount(Number(e.target.value) || 1)}
              aria-label="headcount"
              aria-invalid={!!errors.headcount}
              aria-describedby={errors.headcount ? "error-headcount" : undefined}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
            {errors.headcount && (
              <p id="error-headcount" className="mt-1 text-sm text-red-600">
                {errors.headcount}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="rsvp-mealChoice" className="block text-sm font-medium">
              Meal Choice
            </label>
            <select
              id="rsvp-mealChoice"
              value={mealChoice}
              onChange={(e) => setMealChoice(e.target.value)}
              aria-label="mealChoice"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">Select a meal</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="meat">Meat</option>
              <option value="fish">Fish</option>
            </select>
          </div>

          <div>
            <label htmlFor="rsvp-dietaryNotes" className="block text-sm font-medium">
              Dietary Notes
            </label>
            <textarea
              id="rsvp-dietaryNotes"
              value={dietaryNotes}
              onChange={(e) => setDietaryNotes(e.target.value)}
              aria-label="dietaryNotes"
              rows={3}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="Allergies, restrictions, etc."
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
            aria-label="Plus One"
          />
          Plus One
        </label>
      </div>

      {plusOne && (
        <div>
          <label htmlFor="rsvp-plusOneName" className="block text-sm font-medium">
            Plus One Name
          </label>
          <input
            id="rsvp-plusOneName"
            type="text"
            value={plusOneName}
            onChange={(e) => setPlusOneName(e.target.value)}
            aria-label="plusOneName"
            aria-invalid={!!errors.plusOneName}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            placeholder="Plus one name"
          />
          {errors.plusOneName && <p className="mt-1 text-sm text-red-600">{errors.plusOneName}</p>}
        </div>
      )}

      {/* Message */}
      <div>
        <label htmlFor="rsvp-message" className="block text-sm font-medium">
          Message <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <textarea
          id="rsvp-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-label="message"
          rows={4}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="Leave a note for the couple"
        />
        {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message}</p>}
      </div>

      {submitError && (
        <p role="alert" className="text-sm text-red-600">
          {submitError}
        </p>
      )}

      <Button type="submit" loading={submitting} className="w-full">
        Send RSVP
      </Button>
    </form>
  );
}
