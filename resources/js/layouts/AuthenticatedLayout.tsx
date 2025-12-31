import React, { ReactNode, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { User } from '@/types';
import {
    HomeIcon,
    CreditCardIcon,
    ArrowsRightLeftIcon,
    BanknotesIcon,
    ChartBarIcon,
    Bars3Icon,
    XMarkIcon,
    UserCircleIcon,
    ArrowRightOnRectangleIcon,
    EyeIcon,
    EyeSlashIcon,
    FolderIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/formatters';
import BottomNavigation from '@/components/BottomNavigation';
import FloatingActionButton from '@/components/FloatingActionButton';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import InstallBanner from '@/components/InstallBanner';
import InstallButton from '@/components/InstallButton';
import PWAUpdateBanner from '@/components/PWAUpdateBanner';
import OfflineIndicator from '@/components/OfflineIndicator';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

interface Props {
    user?: User;
    children: ReactNode;
    header?: ReactNode;
    showFAB?: boolean;
}

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Accounts', href: '/accounts', icon: CreditCardIcon },
    { name: 'Categories', href: '/categories', icon: FolderIcon },
    { name: 'Transactions', href: '/transactions', icon: ArrowsRightLeftIcon },
    { name: 'Budgets', href: '/budgets', icon: ChartBarIcon },
    { name: 'Loans', href: '/loans', icon: BanknotesIcon },
];

export default function AuthenticatedLayout({
    children,
    header,
    showFAB = true
}: Props) {
    const page = usePage();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [hideBalances, setHideBalances] = useState(false);

    // Safe access to page props with fallbacks
    const auth = page.props.auth as { user: User } | undefined;
    const financialSummary = page.props.financialSummary as {
        totalBalance: number;
        loansTaken: number;
        loansGiven: number;
        netWorth: number;
    } | undefined;

    const {
        installApp,
        isInstallable,
        isInstalled,
        showInstallBanner,
        dismissInstallBanner
    } = usePWAInstall();

    const { updateAvailable, updateApp } = usePWAUpdate();
    const [showUpdateBanner, setShowUpdateBanner] = useState(false);

    // Show update banner when update is available
    React.useEffect(() => {
        if (updateAvailable) {
            setShowUpdateBanner(true);
        }
    }, [updateAvailable]);

    const currentUrl = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';

    // Fallback if auth is not available
    if (!auth?.user) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔐</div>
                    <p className="text-gray-500 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    const user = auth.user;

    // Default values if financial summary not available
    const summary = financialSummary || {
        totalBalance: 0,
        loansTaken: 0,
        loansGiven: 0,
        netWorth: 0
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            </Head>

            {/* Financial Summary Top Bar */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white shadow-sm">
                <div className="lg:pl-64">
                    <div className="px-4 py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1 lg:space-x-6">
                                {/* Total Balance */}
                                <div className="flex items-center space-x-2">
                                    <div className="hidden sm:block text-xs text-blue-100">Balance:</div>
                                    <div className="font-bold text-sm lg:text-base">
                                        {hideBalances ? '••••••' : formatCurrency(summary.totalBalance)}
                                    </div>
                                </div>

                                <div className="hidden lg:block text-blue-300">|</div>

                                {/* Loans Taken */}
                                <div className="flex items-center space-x-2">
                                    <div className="hidden sm:block text-xs text-red-200">Owed:</div>
                                    <div className="font-medium text-sm text-red-200">
                                        {hideBalances ? '••••' : formatCurrency(summary.loansTaken)}
                                    </div>
                                </div>

                                <div className="hidden lg:block text-blue-300">|</div>

                                {/* Loans Given */}
                                <div className="flex items-center space-x-2">
                                    <div className="hidden sm:block text-xs text-green-200">Lending:</div>
                                    <div className="font-medium text-sm text-green-200">
                                        {hideBalances ? '••••' : formatCurrency(summary.loansGiven)}
                                    </div>
                                </div>

                                <div className="hidden lg:block text-blue-300">|</div>

                                {/* Net Worth */}
                                <div className="hidden lg:flex items-center space-x-2">
                                    <div className="text-xs text-blue-100">Net:</div>
                                    <div className={cn(
                                        "font-bold text-sm",
                                        summary.netWorth >= 0
                                            ? "text-green-200"
                                            : "text-red-200"
                                    )}>
                                        {hideBalances ? '••••' : formatCurrency(summary.netWorth)}
                                    </div>
                                </div>
                            </div>

                            {/* Hide/Show Toggle */}
                            <button
                                onClick={() => setHideBalances(!hideBalances)}
                                className="p-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 transition-colors"
                                title={hideBalances ? 'Show balances' : 'Hide balances'}
                            >
                                {hideBalances ?
                                    <EyeIcon className="h-4 w-4" /> :
                                    <EyeSlashIcon className="h-4 w-4" />
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                </div>
            )}

            {/* Mobile sidebar */}
            <div className={cn(
                "fixed top-0 left-0 z-50 h-full w-80 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Finance App</h2>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Mobile Financial Summary */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                    <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">Financial Overview</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white dark:bg-gray-800 p-2 rounded">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                            <p className="font-bold text-blue-600 dark:text-blue-400">
                                {hideBalances ? '••••••' : formatCurrency(summary.totalBalance)}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Net Worth</p>
                            <p className={cn(
                                "font-bold",
                                summary.netWorth >= 0
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                            )}>
                                {hideBalances ? '••••••' : formatCurrency(summary.netWorth)}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Owed</p>
                            <p className="font-medium text-red-600 dark:text-red-400">
                                {hideBalances ? '••••' : formatCurrency(summary.loansTaken)}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Lending</p>
                            <p className="font-medium text-green-600 dark:text-green-400">
                                {hideBalances ? '••••' : formatCurrency(summary.loansGiven)}
                            </p>
                        </div>
                    </div>
                </div>

                <nav className="mt-4 px-2">
                    {navigation.map((item) => {
                        const isActive = currentUrl.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors mb-1",
                                    isActive
                                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                )}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <item.icon className="h-5 w-5 mr-3" />
                                {item.name}
                            </Link>
                        );
                    })}

                    <div className="px-2 pt-4">
                        <InstallButton
                            onInstall={installApp}
                            isInstallable={isInstallable}
                            isInstalled={isInstalled}
                            variant="primary"
                            size="sm"
                        />
                    </div>
                </nav>

                {/* Mobile User Profile */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center mb-3">
                        <UserCircleIcon className="h-8 w-8 text-gray-400" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {user.name || user.username || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user.email}
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                        Logout
                    </Link>
                </div>
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                <div className="flex items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="h-8 w-8 bg-blue-600 rounded-xl flex items-center justify-center mr-3">
                        <span className="text-lg text-white">💰</span>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Finance App</h1>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1">
                    {navigation.map((item) => {
                        const isActive = currentUrl.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                                    isActive
                                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                )}
                            >
                                <item.icon className="h-5 w-5 mr-3" />
                                {item.name}
                            </Link>
                        );
                    })}
                    <div className="pt-4">
                        <InstallButton
                            onInstall={installApp}
                            isInstallable={isInstallable}
                            isInstalled={isInstalled}
                            variant="secondary"
                            size="sm"
                        />
                    </div>
                </nav>

                {/* Desktop User Profile */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center mb-3">
                        <UserCircleIcon className="h-8 w-8 text-gray-400" />
                        <div className="ml-3 min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {user.name || user.username || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user.email}
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                        Logout
                    </Link>
                </div>
            </div>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Top header - Mobile only */}
                {header && (
                    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 lg:hidden">
                        <div className="flex items-center justify-between px-4 py-3">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <Bars3Icon className="h-6 w-6" />
                            </button>

                            <div className="flex-1 px-4 min-w-0">
                                {header}
                            </div>

                            <Link
                                href="/profile"
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <UserCircleIcon className="h-6 w-6" />
                            </Link>
                        </div>
                    </header>
                )}

                {/* Desktop header */}
                {header && (
                    <header className="hidden lg:block bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                        <div className="px-6 py-4">
                            {header}
                        </div>
                    </header>
                )}

                {/* Page content */}
                <main className="pb-20 lg:pb-6">
                    {children}
                </main>
            </div>

            {/* Bottom Navigation - Mobile only */}
            <BottomNavigation />

            {/* Floating Action Button - Hidden, using Dashboard's FAB instead */}
            {/* {showFAB && <FloatingActionButton />} */}

            {/* Offline Indicator */}
            <OfflineIndicator />

            {/* PWA Install Prompt - Modern style */}
            <PWAInstallPrompt />

            {/* Install Banner */}
            <InstallBanner
                onInstall={installApp}
                onDismiss={dismissInstallBanner}
                isVisible={showInstallBanner}
            />

            {/* Update Banner */}
            <PWAUpdateBanner
                onUpdate={updateApp}
                onDismiss={() => setShowUpdateBanner(false)}
                isVisible={showUpdateBanner}
            />
        </div>

    );
}
