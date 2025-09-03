import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setInstallPrompt(promptEvent);
      setIsInstallable(true);

      // Show banner after 30 seconds if user hasn't dismissed it
      setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (!dismissed) {
          setShowInstallBanner(true);
        }
      }, 30000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
      setShowInstallBanner(false);
      localStorage.removeItem('pwa-install-dismissed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const result = await installPrompt.userChoice;

      if (result.outcome === 'accepted') {
        setIsInstalled(true);
        setShowInstallBanner(false);
      }

      setInstallPrompt(null);
      setIsInstallable(false);
      return result.outcome === 'accepted';
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    // Auto-show again after 7 days
    setTimeout(() => {
      localStorage.removeItem('pwa-install-dismissed');
    }, 7 * 24 * 60 * 60 * 1000);
  };

  return {
    installApp,
    isInstallable,
    isInstalled,
    showInstallBanner,
    dismissInstallBanner
  };
}
