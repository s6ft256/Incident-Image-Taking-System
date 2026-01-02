
// Biometric support removed
// The biometric authentication feature has been removed from the application
// per project requirements. This file remains for historical context only
// and should not be imported or relied upon. If present, its APIs intentionally
// return disabled responses.

export const isBiometricsAvailable = async (): Promise<boolean> => false;
export const registerBiometrics = async () => { throw new Error('Biometric authentication removed.'); };
export const authenticateBiometrics = async () => false;
