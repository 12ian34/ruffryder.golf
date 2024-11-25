import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  confirmPasswordReset,
  type User
} from 'firebase/auth';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { auth } from '../config/firebase';

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

interface AuthError {
  code: string;
  message: string;
}

function getErrorMessage(error: AuthError): string {
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
    default:
      return 'An error occurred. Please try again.';
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

      await signOut(auth);
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(getErrorMessage(error));
    }
  }

  async function signInUser(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      throw new Error(getErrorMessage(error));
    }
  }

  async function signOutUser() {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error('Failed to sign out. Please try again.');
    }
  }

  async function resetUserPassword(email: string) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(getErrorMessage(error));
    }
  }

  async function completeUserPasswordReset(oobCode: string, newPassword: string) {
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
    } catch (error: any) {
      throw new Error('Failed to reset password. The link may have expired.');
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