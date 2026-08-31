import type { Guest, RsvpResponse } from "@prisma/client";

export type GuestWithRsvp = Guest & { rsvp: RsvpResponse | null };
export type RsvpWithGuest = RsvpResponse & { guest: Guest };

export type ApiResponse<T> = { data: T } | { error: string };

export type GuestCategory = "family" | "friends" | "colleagues" | "other";
export type MealChoice = "vegetarian" | "vegan" | "meat" | "fish";
