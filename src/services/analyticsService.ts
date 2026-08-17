import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, Timestamp, where } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface AnalyticsEvent {
  event: 'visit' | 'page_view' | 'click' | 'scroll_stop' | 'video_play' | 'form_open' | 'form_submit' | 'enroll_click';
  page?: string;
  section?: string;
  itemId?: string;
  itemName?: string;
  referrer?: string;
  userAgent?: string;
  screenResolution?: string;
  language?: string;
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
  org?: string;
  network?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  platform?: string;
  connectionType?: string;
  ip?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  urlParams?: Record<string, string>;
  sessionId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  timestamp?: any;
  duration?: number;
}

let currentSessionId = Math.random().toString(36).substring(2, 15);

export const analyticsService = {
  async logEvent(data: Partial<AnalyticsEvent>) {
    try {
      const analyticsRef = collection(db, 'analytics');
      
      // Get basic IP info if not already cached in session
      let ipInfo = {};
      try {
        const cached = sessionStorage.getItem('ip_info');
        if (cached) {
          ipInfo = JSON.parse(cached);
        } else {
          const res = await fetch('https://ipapi.co/json/');
          if (res.ok) {
            const json = await res.json();
            ipInfo = {
              ip: json.ip,
              country: json.country_name,
              city: json.city,
              region: json.region,
              timezone: json.timezone,
              org: json.org,
              network: json.network,
            };
            sessionStorage.setItem('ip_info', JSON.stringify(ipInfo));
          }
        }
      } catch (e) {
        console.warn('IP lookup failed', e);
      }

      // Helper to get connection type safely
      const getConnectionType = (): string | undefined => {
        const nav = navigator as any;
        if (nav.connection) {
          return nav.connection.effectiveType || nav.connection.type;
        }
        return undefined;
      };

      // Capture URL Parameters
      const searchParams = new URLSearchParams(window.location.search);
      const urlParams: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        urlParams[key] = value;
      });

      const fullData = {
        ...data,
        ...ipInfo,
        sessionId: currentSessionId,
        userId: auth.currentUser?.uid || 'anonymous',
        userEmail: auth.currentUser?.email || null,
        userName: auth.currentUser?.displayName || null,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        referrer: document.referrer || 'direct',
        utmSource: searchParams.get('utm_source') || undefined,
        utmMedium: searchParams.get('utm_medium') || undefined,
        utmCampaign: searchParams.get('utm_campaign') || undefined,
        urlParams: Object.keys(urlParams).length > 0 ? urlParams : undefined,
        deviceMemory: (navigator as any).deviceMemory || null,
        hardwareConcurrency: navigator.hardwareConcurrency || null,
        platform: navigator.platform || null,
        connectionType: getConnectionType(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        timestamp: serverTimestamp(),
        clientTime: new Date().toISOString()
      };

      const cleanedData = Object.fromEntries(
        Object.entries(fullData).filter(([_, v]) => v !== undefined)
      );

      await addDoc(analyticsRef, cleanedData);
    } catch (error) {
      console.error('Failed to log analytics event', error);
    }
  },

  async getAnalytics(days?: number, startDate?: Date, endDate?: Date) {
    const analyticsRef = collection(db, 'analytics');
    let q;
    
    if (startDate) {
      const end = endDate || new Date();
      q = query(
        analyticsRef,
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(end)),
        orderBy('timestamp', 'desc')
      );
    } else {
      const start = new Date();
      start.setDate(start.getDate() - (days || 30));
      q = query(
        analyticsRef, 
        where('timestamp', '>=', Timestamp.fromDate(start)),
        orderBy('timestamp', 'desc')
      );
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
  }
};
