import { createClient } from "@supabase/supabase-js";

/** Único cliente do app: roda só no servidor, com a service role key.
 * O RLS do banco fica ligado sem políticas, então nada é lido do navegador —
 * quem pode o quê é decidido pelo login (src/lib/auth.ts). */
export function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
