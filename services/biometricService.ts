
/**
 * Utility to convert ArrayBuffer to Base64String for storage in Database
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
 * Checks if the current device/browser supports platform biometrics (FaceID/Fingerprint)
 */
export const isBiometricsAvailable = async (): Promise<boolean> => {
  try {
    if (!window.PublicKeyCredential) return false;
    // Ensure we are in a secure context (HTTPS or localhost)
    if (!window.isSecureContext) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error) {
    return false;
  }
};

/**
 * Registers a new biometric signature (Enrollment)
 */
export const registerBiometrics = async (userName: string): Promise<{ credentialId: string; publicKey: string }> => {
  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  const userId = window.crypto.getRandomValues(new Uint8Array(16));

  const options: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: { 
      name: "HSE Guardian Security", 
      id: window.location.hostname 
    },
    user: {
      id: userId,
      name: userName,
      displayName: userName,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" }, // ES256 (Preferred)
      { alg: -257, type: "public-key" } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform", // Force TouchID/FaceID/Windows Hello
      userVerification: "required",
      residentKey: "preferred",
    },
    timeout: 60000,
  };

  try {
    const credential = (await navigator.credentials.create({ publicKey: options })) as PublicKeyCredential;
    if (!credential) throw new Error("Biometric enrollment interrupted.");

    const response = credential.response as AuthenticatorAttestationResponse;

    return {
      credentialId: bufferToBase64(credential.rawId),
      publicKey: bufferToBase64(response.getPublicKey()),
    };
  } catch (error: any) {
    console.error("Enrollment Error:", error);
    if (error.name === 'NotAllowedError') throw new Error("Verification declined by user.");
    if (error.name === 'SecurityError') throw new Error("Secure context (HTTPS) required for biometrics.");
    throw new Error("System biometric handshake failed.");
  }
};

/**
 * Authenticates the user using a previously stored biometric credential (Login)
 */
export const authenticateBiometrics = async (storedCredentialId: string): Promise<boolean> => {
  const challenge = window.crypto.getRandomValues(new Uint8Array(32));

  const options: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId: window.location.hostname,
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
    console.warn("Auth Error:", error.name);
    return false;
  }
};
