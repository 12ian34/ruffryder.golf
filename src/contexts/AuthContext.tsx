import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  confirmPasswordReset,
  setPersistence,
  browserLocalPersistence,
  sendEmailVerification,
  type User,
  type AuthError as FirebaseAuthError
} from 'firebase/auth';
import { doc, setDoc, getFirestore, serverTimestamp } from 'firebase/firestore';
import { auth } from '../config/firebase';
import { showErrorToast, showSuccessToast } from '../utils/toast';

setPersistence(auth, browserLocalPersistence).catch((error) => {
  showErrorToast('Error setting auth persistence');
  console.error('Error setting auth persistence:', error);
});

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  completePasswordReset: (code: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function getErrorMessage(error: FirebaseAuthError): string {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please try signing in or use the forgot password option.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again or use the forgot password option.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Please try again later.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/invalid-login-credentials':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/unverified-email':
      return 'Please verify your email address before signing in. Check your inbox for a verification link.';
    default:
      // Check for the UNAUTHORIZED_DOMAIN error which comes as a message rather than a code
      if (error.message?.includes('UNAUTHORIZED_DOMAIN')) {
        console.error('Firebase Auth Error: Unauthorized domain. Please contact support or try again later.');
        return 'Unable to send verification email due to a configuration issue. Please contact support.';
      }
      console.error('Firebase Auth Error:', error);
      return 'An error occurred during authentication. Please try again.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Check if session is stale (older than 24 hours)
        const lastSignInTime = user.metadata.lastSignInTime;
        if (lastSignInTime) {
          const lastSignInDate = new Date(lastSignInTime);
          const now = new Date();
          const hoursSinceLastSignIn = (now.getTime() - lastSignInDate.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceLastSignIn > 96) {
            firebaseSignOut(auth);
            showErrorToast('Your session has expired. Please sign in again.');
            return;
          }
        }
      }
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function signUpUser(email: string, password: string) {
    try {
      // Create user account with their chosen password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore first
      const db = getFirestore();
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        email: email,
        name: email.split('@')[0],
        isAdmin: false,
        linkedPlayerId: null,
        team: null,
        createdAt: serverTimestamp()
      });

      // Send verification email
      const actionCodeSettings = {
        url: `${window.location.origin}/?email=${encodeURIComponent(email)}`,
        handleCodeInApp: false
      };
      await sendEmailVerification(userCredential.user, actionCodeSettings);
      
      // Sign out immediately after sending verification
      await firebaseSignOut(auth);
      
      showSuccessToast('Account created! Please check your email to verify your account before signing in.');
    } catch (error: any) {
      // If we failed after creating the user but before verification, try to clean up
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
      showErrorToast(getErrorMessage(error));
      throw error;
    }
  }

  async function signInUser(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        await firebaseSignOut(auth);
        throw { code: 'auth/unverified-email' };
      }
      
      showSuccessToast('Successfully signed in!');
    } catch (error: any) {
      showErrorToast(getErrorMessage(error));
      throw error;
    }
  }

  async function signOut() {
    try {
      await firebaseSignOut(auth);
      showSuccessToast('Successfully signed out!');
    } catch (error: any) {
      showErrorToast(getErrorMessage(error));
      throw error;
    }
  }

  async function resetUserPassword(email: string) {
    try {
      // Check if user has requested too many password resets
      const resetKey = `password_reset_${email}`;
      const lastReset = localStorage.getItem(resetKey);
      const now = Date.now();
      
      if (lastReset) {
        const timeSinceLastReset = now - parseInt(lastReset);
        if (timeSinceLastReset < 1 * 60 * 1000) { // 1 minute
          throw { code: 'auth/too-many-requests' };
        }
      }

      const actionCodeSettings = {
        url: `${window.location.origin}/password-reset-complete`,
        handleCodeInApp: true
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      localStorage.setItem(resetKey, now.toString());
      showSuccessToast('Password reset email sent. Please check your inbox.');
    } catch (error: any) {
      showErrorToast(getErrorMessage(error));
      throw error;
    }
  }

  async function completeUserPasswordReset(oobCode: string, newPassword: string) {
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      showSuccessToast('Password successfully reset! Please sign in with your new password.');
    } catch (error: any) {
      showErrorToast('Failed to reset password. The link may have expired.');
      throw error;
    }
  }

  const value = {
    currentUser,
    loading,
    signUp: signUpUser,
    signIn: signInUser,
    signOut,
    resetPassword: resetUserPassword,
    completePasswordReset: completeUserPasswordReset
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}