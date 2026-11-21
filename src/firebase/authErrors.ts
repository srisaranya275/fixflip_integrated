import firebaseConfig from '../../firebase-applet-config.json';

export function formatFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  switch (code) {
    case 'auth/operation-not-allowed':
      return `Email/Password sign-in is disabled in Firebase Console for project "${firebaseConfig.projectId}". Enable it under Firebase Console -> Project "${firebaseConfig.projectId}" -> Authentication -> Sign-in method -> Email/Password -> Enable -> Save, or use "Continue with Google" below.`;
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Switch to Sign In or reset your password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose at least 6 characters (mix of letters and numbers recommended).';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email address or password. Please verify your credentials and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled in Firebase Authentication.';
    case 'auth/too-many-requests':
      return 'Too many consecutive attempts. Please wait a minute before trying again.';
    case 'auth/network-request-failed':
      return 'Network error while contacting Firebase Authentication. Check your connection and retry.';
    case 'auth/popup-closed-by-user':
      return 'The Google sign-in window was closed before completing authentication.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.';
    case 'auth/cancelled-popup-request':
      return 'A previous sign-in popup was already open. Please complete or close it and try again.';
    case 'auth/unauthorized-domain':
      return `This domain (${window.location.hostname}) is not allowlisted in Firebase Console for project "${firebaseConfig.projectId}". Add it under Authentication -> Settings -> Authorized domains.`;
    default: {
      if (error instanceof Error && error.message) {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed && typeof parsed.error === 'string') {
            return `Profile database error: ${parsed.error}`;
          }
        } catch {
          // Not JSON
        }
        return error.message;
      }
      return 'Authentication failed. Please try again.';
    }
  }
}
