'use client';

import { useEffect } from 'react';

export function usePageTitle(title: string): void {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Store the original title
      const originalTitle = document.title;
      
      // Set the new title
      document.title = title;
      
      // Cleanup function to restore original title
      return () => {
        document.title = originalTitle;
      };
    }
  }, [title]);
}

export default usePageTitle;

