import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import {
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BanknotesIcon,
  XMarkIcon
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
    name: 'Add Loan',
    href: '/loans/create',
    icon: BanknotesIcon,
    color: 'bg-purple-500 hover:bg-purple-600'
  }
];

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden fixed bottom-20 right-4 z-50">
      {/* Quick action buttons */}
      <div className={cn(
        "mb-4 space-y-3 transform transition-all duration-300",
        isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
      )}>
        {quickActions.map((action, index) => (
          <Link
            key={action.name}
            href={action.href}
            onClick={() => setIsOpen(false)}
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full text-white shadow-lg transition-all duration-200 transform hover:scale-110",
              action.color
            )}
            style={{
              animationDelay: `${index * 50}ms`,
              animation: isOpen ? `fadeInUp 0.3s ease-out ${index * 50}ms both` : 'none'
            }}
            title={action.name}
          >
            <action.icon className="h-6 w-6" />
          </Link>
        ))}
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-center w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 transform hover:scale-110",
          isOpen && "rotate-45"
        )}
        aria-label={isOpen ? 'Close menu' : 'Open quick actions'}
      >
        {isOpen ? <XMarkIcon className="h-6 w-6" /> : <PlusIcon className="h-6 w-6" />}
      </button>
    </div>
  );
}
