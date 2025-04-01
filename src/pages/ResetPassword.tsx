import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completePasswordReset, signIn } = useAuth();

  const oobCode = searchParams.get('oobCode');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!oobCode || !email) {
      navigate('/');
    }
  }, [oobCode, email, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!oobCode || !email) {
      setError('Invalid reset link');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First complete the password reset
      await completePasswordReset(oobCode, password);
      
      // Wait a short moment to ensure Firebase has processed the password reset
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Then attempt to sign in with the new credentials
      await signIn(email, password);
      
      // Navigate to dashboard after successful sign in
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message);
      if (err.code === 'auth/invalid-action-code') {
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!oobCode || !email) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900 dark:text-white">
          Reset Password
        </h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isLoading}
                placeholder="Enter your new password"
                required
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isLoading}
                placeholder="Confirm your new password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 