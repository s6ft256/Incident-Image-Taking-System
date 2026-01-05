import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../constants';
import { UserProfile } from '../types';

const isValidConfig = SUPABASE_CONFIG.URL && SUPABASE_CONFIG.ANON_KEY;
const supabase = isValidConfig ? createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY) : null;
const TABLE_NAME = 'profiles';

/**
 * Maps Supabase DB technical errors to personnel-appropriate safety messages.
 */
const handleDBError = (error: any): string => {
  if (!error) return "Unknown Database Fault";
  
  // PostgreSQL Error Codes
  if (error.code === '23505') return "IDENTITY OVERLAP: This personnel name is already registered in the safety grid.";
  if (error.code === '42P01') return "SYSTEM INTEGRITY FAULT: Personnel registry table is missing from the database.";
  if (error.code === 'PGRST301') return "SECURITY EXPIRED: Your authentication handshake has timed out. Please refresh the terminal.";
  if (error.message?.includes('JWT')) return "SESSION INVALID: Security credentials rejected. Please log in again.";
  
  return error.message || "Registry synchronization failed.";
};

const requireSupabase = () => {
  if (!supabase) {
    throw new Error(
      "CONFIGURATION FAULT: Personnel registry is not activated. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
    );
  }
};

export const registerProfile = async (profile: UserProfile): Promise<UserProfile> => {
  requireSupabase();
  const { data, error } = await supabase!
    .from(TABLE_NAME)
    .insert([{ 
      name: profile.name, 
      role: profile.role, 
      site: profile.site,
      email: profile.email,
      password: profile.password,
      profile_image_url: profile.profileImageUrl,
      privacy_policy_consent: profile.privacy_policy_consent,
      user_agreement_consent: profile.user_agreement_consent,
      image_consent: profile.image_consent,
      consent_timestamp: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw new Error(handleDBError(error));
  
  return {
    id: data.id,
    name: data.name,
    role: data.role,
    site: data.site,
    email: data.email,
    password: data.password,
    profileImageUrl: data.profile_image_url,
    privacy_policy_consent: data.privacy_policy_consent,
    user_agreement_consent: data.user_agreement_consent,
    image_consent: data.image_consent,
    consent_timestamp: data.consent_timestamp
  };
};

export const getProfileByName = async (name: string): Promise<UserProfile | null> => {
  requireSupabase();
  const { data, error } = await supabase!
    .from(TABLE_NAME)
    .select('*')
    .eq('name', name)
    .maybeSingle();

  if (error) throw new Error(handleDBError(error));
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    role: data.role,
    site: data.site,
    email: data.email,
    password: data.password,
    profileImageUrl: data.profile_image_url,
    privacy_policy_consent: data.privacy_policy_consent,
    user_agreement_consent: data.user_agreement_consent,
    image_consent: data.image_consent,
    consent_timestamp: data.consent_timestamp
  };
};

export const getAllProfiles = async (): Promise<UserProfile[]> => {
  // Personnel directory is optional for core app flows; don't hard-fail startup.
  if (!supabase) return [];
  const { data, error } = await supabase!
    .from(TABLE_NAME)
    .select('name, role, site, email, profile_image_url');
  
  if (error) throw new Error(handleDBError(error));
  
  return (data || []).map(d => ({
    name: d.name,
    role: d.role,
    site: d.site,
    email: d.email,
    profileImageUrl: d.profile_image_url
  }));
};

export const updateProfile = async (id: string, updates: Partial<UserProfile>): Promise<void> => {
  requireSupabase();
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.site !== undefined) dbUpdates.site = updates.site;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.password !== undefined) dbUpdates.password = updates.password;
  if (updates.profileImageUrl !== undefined) dbUpdates.profile_image_url = updates.profileImageUrl;

  const { error } = await supabase!
    .from(TABLE_NAME)
    .update(dbUpdates)
    .eq('id', id);

  if (error) throw new Error(handleDBError(error));
};

export const deleteProfile = async (id: string): Promise<void> => {
  requireSupabase();
  const { error } = await supabase!
    .from(TABLE_NAME)
    .delete()
    .eq('id', id);

  if (error) throw new Error(handleDBError(error));
};