import React from 'react';
import { Link } from '@inertiajs/react';
import {
  HomeIcon,
  CreditCardIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  CreditCardIcon as CreditCardIconSolid,
  ArrowsRightLeftIcon as ArrowsRightLeftIconSolid,
  BanknotesIcon as BanknotesIconSolid,
} from '@heroicons/react/24/solid';
import { cn } from '@/utils/cn';

const navigation = [
  {
    name: 'Home',
    href: '/dashboard',
    icon: HomeIcon,
    activeIcon: HomeIconSolid
  },
  {
    name: 'Accounts',
    href: '/accounts',
    icon: CreditCardIcon,
    activeIcon: CreditCardIconSolid
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: ArrowsRightLeftIcon,
    activeIcon: ArrowsRightLeftIconSolid
  },
  {
    name: 'Loans',
    href: '/loans',
    icon: BanknotesIcon,
    activeIcon: BanknotesIconSolid
  },
];

export default function BottomNavigation() {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40">
      <div className="flex">
        {navigation.map((item) => {
          const isActive = currentPath.startsWith(item.href);
          const Icon = isActive ? item.activeIcon : item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center py-2 px-1 transition-colors",
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <Icon className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for iOS */}
      <div className="h-safe-area-inset-bottom bg-white dark:bg-gray-800"></div>
    </nav>
  );
}
