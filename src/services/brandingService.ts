import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from './firestoreService';

export interface Branch {
  id: string;
  name: string;
  address: string;
  locationUrl: string;
}

export interface BrandingConfig {
  title: string;
  description?: string;
  logo: string;
  qrCodeUrl?: string;
  upiId?: string;
  starTitle?: string;
  metaPixelCode?: string;
  googleAnalyticsCode?: string;
  navOrder?: string[];
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  whatsapp?: string;
  entityName?: string;
  invoicePromoText?: string;
  batchRemovalDay?: number;
  advancedPaymentDiscountDay?: number;
  enableDigitalNotesNavbar?: boolean;
  branches?: Branch[];
  updatedAt: any;
}

const DEFAULT_BRANDING: BrandingConfig = {
  title: 'Advanced Classes',
  logo: '', // Default logo URL
  qrCodeUrl: '',
  upiId: 'advancedclasses@boi',
  starTitle: 'STAR OF THE WEEK',
  metaPixelCode: '',
  googleAnalyticsCode: '',
  contactEmail: 'support@advancedclasses.com',
  contactPhone: '+91 6001539070',
  whatsapp: '+91 6001539070',
  entityName: 'Academy Institute',
  invoicePromoText: 'Thank you for choosing us!',
  contactAddress: 'Sonai Town, Silchar, Assam',
  navOrder: ['home', 'exclusive', 'batches', 'routine', 'test', 'downloads', 'studyhub', 'fee', 'join', 'settings'],
  batchRemovalDay: 10,
  advancedPaymentDiscountDay: 5,
  enableDigitalNotesNavbar: false,
  branches: [
    { id: '1', name: 'Main Campus', address: 'Sonai Town, Silchar, Assam', locationUrl: 'https://share.google/VYYWtSsTTSZOciN7r' }
  ],
  updatedAt: null
};

export const brandingService = {
  async getBranding(): Promise<BrandingConfig> {
    const path = 'admin/branding';
    try {
      const brandingRef = doc(db, 'admin', 'branding');
      const brandingSnap = await getDoc(brandingRef);
      
      if (!brandingSnap.exists()) {
        await setDoc(brandingRef, DEFAULT_BRANDING);
        return DEFAULT_BRANDING;
      }
      
      return brandingSnap.data() as BrandingConfig;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return DEFAULT_BRANDING;
    }
  },

  listenToBranding(callback: (config: BrandingConfig) => void, onError?: (error: any) => void) {
    const path = 'admin/branding';
    const brandingRef = doc(db, 'admin', 'branding');
    return onSnapshot(brandingRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as BrandingConfig);
      } else {
        callback(DEFAULT_BRANDING);
      }
    }, (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async updateBranding(config: Partial<BrandingConfig>) {
    const path = 'admin/branding';
    try {
      const brandingRef = doc(db, 'admin', 'branding');
      await setDoc(brandingRef, {
        ...config,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};
