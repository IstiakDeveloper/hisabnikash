import React from 'react';
import { XMarkIcon, ArrowDownTrayIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

interface InstallBannerProps {
  onInstall: () => void;
  onDismiss: () => void;
  isVisible: boolean;
}

export default function InstallBanner({ onInstall, onDismiss, isVisible }: InstallBannerProps) {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed bottom-20 left-4 right-4 lg:bottom-4 lg:left-auto lg:right-4 lg:w-96 z-50",
      "transform transition-all duration-300 ease-in-out",
      isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
    )}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DevicePhoneMobileIcon className="h-5 w-5" />
              <span className="font-medium text-sm">Install Finance App</span>
            </div>
            <button
              onClick={onDismiss}
              className="p-1 hover:bg-blue-600 rounded-full transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Install our app for a better experience with offline access, push notifications, and faster loading.
          </p>

          <div className="flex space-x-2">
            <button
              onClick={onInstall}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              <span>Install</span>
            </button>

            <button
              onClick={onDismiss}
              className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>

        {/* iOS Instructions (if needed) */}
        <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="hidden ios-device:inline">
            On iOS: Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>
          </span>
          <span className="ios-device:hidden">
            Available for Chrome, Edge, and other modern browsers
          </span>
        </div>
      </div>
    </div>
  );
}
