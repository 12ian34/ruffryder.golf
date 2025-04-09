import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { showSuccessToast } from '../utils/toast';
import { auth } from '../config/firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';

export default function Login() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, signUp, signIn, resetPassword, loading: authLoading } = useAuth();

  // Handle email verification redirect
  useEffect(() => {
    const handleVerificationRedirect = async () => {
      const emailFromParams = searchParams.get('email');
      if (emailFromParams) {
        // Ensure user is signed out when returning from verification
        if (auth.currentUser) {
          await firebaseSignOut(auth);
        }
        setLoginEmail(emailFromParams);
        showSuccessToast('Email verified! Please sign in to continue.');
      }
    };

    handleVerificationRedirect();
  }, [searchParams]);

  // Handle dashboard redirect - only if user is verified and we're not in a verification flow
  useEffect(() => {
    if (!authLoading && currentUser?.emailVerified && !searchParams.get('email')) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate, authLoading, searchParams]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword || !signupConfirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (signupPassword.length < 6) {
      setError('Password should be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signUp(signupEmail, signupPassword);
      setSignupEmail('');
      setSignupPassword('');
      setSignupConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signIn(loginEmail, loginPassword);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginEmail) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await resetPassword(loginEmail);
      alert('Password reset email sent. Please check your inbox and click the link to reset your password.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 dark:from-gray-900 dark:via-purple-900/50 dark:to-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-white">
          Ruff Ryders Cup
        </h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {error && (
          <div className="mb-4 bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative">
            {error}
          </div>
        )}

        {/* Sign Up Form */}
        <div className="py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 mb-8 hover:shadow-xl transition-all duration-200">
          <h2 className="text-xl font-semibold mb-6 text-white">Create account</h2>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="w-full bg-gray-800 border-gray-700 text-white rounded-md focus:ring-europe-500 focus:border-europe-500"
                disabled={isLoading}
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                className="w-full bg-gray-800 border-gray-700 text-white rounded-md focus:ring-europe-500 focus:border-europe-500"
                disabled={isLoading}
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>
            <div>
              <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-gray-300 mb-1">
                Confirm password
              </label>
              <input
                id="signup-confirm-password"
                type="password"
                value={signupConfirmPassword}
                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                className="w-full bg-gray-800 border-gray-700 text-white rounded-md focus:ring-europe-500 focus:border-europe-500"
                disabled={isLoading}
                placeholder="Confirm your password"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-br from-europe-500 to-europe-600 hover:shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-europe-500 focus:ring-opacity-50 disabled:opacity-50"
              disabled={isLoading}
            >
              Create Account
            </button>
          </form>
        </div>

        {/* Sign In Form */}
        <div className="py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 hover:shadow-xl transition-all duration-200">
          <h2 className="text-xl font-semibold mb-6 text-white">Sign in</h2>
          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-gray-800 border-gray-700 text-white rounded-md focus:ring-europe-500 focus:border-europe-500"
                disabled={isLoading}
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-gray-800 border-gray-700 text-white rounded-md focus:ring-europe-500 focus:border-europe-500"
                disabled={isLoading}
                placeholder="Enter your password"
                required
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-br from-europe-500 to-europe-600 hover:shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-europe-500 focus:ring-opacity-50 disabled:opacity-50"
                disabled={isLoading}
              >
                Sign In
              </button>
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-europe-400 hover:text-europe-300 transition-colors duration-200"
                disabled={isLoading}
              >
                Forgot password?
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* GitHub Badge */}
      <div className="mt-8 text-center space-x-4">
        <a 
          href="https://github.com/12ian34/ruff-ryders-app" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors duration-200"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path>
          </svg>
          view source code
        </a>
        <a 
          href="https://buymeacoffee.com/12ian34" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors duration-200"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" clipRule="evenodd"></path>
          </svg>
          donations welcome
        </a>
      </div>
    </div>
  );
}