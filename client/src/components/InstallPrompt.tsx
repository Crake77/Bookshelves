import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const hasPromptedBefore = localStorage.getItem('pwa-install-prompted');

    if (isStandalone || hasPromptedBefore) {
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after a short delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // For iOS Safari, show manual install instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isIOS && isSafari && !isStandalone) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      setDeferredPrompt(null);
    }
    
    localStorage.setItem('pwa-install-prompted', 'true');
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-prompted', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-card border-2 border-primary/20 rounded-2xl p-4 shadow-2xl backdrop-blur-lg">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Download className="w-5 h-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">Install BookShelf.ai</h3>
            
            {isIOS && isSafari ? (
              <p className="text-xs text-muted-foreground mb-3">
                Tap the <strong>Share</strong> button below, then tap <strong>"Add to Home Screen"</strong> to install.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mb-3">
                Install the app for a better experience with offline access and notifications.
              </p>
            )}
            
            <div className="flex gap-2">
              {!isIOS && deferredPrompt && (
                <Button 
                  size="sm" 
                  onClick={handleInstall}
                  className="text-xs"
                  data-testid="button-install"
                >
                  Install
                </Button>
              )}
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDismiss}
                className="text-xs"
                data-testid="button-dismiss"
              >
                Not now
              </Button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 hover-elevate rounded-full"
            data-testid="button-close-prompt"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
