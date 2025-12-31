import React from 'react';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Props {
    onUpdate: () => void;
    onDismiss: () => void;
    isVisible: boolean;
}

export default function PWAUpdateBanner({ onUpdate, onDismiss, isVisible }: Props) {
    if (!isVisible) return null;

    return (
        <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:w-96 z-50 animate-slide-up">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-2xl p-4 border border-blue-500">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center mb-2">
                            <ArrowPathIcon className="h-5 w-5 mr-2" />
                            <h3 className="font-semibold">Update Available!</h3>
                        </div>
                        <p className="text-sm text-blue-100 mb-3">
                            A new version of Finance App is ready. Update now for the latest features and improvements.
                        </p>
                        <div className="flex space-x-2">
                            <button
                                onClick={onUpdate}
                                className="flex-1 bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                            >
                                Update Now
                            </button>
                            <button
                                onClick={onDismiss}
                                className="px-4 py-2 bg-blue-800/50 hover:bg-blue-800 rounded-lg transition-colors"
                            >
                                Later
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="ml-2 p-1 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
