import { getApps, initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import type { FirebaseStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { FIREBASE_CONFIG } from '../constants';

const isFirebaseConfigured = Boolean(
  FIREBASE_CONFIG.API_KEY &&
    FIREBASE_CONFIG.PROJECT_ID &&
    FIREBASE_CONFIG.STORAGE_BUCKET
);

const firebaseApp = isFirebaseConfigured
  ? getApps().find((app) => app.name === '[DEFAULT]') ??
    initializeApp({
      apiKey: FIREBASE_CONFIG.API_KEY,
      authDomain: FIREBASE_CONFIG.AUTH_DOMAIN,
      projectId: FIREBASE_CONFIG.PROJECT_ID,
      storageBucket: FIREBASE_CONFIG.STORAGE_BUCKET,
      messagingSenderId: FIREBASE_CONFIG.MESSAGING_SENDER_ID,
      appId: FIREBASE_CONFIG.APP_ID,
    })
  : null;

export const getFirebaseStorage = (bucketName?: string): FirebaseStorage | null => {
  if (!firebaseApp) return null;
  if (!bucketName) return getStorage(firebaseApp);

  const bucketUrl = bucketName.startsWith('gs://')
    ? bucketName
    : `gs://${bucketName}`;
  return getStorage(firebaseApp, bucketUrl);
};

export const getFirebaseFirestore = (): Firestore | null => {
  return firebaseApp ? getFirestore(firebaseApp) : null;
};
