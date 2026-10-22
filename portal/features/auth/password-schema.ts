import { z } from "zod";

/** Mirrors the API rule (App\Support\PasswordRule): at least 8 characters with a letter and a number. */
export const newPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one number.");

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    password: newPasswordSchema,
    password_confirmation: z.string().min(1, "Confirm the new password."),
  })
  .refine((values) => values.password === values.password_confirmation, {
    path: ["password_confirmation"],
    message: "The passwords do not match.",
  })
  .refine((values) => values.password !== values.current_password, {
    path: ["password"],
    message: "Choose a password different from the current one.",
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
