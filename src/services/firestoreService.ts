import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  updateDoc, 
  deleteDoc, 
  Timestamp,
  runTransaction,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export async function logAppError(errInfo: any) {
  try {
    const logsRef = collection(db, 'error_logs');
    await addDoc(logsRef, {
      ...errInfo,
      createdAt: serverTimestamp(),
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to log error to firestore', e);
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName || null,
        email: provider.email || null,
        photoUrl: provider.photoURL || null
      })) || []
    },
    operationType,
    path
  };
  console.error(`[FIRESTORE ERROR] ${operationType.toUpperCase()} on ${path || 'unknown path'}`);
  console.error('Detailed Error Info:', JSON.stringify(errInfo, null, 2));
  
  // Fire-and-forget log
  logAppError({ ...errInfo, category: 'Firestore' });
  
  // Do not throw for LIST operations (snapshot listeners) to avoid crashing the app
  if (operationType !== OperationType.LIST) {
    throw new Error(JSON.stringify(errInfo));
  }
}

export const firestoreService = {
  // Generic Listeners
  listenToCollection(collectionName: string, callback: (data: any[]) => void, onError?: (error: any) => void) {
    const ref = collection(db, collectionName);
    return onSnapshot(ref, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      callback(items);
    }, (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, collectionName);
    });
  },

  // Generic CRUD
  async getCollection(collectionName: string) {
    try {
      const ref = collection(db, collectionName);
      const snapshot = await getDocs(ref);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionName);
      return [];
    }
  },

  async getItem(collectionName: string, id: string) {
    try {
      const ref = doc(db, collectionName, id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${collectionName}/${id}`);
      return null;
    }
  },

  async setItem(collectionName: string, id: string, data: any) {
    try {
      const { id: _, ...cleanData } = data;
      await setDoc(doc(db, collectionName, id), {
        ...cleanData,
        updatedAt: serverTimestamp(),
        createdAt: data.createdAt || serverTimestamp(),
      });
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${id}`);
    }
  },

  async addItem(collectionName: string, data: any) {
    try {
      const ref = collection(db, collectionName);
      // Remove id if it exists to avoid overwriting doc.id in listeners
      const { id: _, ...cleanData } = data;
      const docRef = await addDoc(ref, {
        ...cleanData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, collectionName);
    }
  },

  async updateItem(collectionName: string, id: string, data: any) {
    try {
      const ref = doc(db, collectionName, id);
      const { id: _, ...updateData } = data;
      await updateDoc(ref, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
    }
  },

  async updatePaymentHistoryAtomic(enrollmentId: string, paymentId: string, status: string, additionalData: any = {}) {
    try {
      const sfDocRef = doc(db, 'enrollments', enrollmentId);

      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(sfDocRef);
        if (!sfDoc.exists()) {
          throw new Error("Enrollment does not exist!");
        }

        const data = sfDoc.data();
        const history = data.paymentHistory || [];
        const updatedHistory = history.map((ph: any) => 
          ph.id === paymentId ? { ...ph, status, ...additionalData, updatedAt: new Date().toISOString() } : ph
        );

        // Update feeStatus based on history
        const hasAnyVerified = updatedHistory.some((ph: any) => ph.status === 'verified' || ph.status === 'completed');
        const hasAnyPending = updatedHistory.some((ph: any) => ph.status === 'pending');
        const newFeeStatus = hasAnyPending ? 'Pending' : (hasAnyVerified ? 'Paid' : 'Unpaid');

        transaction.update(sfDocRef, { 
          paymentHistory: updatedHistory,
          feeStatus: newFeeStatus,
          updatedAt: serverTimestamp()
        });
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `enrollments/${enrollmentId}/paymentHistory/${paymentId}`);
       throw error;
    }
  },

  async submitPaymentAtomic(enrollmentId: string, newPayment: any) {
    try {
      const ref = doc(db, 'enrollments', enrollmentId);
      
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);
        if (snap.exists()) {
          const data = snap.data();
          const history = data.paymentHistory || [];
          const selectedMonths = newPayment.months || [];
          
          // Filter out older pending entries that match the current selected months
          const updatedHistoryBase = history.filter((ph: any) => {
            if (ph.status !== 'pending') return true; 
            const phMonths = ph.months || [];
            const hasOverlap = selectedMonths.some((m: string) => phMonths.includes(m));
            return !hasOverlap;
          });

          // Check if exactly this payment ID already exists (unlikely given Date.now() but good for safety)
          if (history.some((p: any) => p.id === newPayment.id)) {
            return;
          }
          
          transaction.update(ref, {
            paymentHistory: [...updatedHistoryBase, newPayment],
            lastPaymentAttempt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `enrollments/${enrollmentId}/submitPaymentAtomic`);
      throw error;
    }
  },
  async reorderItems(collectionName: string, reorderedItems: any[]) {
    try {
      await runTransaction(db, async (transaction) => {
        reorderedItems.forEach((item, index) => {
          const ref = doc(db, collectionName, item.id);
          transaction.update(ref, { order: index, updatedAt: serverTimestamp() });
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/bulkReorder`);
    }
  },

  async deleteItem(collectionName: string, id: string) {
    try {
      const ref = doc(db, collectionName, id);
      await deleteDoc(ref);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  },

  async bulkAdd(collectionName: string, items: any[]) {
    const results = { success: 0, failed: 0 };
    for (const item of items) {
      try {
        await this.addItem(collectionName, item);
        results.success++;
      } catch (error) {
        console.error(`Failed to import item:`, item, error);
        results.failed++;
      }
    }
    return results;
  },

  async testConnection() {
    try {
      await getDocFromServer(doc(db, '_health', 'check'));
      return true;
    } catch (error: any) {
      if (error.message?.includes('offline') || error.code === 'unavailable') {
        // Silently fail on offline since it might just be connecting
      } else {
        console.error('Firestore Connection Test Failed:', error);
      }
      return false;
    }
  },

  // Specific for Enrollments
  async findEnrollment(email?: string, whatsapp?: string, grade?: string) {
    try {
      const ref = collection(db, 'enrollments');
      let results: any[] = [];
      
      // Try email first (single field query)
      if (email) {
        const q = query(ref, where('email', '==', email));
        const snap = await getDocs(q);
        results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      // Filter by grade if provided
      if (results.length > 0 && grade) {
        const filteredByGrade = results.find(doc => doc.grade === grade);
        if (filteredByGrade) return filteredByGrade;
        // If not found with grade, returns first match for user later or tries whatsapp
      } else if (results.length > 0) {
        return results[0];
      }
      
      // Try whatsapp (single field query)
      if (whatsapp) {
        const q = query(ref, where('whatsapp', '==', whatsapp));
        const snap = await getDocs(q);
        const waResults: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (grade) {
          const matched = waResults.find(doc => doc.grade === grade);
          if (matched) return matched;
        }
        
        if (waResults.length > 0) return waResults[0];
      }
      
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'enrollments');
      return null;
    }
  },

  listenToUserEnrollment(email: string, callback: (enrollment: any) => void, onError?: (error: any) => void) {
    const ref = collection(db, 'enrollments');
    
    // If it's a phone-based pseudo email from Firebase Auth (e.g. 1234567890@phone.auth)
    const phoneMatch = email.match(/^(\d+)@/);
    if (phoneMatch) {
      const phone = phoneMatch[1];
      const q = query(ref, where('whatsapp', '==', phone));
      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          callback({ id: doc.id, ...doc.data() });
        } else {
          // Fallback to email just in case
          const q2 = query(ref, where('email', '==', email));
          getDocs(q2).then(snap => {
            if (!snap.empty) callback({ id: snap.docs[0].id, ...snap.docs[0].data() });
            else callback(null);
          }).catch(err => {
            if (onError) onError(err);
            handleFirestoreError(err, OperationType.LIST, 'enrollments');
          });
        }
      }, (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, 'enrollments');
      });
    }

    const q = query(ref, where('email', '==', email));
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        callback({ id: doc.id, ...doc.data() });
      } else {
        callback(null);
      }
    }, (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'enrollments');
    });
  },

  async submitPayment(enrollmentId: string, paymentRecord: any) {
    try {
      const ref = doc(db, 'enrollments', enrollmentId);
      
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);
        if (snap.exists()) {
          const data = snap.data();
          const paymentHistory = data.paymentHistory || [];
          // Check if this payment ID already exists to prevent duplicates
          if (paymentHistory.some((p: any) => p.id === paymentRecord.id)) {
            return;
          }
          
          transaction.update(ref, {
            paymentHistory: [...paymentHistory, paymentRecord],
            updatedAt: serverTimestamp()
          });
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `enrollments/${enrollmentId}/submitPayment`);
    }
  },

  async seedData(data: any, overwrite = false) {
    const collections = ['batches', 'routines', 'downloads', 'fees', 'enrollments', 'channels_config', 'teasers', 'drops', 'stars', 'radars'];
    const results: Record<string, number> = {};
    
    // Mapping for common aliases in local_db.json
    const aliases: Record<string, string> = {
      'students': 'enrollments',
      'chatSettings': 'channels_config',
      'questions': 'teasers',
      'announcements': 'drops'
    };

    for (const colName of collections) {
      try {
        // Try to find data by primary name or alias
        let sourceData = data[colName];
        if (!sourceData) {
          const aliasKey = Object.keys(aliases).find(key => aliases[key] === colName);
          if (aliasKey) sourceData = data[aliasKey];
        }
        
        // Special mapping for chatSettings to channels_config
        if (colName === 'channels_config' && !sourceData && data.chatSettings) {
          sourceData = data.chatSettings.map((s: any) => ({
            id: s.roomId || 'general',
            name: s.name || 'General',
            iconName: 'MessageSquare',
            description: s.description || '',
            order: 0,
            permissions: {
              roles: { everyone: { view: true, send: true, delete: false } },
              users: {}
            }
          }));
        }

        if (sourceData && Array.isArray(sourceData)) {
          const colRef = collection(db, colName);
          const snapshot = await getDocs(colRef);
          
          if (snapshot.empty || overwrite) {
            console.log(`Seeding ${colName}...`);
            let count = 0;
            for (const item of sourceData) {
              const { id, ...itemData } = item;
              // Use provided ID, or subject-based ID, or auto-generate
              const docId = id || (itemData.subject ? itemData.subject.toLowerCase().replace(/\s+/g, '_') : undefined);
              
              if (docId) {
                await setDoc(doc(db, colName, String(docId)), {
                  ...itemData,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                }, { merge: true });
              } else {
                await addDoc(colRef, {
                  ...itemData,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                });
              }
              count++;
            }
            results[colName] = count;
          } else {
            console.log(`Skipping ${colName} as it already has data.`);
            results[colName] = 0;
          }
        }
      } catch (error) {
        console.error(`Error seeding ${colName}:`, error);
      }
    }

    // Handle chat migration if messages exist in backup
    if (data.chatMessages && Array.isArray(data.chatMessages)) {
      console.log('Migrating chat messages from backup...');
      const chatCount = await this.migrateChat(data.chatMessages);
      results['chatMessages'] = chatCount;
    }

    return results;
  },

  async migrateChat(messages: any[]) {
    let count = 0;
    for (const msg of messages) {
      try {
        const channelId = msg.channelId || 'general';
        await addDoc(collection(db, 'channels', channelId, 'messages'), {
          content: msg.text || msg.content || '',
          senderId: msg.senderId || 'legacy-system',
          senderName: msg.user?.name || msg.senderName || 'Unknown',
          senderPhoto: msg.user?.photoUrl || msg.senderPhoto || '',
          senderRole: msg.user?.role || msg.senderRole || 'student',
          channelId: channelId,
          type: msg.type || 'text',
          isEdited: msg.isEdited || false,
          isDeleted: msg.isDeleted || false,
          createdAt: msg.timestamp ? Timestamp.fromMillis(new Date(msg.timestamp).getTime()) : serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        count++;
      } catch (err) {
        console.error('Failed to migrate message:', err);
      }
    }
    return count;
  },

  async backupData() {
    const collections = [
      'batches', 'routines', 'downloads', 'fees', 'radars', 
      'teasers', 'drops', 'stars', 'enrollments', 'channels_config'
    ];
    const backup: any = {};

    for (const colName of collections) {
      try {
        const snap = await getDocs(collection(db, colName));
        backup[colName] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error(`Error backing up ${colName}:`, error);
      }
    }

    // Special case for branding
    try {
      const brandingSnap = await getDoc(doc(db, 'admin', 'branding'));
      if (brandingSnap.exists()) {
        backup.branding = brandingSnap.data();
      }
    } catch (error) {
      console.error('Error backing up branding:', error);
    }

    return backup;
  }
};
