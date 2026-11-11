export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Site Visit' | 'Won' | 'Lost';
export type UserRole = 'admin' | 'area_ambassador';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
  created_at?: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  author_id?: string | null;
  author_name?: string;
  note: string;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  preferred_location: string;
  budget: string;
  property_type: string;
  purchase_timeline: string;
  status: LeadStatus;
  assigned_aa_id?: string | null;
  assigned_ambassador?: Profile | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  lead_notes?: LeadNote[];
}
