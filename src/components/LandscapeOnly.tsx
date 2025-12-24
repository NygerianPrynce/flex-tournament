import { useEffect, useState } from 'react';

export function LandscapeOnly({ children }: { children: React.ReactNode }) {
  const [isLandscape, setIsLandscape] = useState(() => {
    // Initialize based on current orientation
    if (typeof window !== 'undefined') {
      return window.innerWidth > window.innerHeight;
    }
    return true;
  });

  useEffect(() => {
    const checkOrientation = () => {
      // Check if window width > height (landscape)
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    // Handle orientation change with a small delay to allow the orientation to update
    const handleOrientationChange = () => {
      setTimeout(checkOrientation, 100);
    };

    // Check immediately on mount
    checkOrientation();

    // Listen for resize events (handles orientation changes and window resizing)
    window.addEventListener('resize', checkOrientation);
    
    // Listen for orientation change events (mobile devices)
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  if (!isLandscape) {
    return (
      <div className="min-h-screen bg-light-off-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-6">📱</div>
          <h1 className="text-2xl font-heading uppercase tracking-wide-heading text-accent-orange mb-4" style={{ fontStyle: 'oblique' }}>
            Please Rotate Your Device
          </h1>
          <p className="text-dark-charcoal text-lg">
            This tournament viewer is optimized for landscape mode. Please rotate your phone to view the tournament.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

