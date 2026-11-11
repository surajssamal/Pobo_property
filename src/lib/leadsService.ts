import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Lead, Profile, LeadNote, LeadStatus } from '@/types/crm';
import { MOCK_LEADS, MOCK_PROFILES } from './mockData';

// In-memory / session storage store for updates in preview mode
const LOCAL_LEADS_KEY = 'pobo_crm_leads_cache_v1';
const LOCAL_PROFILES_KEY = 'pobo_crm_profiles_cache_v1';

function getLocalProfilesCache(): Profile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_PROFILES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function recordNewProfile(newProfile: Profile): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalProfilesCache();
    const updated = [newProfile, ...existing.filter((p) => p.id !== newProfile.id && p.phone !== newProfile.phone)];
    localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to record new profile locally:', e);
  }
}

function getLocalLeadsCache(): Lead[] {
  if (typeof window === 'undefined') return MOCK_LEADS;
  try {
    const raw = localStorage.getItem(LOCAL_LEADS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(MOCK_LEADS));
      return MOCK_LEADS;
    }
    return JSON.parse(raw);
  } catch {
    return MOCK_LEADS;
  }
}

function saveLocalLeadsCache(leads: Lead[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(leads));
  } catch (e) {
    console.warn('Failed to save local leads cache:', e);
  }
}

/**
 * Add newly submitted lead to local CRM cache so it instantly appears in Admin & Worker tables
 */
export function recordNewSubmittedLead(leadData: Omit<Lead, 'id' | 'created_at'> & { id?: string }): void {
  const newLead: Lead = {
    id: leadData.id || `lead-${Date.now()}`,
    name: leadData.name,
    phone: leadData.phone,
    preferred_location: leadData.preferred_location,
    budget: leadData.budget,
    property_type: leadData.property_type,
    purchase_timeline: leadData.purchase_timeline,
    status: 'New',
    assigned_aa_id: null,
    assigned_ambassador: null,
    notes: leadData.notes || null,
    created_at: new Date().toISOString(),
    lead_notes: [],
  };

  const cached = getLocalLeadsCache();
  const updated = [newLead, ...cached];
  saveLocalLeadsCache(updated);
}

/**
 * Fetch all leads for Admin view
 */
export async function getAdminLeads(): Promise<{ leads: Lead[]; isLiveDb: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { leads: getLocalLeadsCache(), isLiveDb: false };
  }

  try {
    // Attempt Supabase fetch
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        assigned_ambassador:profiles!assigned_aa_id (
          id,
          full_name,
          role,
          phone
        ),
        lead_notes (
          id,
          note,
          created_at,
          author_id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase leads query note:', error.message);
      // Fallback to cache if RLS restricts anon read
      return {
        leads: getLocalLeadsCache(),
        isLiveDb: false,
        error: error.message.includes('permission') || error.message.includes('policy')
          ? 'RLS Policy active: Showing live preview leads. Sign in as admin or enable RLS read policy for full sync.'
          : error.message,
      };
    }

    if (!data || data.length === 0) {
      // If table is empty in DB, return empty or seed preview
      return { leads: data || [], isLiveDb: true };
    }

    return { leads: data as Lead[], isLiveDb: true };
  } catch (err: unknown) {
    console.error('Error fetching leads:', err);
    return {
      leads: getLocalLeadsCache(),
      isLiveDb: false,
      error: 'Using local cache leads',
    };
  }
}

/**
 * Fetch leads assigned to a specific worker / area ambassador
 */
export async function getWorkerLeads(ambassadorId: string): Promise<{ leads: Lead[]; isLiveDb: boolean }> {
  if (!isSupabaseConfigured) {
    const cached = getLocalLeadsCache();
    const filtered = cached.filter((l) => l.assigned_aa_id === ambassadorId);
    return { leads: filtered, isLiveDb: false };
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        assigned_ambassador:profiles!assigned_aa_id (
          id,
          full_name,
          role,
          phone
        ),
        lead_notes (
          id,
          note,
          created_at,
          author_id
        )
      `)
      .eq('assigned_aa_id', ambassadorId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      const cached = getLocalLeadsCache();
      const filtered = cached.filter((l) => l.assigned_aa_id === ambassadorId);
      return { leads: filtered, isLiveDb: false };
    }

    return { leads: data as Lead[], isLiveDb: true };
  } catch {
    const cached = getLocalLeadsCache();
    const filtered = cached.filter((l) => l.assigned_aa_id === ambassadorId);
    return { leads: filtered, isLiveDb: false };
  }
}

/**
 * Update the status of a lead
 */
export async function updateLeadStatus(
  leadId: string,
  newStatus: LeadStatus
): Promise<{ success: boolean; error?: string }> {
  // Always update local cache for instant UI feedback
  const cached = getLocalLeadsCache();
  const updated = cached.map((l) =>
    l.id === leadId ? { ...l, status: newStatus, updated_at: new Date().toISOString() } : l
  );
  saveLocalLeadsCache(updated);

  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('leads')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

/**
 * Assign a lead to an Area Ambassador / Worker
 */
export async function assignLeadAmbassador(
  leadId: string,
  ambassadorId: string | null
): Promise<{ success: boolean; error?: string }> {
  const cached = getLocalLeadsCache();
  const selectedProfile = MOCK_PROFILES.find((p) => p.id === ambassadorId) || null;

  const updated = cached.map((l) =>
    l.id === leadId
      ? { ...l, assigned_aa_id: ambassadorId, assigned_ambassador: selectedProfile }
      : l
  );
  saveLocalLeadsCache(updated);

  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('leads')
      .update({
        assigned_aa_id: ambassadorId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Assignment failed' };
  }
}

/**
 * Add a note to a lead's activity log
 */
export async function addLeadNote(
  leadId: string,
  noteText: string,
  authorId?: string | null,
  authorName?: string
): Promise<{ success: boolean; newNote?: LeadNote; error?: string }> {
  const newNote: LeadNote = {
    id: `note-${Date.now()}`,
    lead_id: leadId,
    author_id: authorId || null,
    author_name: authorName || 'Area Ambassador',
    note: noteText,
    created_at: new Date().toISOString(),
  };

  // Update local cache
  const cached = getLocalLeadsCache();
  const updated = cached.map((l) => {
    if (l.id === leadId) {
      return {
        ...l,
        lead_notes: [newNote, ...(l.lead_notes || [])],
      };
    }
    return l;
  });
  saveLocalLeadsCache(updated);

  if (!isSupabaseConfigured) {
    return { success: true, newNote };
  }

  try {
    const { data, error } = await supabase
      .from('lead_notes')
      .insert([
        {
          lead_id: leadId,
          author_id: authorId || null,
          note: noteText,
        },
      ])
      .select();

    if (error) {
      // Still return local success so UI responds
      return { success: true, newNote, error: error.message };
    }

    return { success: true, newNote: (data && data[0]) || newNote };
  } catch (err: unknown) {
    return { success: true, newNote, error: err instanceof Error ? err.message : 'Note saved locally' };
  }
}

/**
 * Fetch available Area Ambassadors / Workers (merges Supabase profiles with local newly registered profiles)
 */
export async function getProfiles(): Promise<Profile[]> {
  const localRegistered = getLocalProfilesCache();

  if (!isSupabaseConfigured) {
    const combined = [...localRegistered, ...MOCK_PROFILES.filter((m) => !localRegistered.some((l) => l.id === m.id))];
    return combined;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    if (error || !data) {
      const combined = [...localRegistered, ...MOCK_PROFILES.filter((m) => !localRegistered.some((l) => l.id === m.id))];
      return combined;
    }

    const dbProfiles = data as Profile[];
    // Merge DB profiles + locally registered profiles not yet in DB
    const merged = [
      ...dbProfiles,
      ...localRegistered.filter((lp) => !dbProfiles.some((dp) => dp.id === lp.id || (dp.phone && dp.phone === lp.phone))),
    ];

    if (merged.length === 0) {
      return MOCK_PROFILES;
    }

    return merged.sort((a, b) => a.full_name.localeCompare(b.full_name));
  } catch {
    const combined = [...localRegistered, ...MOCK_PROFILES.filter((m) => !localRegistered.some((l) => l.id === m.id))];
    return combined;
  }
}
