import { z } from "zod";

export const rsvpSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  attending: z.boolean(),
  headcount: z.number().int().min(1).max(10).default(1),
  mealChoice: z.enum(["vegetarian", "vegan", "meat", "fish"]).optional().nullable(),
  dietaryNotes: z.string().max(500).optional().nullable(),
  message: z.string().max(1000).optional().nullable(),
  guestId: z.string().optional(),
  category: z.enum(["family", "friends", "colleagues", "other"]).optional(),
  plusOne: z.boolean().optional(),
  plusOneName: z.string().max(100).optional().nullable(),
});

export const guestUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  category: z.enum(["family", "friends", "colleagues", "other"]).optional(),
  plusOne: z.boolean().optional(),
  plusOneName: z.string().max(100).optional().nullable(),
});

export type RsvpInput = z.infer<typeof rsvpSchema>;
export type GuestUpdateInput = z.infer<typeof guestUpdateSchema>;
