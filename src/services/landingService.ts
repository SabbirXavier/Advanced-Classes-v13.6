import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp,
  collection,
  query,
  orderBy,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from './firestoreService';

export interface LandingConfig {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl?: string;
  heroImageUrl2?: string;
  heroImageUrl3?: string;
  aboutImageUrl?: string;
  stats: { label: string; value: string }[];
  features: { title: string; description: string; icon: string; imageUrl?: string }[];
}

export interface Achiever {
  id?: string;
  name: string;
  rank: string;
  percentage: string;
  grade: string;
  batch: string;
  achievementTitle: string;
  photo: string;
  year: string;
  achievement: string;
  order: number;
}

export interface Program {
  id?: string;
  tag: string;
  title: string;
  subtitle: string;
  primaryBtnText: string;
  secondaryBtnText: string;
  imageUrl: string;
  order: number;
}

export interface Review {
  id?: string;
  author: string;
  rating: number;
  time: string;
  text: string;
  order: number;
}

export interface Faculty {
  id?: string;
  name: string;
  degree: string;
  designationLabel?: string;
  memberRole?: string;
  experience: string;
  studentsMentored?: string;
  coursesDelivered?: string;
  successRate?: string;
  achievement: string;
  photo: string;
  subjects: string[];
  order: number;
  portfolioUrl?: string;
}

const DEFAULT_LANDING_CONFIG: LandingConfig = {
  heroTitle: 'Master Your Future Today.',
  heroSubtitle: 'The digital revolution for modern students. Live classes, elite mentoring, and a powerful community to help you crush your goals.',
  heroImageUrl: '',
  heroImageUrl2: '',
  heroImageUrl3: '',
  aboutImageUrl: '',
  stats: [
    { label: "Success Rate", value: "98%" },
    { label: "Proper Revision", value: "100%" },
    { label: "Letter Marks", value: "90%+" },
    { label: "Exam Mentoring", value: "Top Tier" }
  ],
  features: [
    {
      title: "Smart Learning Rooms",
      description: "Equipped with Flat Interactive Boards and modern visual aids for an immersive experience.",
      icon: "Zap",
      imageUrl: ""
    },
    {
      title: "24/7 Doubt Solving",
      description: "Best mentorship with round-the-clock support for all your academic queries.",
      icon: "MessageSquare",
      imageUrl: ""
    },
    {
      title: "Exam Mastery Bundle",
      description: "PYQ bundles, regular tests, and MCQ practice to make you exam-ready.",
      icon: "Brain",
      imageUrl: ""
    }
  ]
};

export const landingService = {
  // Config
  listenToConfig(callback: (config: LandingConfig) => void, onError?: (error: any) => void) {
    const path = 'admin/landing';
    const configRef = doc(db, 'admin', 'landing');
    return onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as LandingConfig);
      } else {
        callback(DEFAULT_LANDING_CONFIG);
      }
    }, (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async updateConfig(config: Partial<LandingConfig>) {
    const path = 'admin/landing';
    try {
      const configRef = doc(db, 'admin', 'landing');
      await setDoc(configRef, {
        ...config,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Achievers
  listenToAchievers(callback: (achievers: Achiever[]) => void, onError?: (error: any) => void) {
    const path = 'achievers';
    const q = query(collection(db, 'achievers'), orderBy('order', 'asc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Achiever)));
    }, (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // Faculty
  listenToFaculty(callback: (faculty: Faculty[]) => void, onError?: (error: any) => void) {
    const path = 'faculty';
    const q = query(collection(db, 'faculty'), orderBy('order', 'asc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Faculty)));
    }, (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // Programs
  listenToPrograms(callback: (programs: Program[]) => void, onError?: (error: any) => void) {
    const path = 'programs';
    const q = query(collection(db, 'programs'), orderBy('order', 'asc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Program)));
    }, (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // Reviews
  listenToReviews(callback: (reviews: Review[]) => void, onError?: (error: any) => void) {
    const path = 'reviews';
    const q = query(collection(db, 'reviews'), orderBy('order', 'asc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
    }, (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    });
  }
};
