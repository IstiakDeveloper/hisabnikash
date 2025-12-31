import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import {
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BanknotesIcon,
  ChartBarIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

const quickActions = [
  {
    name: 'Add Income',
    href: '/transactions/create?type=income',
    icon: ArrowUpIcon,
    color: 'bg-green-500 hover:bg-green-600'
  },
  {
    name: 'Add Expense',
    href: '/transactions/create?type=expense',
    icon: ArrowDownIcon,
    color: 'bg-red-500 hover:bg-red-600'
  },
  {
    name: 'Cash Out',
    href: '/transfers/cash-out',
    icon: ArrowDownTrayIcon,
    color: 'bg-emerald-500 hover:bg-emerald-600'
  },
  {
    name: 'Transfer',
    href: '/transfers/balance-transfer',
    icon: ArrowsRightLeftIcon,
    color: 'bg-purple-500 hover:bg-purple-600'
  },
  {
    name: 'Add Budget',
    href: '/budgets/create',
    icon: ChartBarIcon,
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    name: 'Add Loan',
    href: '/loans/create',
    icon: BanknotesIcon,
    color: 'bg-orange-500 hover:bg-orange-600'
  }
];

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Backdrop when menu is open */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 z-50">
        {/* Quick action buttons - positioned above */}
        <div className={cn(
          "absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col-reverse items-center space-y-reverse space-y-3 transition-all duration-300",
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
        )}>
          {quickActions.slice(0, 4).map((action, index) => (
            <Link
              key={action.name}
              href={action.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-full text-white shadow-lg transition-all duration-200 transform hover:scale-110 active:scale-95",
                action.color
              )}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
              title={action.name}
            >
              <action.icon className="h-5 w-5" />
            </Link>
          ))}
        </div>

        {/* Main FAB - Centered on bottom nav */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center justify-center w-16 h-16 mb-2 bg-gradient-to-br from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white rounded-full shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95",
            isOpen && "rotate-45 from-red-500 to-pink-500"
          )}
          aria-label={isOpen ? 'Close menu' : 'Open quick actions'}
        >
          <PlusIcon className="h-8 w-8" />
        </button>
      </div>
    </>
  );
}
