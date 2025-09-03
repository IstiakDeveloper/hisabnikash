import React, { useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import {
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';

interface Props {
  canResetPassword?: boolean;
  status?: string;
}

export default function Login({ canResetPassword, status }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const { data, setData, post, processing, errors, reset } = useForm({
    login: '', // Can be username or email
    password: '',
    remember: false,
  });

  useEffect(() => {
    return () => {
      reset('password');
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/login');
  };

  return (
    <GuestLayout>
      <Head title="Login" />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <span className="text-2xl text-white">💰</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Sign in to manage your finances
            </p>
          </div>

          {/* Status Message */}
          {status && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
              {status}
            </div>
          )}

          {/* Login Form */}
          <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl px-8 py-10 border border-gray-100 dark:border-gray-700">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username/Email Field */}
              <div>
                <label htmlFor="login" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username or Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="login"
                    type="text"
                    value={data.login}
                    onChange={(e) => setData('login', e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                    placeholder="Enter username or email"
                    required
                    autoFocus
                  />
                </div>
                {errors.login && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.login}</p>}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={data.remember}
                    onChange={(e) => setData('remember', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Remember me</span>
                </label>

                {canResetPassword && (
                  <Link
                    href="/forgot-password"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={processing}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {processing ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center">
                    Sign in
                    <ArrowRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </button>
            </form>

            {/* Register Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <Link
                  href="/register"
                  className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
                >
                  Create one now
                </Link>
              </p>
            </div>
          </div>

          {/* Demo Credentials */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-2">Demo Credentials:</p>
            <p className="text-xs text-gray-600 dark:text-gray-300 text-center">
              Username: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">demo</code> |
              Password: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">password</code>
            </p>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
}
