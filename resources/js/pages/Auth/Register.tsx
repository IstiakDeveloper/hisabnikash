import React, { useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import {
  UserIcon,
  AtSymbolIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  useEffect(() => {
    return () => {
      reset('password', 'password_confirmation');
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/register');
  };

  const getPasswordStrength = (password: string): { strength: number; color: string; label: string } => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;

    const levels = [
      { strength: 0, color: 'bg-gray-300', label: '' },
      { strength: 1, color: 'bg-red-500', label: 'Very Weak' },
      { strength: 2, color: 'bg-orange-500', label: 'Weak' },
      { strength: 3, color: 'bg-yellow-500', label: 'Fair' },
      { strength: 4, color: 'bg-green-500', label: 'Good' },
      { strength: 5, color: 'bg-green-600', label: 'Strong' },
    ];

    return levels[strength] || levels[0];
  };

  const passwordStrength = getPasswordStrength(data.password);

  return (
    <GuestLayout>
      <Head title="Register" />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <span className="text-2xl text-white">💰</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Create Account
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Start managing your finances today
            </p>
          </div>

          {/* Register Form */}
          <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl px-8 py-10 border border-gray-100 dark:border-gray-700">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                    placeholder="Enter your full name"
                    required
                    autoFocus
                  />
                </div>
                {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
              </div>

              {/* Username Field */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-sm">@</span>
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={data.username}
                    onChange={(e) => setData('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="block w-full pl-8 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                    placeholder="choose a username"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Only letters, numbers, and underscores allowed
                </p>
                {errors.username && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>}
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <AtSymbolIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
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
                    placeholder="Create a strong password"
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

                {/* Password Strength Indicator */}
                {data.password && (
                  <div className="mt-2">
                    <div className="flex space-x-1 mb-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1 w-full rounded-full transition-colors ${
                            level <= passwordStrength.strength
                              ? passwordStrength.color
                              : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    {passwordStrength.label && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Password strength: {passwordStrength.label}
                      </p>
                    )}
                  </div>
                )}

                {errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password_confirmation"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={data.password_confirmation}
                    onChange={(e) => setData('password_confirmation', e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>

                {/* Password Match Indicator */}
                {data.password_confirmation && (
                  <div className="mt-1 flex items-center">
                    {data.password === data.password_confirmation ? (
                      <div className="flex items-center text-green-600 dark:text-green-400 text-xs">
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Passwords match
                      </div>
                    ) : (
                      <div className="text-red-600 dark:text-red-400 text-xs">
                        Passwords don't match
                      </div>
                    )}
                  </div>
                )}

                {errors.password_confirmation && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password_confirmation}</p>}
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
                    Creating account...
                  </div>
                ) : (
                  <div className="flex items-center">
                    Create Account
                    <ArrowRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
}
