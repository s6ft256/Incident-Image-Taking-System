
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
 * Handles potential SecurityErrors caused by Permissions Policy restrictions.
 */
export const isBiometricsAvailable = async (): Promise<boolean> => {
  try {
    // Basic check for API support
    if (!window.PublicKeyCredential) return false;
    
    // Check if the feature is allowed by Permissions Policy
    // Some browsers throw SecurityError immediately if 'publickey-credentials-get' is not allowed.
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error: any) {
    if (error.name === 'SecurityError') {
      console.warn("HSE Guardian: Biometric features restricted by environment Permissions Policy (publickey-credentials-get).");
    } else {
      console.warn("HSE Guardian: WebAuthn check failed:", error);
    }
    return false;
  }
};

/**
 * Registers a new biometric signature
 */
export const registerBiometrics = async (userName: string): Promise<{ credentialId: string; publicKey: string }> => {
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
    if (error.name === 'SecurityError') {
      throw new Error("Security Policy: Biometric registration (publickey-credentials-create) is blocked by the host environment.");
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
    if (error.name === 'SecurityError') {
      console.error("Biometric 'get' operation blocked by Permissions Policy.");
      throw new Error("Security Policy Violation: This environment restricts biometric features. Please use your Access Key.");
    }
    console.error("Biometric auth error:", error);
    return false;
  }
};
