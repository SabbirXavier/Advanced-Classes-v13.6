import { useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';

export const useAnalytics = (pageName: string) => {
  useEffect(() => {
    // Log page view on mount
    analyticsService.logEvent({
      event: 'page_view',
      page: pageName
    });

    // Log visit if it's the first mount of the session (simplified)
    const hasLoggedVisit = sessionStorage.getItem('logged_visit');
    if (!hasLoggedVisit) {
      analyticsService.logEvent({
        event: 'visit',
        page: pageName
      });
      sessionStorage.setItem('logged_visit', 'true');
    }
  }, [pageName]);

  const trackClick = (section: string, itemId?: string) => {
    analyticsService.logEvent({
      event: 'click',
      page: pageName,
      section,
      itemId
    });
  };

  return { trackClick };
};
