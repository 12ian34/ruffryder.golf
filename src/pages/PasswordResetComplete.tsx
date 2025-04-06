import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PasswordResetComplete() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completePasswordReset, signIn } = useAuth();

  const oobCode = searchParams.get('oobCode');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!oobCode) {
      setError('Invalid or expired password reset link. Please request a new one.');
      return;
    }
    if (!email) {
      setError('Missing email parameter. Please request a new password reset link.');
      return;
    }
  }, [oobCode, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters');
      return;
    }

    if (!oobCode || !email) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    setIsLoading(true);
    try {
      await completePasswordReset(oobCode, password);
      // Wait a moment to ensure Firebase has processed the password reset
      await new Promise(resolve => setTimeout(resolve, 1000));
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/invalid-action-code') {
        setError('This password reset link has expired or already been used. Please request a new one.');
      } else {
        setError(err.message || 'Failed to set password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900 dark:text-white">
          Set Your Password
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
                className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded-md"
                disabled={isLoading || !oobCode || !email}
                placeholder="Enter your new password"
                required
                minLength={6}
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
                className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded-md"
                disabled={isLoading || !oobCode || !email}
                placeholder="Confirm your new password"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-br from-purple-500 to-purple-600 hover:shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 disabled:opacity-50"
              disabled={isLoading || !oobCode || !email}
            >
              {isLoading ? 'Setting password...' : 'Set Password & Sign In'}
            </button>

            {(!oobCode || !email) && (
              <div className="text-center mt-4">
                <a
                  href="/"
                  className="text-sm text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300"
                >
                  Return to Login
                </a>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}