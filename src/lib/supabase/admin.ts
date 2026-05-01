import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

// The `as any` cast works around a known Supabase TS issue where Partial<Insert> with
// literal union types collapses the update/insert parameter type to `never`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAdmin(): any {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase admin env vars not set");
    _admin = createClient<Database>(url, key);
  }
  return _admin;
}

// This client bypasses RLS. Only use it in secure server-side environments (e.g. API routes).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAdmin: any = new Proxy({} as any, {
  get(_, prop) {
    return (getAdmin() as Record<string, unknown>)[prop as string];
  },
});
