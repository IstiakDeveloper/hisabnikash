import React, { ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

export default function GuestLayout({ children }: Props) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {children}
        </div>
    );
}
