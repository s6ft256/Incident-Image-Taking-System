
/**
 * Biometric Service - DEACTIVATED
 * Feature removed per system requirements to bypass environment-specific WebAuthn restrictions.
 */

export const isBiometricsAvailable = async (): Promise<boolean> => {
  return false;
};

export const registerBiometrics = async (userName: string): Promise<{ credentialId: string; publicKey: string }> => {
  throw new Error("Biometric protocol is currently disabled in this environment.");
};

export const authenticateBiometrics = async (storedCredentialId: string): Promise<boolean> => {
  return false;
};
