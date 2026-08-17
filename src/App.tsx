import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Layers, Calendar, Download, UserPlus, MessageSquare, Settings, Menu, Sun, Moon, Wallet, ArrowUp, Library, Edit2, BookOpen, Shield, Users, Phone, MessageCircle, Instagram, Facebook, Youtube, Twitter, Send, Link as LinkIcon } from 'lucide-react';
import TabHome from './components/TabHome';
import TabAbout from './components/TabAbout';
import Footer from './components/Footer';
import TabBatches from './components/TabBatches';
import TabRoutine from './components/TabRoutine';
import TabDownloads from './components/TabDownloads';
import TabJoin from './components/TabJoin';
import TabAdmin from './components/TabAdmin';
import TabStudyHub from './components/TabStudyHub';
import TabSettings from './components/TabSettings';
import TabTest from './components/TabTest';
import TabFee from './components/TabFee';
import TabResourceVault from './components/TabResourceVault';
import TabWhiteboard from './components/TabWhiteboard';
import TabMyBatch from './components/TabMyBatch';
import EnrollmentModal from './components/EnrollmentModal';
import LandingPage from './components/LandingPage';
import ErrorLogPage from './components/ErrorLogPage';
import SupportChatView from './components/SupportChatView';
import FloatingWhatsApp, { WhatsAppIcon } from './components/FloatingWhatsApp';
import FacultyPortfolioPage from './components/FacultyPortfolioPage';
import { PublicDigitalNoteViewer, PublicDigitalNotesLibrary } from './components/PublicDigitalNotes';
import { brandingService, BrandingConfig } from './services/brandingService';
import { authService } from './services/authService';
import { presenceService } from './services/presenceService';
import { channelService } from './services/channelService';
import { firestoreService } from './services/firestoreService';
import { collection, query, where, getDocs, limit, doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { handleFirestoreError } from './services/firestoreService';
import { analyticsService } from './services/analyticsService';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

import DecorationBackground from './components/DecorationBackground';
import { TabDownloadApp, TabSupport, TabFAQs, TabContactUs, TabPrivacyPolicy } from './components/FooterPages';

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/digital-notes')) return 'digital_notes';
    return 'home';
  });
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [branding, setBranding] = useState<BrandingConfig>({
    title: 'Advanced Classes',
    logo: '',
    updatedAt: null
  });
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [userEnrollment, setUserEnrollment] = useState<any>(null);
  const [facultyBatches, setFacultyBatches] = useState<any[]>([]);
  const [adminSection, setAdminSection] = useState('batches');

  // Log analytics on tab change
  useEffect(() => {
    analyticsService.logEvent({
      event: 'page_view',
      page: activeTab
    });
  }, [activeTab]);

  const handleManage = (section: string) => {
    setAdminSection(section);
    setActiveTab('admin');
  };
  const [hasNewMyBatch, setHasNewMyBatch] = useState(false);
  const [socialLinks, setSocialLinks] = useState<any[]>([]);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isLandingPage, setIsLandingPage] = useState(window.location.pathname === '/landing');
  
  const getInitialFacultySlug = () => {
    const path = window.location.pathname;
    if (path !== '/' && path !== '/landing' && !path.startsWith('/api') && !path.startsWith('/digital-notes') && path.length > 1) {
       return path.substring(1);
    }
    return null;
  };
  const [facultySlug, setFacultySlug] = useState<string | null>(getInitialFacultySlug());
  const [digitalNotesPath, setDigitalNotesPath] = useState(window.location.pathname.startsWith('/digital-notes') ? window.location.pathname : null);

  // Root Admin Check Helper
  const isRootAdmin = (email?: string | null) => {
    if (!email) return false;
    const e = email.toLowerCase();
    const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || 'xavierscot3454@gmail.com').toLowerCase();
    const adminEmail1 = (import.meta.env.VITE_ADMIN_EMAIL_1 || '').toLowerCase();
    const adminEmail2 = (import.meta.env.VITE_ADMIN_EMAIL_2 || '').toLowerCase();
    const adminEmail3 = (import.meta.env.VITE_ADMIN_EMAIL_3 || 'dcpromoidse@gmail.com').toLowerCase();
    return e === adminEmail || e === adminEmail1 || e === adminEmail2 || e === adminEmail3;
  };

  const isSystemAdmin = userData?.role === 'admin' || isRootAdmin(user?.email);
  const isSystemFaculty = userData?.role === 'faculty' || (facultyBatches && facultyBatches.length > 0);

  useEffect(() => {
    // Sync landing page state on mount and popstate
    const checkPath = () => {
      setIsLandingPage(window.location.pathname === '/landing');
      setFacultySlug(getInitialFacultySlug());
      setDigitalNotesPath(window.location.pathname.startsWith('/digital-notes') ? window.location.pathname : null);
    };
    window.addEventListener('popstate', checkPath);
    return () => window.removeEventListener('popstate', checkPath);
  }, []);

  useEffect(() => {
    // Setting up global scroll reveal Observer
    const scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-active');
        }
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -30px 0px" });

    // Mutation observer to dynamically attach scroll reveal to major elements representing "divs and sections"
    const applyScrollReveal = () => {
      // Safely target divs that look like cards/sections, actual sections, articles, or major content blocks. 
      // Avoid targeting tiny UI elements, inline buttons, or fixed headers.
      const elements = document.querySelectorAll(`
        section:not(.reveal-base), 
        .glass-card:not(.reveal-base), 
        article:not(.reveal-base), 
        .grid > div:not(.reveal-base),
        [class*="section"]:not(.reveal-base)
      `);
      elements.forEach(el => {
        // Skip elements that shouldn't bounce in like nav bars or footers
        if (el.tagName.toLowerCase() === 'nav' || el.closest('nav') || el.closest('.fixed') || el.closest('footer') || el.tagName.toLowerCase() === 'footer') return;
        el.classList.add('reveal-base');
        scrollObserver.observe(el);
      });
    };

    applyScrollReveal();
    const mutationObserver = new MutationObserver(() => applyScrollReveal());
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      scrollObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    // Theme initialization
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      setIsDarkMode(true);
    }

    // Test Firestore connection
    firestoreService.testConnection();

    // Branding listener
    const unsubscribeBranding = brandingService.listenToBranding((config) => {
      setBranding(config);
      
      const appTitle = config.title || 'Advanced Classes';
      document.title = appTitle;
      
      const setMetaTag = (name: string, content: string, property: boolean = false) => {
        const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
        let meta = document.querySelector(selector) as HTMLMetaElement;
        if (!meta) {
          meta = document.createElement('meta');
          if (property) meta.setAttribute('property', name);
          else meta.setAttribute('name', name);
          document.head.appendChild(meta);
        }
        meta.content = content || '';
      };

      setMetaTag('description', config.description || 'Premium offline and online tuition classes.');
      setMetaTag('application-name', appTitle);
      
      setMetaTag('og:title', appTitle, true);
      setMetaTag('og:description', config.description || 'Premium offline and online tuition classes.', true);

      // Update favicon and og:image
      if (config.logo) {
        setMetaTag('og:image', config.logo, true);
        const updateIcon = (rel: string) => {
          let link = document.querySelector(`link[rel='${rel}']`) as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = rel;
            document.head.appendChild(link);
          }
          link.href = config.logo;
        };
        updateIcon('icon');
        updateIcon('apple-touch-icon');
        updateIcon('shortcut icon');
      }

      // Inject Meta Pixel
      if (config.metaPixelCode) {
        const existingScript = document.getElementById('meta-pixel-script');
        if (existingScript) existingScript.remove();
        
        // Extract script content or just inject as is if it's a full block
        // For safety, we'll create a container and inject
        const container = document.createElement('div');
        container.id = 'meta-pixel-script';
        container.innerHTML = config.metaPixelCode;
        
        // Move scripts to head
        const scripts = container.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          document.head.appendChild(newScript);
          oldScript.remove();
        });
        
        // Add noscript to body if present
        const noscripts = container.querySelectorAll('noscript');
        noscripts.forEach(ns => document.body.appendChild(ns));
      }
    });

    // Scroll listener for Scroll to Top button
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      // Prevent small scrollable areas (like horizontal scrollbars) from triggering this
      if (target && typeof target.scrollTop === 'number' && target.clientHeight > 300) {
        if (target.scrollTop > 400) {
          setShowScrollTop(true);
        } else if (target.scrollTop <= 10) {
          setShowScrollTop(false);
        }
      }
    };
    window.addEventListener('scroll', handleScroll, true);

    // Auth listener
    const unsubscribeAuth = authService.onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        presenceService.setupPresence(firebaseUser.uid);
        // Ensure profile exists immediately for new users
        authService.ensureUserProfile(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName, firebaseUser.photoURL)
          .then(() => authService.getUserProfile(firebaseUser.uid, firebaseUser.email))
          .then(setUserData);
        
        if (firebaseUser.email) {
          const userEmail = firebaseUser.email!;
          const emailLower = userEmail.toLowerCase();
          const emailsToCheck = Array.from(new Set([userEmail, emailLower]));
          
          let unsubLedgers: any = null;
          
          const q = query(collection(db, 'enrollments'), where('email', 'in', emailsToCheck), limit(1));
          const unsubEnrollment = onSnapshot(q, async (snap) => {
            if (!snap.empty) {
              const docSnap = snap.docs[0];
              const data = docSnap.data();
              const studentId = docSnap.id;
              
              if (data.batchAccess === 'active') {
                setIsVerified(true);
                setUserEnrollment({ id: studentId, ...data });
                return;
              } else if (data.batchAccess === 'disabled') {
                setIsVerified(false);
                setUserEnrollment({ id: studentId, ...data, isExpired: true, feeStatus: 'Pending', inactiveReason: 'Batch access disabled' });
                return;
              }

              if (data.status && data.status !== 'Active') {
                setIsVerified(false);
                setUserEnrollment({ id: studentId, ...data, isExpired: true, feeStatus: 'Pending', inactiveReason: data.removalReason || data.status });
                return;
              }
              
              if (data.manualVerificationOverride !== undefined && data.manualVerificationOverride !== null) {
                setIsVerified(!!data.manualVerificationOverride);
                setUserEnrollment({ id: studentId, ...data });
                return;
              }

              const now = new Date();
              const currentMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
              
              const ledgersQuery = query(collection(db, 'student_monthly_fee_ledger'), where('studentId', '==', studentId));
              
              if (unsubLedgers) unsubLedgers();
              
              unsubLedgers = onSnapshot(ledgersQuery, (ledgersSnap) => {
                let hasUnpaidPastMonth = false;
                ledgersSnap.forEach(docSnap => {
                  const ledgerData = docSnap.data();
                  if (ledgerData.month < currentMonthStr && Number(ledgerData.balance) > 0) {
                    hasUnpaidPastMonth = true;
                  }
                });
                
                if (hasUnpaidPastMonth) {
                  const currentMonthNow = new Date();
                  let removalDay = branding?.batchRemovalDay;
                  if (!removalDay || removalDay <= 0) {
                    removalDay = new Date(currentMonthNow.getFullYear(), currentMonthNow.getMonth() + 1, 0).getDate();
                  }
                  const today = currentMonthNow.getDate();
                  if (today >= removalDay) {
                    setIsVerified(false);
                    setUserEnrollment({ id: studentId, ...data, isExpired: true, feeStatus: 'Pending' });
                  } else {
                    setIsVerified(true);
                    setUserEnrollment({ id: studentId, ...data });
                  }
                } else {
                  setIsVerified(true);
                  setUserEnrollment({ id: studentId, ...data });
                }
              }, (error) => {
                handleFirestoreError(error, OperationType.LIST, 'student_monthly_fee_ledger');
              });
              
            } else {
              setIsVerified(false);
              setUserEnrollment(null);
            }
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'enrollments');
          });
          
          return () => {
             unsubEnrollment();
             if (unsubLedgers) unsubLedgers();
          };
        }
      } else {
        setIsVerified(false);
        setUserData(null);
      }
    });

    // Custom navigation listener
    const handleNavigation = (e: CustomEvent) => {
      setActiveTab(e.detail);
      setIsMoreMenuOpen(false);
    };
    window.addEventListener('navigate', handleNavigation as EventListener);

    // Fetch Social Links
    let unsubscribeSocialLinks = () => {};
    unsubscribeSocialLinks = firestoreService.listenToCollection('socialLinks', (data) => {
      setSocialLinks(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
    });

    return () => {
      unsubscribeBranding();
      unsubscribeAuth();
      window.removeEventListener('scroll', handleScroll, true);
      unsubscribeSocialLinks();
      window.removeEventListener('navigate', handleNavigation as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setFacultyBatches([]);
      return;
    }
    let unsub: any = null;
    const initFaculty = async () => {
      const q = query(collection(db, 'batchFaculty'), where('userId', '==', user.uid));
      unsub = onSnapshot(q, (snap) => {
        setFacultyBatches(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'batchFaculty');
      });
    };
    initFaculty();
    return () => unsub?.();
  }, [user]);

  useEffect(() => {
    if (!userEnrollment && !isSystemFaculty) {
      setHasNewMyBatch(false);
      return;
    }
    let unsub: any = null;
    const initDropsWatcher = async () => {
      const key = `last_seen_drop_${user?.uid || 'guest'}`;
      const lastSeen = Number(localStorage.getItem(key) || 0);
      unsub = onSnapshot(collection(db, 'drops'), (snap) => {
        const enrolledSubjects = new Set((userEnrollment?.subjects || []).map((s: string) => s.toLowerCase()));
        const hasNew = snap.docs.some((d) => {
          const data: any = d.data();
          const createdMs = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : 0;
          const isAfterSeen = createdMs > lastSeen;
          if (!isAfterSeen) return false;
          if (isSystemFaculty) return true;
          const dropSubjects = (data.subjects || []).map((s: string) => String(s).toLowerCase());
          return dropSubjects.length === 0 || dropSubjects.some((s: string) => enrolledSubjects.has(s));
        });
        setHasNewMyBatch(hasNew);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'drops');
      });
    };
    initDropsWatcher();
    return () => unsub?.();
  }, [user?.uid, userEnrollment, isSystemFaculty]);

  useEffect(() => {
    if (activeTab === 'exclusive') {
      const key = `last_seen_drop_${user?.uid || 'guest'}`;
      localStorage.setItem(key, String(Date.now()));
      setHasNewMyBatch(false);
    }
  }, [activeTab, user?.uid]);

  useEffect(() => {
    if (isSystemAdmin) {
      channelService.seedDefaultChannels();
    }
  }, [isSystemAdmin]);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const navItemsConfig: Record<string, { icon: React.ReactNode, label: string, isActive: (tab: string) => boolean }> = {
    home: { icon: <Home size={22} />, label: "Home", isActive: (t) => t === 'home' || t === 'about' },
    batches: { icon: <Layers size={22} />, label: "Programs", isActive: (t) => t === 'batches' },
    routine: { icon: <Calendar size={22} />, label: "Routine", isActive: (t) => t === 'routine' },
    test: { icon: <Calendar size={22} />, label: "Tests", isActive: (t) => t === 'test' },
    downloads: { icon: <Download size={22} />, label: "PDFs", isActive: (t) => t === 'downloads' },
    library: { icon: <Library size={22} />, label: "Library", isActive: (t) => t === 'library' },
    whiteboard: { icon: <Edit2 size={22} />, label: "Board", isActive: (t) => t === 'whiteboard' },
    exclusive: { icon: <BookOpen size={22} />, label: hasNewMyBatch ? "My Batch • New" : "My Batch", isActive: (t) => t === 'exclusive' },
    studyhub: { icon: <MessageSquare size={22} />, label: "Chat Room", isActive: (t) => t === 'studyhub' },
    about: { icon: <Users size={22} />, label: "About", isActive: (t) => t === 'about' },
    admin: { icon: <Shield size={22} />, label: "Dashboard", isActive: (t) => t === 'admin' },
    fee: { icon: <Wallet size={22} />, label: "Fees", isActive: (t) => t === 'fee' },
    join: { icon: <UserPlus size={22} />, label: "Join", isActive: (t) => t === 'join' },
    digital_notes: { icon: <Library size={22} />, label: "Digital Notes", isActive: (t) => t === 'digital_notes' },
    settings: { icon: <Settings size={22} />, label: "Settings", isActive: (t) => t === 'settings' }
  };

  const isUserAdmin = isSystemAdmin;

  const defaultNavOrder = ['home', 'about', 'exclusive', 'batches', 'routine', 'downloads', 'digital_notes', 'join', 'test', 'fee', 'studyhub', 'admin', 'settings'];
  const hasExclusivePermission = isVerified || isUserAdmin || isSystemFaculty || !!user;

  // Map branding nav order names to internal names
  // User might type "mybatch" for "exclusive"
  const navMap: Record<string, string> = {
    'home': 'home',
    'about': 'about',
    'batches': 'batches',
    'routine': 'routine',
    'downloads': 'downloads',
    'join': 'join',
    'test': 'test',
    'fee': 'fee',
    'studyhub': 'studyhub',
    'admin': 'admin',
    'settings': 'settings',
    'mybatch': 'exclusive',
    'mybatches': 'exclusive',
    'exclusive': 'exclusive'
  };

  const brandingOrder = branding.navOrder || defaultNavOrder;
  const mappedOrder = brandingOrder.map(k => navMap[k.toLowerCase()] || k).filter(Boolean);
  
  // Build the effective navigation order
  let effectiveOrder = Array.from(new Set([...mappedOrder, ...defaultNavOrder]));
  
  // If "exclusive" is allowed but missing from the pool, inject it
  if (hasExclusivePermission && !effectiveOrder.includes('exclusive')) {
    const batchesIdx = effectiveOrder.indexOf('batches');
    const homeIdx = effectiveOrder.indexOf('home');
    const insertPos = batchesIdx !== -1 ? batchesIdx : (homeIdx !== -1 ? homeIdx + 1 : 0);
    effectiveOrder.splice(insertPos, 0, 'exclusive');
  }

  const currentNavOrder = effectiveOrder.filter(id => {
    if (id === 'exclusive') return hasExclusivePermission;
    if (id === 'admin') return isUserAdmin;
    if (id === 'digital_notes' && !branding.enableDigitalNotesNavbar) return false;
    // Filter out if not in config
    return !!navItemsConfig[id];
  });
  const mobileVisibleTabs = currentNavOrder.slice(0, 4);
  const mobileMoreTabs = currentNavOrder.slice(4);

  const renderTab = () => {
    switch (activeTab) {
      case 'home': return <TabHome onNavigate={setActiveTab} branding={branding} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} socialLinks={socialLinks} isAdmin={isSystemAdmin} onManage={handleManage} isVerified={isVerified} user={user} />;
      case 'about': return <TabAbout onNavigate={setActiveTab} />;
      case 'batches': return <TabBatches isVerified={isVerified} branding={branding} isAdmin={isSystemAdmin} onManage={handleManage} />;
      case 'routine': return <TabRoutine />;
      case 'downloads': return <TabDownloads isAdmin={isSystemAdmin} />;
      case 'library': return <TabResourceVault />;
      case 'whiteboard': return <TabWhiteboard />;
      case 'join': return <TabJoin />;
      case 'test': return <TabTest />;
      case 'exclusive': return <TabMyBatch userEnrollment={userEnrollment} user={user} facultyBatches={facultyBatches} isVerified={isVerified} />;
      case 'fee': return <TabFee branding={branding} />;
      case 'studyhub': return <TabStudyHub branding={branding} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />;
      case 'admin': return <TabAdmin branding={branding} initialSection={adminSection} />;
      case 'settings': return <TabSettings onNavigate={setActiveTab} userEnrollment={userEnrollment} branding={branding} />;
      case 'support_chat': return <SupportChatView user={user} userData={userData} onBack={() => setActiveTab('settings')} />;
      case 'error_log': return <ErrorLogPage user={user} isAdmin={isUserAdmin} />;
      case 'downloadapp': return <TabDownloadApp />;
      case 'support': return <TabSupport branding={branding} user={user} onNavigate={setActiveTab} />;
      case 'faqs': return <TabFAQs />;
      case 'contactus': return <TabContactUs branding={branding} />;
      case 'privacy': return <TabPrivacyPolicy />;
      case 'digital_notes': {
        const pathToParse = digitalNotesPath || '/digital-notes';
        const parts = pathToParse.split('/').filter(Boolean);
        return (
          <div className="w-full relative min-h-full">
            {parts.length === 1 || parts.length === 0 ? (
              <PublicDigitalNotesLibrary branding={branding} onNavigate={(url) => { window.history.pushState({}, '', url); setDigitalNotesPath(url); setActiveTab('digital_notes'); }} />
            ) : parts.length >= 5 ? (
              <PublicDigitalNoteViewer 
                branding={branding}
                classId={parts[1]} 
                subjectId={parts[2]} 
                chapterId={parts[3]} 
                slug={parts[4]} 
              />
            ) : (
              <div className="text-center py-24">Invalid Note URL</div>
            )}
          </div>
        );
      }
      default: return <TabHome onNavigate={setActiveTab} branding={branding} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} socialLinks={socialLinks} />;
    }
  };

  if (facultySlug) {
    return <FacultyPortfolioPage slug={facultySlug} />;
  }

  if (isLandingPage) {
    return (
      <div className="flex-1 w-full max-h-full overflow-y-auto">
        <LandingPage />
        <div className="mt-20">
          <Footer branding={branding} socialLinks={socialLinks} setActiveTab={setActiveTab} isVerified={isVerified} user={user} />
        </div>
        <EnrollmentModal branding={branding} />
      </div>
    );
  }

  const getSocialIcon = (iconName: string) => {
    const lower = iconName.toLowerCase();
    if (lower.includes('group') || lower === 'users') return <Users size={14} />;
    switch (lower) {
      case 'whatsapp': return <WhatsAppIcon size={14} />;
      case 'instagram': return <Instagram size={14} />;
      case 'facebook': return <Facebook size={14} />;
      case 'youtube': return <Youtube size={14} />;
      case 'twitter': return <Twitter size={14} />;
      case 'telegram': return <Send size={14} />;
      default: return <LinkIcon size={14} />;
    }
  };

  return (
    <div className="w-full h-[100dvh] flex flex-col overflow-hidden relative">
      <DecorationBackground />

      {/* Announcement Bar */}
      {activeTab === 'home' && (
        <div className="bg-indigo-600 dark:bg-indigo-900 text-white font-semibold py-1.5 px-4 shadow-md z-50 flex items-center justify-between gap-4 shrink-0 overflow-hidden text-xs">
          <div className="flex-1 w-full overflow-hidden relative h-5 flex items-center">
            <div className="animate-marquee whitespace-nowrap absolute w-full text-indigo-100 flex items-center gap-8">
              <span>🚨 Special Deals & Discounts currently running! Check Program Fee Page</span>
              <span>✨ Refer a friend and get 10% off your next fee!</span>
            </div>
          </div>
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-4 shrink-0 border-l border-indigo-400 pl-4">
              {socialLinks.map(link => (
                <a key={link.id} href={link.url} target="_blank" rel="noreferrer" title={link.title} className="flex items-center gap-1.5 hover:text-indigo-200 transition-colors hover:scale-110">
                  {getSocialIcon(link.icon)}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <main id="main-scroll-container" className={`flex-1 w-full max-h-full flex flex-col ${activeTab === 'studyhub' || activeTab === 'home' || activeTab === 'admin' ? 'overflow-hidden pt-[env(safe-area-inset-top)]' : 'overflow-y-auto px-3 pb-3 pt-[calc(0.5rem+env(safe-area-inset-top))] md:px-6 md:pt-[calc(1rem+env(safe-area-inset-top))] w-full mx-auto'}`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.8 }}
            className={`w-full will-change-transform ${activeTab === 'studyhub' || activeTab === 'home' || activeTab === 'admin' ? 'flex-1 flex flex-col h-full max-h-full overflow-hidden' : 'h-full'}`}
          >
            {renderTab()}
            {activeTab !== 'home' && activeTab !== 'studyhub' && activeTab !== 'admin' && (
              <div className="mt-12 -mx-3 md:-mx-6">
                <Footer branding={branding} socialLinks={socialLinks} setActiveTab={setActiveTab} isVerified={isVerified} user={user} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && activeTab !== 'studyhub' && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => {
              const scrollableElements = document.querySelectorAll('.overflow-y-auto, main');
              scrollableElements.forEach(el => el.scrollTo({ top: 0, behavior: 'smooth' }));
            }}
            className="fixed bottom-24 md:bottom-32 right-4 md:right-8 p-2.5 bg-white/80 dark:bg-black/60 text-indigo-600 dark:text-indigo-400 backdrop-blur-md rounded-full shadow-lg border border-gray-100 dark:border-white/10 z-[900] hover:-translate-y-1 hover:shadow-xl active:scale-95 transition-all"
            title="Scroll to Top"
          >
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      <EnrollmentModal branding={branding} />
      
      {['home', 'batches', 'routine', 'downloads', 'join'].includes(activeTab) && (
        <FloatingWhatsApp branding={branding} />
      )}

      {/* Navigation */}
      <nav className="flex-shrink-0 w-full relative bg-transparent z-[1000] pointer-events-none md:pointer-events-auto">
        <div className="absolute bottom-0 left-0 w-full h-full bg-white/90 dark:bg-[#111214]/90 border-t border-gray-100 dark:border-white/10 backdrop-blur-xl pointer-events-auto"></div>
        {/* More Menu Popup */}
        <AnimatePresence>
          {isMoreMenuOpen && (
            <>
              <div className="fixed inset-0 z-[990] pointer-events-auto" onClick={() => setIsMoreMenuOpen(false)} />
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                className="absolute bottom-[calc(100%+12px)] right-4 md:hidden bg-white/95 dark:bg-[#18191c]/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 dark:border-white/10 p-2 flex flex-col gap-0.5 z-[1000] min-w-[180px] pointer-events-auto"
              >
                {mobileMoreTabs.map(tabKey => {
                  const config = navItemsConfig[tabKey];
                  if (!config) return null;
                  return (
                    <MenuItem 
                      key={tabKey}
                      icon={React.cloneElement(config.icon as React.ReactElement, { size: 18 })} 
                      label={config.label} 
                      isActive={config.isActive(activeTab)} 
                      onClick={() => { 
                        if (tabKey === 'digital_notes') {
                          window.history.pushState({}, '', '/digital-notes');
                          setDigitalNotesPath('/digital-notes');
                          setActiveTab('digital_notes');
                          setIsMoreMenuOpen(false);
                          return;
                        }
                        if (tabKey === 'home') { setActiveTab('home'); setIsMoreMenuOpen(false); return; }
                        setActiveTab(tabKey); 
                        setIsMoreMenuOpen(false); 
                      }} 
                    />
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Desktop View */}
        <div className="hidden md:flex justify-start md:justify-center items-center px-4 py-2 w-full relative z-10 pointer-events-auto overflow-x-auto hide-scrollbar gap-1 sm:gap-4 max-w-full">
          {currentNavOrder.map(tabKey => {
            const config = navItemsConfig[tabKey];
            if (!config) return null;
            return (
              <NavItem 
                key={tabKey}
                icon={config.icon} 
                label={config.label} 
                isActive={config.isActive(activeTab)} 
                onClick={() => {
                  if (tabKey === 'digital_notes') {
                    window.history.pushState({}, '', '/digital-notes');
                    setDigitalNotesPath('/digital-notes');
                    setActiveTab('digital_notes');
                    return;
                  }
                  if (tabKey === 'home') { setActiveTab('home'); return; }
                  setActiveTab(tabKey);
                }} 
              />
            );
          })}
        </div>

        {/* Mobile View (Floating tab style) */}
        <div className="flex md:hidden justify-around items-center px-2 py-1.5 pb-safe w-full relative z-10 pointer-events-auto">
          {mobileVisibleTabs.map(tabKey => {
            const config = navItemsConfig[tabKey];
            if (!config) return null;
            return (
              <NavItem 
                key={tabKey}
                icon={React.cloneElement(config.icon as React.ReactElement, { size: 20 })} 
                label={config.label === 'Chat Room' ? 'Chat' : config.label} 
                isActive={config.isActive(activeTab)} 
                onClick={() => { 
                  if (tabKey === 'digital_notes') {
                    window.history.pushState({}, '', '/digital-notes');
                    setDigitalNotesPath('/digital-notes');
                    setActiveTab('digital_notes');
                    return;
                  }
                  if (tabKey === 'home') { setActiveTab('home'); return; }
                  setActiveTab(tabKey); 
                  setIsMoreMenuOpen(false); 
                }} 
              />
            );
          })}
          <NavItem 
            icon={<Menu size={20} />} 
            label="More" 
            isActive={isMoreMenuOpen || mobileMoreTabs.some(t => navItemsConfig[t]?.isActive(activeTab))} 
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)} 
          />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-1 w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl transition-all ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-gray-200'}`}
    >
      <div className={`transition-transform duration-300 ${isActive ? 'scale-110 -translate-y-0.5' : ''}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold tracking-tight transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
      {isActive && (
        <motion.div layoutId="nav-indicator" className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400" />
      )}
    </button>
  );
}

function MenuItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-bold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}