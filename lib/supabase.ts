import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type Role = "admin" | "site_lead" | "pending";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
};
