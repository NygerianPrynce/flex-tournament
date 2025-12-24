import { useEffect, useState } from 'react';

export function DesktopOnly({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const width = window.innerWidth;
      
      // Check if it's an iPad (modern iPads report as MacIntel with touch)
      const isIPad = /iPad/.test(userAgent) || 
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      // Check if it's a mobile phone (but not iPad)
      const isMobilePhone = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase()) &&
                           !isIPad;
      
      // Check screen width (desktops typically have width >= 1024px)
      // Allow iPad even if width is smaller (iPad mini, etc.)
      const isLargeScreen = width >= 1024;
      
      // Desktop/iPad if: iPad OR (not mobile phone AND large screen)
      setIsDesktop(isIPad || (!isMobilePhone && isLargeScreen));
    };

    // Check on mount
    checkDevice();

    // Listen for resize events
    window.addEventListener('resize', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);

  if (!isDesktop) {
    return (
      <div className="min-h-screen bg-light-off-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-6">💻</div>
          <h1 className="text-2xl font-heading uppercase tracking-wide-heading text-accent-orange mb-4" style={{ fontStyle: 'oblique' }}>
            Please Use a Desktop or iPad
          </h1>
          <p className="text-dark-charcoal text-lg mb-4">
            Tournament management requires a larger screen. Please use a desktop computer or iPad to sign in or sign up.
          </p>
          <p className="text-sm text-gray-500">
            Mobile devices can view tournaments using the share code on the landing page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

