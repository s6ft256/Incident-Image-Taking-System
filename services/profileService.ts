
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
      profile_image_url: profile.profileImageUrl 
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  // Map back to camelCase for the app
  return {
    id: data.id,
    name: data.name,
    role: data.role,
    site: data.site,
    profileImageUrl: data.profile_image_url
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
    profileImageUrl: data.profile_image_url
  };
};

export const updateProfile = async (id: string, updates: Partial<UserProfile>): Promise<void> => {
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.site !== undefined) dbUpdates.site = updates.site;
  if (updates.profileImageUrl !== undefined) dbUpdates.profile_image_url = updates.profileImageUrl;

  const { error } = await supabase
    .from(TABLE_NAME)
    .update(dbUpdates)
    .eq('id', id);

  if (error) throw new Error(error.message);
};
