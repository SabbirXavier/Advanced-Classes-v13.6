import { 
  doc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from './firestoreService';

export interface RadarConfig {
  syncIntervalMinutes: number;
  lastSyncAt: any;
  autoSyncEnabled: boolean;
}

const DEFAULT_RADAR_CONFIG: RadarConfig = {
  syncIntervalMinutes: 60, // 1 hour default
  lastSyncAt: null,
  autoSyncEnabled: true
};

export const radarService = {
  listenToConfig(callback: (config: RadarConfig) => void, onError?: (error: any) => void) {
    const configRef = doc(db, 'admin', 'radar');
    return onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as RadarConfig);
      } else {
        callback(DEFAULT_RADAR_CONFIG);
      }
    }, (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, 'admin/radar');
    });
  },

  async updateConfig(config: Partial<RadarConfig>) {
    const configRef = doc(db, 'admin', 'radar');
    try {
      await setDoc(configRef, {
        ...config,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'admin/radar');
    }
  },

  async markSynced() {
    const configRef = doc(db, 'admin', 'radar');
    try {
      await setDoc(configRef, {
        lastSyncAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'admin/radar');
    }
  }
};
