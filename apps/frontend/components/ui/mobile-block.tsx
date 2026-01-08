'use client';

/**
 * Mobile Block Component
 * Blocks access on mobile devices
 */

import * as React from 'react';

export function MobileBlockScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* Laptop Icon */}
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <svg 
            className="w-12 h-12 text-gray-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
            />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 mb-3">
          Desktop Required
        </h1>

        <p className="text-gray-600 mb-6">
          For the best interview experience, please join from a laptop or desktop computer with a camera and microphone.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2">
          <p className="text-sm font-medium text-gray-700">Why desktop?</p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Better video quality
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Stable connection
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Professional environment
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Required for proctoring
            </li>
          </ul>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Open this link on your laptop or desktop to continue
        </p>
      </div>
    </div>
  );
}

/**
 * Hook to detect mobile devices
 * Returns null during SSR/initial render to avoid hydration mismatch
 */
export function useIsMobile(): boolean | null {
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = [
        'android',
        'webos',
        'iphone',
        'ipad',
        'ipod',
        'blackberry',
        'windows phone',
        'opera mini',
        'mobile',
      ];
      
      const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
      const isSmallScreen = window.innerWidth < 768;
      
      setIsMobile(isMobileUA || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}
