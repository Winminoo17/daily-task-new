import type { SupabaseClient, User } from '@supabase/supabase-js';
declare global {
 namespace App {
  interface Locals { supabase: SupabaseClient; user: User | null }
  interface Platform { env?: Record<string,string> }
 }
}
export {};
