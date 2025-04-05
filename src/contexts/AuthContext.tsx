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
  type User,
  type AuthError as FirebaseAuthError
} from 'firebase/auth';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
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
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function signUpUser(email: string, password: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      const db = getFirestore();
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        email: email,
        name: email.split('@')[0],
        isAdmin: false,
        linkedPlayerId: null,
        team: null,
        createdAt: new Date()
      });

      try {
        await firebaseSignOut(auth);
        await sendPasswordResetEmail(auth, email);
        showSuccessToast('Account created! Please check your email to set your password.');
      } catch (resetError: any) {
        // If we fail to send the reset email, but the account was created
        if (resetError.message?.includes('UNAUTHORIZED_DOMAIN')) {
          showSuccessToast('Account created! Please use the "Forgot Password" option on the login page to set your password.');
        } else {
          throw resetError;
        }
      }
    } catch (error: any) {
      showErrorToast(getErrorMessage(error));
      throw error;
    }
  }

  async function signInUser(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showSuccessToast('Successfully signed in!');
    } catch (error: any) {
      showErrorToast(getErrorMessage(error));
      throw error;
    }
  }

  async function signOut() {
    try {
      // Unsubscribe from all Firestore listeners by triggering auth state change
      // This will cause all useEffect cleanup functions to run
      await firebaseSignOut(auth);
      showSuccessToast('Successfully signed out!');
    } catch (error: any) {
      showErrorToast(getErrorMessage(error));
      throw error;
    }
  }

  async function resetUserPassword(email: string) {
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/password-reset-complete?email=${encodeURIComponent(email)}`,
        handleCodeInApp: true
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      showSuccessToast('Password reset email sent. Please check your inbox.');
    } catch (error: any) {
      showErrorToast(getErrorMessage(error));
      throw error;
    }
  }

  async function completeUserPasswordReset(oobCode: string, newPassword: string) {
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      showSuccessToast('Password successfully reset!');
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
      {!loading && children}
    </AuthContext.Provider>
  );
}