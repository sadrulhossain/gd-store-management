import { z } from "zod";
import { AVATAR_MAX_BYTES, AVATAR_TYPES } from "@/components/common/avatar-uploader";
import { newPasswordSchema } from "@/features/auth/password-schema";

const phonePattern = /^[0-9+()\-\s]*$/;

const baseFields = {
  name: z.string().trim().min(1, "Enter a name.").max(255, "Use at most 255 characters."),
  username: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters.")
    .max(50, "Use at most 50 characters.")
    .regex(/^[A-Za-z0-9._-]+$/, "Letters, numbers, dots, underscores and hyphens only."),
  email: z.string().trim().max(255).email("Enter a valid email address.").or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(32, "Use at most 32 characters.")
    .regex(phonePattern, "Digits, spaces and + ( ) - only."),
  role: z.string().min(1, "Choose a role."),
  is_active: z.boolean(),
  must_change_password: z.boolean(),
  avatar: z
    .instanceof(File)
    .refine(
      (file) => (AVATAR_TYPES as readonly string[]).includes(file.type),
      "Use a JPEG, PNG or WebP image.",
    )
    .refine((file) => file.size <= AVATAR_MAX_BYTES, "The image must be 2 MB or smaller.")
    .nullable(),
  removeAvatar: z.boolean(),
};

export const createUserSchema = z.object({ ...baseFields, password: newPasswordSchema });
export const editUserSchema = z.object({ ...baseFields, password: z.string() });

export type UserFormValues = z.infer<typeof createUserSchema>;

export const USER_FORM_FIELDS = [
  "name",
  "username",
  "email",
  "phone",
  "role",
  "password",
  "is_active",
  "must_change_password",
  "avatar",
] as const;
