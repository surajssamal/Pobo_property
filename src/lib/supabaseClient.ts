import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isValidHttpUrl = (str: string): boolean => {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  !rawUrl.includes('your-supabase-url') &&
  !rawKey.includes('your-anon-key') &&
  isValidHttpUrl(rawUrl)
);

// Fallback dummy client if credentials aren't provided yet
const fallbackUrl = 'https://placeholder-project.supabase.co';
const fallbackKey = 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? rawUrl : fallbackUrl,
  isSupabaseConfigured ? rawKey : fallbackKey
);

/**
 * Checks if a phone number already exists in the database via RPC (if installed)
 */
export async function checkPhoneDuplicateInSupabase(cleanPhone: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { data, error } = await supabase.rpc('check_enquiry_phone_exists', {
      p_phone: cleanPhone,
    });
    if (error) {
      // If the RPC doesn't exist yet, gracefully return false
      return false;
    }
    return Boolean(data);
  } catch {
    return false;
  }
}
