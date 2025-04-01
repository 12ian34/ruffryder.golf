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
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  completePasswordReset: (oobCode: string, newPassword: string) => Promise<void>;
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

      await firebaseSignOut(auth);
      await sendPasswordResetEmail(auth, email);
      showSuccessToast('Account created! Please check your email to set your password.');
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

  async function signOutUser() {
    try {
      await firebaseSignOut(auth);
      showSuccessToast('Successfully signed out');
    } catch (error: any) {
      showErrorToast('Failed to sign out. Please try again.');
      throw error;
    }
  }

  async function resetUserPassword(email: string) {
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/reset-password?email=${encodeURIComponent(email)}`,
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
    signUp: signUpUser,
    signIn: signInUser,
    signOut: signOutUser,
    resetPassword: resetUserPassword,
    completePasswordReset: completeUserPasswordReset
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}