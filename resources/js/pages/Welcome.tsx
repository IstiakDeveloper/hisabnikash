import React from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowRightIcon,
    ChartBarIcon,
    CreditCardIcon,
    ShieldCheckIcon,
    DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

interface Props {
    canLogin?: boolean;
    canRegister?: boolean;
    laravelVersion: string;
    phpVersion: string;
}

export default function Welcome({ canLogin, canRegister }: Props) {
    const features = [
        {
            icon: CreditCardIcon,
            title: 'Multiple Accounts',
            description: 'Manage all your bank accounts, mobile banking, and cash in one place'
        },
        {
            icon: ChartBarIcon,
            title: 'Smart Analytics',
            description: 'Get insights into your spending patterns with beautiful charts'
        },
        {
            icon: ShieldCheckIcon,
            title: 'Secure & Private',
            description: 'Your financial data is encrypted and stored securely'
        },
        {
            icon: DevicePhoneMobileIcon,
            title: 'Mobile First',
            description: 'Optimized for mobile devices with PWA support'
        }
    ];

    return (
        <>
            <Head title="Personal Finance Manager" />

            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                {/* Navigation */}
                <nav className="flex justify-between items-center p-6 lg:px-8">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center">
                            <span className="text-xl text-white">💰</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                            Finance App
                        </span>
                    </div>

                    {canLogin && (
                        <div className="flex items-center space-x-4">
                            <Link
                                href="/login"
                                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                            >
                                Sign in
                            </Link>
                            {canRegister && (
                                <Link
                                    href="/register"
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
                                >
                                    Get Started
                                </Link>
                            )}
                        </div>
                    )}
                </nav>

                {/* Hero Section */}
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="text-center py-20 lg:py-32">
                        <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                            Take Control of Your{' '}
                            <span className="text-blue-600 dark:text-blue-400">Finances</span>
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                            The easiest way to track your income, expenses, and loans.
                            Get insights into your spending habits and make better financial decisions.
                        </p>

                        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
                            {canRegister && (
                                <Link
                                    href="/register"
                                    className="group bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200 shadow-xl hover:shadow-2xl flex items-center justify-center"
                                >
                                    Start Free Today
                                    <ArrowRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            )}
                            {canLogin && (
                                <Link
                                    href="/login"
                                    className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 px-8 py-4 rounded-xl font-semibold transition-colors"
                                >
                                    Sign In
                                </Link>
                            )}
                        </div>

                        {/* Demo Preview */}
                        <div className="relative mx-auto max-w-4xl">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold">Dashboard Overview</h3>
                                        <span className="text-blue-200">Total Balance: ৳1,25,000</span>
                                    </div>
                                </div>
                                <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                                        <p className="text-green-600 dark:text-green-400 text-sm font-medium">This Month Income</p>
                                        <p className="text-green-700 dark:text-green-300 text-lg font-bold">৳45,000</p>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                                        <p className="text-red-600 dark:text-red-400 text-sm font-medium">This Month Expense</p>
                                        <p className="text-red-700 dark:text-red-300 text-lg font-bold">৳25,000</p>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                        <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Accounts</p>
                                        <p className="text-blue-700 dark:text-blue-300 text-lg font-bold">4</p>
                                    </div>
                                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                                        <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Active Loans</p>
                                        <p className="text-purple-700 dark:text-purple-300 text-lg font-bold">2</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Features Section */}
                    <div className="py-20">
                        <h2 className="text-3xl lg:text-4xl font-bold text-center text-gray-900 dark:text-white mb-16">
                            Everything you need to manage your finances
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {features.map((feature, index) => (
                                <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow">
                                    <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
                                        <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        {feature.title}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className="text-center py-20">
                        <div className="bg-blue-600 dark:bg-blue-800 rounded-2xl p-12 text-white">
                            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                                Ready to get started?
                            </h2>
                            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                                Join thousands of users who are already taking control of their finances
                            </p>
                            {canRegister && (
                                <Link
                                    href="/register"
                                    className="group bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-colors shadow-lg inline-flex items-center"
                                >
                                    Create Free Account
                                    <ArrowRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="border-t border-gray-200 dark:border-gray-700 py-8">
                    <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
                        <p className="text-gray-600 dark:text-gray-400">
                            © 2025 Personal Finance App. Built with Laravel & React.
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
