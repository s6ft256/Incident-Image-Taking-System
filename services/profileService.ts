import { collection, deleteDoc, doc, getDocs, limit, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { UserProfile } from '../types';
import { getFirebaseFirestore } from './firebaseService';

const COLLECTION_NAME = 'profiles';

const requireFirestore = () => {
  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('CONFIGURATION FAULT: Firebase database is not configured. Verify Firebase credentials.');
  }
  return db;
};

const toProfile = (id: string, data: Record<string, unknown>): UserProfile => ({
  id,
  name: String(data.name || ''),
  role: String(data.role || ''),
  site: typeof data.site === 'string' ? data.site : '',
  email: typeof data.email === 'string' ? data.email : '',
  password: typeof data.password === 'string' ? data.password : undefined,
  profileImageUrl: typeof data.profile_image_url === 'string' ? data.profile_image_url : undefined,
  privacy_policy_consent: Boolean(data.privacy_policy_consent),
  user_agreement_consent: Boolean(data.user_agreement_consent),
  image_consent: Boolean(data.image_consent),
  consent_timestamp: typeof data.consent_timestamp === 'string' ? data.consent_timestamp : undefined
});

export const registerProfile = async (profile: UserProfile): Promise<UserProfile> => {
  const db = requireFirestore();
  const profileRef = doc(collection(db, COLLECTION_NAME));
  const profileData = {
    name: profile.name,
    role: profile.role,
    site: profile.site || '',
    email: profile.email || '',
    password: profile.password || '',
    profile_image_url: profile.profileImageUrl || '',
    privacy_policy_consent: Boolean(profile.privacy_policy_consent),
    user_agreement_consent: Boolean(profile.user_agreement_consent),
    image_consent: Boolean(profile.image_consent),
    consent_timestamp: new Date().toISOString()
  };
  await setDoc(profileRef, profileData);
  return toProfile(profileRef.id, profileData);
};

export const getProfileByName = async (name: string): Promise<UserProfile | null> => {
  const db = requireFirestore();
  const snapshot = await getDocs(query(
    collection(db, COLLECTION_NAME),
    where('name', '==', name),
    limit(1)
  ));
  const match = snapshot.docs[0];
  return match ? toProfile(match.id, match.data()) : null;
};

export const getAllProfiles = async (): Promise<UserProfile[]> => {
  const db = getFirebaseFirestore();
  if (!db) return [];
  const snapshot = await getDocs(collection(db, COLLECTION_NAME));
  return snapshot.docs.map(profile => toProfile(profile.id, profile.data()));
};

export const updateProfile = async (id: string, updates: Partial<UserProfile>): Promise<void> => {
  const db = requireFirestore();
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.site !== undefined) dbUpdates.site = updates.site;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.password !== undefined) dbUpdates.password = updates.password;
  if (updates.profileImageUrl !== undefined) dbUpdates.profile_image_url = updates.profileImageUrl;
  await updateDoc(doc(db, COLLECTION_NAME, id), dbUpdates);
};

export const deleteProfile = async (id: string): Promise<void> => {
  const db = requireFirestore();
  await deleteDoc(doc(db, COLLECTION_NAME, id));
};
