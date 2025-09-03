import React from 'react';
import { Link } from '@inertiajs/react';
import { formatCurrency, getAccountTypeIcon } from '@/utils/formatters';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  account_number?: string;
}

interface Props {
  account: Account;
  hideBalance?: boolean;
  showActions?: boolean;
}

export default function AccountCard({ account, hideBalance = false, showActions = true }: Props) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bank': return 'bg-blue-500';
      case 'mobile_banking': return 'bg-green-500';
      case 'cash': return 'bg-yellow-500';
      case 'card': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const CardContent = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${getTypeColor(account.type)} text-white text-lg`}>
          {getAccountTypeIcon(account.type)}
        </div>
        {hideBalance && (
          <EyeSlashIcon className="h-5 w-5 text-gray-400" />
        )}
      </div>

      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1 truncate">
        {account.name}
      </h3>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 capitalize">
        {account.type.replace('_', ' ')}
      </p>

      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
        {hideBalance ? '••••••' : formatCurrency(account.balance)}
      </p>

      {account.account_number && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          •••• {account.account_number.slice(-4)}
        </p>
      )}
    </div>
  );

  return showActions ? (
    <Link href={`/accounts/${account.id}`}>
      <CardContent />
    </Link>
  ) : (
    <CardContent />
  );
}
