
/**
 * Utility to convert ArrayBuffer to Base64String for storage in Supabase
 */
const bufferToBase64 = (buffer: ArrayBuffer): string => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

/**
 * Utility to convert Base64String to ArrayBuffer for WebAuthn API
 */
const base64ToBuffer = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

/**
 * Checks if the current device/browser supports biometrics (FaceID/Fingerprint)
 */
export const isBiometricsAvailable = async (): Promise<boolean> => {
  return !!(
    window.PublicKeyCredential &&
    await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  );
};

/**
 * Registers a new biometric signature (The Web equivalent of BiometricPrompt)
 * This triggers the native system dialog on Android/iOS.
 */
export const registerBiometrics = async (userName: string): Promise<{ credentialId: string; publicKey: string }> => {
  // Generate random challenges required by the security protocol
  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  const userId = window.crypto.getRandomValues(new Uint8Array(16));

  const options: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: { 
      name: "HSE Guardian", 
      id: window.location.hostname 
    },
    user: {
      id: userId,
      name: userName,
      displayName: userName,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" }, // ES256
      { alg: -257, type: "public-key" } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
    timeout: 60000,
  };

  try {
    const credential = (await navigator.credentials.create({ publicKey: options })) as PublicKeyCredential;
    if (!credential) throw new Error("Biometric registration cancelled by user.");

    const response = credential.response as AuthenticatorAttestationResponse;

    return {
      credentialId: bufferToBase64(credential.rawId),
      publicKey: bufferToBase64(response.getPublicKey()),
    };
  } catch (error: any) {
    if (error.name === 'NotAllowedError') {
      throw new Error("Biometric registration was declined.");
    }
    throw error;
  }
};

/**
 * Authenticates the user using a previously stored biometric credential
 */
export const authenticateBiometrics = async (storedCredentialId: string): Promise<boolean> => {
  const challenge = window.crypto.getRandomValues(new Uint8Array(32));

  const options: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: [{
      id: base64ToBuffer(storedCredentialId),
      type: "public-key",
      transports: ["internal"],
    }],
    userVerification: "required",
    timeout: 60000,
  };

  try {
    const assertion = await navigator.credentials.get({ publicKey: options });
    return !!assertion;
  } catch (error: any) {
    console.error("Biometric auth error:", error);
    return false;
  }
};
