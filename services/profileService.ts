
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../constants';
import { UserProfile } from '../types';

const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
const TABLE_NAME = 'profiles';

export const registerProfile = async (profile: UserProfile): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert([{ 
      name: profile.name, 
      role: profile.role, 
      site: profile.site,
      email: profile.email,
      password: profile.password,
      profile_image_url: profile.profileImageUrl,
      // Compliance persistence
      privacy_policy_consent: profile.privacy_policy_consent,
      user_agreement_consent: profile.user_agreement_consent,
      image_consent: profile.image_consent,
      consent_timestamp: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Identity already exists. Please use the Access protocol to login.');
    throw new Error(error.message);
  }
  
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
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('name', name)
    .maybeSingle();

  if (error) throw new Error(error.message);
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
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('name, role, site, email, profile_image_url');
  
  if (error) throw new Error(error.message);
  
  return (data || []).map(d => ({
    name: d.name,
    role: d.role,
    site: d.site,
    email: d.email,
    profileImageUrl: d.profile_image_url
  }));
};

export const updateProfile = async (id: string, updates: Partial<UserProfile>): Promise<void> => {
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.site !== undefined) dbUpdates.site = updates.site;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.password !== undefined) dbUpdates.password = updates.password;
  if (updates.profileImageUrl !== undefined) dbUpdates.profile_image_url = updates.profileImageUrl;

  const { error } = await supabase
    .from(TABLE_NAME)
    .update(dbUpdates)
    .eq('id', id);

  if (error) throw new Error(error.message);
};

export const deleteProfile = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};
