import React from 'react';
import { ArrowDownTrayIcon, CheckIcon } from '@heroicons/react/24/outline';

interface InstallButtonProps {
  onInstall: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export default function InstallButton({
  onInstall,
  isInstallable,
  isInstalled,
  variant = 'primary',
  size = 'md'
}: InstallButtonProps) {
  if (isInstalled) {
    return (
      <button
        disabled
        className={`
          flex items-center justify-center space-x-2 rounded-lg font-medium transition-colors
          ${size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'}
          bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 cursor-default
        `}
      >
        <CheckIcon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        <span>Installed</span>
      </button>
    );
  }

  if (!isInstallable) {
    return null;
  }

  const baseClasses = `
    flex items-center justify-center space-x-2 rounded-lg font-medium transition-colors
    ${size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'}
  `;

  const variantClasses = variant === 'primary'
    ? 'bg-blue-600 hover:bg-blue-700 text-white'
    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700';

  return (
    <button
      onClick={onInstall}
      className={`${baseClasses} ${variantClasses}`}
    >
      <ArrowDownTrayIcon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      <span>Install App</span>
    </button>
  );
}
