import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'motion/react';
import { 
  GraduationCap, MapPin, Phone, Calendar, ArrowRight, Zap, Brain, Target, 
  ExternalLink, Download, Mic, FileText, Instagram, MessageCircle, ChevronLeft, ChevronRight, Moon, Sun, ArrowUpRight, Activity, MonitorPlay, Users, CheckCircle2, Laptop, Shield, Star, Facebook, Youtube, Twitter, Send, Link as LinkIcon, X, Settings
} from 'lucide-react';
import { firestoreService, handleFirestoreError } from '../services/firestoreService';
import { analyticsService } from '../services/analyticsService';
import MarkdownRenderer from './MarkdownRenderer';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
import { landingService, Faculty, Program, Review } from '../services/landingService';

const GOOGLE_REVIEWS = [
  { id: "gr1", author: "Rahul Das", rating: 5, time: "2 weeks ago", text: "Best coaching in Sonai. The smart boards make understanding physics so much easier. Highly recommended for JEE & NEET." },
  { id: "gr2", author: "Sneha L.", rating: 5, time: "1 month ago", text: "Personal attention is real here. The teachers actually know where you are struggling and help you overcome it. Great environment." },
  { id: "gr3", author: "Aman Hussain", rating: 5, time: "3 months ago", text: "Advanced Classes transformed my result. The weekly tests and performance tracking kept me on my toes. The digital attendance system is also very modern." },
  { id: "gr4", author: "Priya Sharma", rating: 5, time: "3 weeks ago", text: "Finally a place that actually focuses on conceptual clarity rather than just rote memorization. The faculty is highly experienced and approachable." },
  { id: "gr5", author: "Rohan K.", rating: 4, time: "2 months ago", text: "Great infrastructure and study material. Solving previous year questions with the teachers built a lot of confidence for my board exams." },
  { id: "gr6", author: "Aditi B.", rating: 5, time: "1 month ago", text: "The structured cycle of concept, practice, test, and analysis is exactly what I needed. No randomness, just pure focused learning." },
  { id: "gr7", author: "Vikram S.", rating: 5, time: "4 months ago", text: "Premium feel without the hefty price tag. They actually deliver on what they promise. Doubt clearing sessions are a life-saver." },
  { id: "gr8", author: "Neha Choudhury", rating: 5, time: "2 weeks ago", text: "Don't have to travel hours in traffic anymore to get top quality education. Highly qualified teachers right here in Sonai." },
  { id: "gr9", author: "Kabir M.", rating: 5, time: "1 month ago", text: "The PYQ trend analysis done by the team helped me focus on the most important topics. Great strategic approach to exam prep." },
  { id: "gr10", author: "Simran Kaur", rating: 5, time: "5 months ago", text: "Excellent track record of results. The periodic assessments give a clear picture of where you stand and what needs improvement." },
  { id: "gr11", author: "Deepak T.", rating: 4, time: "3 weeks ago", text: "Classrooms are very well equipped with the latest technology. It makes visualizing complex chemistry concepts much easier." },
  { id: "gr12", author: "Anjali Roy", rating: 5, time: "2 months ago", text: "The teachers are extremely supportive and act as true mentors. They genuinely care about each student's academic growth." },
  { id: "gr13", author: "Farhan A.", rating: 5, time: "1 week ago", text: "Best mathematics tuition in town. Sabir sir makes algebra and calculus feel like a breeze. Highly recommended!" },
  { id: "gr14", author: "Shruti D.", rating: 5, time: "3 months ago", text: "I used to hate physics until I joined here. The practical examples and simple explanations changed everything." },
  { id: "gr15", author: "Karan Johar", rating: 4, time: "2 weeks ago", text: "Regular mock tests are incredibly helpful. They make sure you are fully prepared for the unexpected." },
  { id: "gr16", author: "Sonia G.", rating: 5, time: "1 month ago", text: "A truly inspiring environment. The faculty not only teaches but also motivates us to aim higher." },
  { id: "gr17", author: "Md. Arif", rating: 5, time: "2 months ago", text: "Their approach to JEE Mains preparation is very systematic. Modules are exactly aligned with the latest syllabus." },
  { id: "gr18", author: "Pallavi B.", rating: 4, time: "4 months ago", text: "Doubt clearing sessions on weekends are great. You never feel left behind." },
  { id: "gr19", author: "Roshan S.", rating: 5, time: "1 week ago", text: "The discipline and dedication of the Master Faculty here is unmatched. Excellent place for class 11 and 12." },
  { id: "gr20", author: "Tania M.", rating: 5, time: "3 weeks ago", text: "The digital board teaching makes a big difference. Complex diagrams in biology are so easy to understand now." }
];

const THE_MASTERS = [
  { id: 1, name: "Physics Expert", role: "Concept Master", photo: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=400&h=500&auto=format&fit=crop" },
  { id: 2, name: "Chemistry Lead", role: "Reaction Specialist", photo: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?q=80&w=400&h=500&auto=format&fit=crop" },
  { id: 3, name: "Math Guru", role: "Analytical Expert", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&h=500&auto=format&fit=crop" },
  { id: 4, name: "Biology Head", role: "Anatomy Specialist", photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&h=500&auto=format&fit=crop" },
];
import EnrollmentSection from './EnrollmentSection';
import CountdownTimer from './CountdownTimer';
import Footer from './Footer';

const ProgressiveImg = ({ src, alt, className }: { src: string; alt: string; className: string }) => {
  const [loaded, setLoaded] = useState(false);
  const isUnsplash = src?.includes('unsplash.com');
  
  // High quality source
  let hqSrc = src;
  if (isUnsplash) {
    if (src.includes('w=')) {
      hqSrc = src.replace(/w=[0-9]+/, 'w=1200').replace(/q=[0-9]+/, 'q=80') + '&auto=format';
    } else {
      hqSrc = `${src}${src.includes('?') ? '&' : '?'}w=1200&q=80&auto=format`;
    }
  }

  // Low quality source for blur up
  let lqSrc = src;
  if (isUnsplash) {
    if (src.includes('w=')) {
      lqSrc = src.replace(/w=[0-9]+/, 'w=50').replace(/q=[0-9]+/, 'q=10') + '&auto=format';
    } else {
      lqSrc = `${src}${src.includes('?') ? '&' : '?'}w=50&q=10&auto=format`;
    }
  }

  return (
    <div className={`overflow-hidden bg-gray-200 dark:bg-[#1a1a1a] ${className.replace(/transition-\S+|duration-\S+|ease-\S+|group-hover:\S+|opacity-\S+|blur-\S+|scale-\S+/g, '').trim()} ${!className.includes('absolute') && !className.includes('fixed') ? 'relative' : ''}`}>
      {/* Blurred thumbnail */}
      {isUnsplash && (
         <img 
           src={lqSrc} 
           alt="" 
           className="absolute inset-0 w-full h-full object-cover filter blur-lg transform scale-110 z-0" 
         />
      )}
      
      {/* High-res image */}
      <img 
        src={hqSrc} 
        alt={alt} 
        loading="lazy" 
        onLoad={() => setLoaded(true)} 
        className={`absolute inset-0 z-10 w-full h-full object-cover ${loaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-md scale-105'} transition-all duration-[1s] ease-out ${className.match(/group-hover:\S+/g)?.join(' ') || ''}`} 
      />
    </div>
  );
};

interface FlashDropCardProps {
  drop: any;
  isAdmin: boolean;
  firestoreService: any;
}

const FlashDropCard = ({ drop, isAdmin, firestoreService }: FlashDropCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInView = useInView(cardRef, { amount: 0.6 });

  const getYouTubeVideoId = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url.split('/').pop()?.split('?')[0];
  };

  useEffect(() => {
    if (drop.type === 'video' && videoRef.current) {
      if (isInView) {
        videoRef.current.play().catch(e => {
          // Fallback to muted if unmuted auto-play is blocked by browser
          if (e.name === 'NotAllowedError') {
            videoRef.current!.muted = true;
            videoRef.current!.play();
          }
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isInView, drop.type]);

  return (
    <motion.div 
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-yellow-500 via-orange-500 to-rose-500 p-6 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group"
    >
       <Zap className="absolute -right-8 -bottom-8 w-48 h-48 text-white/10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
       <div className="relative z-10 flex flex-col gap-4">
          <div>
             <div className="flex items-center justify-between gap-2 mb-3">
               <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 w-fit border border-white/20">
                  <Zap size={12} className="text-yellow-200 fill-yellow-200" /> Flash Drop
               </div>
               {drop.expiresAt && (
                 <div className="text-[10px] font-bold opacity-90 backdrop-blur-md bg-black/20 px-3 py-1 rounded-full border border-white/10">
                   Expires: {new Date(drop.expiresAt).toLocaleDateString()}
                 </div>
               )}
             </div>
             
             {drop.title && <h3 className="text-2xl font-black tracking-tight leading-tight mb-1">{drop.title}</h3>}
             {drop.content && <p className="text-sm opacity-90 leading-relaxed max-w-2xl">{drop.content}</p>}
             
             {drop.type === 'video' && (drop.externalUrl || drop.fileUrl) && (() => {
               const url = drop.externalUrl || drop.fileUrl || '';
               const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
               const isShort = url.includes('shorts/');
               
               return (
                 <div 
                   className="mt-5 rounded-2xl overflow-hidden border border-white/30 shadow-2xl bg-black/40 group/video relative flex justify-center mx-auto" 
                   style={isYouTube ? (isShort ? { width: 'min(100%, 45vh)', aspectRatio: '9/16' } : { width: '100%', aspectRatio: '16/9' }) : { width: '100%' }}
                 >
                   {isYouTube ? (
                     <iframe
                       className="absolute top-0 left-0 w-full h-full pointer-events-auto border-0"
                       src={`https://www.youtube.com/embed/${getYouTubeVideoId(url)}?autoplay=${isInView ? 1 : 0}&rel=0`}
                       title={drop.title || 'Flash Drop Video'}
                       allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                       allowFullScreen
                       scrolling="no"
                     ></iframe>
                   ) : (
                     <video
                       ref={videoRef}
                       controls 
                       playsInline
                       className="w-full h-auto max-h-[70vh] object-contain bg-black rounded-2xl"
                     >
                       <source src={url} />
                       Your browser does not support the video tag.
                     </video>
                   )}
                 </div>
               );
             })()}
             
             {drop.type === 'image' && (drop.fileUrl || drop.externalUrl) && (
               <div className="mt-5 rounded-2xl overflow-hidden border border-white/30 shadow-2xl group/img">
                 <img 
                   src={drop.fileUrl || drop.externalUrl} 
                   alt={drop.title || 'Flash Drop'} 
                   className="w-full h-auto max-h-[500px] object-cover group-hover/img:scale-105 transition-transform duration-700"
                   referrerPolicy="no-referrer"
                 />
               </div>
             )}
          </div>
          
          {(drop.externalUrl || drop.fileUrl) && drop.type !== 'video' && drop.type !== 'image' && (
            <div className="mt-2 text-right">
               <a 
                 href={drop.externalUrl || drop.fileUrl} 
                 target="_blank" 
                 rel="noreferrer" 
                 className="inline-flex px-6 py-3 bg-white text-orange-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-50 hover:scale-105 transition-all shadow-xl active:scale-95"
               >
                 {drop.externalUrl ? 'View Details' : 'Open Attachment'}
               </a>
            </div>
          )}
       </div>
    </motion.div>
  );
};

interface TabHomeProps {
  onNavigate: (tab: string) => void;
  branding?: any;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
  socialLinks?: any[];
  isAdmin?: boolean;
  onManage?: (section: string) => void;
  isVerified?: boolean;
  user?: any;
}

export default function TabHome({ onNavigate, branding, isDarkMode, toggleDarkMode, socialLinks = [], isAdmin, onManage, isVerified, user }: TabHomeProps) {
  const [radars, setRadars] = useState<any[]>([]);
  const [routines, setRoutines] = useState<any[]>([]);
  const [drops, setDrops] = useState<any[]>([]);
  const [landingConfig, setLandingConfig] = useState<any>(null);

  useEffect(() => {
    return landingService.listenToConfig(setLandingConfig, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'landing_config');
    });
  }, []);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const philosophyScrollRef = useRef<HTMLDivElement>(null);
  const mastersScrollRef = useRef<HTMLDivElement>(null);
  const reviewsScrollRef = useRef<HTMLDivElement>(null);
  const [selectedMaster, setSelectedMaster] = useState<any>(null);

  const scrollHorizontal = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (!ref.current) return;
    const scrollAmount = 300;
    ref.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  // currentSlide used to be here
  
  const { scrollYProgress } = useScroll({
    container: containerRef,
  });

  // Global parallax transforms
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-10%"]);

  const getKolkataTime = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const [currentTime, setCurrentTime] = useState(getKolkataTime());

  // Slider Logic
  const [currentSlide, setCurrentSlide] = useState(0);
  const HOME_SLIDES = [
    {
      id: 1,
      tag: "A COMPLETE ACADEMIC SYSTEM",
      title: "Where Results Are Engineered",
      subtitle: "Not Just Coaching. A structured learning ecosystem to take you from basic understanding to exam mastery.",
      primaryBtn: { text: "Enroll Now", action: () => window.dispatchEvent(new CustomEvent('open-enrollment')) },
      secondaryBtn: { text: "Discover Programs", action: () => onNavigate('batches') },
      imageUrl: landingConfig?.homeHeroImageUrl || "/Classroom.png",
    },
    {
      id: 2,
      tag: "CONCEPT MASTERY",
      title: "From Concept to Rank",
      subtitle: "Forget rote learning. Understand, visualize, and experience concepts with smart digital classrooms.",
      primaryBtn: { text: "Explore Batches", action: () => onNavigate('batches') },
      secondaryBtn: { text: "Contact Us", action: () => window.open("tel:6001539070") },
      imageUrl: landingConfig?.homeHeroImageUrl2 || "/ClosedUPDigitalBoard Teaching.png",
    },
    {
      id: 3,
      tag: "PRECISION-BASED EXAM PREP",
      title: "Not Tuition. Transformation.",
      subtitle: "We follow a data-driven preparation model. Prepare exactly for what matters in exams.",
      primaryBtn: { text: "Secure Your Seat", action: () => window.dispatchEvent(new CustomEvent('open-enrollment')) },
      secondaryBtn: { text: "View Results", action: () => onNavigate('batches') },
      imageUrl: landingConfig?.homeHeroImageUrl3 || "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=2070&auto=format&fit=crop",
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % HOME_SLIDES.length), 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (philosophyScrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = philosophyScrollRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          philosophyScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          philosophyScrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
      }
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (mastersScrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = mastersScrollRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          mastersScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          mastersScrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [faculty.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (reviewsScrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = reviewsScrollRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          reviewsScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          reviewsScrollRef.current.scrollBy({ left: 400, behavior: 'smooth' });
        }
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [reviews.length]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(getKolkataTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubRadars = firestoreService.listenToCollection('radars', (data) => {
      const todayKolkata = getKolkataTime();
      const todayISO = todayKolkata.toISOString().split('T')[0]; // YYYY-MM-DD
      const todayString = todayKolkata.toDateString(); // Backup format
      
      const items = data.filter(r => !r.date || r.date === todayISO || r.date === todayString);
      // Deduplicate by title
      const uniqueItems = Array.from(new Map(items.map(item => [item.title, item])).values());
      setRadars(uniqueItems);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'radars');
    });

    const unsubDrops = firestoreService.listenToCollection('drops', setDrops, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'drops');
    });

    const unsubRoutines = firestoreService.listenToCollection('routines', setRoutines, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'routines');
    });

    const unsubFaculty = landingService.listenToFaculty(setFaculty, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'faculty');
    });
    const unsubPrograms = landingService.listenToPrograms(setPrograms, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'programs');
    });
    const unsubReviews = landingService.listenToReviews(setReviews, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
    });

    return () => {
      unsubRadars();
      unsubDrops();
      unsubRoutines();
      unsubFaculty();
      unsubPrograms();
      unsubReviews();
    };
  }, []);

  const parseTime = (timeStr: string, isTomorrow?: boolean, daysAhead = 0) => {
    if (!timeStr) return null;
    try {
      const startTimeStr = timeStr.split('-')[0].trim();
      const timeMatch = startTimeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (!timeMatch) return null;
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const modifier = timeMatch[3]?.toUpperCase();
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      const date = getKolkataTime();
      if (daysAhead > 0) {
        date.setDate(date.getDate() + daysAhead);
      } else if (isTomorrow) {
        date.setDate(date.getDate() + 1);
      }
      date.setHours(hours, minutes, 0, 0);
      return date;
    } catch (e) { return null; }
  };

  const getStatusInfo = (radar: any) => {
    const startTime = parseTime(radar.time, radar.isTomorrow, radar.daysAhead);
    if (!startTime) return { status: radar.status || 'upcoming', label: radar.status?.toUpperCase() || 'UPCOMING', color: 'bg-gray-500' };
    const diffSecs = (startTime.getTime() - currentTime.getTime()) / 1000;
    
    if (radar.status === 'canceled') return { status: 'canceled', label: 'CANCELED', color: 'bg-red-500' };
    
    if (diffSecs <= 0 && diffSecs >= -7200) {
      return { status: 'live', label: 'LIVE NOW', color: 'bg-indigo-500 animate-pulse' };
    }
    
    if (diffSecs > 0) {
      const days = Math.floor(diffSecs / 86400);
      const hours = Math.floor((diffSecs % 86400) / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      const secs = Math.floor(diffSecs % 60);
      
      let timeStr = "";
      if (days > 0) {
        timeStr = `${days}D ${hours}H ${mins}M ${secs}S`;
      } else if (hours > 0) {
        timeStr = `${hours}H ${mins}M ${secs}S`;
      } else {
        timeStr = `${mins}M ${secs}S`;
      }
      
      const dayLabel = radar.dayNameLabel ? `${radar.dayNameLabel} • ` : (radar.isTomorrow ? 'TOMORROW • ' : 'STARTS IN ');
      const label = `${dayLabel}${timeStr}`;
      return { status: 'upcoming', label, color: (radar.isTomorrow || radar.daysAhead > 0) ? 'bg-purple-500' : 'bg-cyan-500' };
    }
    
    return { status: 'completed', label: 'OFFLINE', color: 'bg-gray-700' };
  };

  const activeRadars = radars.filter(r => getStatusInfo(r).status !== 'completed');
  let displayRadars = [...activeRadars];
  let showingTomorrow = false;

  if (displayRadars.length === 0) {
    const kolkataNow = getKolkataTime();
    const todayDay = kolkataNow.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
    
    // Check for today's routines first
    const todayRoutines = routines.filter(r => r[todayDay] && r[todayDay] !== '-');
    const todayRoutinesMapped = todayRoutines.map(r => ({
      title: r[todayDay],
      time: r.startTime && r.endTime ? `${r.startTime} - ${r.endTime}` : r.time || r.startTime || "",
      status: 'upcoming',
      isTomorrow: false
    })).filter(r => getStatusInfo(r).status !== 'completed');

    if (todayRoutinesMapped.length > 0) {
      displayRadars.push(...todayRoutinesMapped);
    } else {
      // If no routines for today (or all completed), loop through next days up to a week
      let daysToAdd = 1;
      while (displayRadars.length === 0 && daysToAdd <= 7) {
        const nextDayDate = new Date(kolkataNow);
        nextDayDate.setDate(nextDayDate.getDate() + daysToAdd);
        const nextDayStr = nextDayDate.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
        
        const nextDayRoutines = routines.filter(r => r[nextDayStr] && r[nextDayStr] !== '-');
        if (nextDayRoutines.length > 0) {
          showingTomorrow = true;
          const isTomorrow = daysToAdd === 1;
          const dayNameLabel = daysToAdd === 1 ? "TOMORROW" : nextDayDate.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
          
          nextDayRoutines.forEach(r => {
            displayRadars.push({
              title: r[nextDayStr],
              time: r.startTime && r.endTime ? `${r.startTime} - ${r.endTime}` : r.time || r.startTime || "",
              status: 'upcoming',
              isTomorrow: isTomorrow,
              daysAhead: daysToAdd,
              dayNameLabel: dayNameLabel
            });
          });
        }
        daysToAdd++;
      }
    }
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-y-auto overflow-x-hidden bg-[#fafafa] dark:bg-[#030712] transition-colors duration-500 rounded-2xl md:rounded-3xl flex flex-col p-2 md:p-3 border border-gray-200/50 dark:border-white/5 shadow-inner">
      
      {/* Background Parallax Element */}
      <motion.div style={{ y: backgroundY }} className="absolute inset-x-0 top-0 h-[120vh] w-full pointer-events-none opacity-20 dark:opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-300 via-transparent to-transparent dark:from-indigo-900/40"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-200 via-transparent to-transparent dark:from-cyan-900/30"></div>
        {/* Futurist Grid Lines */}
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to right, #80808012 1px, transparent 1px), linear-gradient(to bottom, #80808012 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </motion.div>

      {/* Top Header */}
      <header className="relative z-50 flex items-center justify-between w-full pt-4 pb-6 px-2 md:px-0 mb-2">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center justify-center shrink-0">
             {branding?.logo ? (
                <img src={branding.logo} alt="Logo" className="h-12 md:h-16 w-auto object-contain" />
             ) : (
                <Brain className="w-10 h-10 md:w-14 md:h-14 text-indigo-600 dark:text-indigo-400" />
             )}
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-tight whitespace-normal break-words">
              {branding?.title || 'Advanced Classes'}
            </h1>
            <p className="text-[10px] md:text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1">
              Next-Gen Learning Hub
            </p>
          </div>
        </div>
        
        <div className="flex items-center shrink-0 pl-2">
          <button 
            onClick={toggleDarkMode}
            className="w-10 h-10 md:w-12 md:h-12 bg-white/50 dark:bg-black/50 backdrop-blur-md border border-gray-200/60 dark:border-white/10 rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center text-gray-800 dark:text-gray-200"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <div className="relative z-10 w-full flex-1 flex flex-col">
        <CountdownTimer />
        
        {/* Next-Gen Hero Section - Parallax Edition */}
        <div className="relative w-full h-[70vh] md:h-[80vh] flex items-center justify-center overflow-hidden rounded-[2rem] md:rounded-[3rem] mb-12 md:mb-16 shadow-2xl group border border-gray-200/50 dark:border-white/10 mx-auto max-w-[1400px]">
          {/* Background Layer (Moves slower) */}
          <motion.div 
            style={{ y: useTransform(scrollYProgress, [0, 1], ["0%", "15%"]) }}
            className="absolute inset-x-0 -top-[5%] -bottom-[5%] w-full h-[110%]"
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={currentSlide}
                src={HOME_SLIDES[currentSlide].imageUrl}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 0.6, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="absolute inset-0 w-full h-full object-cover"
                alt="Background"
              />
            </AnimatePresence>
            {/* Stronger overlay for much better text readability across themes */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-gray-900/40 dark:from-black dark:via-black/80 dark:to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/50 to-transparent dark:from-black/95 dark:via-black/60 w-full"></div>
          </motion.div>

          {/* Foreground Title / Content Layer (Moves faster) */}
          <div className="relative z-10 w-full h-full flex flex-col justify-end p-6 sm:p-10 md:p-16 lg:p-24 container mx-auto">
             <motion.div 
               style={{ y: useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]) }} // Less aggressive parallax calculation
               className="max-w-3xl"
             >
               <AnimatePresence mode="wait">
                 <motion.div
                   key={currentSlide}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -20 }}
                   transition={{ duration: 0.6, ease: "easeOut" }}
                 >
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                      <span className="w-8 sm:w-12 h-[2px] bg-indigo-500 rounded-full"></span>
                      <span className="text-[10px] sm:text-xs font-black tracking-[0.2em] text-indigo-300 dark:text-indigo-400 uppercase drop-shadow-md">
                        {HOME_SLIDES[currentSlide].tag}
                      </span>
                    </div>
                    
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-white leading-[1.1] mb-6 tracking-tight drop-shadow-lg pr-4">
                      {HOME_SLIDES[currentSlide].title}
                    </h1>
                    
                    <p className="text-sm sm:text-lg md:text-2xl text-gray-200 font-medium mb-8 max-w-2xl border-l-2 border-indigo-500/50 pl-4 sm:pl-6 drop-shadow-md">
                      {HOME_SLIDES[currentSlide].subtitle}
                    </p>
                    
                    <button 
                      onClick={() => onNavigate('batches')}
                      className="px-6 py-3 sm:px-8 sm:py-4 bg-[var(--primary)] text-white text-sm sm:text-base font-black tracking-widest uppercase rounded-full shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] hover:scale-105 hover:bg-white hover:text-[var(--primary)] transition-all flex items-center gap-3 drop-shadow-lg mb-6"
                    >
                      EXPLORE PROGRAMS <ChevronRight size={20} className="stroke-[3]" />
                    </button>

                    <div className="flex flex-col sm:flex-row gap-4 sm:w-auto">
                      <button onClick={HOME_SLIDES[currentSlide].primaryBtn.action} className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-indigo-600 text-white rounded-full font-black uppercase tracking-wider text-xs sm:text-sm hover:scale-[1.02] active:scale-95 hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2 group border border-indigo-400/30">
                        {HOME_SLIDES[currentSlide].primaryBtn.text}
                        <ArrowUpRight size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform border border-white/20 rounded-full p-0.5" />
                      </button>
                      <button onClick={HOME_SLIDES[currentSlide].secondaryBtn.action} className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full font-bold uppercase tracking-wider text-xs sm:text-sm hover:bg-white/20 transition-colors shadow-lg flex items-center justify-center gap-2">
                        {HOME_SLIDES[currentSlide].secondaryBtn.text}
                      </button>
                    </div>
                 </motion.div>
               </AnimatePresence>
             </motion.div>
          </div>

          {/* Slide Navigation inside hero */}
          <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 lg:bottom-12 lg:right-12 flex items-center gap-2 sm:gap-4 z-20">
             <button onClick={() => setCurrentSlide((p) => p === 0 ? HOME_SLIDES.length - 1 : p - 1)} className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border border-white/20 flex items-center justify-center text-white backdrop-blur-md hover:bg-white/20 hover:scale-110 active:scale-95 transition-all shadow-xl bg-black/40">
               <ChevronLeft size={20} />
             </button>
             <button onClick={() => setCurrentSlide((p) => (p + 1) % HOME_SLIDES.length)} className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border border-white/20 flex items-center justify-center text-white backdrop-blur-md hover:bg-white/20 hover:scale-110 active:scale-95 transition-all shadow-xl bg-black/40">
               <ChevronRight size={20} />
             </button>
          </div>
          
          <div className="absolute bottom-6 sm:bottom-16 left-6 md:left-24 flex items-center gap-2 z-20">
            {HOME_SLIDES.map((_, i) => (
               <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'bg-indigo-500 w-8 shadow-[0_0_10px_rgba(79,70,229,0.8)]' : 'bg-white/50 w-2 hover:bg-white/80'}`}></button>
            ))}
          </div>
        </div>

        {/* Compact Contact Actions */}
        {(branding?.contactPhone || branding?.whatsapp || socialLinks?.some(l => l.icon === 'whatsapp')) && (
          <div className="mb-12 flex items-center justify-center gap-3 px-4">
            {branding?.contactPhone && (
              <a 
                href={`tel:${branding.contactPhone.replace(/\D/g,'')}`}
                className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-indigo-500/20 whitespace-nowrap"
              >
                <Phone size={16} />
                <span className="hidden sm:inline">Call Now: </span>{branding.contactPhone}
              </a>
            )}
            {(socialLinks?.find(l => l.icon === 'whatsapp')?.url || branding?.whatsapp) && (
              <a 
                href={socialLinks?.find(l => l.icon === 'whatsapp')?.url || `https://wa.me/${branding?.whatsapp?.replace(/\D/g,'')}`}
                target="_blank" 
                rel="noreferrer"
                className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-green-600/10 hover:bg-green-600/20 text-green-600 dark:text-green-400 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-green-500/20 whitespace-nowrap"
              >
                <MessageCircle size={16} />
                <span className="hidden sm:inline">Join </span>WhatsApp
              </a>
            )}
          </div>
        )}

        {/* About Section */}
        <div className="mb-24">
          <div className="bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] p-8 md:p-16 border border-gray-200 dark:border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mx-20 -my-20 pointer-events-none"></div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
              <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-4 py-2 rounded-full font-bold text-xs tracking-widest uppercase mb-4 shadow-sm border border-indigo-200 dark:border-indigo-500/30">
                <Brain size={14} /> Who We Are
              </div>
              
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-[1.1] drop-shadow-sm">
                Redefining the standard of<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">Science Education</span> in Sonai.
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mt-12 pt-8 border-t border-gray-100 dark:border-white/10">
                <p className="text-gray-600 dark:text-gray-300 md:text-lg leading-relaxed font-medium">
                  Advanced Classes was born out of a relentless desire to eradicate the need for rigorous daily travel to outer cities just to obtain high-quality education. We bring the apex of academic infrastructure to your doorstep.
                </p>
                <p className="text-gray-600 dark:text-gray-300 md:text-lg leading-relaxed font-medium">
                  We are a collective of driven educators, technologists, and strategists. Our methodology relies on high-density focus, interactive visualization, and aggressive conceptual building.
                </p>
              </div>
              
              <div className="pt-8">
               <a href="https://share.google/VYYWtSsTTSZOciN7r" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider text-sm hover:underline underline-offset-4">
                 Find us on Google Maps <ArrowUpRight size={16} />
               </a>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Core Philosophy / Vision */}
        <div className="mb-24 space-y-16">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="flex flex-col gap-4">
            <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tighter uppercase drop-shadow-sm leading-[1.1]">
              Engineered For<br/><span className="text-indigo-600 dark:text-indigo-500">Unmatched Results</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 font-medium max-w-3xl mt-4">
               Not just a tuition center. A complete academic ecosystem combining high-end technology, data-driven prep, and raw conceptual mastery.
            </p>
          </motion.div>
          
          <div className="relative w-full pb-8">
            <div className="absolute top-1/2 -translate-y-1/2 left-0 z-20 pointer-events-none">
              <button 
                onClick={() => scrollHorizontal(philosophyScrollRef, 'left')}
                className="w-10 h-10 bg-white/80 dark:bg-black/80 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center text-gray-800 dark:text-white border border-gray-200 dark:border-white/10 hover:scale-110 active:scale-95 transition-all pointer-events-auto -ml-4 md:ml-0"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 right-0 z-20 pointer-events-none">
              <button 
                onClick={() => scrollHorizontal(philosophyScrollRef, 'right')}
                className="w-10 h-10 bg-white/80 dark:bg-black/80 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center text-gray-800 dark:text-white border border-gray-200 dark:border-white/10 hover:scale-110 active:scale-95 transition-all pointer-events-auto -mr-4 md:mr-0"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            
            <div 
              ref={philosophyScrollRef}
              className="flex gap-4 md:gap-6 w-full overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none' }}
            >
              {/* Box 1 */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="snap-center shrink-0 w-[280px] md:w-[350px] bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow flex flex-col">
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                <Brain className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Concept Mastery</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4 flex-1">
                Forget rote learning. Students here understand, visualize, and experience concepts. With smart digital classrooms, learning becomes visual, interactive, and practical.
              </p>
            </motion.div>

            {/* Box 2 */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="snap-center shrink-0 w-[280px] md:w-[350px] bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow flex flex-col">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
                <Target className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Precision Exam Prep</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4 flex-1">
                We follow a data-driven model: chapter-wise concept building, PYQ trend analysis, weekly test systems, and final exam prediction strategies. Prepare exactly for what matters.
              </p>
            </motion.div>

            {/* Box 3 */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="snap-center shrink-0 w-[280px] md:w-[350px] bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow flex flex-col">
              <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/50 rounded-2xl flex items-center justify-center mb-6 text-purple-600 dark:text-purple-400">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Personal Attention</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4 flex-1">
                Limited batch sizes ensure individual doubt solving and personal performance monitoring. Every student gets noticed. Every student improves.
              </p>
            </motion.div>

            {/* Box 4 */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="snap-center shrink-0 w-[280px] md:w-[350px] bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg flex flex-col">
               <div className="w-14 h-14 bg-green-100 dark:bg-green-900/50 rounded-2xl flex items-center justify-center mb-6 text-green-600 dark:text-green-400">
                 <MapPin className="w-7 h-7" />
               </div>
               <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-3">Ghar Ke Paas, No Bakwaas 🚀</h3>
               <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex-1">
                 Kyun waste karna hours in traffic? We bring top-tier tech to your hood. Save time, sleep more, crack exams.
               </p>
            </motion.div>
            
            {/* Box 5 */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="snap-center shrink-0 w-[280px] md:w-[350px] bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg flex flex-col">
               <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
                 <Target className="w-7 h-7" />
               </div>
               <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-3">Premium Feels, Pocket-Friendly Deals 💸</h3>
               <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex-1">
                 Elite smart classrooms aur crazy academic support, wo bhi bina wallet khali kiye. Zero compromise on quality.
               </p>
            </motion.div>
            
            {/* Structured Cycle Box */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 }} className="snap-center shrink-0 w-[280px] md:w-[350px] bg-indigo-600 border border-indigo-500 rounded-3xl p-8 shadow-xl flex flex-col justify-center items-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=500&auto=format&fit=crop')] opacity-10 mix-blend-overlay bg-cover bg-center"></div>
              <div className="relative z-10 w-full flex flex-col h-full justify-center">
                <h3 className="text-2xl font-black mb-6 text-white tracking-tight">Structured Cycle</h3>
                <div className="flex flex-wrap justify-center items-center gap-2 text-white/90 font-bold text-sm">
                  <span>Concept</span> <ArrowRight size={14} className="opacity-50" />
                  <span>Practice</span> <ArrowRight size={14} className="opacity-50" />
                  <span>Test</span> <ArrowRight size={14} className="opacity-50" />
                  <span>Analysis</span> <ArrowRight size={14} className="opacity-50" />
                  <span className="text-white drop-shadow-md w-full mt-2">Improvement</span>
                </div>
                <p className="text-white/80 text-xs uppercase tracking-widest mt-8 font-semibold">No chaos. Pure logic.</p>
              </div>
            </motion.div>
          </div>
        </div>
          
        <div className="text-center mt-16 max-w-3xl mx-auto border-t border-gray-200/50 dark:border-white/10 pt-16">
             <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-4">The Final Promise</h3>
             <p className="text-xl text-gray-600 dark:text-gray-400 font-medium italic">
               "From weak to confident. From average to top performer. We build results step by step."
             </p>
          </div>
        
        {/* Feature Grid */}
        <div className="mb-24 flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-8 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          <div className="p-8 rounded-[2rem] bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-500/20 shadow-lg shrink-0 w-[min(300px,85vw)] md:w-auto snap-center">
            <MonitorPlay size={40} className="text-indigo-600 dark:text-indigo-400 mb-6" />
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Immersive Tech</h4>
            <p className="text-gray-600 dark:text-gray-400 font-medium text-sm leading-relaxed">
              Equipped with 74" interactive displays, our smart classrooms make complex concepts a visual masterpiece across all the programs we offer.
            </p>
          </div>
          <div className="p-8 rounded-[2rem] bg-cyan-50 dark:bg-cyan-900/10 border border-cyan-100 dark:border-cyan-500/20 shadow-lg shrink-0 w-[min(300px,85vw)] md:w-auto snap-center">
            <Users size={40} className="text-cyan-600 dark:text-cyan-400 mb-6" />
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Strategic Ratios</h4>
            <p className="text-gray-600 dark:text-gray-400 font-medium text-sm leading-relaxed">
              Strictly limited capacity batches ensure you get absolute attention. We optimize seating for intense 2-hour learning bursts.
            </p>
          </div>
          <div className="p-8 rounded-[2rem] md:col-span-2 lg:col-span-1 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-500/20 shadow-lg shrink-0 w-[min(300px,85vw)] md:w-auto snap-center">
            <Target size={40} className="text-emerald-600 dark:text-emerald-400 mb-6" />
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Zero Distraction</h4>
            <p className="text-gray-600 dark:text-gray-400 font-medium text-sm leading-relaxed">
              Our acoustic-treated hubs are designed with one goal: pure focus. We leave no room for fatigue, completely eradicating travel drain.
            </p>
          </div>
        </div>



          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {(programs.length > 0 ? [...programs].sort((a,b) => (a.order||0) - (b.order||0)) : [
              { id: '1', title: 'Mathematics', subtitle: 'Class XI • Class XII • JEE', tag: 'Enroll', imageUrl: '/ClosedUPDigitalBoard Teaching.png', primaryBtnText: '', secondaryBtnText: '' },
              { id: '2', title: 'Physics', subtitle: 'Class XI • Class XII • NEET • JEE', tag: 'Enroll', imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2070&auto=format&fit=crop', primaryBtnText: '', secondaryBtnText: '' },
              { id: '3', title: 'Chemistry', subtitle: 'Class XI • Class XII • NEET • JEE', tag: 'Enroll', imageUrl: '/Advanced Classes team.png', primaryBtnText: '', secondaryBtnText: '' },
              { id: '4', title: 'Biology', subtitle: 'Class XI • Class XII • NEET', tag: 'Enroll', imageUrl: '/Classroom.png', primaryBtnText: '', secondaryBtnText: '' },
              { id: '5', title: 'Computer Science', subtitle: 'Class XI • Class XII', tag: 'Enroll', imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop', primaryBtnText: '', secondaryBtnText: '' },
              { id: '6', title: 'Foundation', subtitle: 'Adv. Maths • Gen. Science • English (Class IX-X)', tag: 'Enroll', imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop', primaryBtnText: '', secondaryBtnText: '' }
            ]).map((program, index) => (
              <motion.div 
                key={program.id}
                initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}
                onClick={() => {
                  analyticsService.logEvent({
                    event: 'click',
                    section: 'programs',
                    itemId: program.id,
                    itemName: program.title,
                    page: 'home'
                  });
                  setSelectedProgram(program);
                }}
                className="group cursor-pointer relative rounded-[2.5rem] overflow-hidden bg-black aspect-square md:aspect-auto md:min-h-[350px] shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col pt-40 md:pt-0"
              >
                <ProgressiveImg src={program.imageUrl || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80'} className="absolute inset-0 w-full h-[120%] object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-1000" alt={program.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/70 to-transparent z-10"></div>
                <div className="absolute inset-0 p-8 flex flex-col justify-end z-20">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/20">
                    <Target className="text-white" size={24} />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-white mb-2 uppercase tracking-tight">{program.title}</h3>
                  <p className="text-gray-300 text-sm font-medium mb-6">{program.subtitle}</p>
                  <div className="inline-flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-xs">
                    EXPLORE <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Program Detailed View Modal */}
        <AnimatePresence>
          {selectedProgram && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProgram(null)}
              className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl overflow-y-auto p-4 md:p-8"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative max-w-4xl mx-auto w-full bg-white dark:bg-[#111] rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10"
                onClick={e => e.stopPropagation()}
              >
                <div className="relative h-64 md:h-96">
                  <ProgressiveImg src={selectedProgram.imageUrl} alt={selectedProgram.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#111] via-transparent to-transparent"></div>
                  <button 
                    onClick={() => setSelectedProgram(null)}
                    className="absolute top-6 right-6 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-all z-20"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-8 md:p-12 -mt-16 relative z-10">
                  <div className="inline-block px-4 py-1.5 bg-[var(--primary)] text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-4 shadow-xl">
                    Academic Program
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-4">
                    {selectedProgram.title}
                  </h2>
                  <p className="text-xl text-indigo-600 dark:text-indigo-400 font-bold mb-8">
                    {selectedProgram.subtitle}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <h4 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                        <Target className="text-[var(--primary)]" size={20} /> Program Overview
                      </h4>
                      <div className="text-gray-600 dark:text-gray-300 font-medium leading-relaxed prose dark:prose-invert max-w-none">
                        <MarkdownRenderer content={selectedProgram.description || 'This comprehensive program is designed to provide deep conceptual clarity and rigorous practice. We focus on building a strong foundation and then scaling up to competitive excellence.'} />
                      </div>
                    </div>
                    
                    <div className="space-y-8">
                      <div className="p-6 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5">
                        <h4 className="text-base font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Zap className="text-yellow-500" size={18} /> Features
                        </h4>
                        <ul className="space-y-3">
                          <li className="text-sm font-medium flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-500" /> Complete Syllabus Coverage
                          </li>
                          <li className="text-sm font-medium flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-500" /> Weekly Assessment Sheets
                          </li>
                          <li className="text-sm font-medium flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-500" /> Interactive Smart Board Lessons
                          </li>
                          <li className="text-sm font-medium flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-500" /> Personal Performance Reports
                          </li>
                        </ul>
                      </div>
                      
                      <button 
                        onClick={() => {
                          analyticsService.logEvent({
                            event: 'enroll_click',
                            section: 'program_modal',
                            itemId: selectedProgram.id,
                            itemName: selectedProgram.title,
                            page: 'home'
                          });
                          setSelectedProgram(null);
                          window.dispatchEvent(new CustomEvent('open-enrollment', { detail: { subject: selectedProgram.title } }));
                        }}
                        className="w-full py-5 bg-[var(--primary)] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[var(--primary)]/20"
                      >
                        Enroll in {selectedProgram.title} Now
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Live Radar HUD - Compact version at bottom */}
        {displayRadars.length > 0 && (
          <div className="mb-10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <Activity className="text-indigo-500 animate-pulse" /> 
                RADAR
              </h3>
              {isAdmin && (
                  <button
                    onClick={() => onManage?.('radars')}
                    className="px-3 py-1 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-lg font-black text-[9px] hover:bg-indigo-500/20 transition-all tracking-widest uppercase flex items-center gap-1.5"
                  >
                    <Settings size={10} /> MANAGE
                  </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayRadars.map((radar, index) => {
                const info = getStatusInfo(radar);
                return (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}
                    className={`relative overflow-hidden rounded-[1.5rem] border backdrop-blur-lg p-[1px] shadow-sm ${showingTomorrow ? 'border-purple-500/30 bg-purple-500/5' : 'border-indigo-500/30 bg-indigo-500/5'}`}
                  >
                    <div className="bg-white/90 dark:bg-black/60 rounded-[1.4rem] p-4 flex flex-col gap-4 h-full">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${info.color.split(' ')[0]} animate-pulse shrink-0 shadow-lg`}></div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 flex-1">
                          <MarkdownRenderer inline content={radar.title || "Active Transmission"} />
                        </h4>
                      </div>
                      
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-200 dark:border-gray-800">
                        <div className="text-[10px] font-mono font-bold tracking-wider text-gray-500 dark:text-gray-400">
                          {radar.time}
                        </div>
                        {radar.link ? (
                          <a href={radar.link} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-bold hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase flex items-center gap-1.5">
                            Join <ArrowRight size={12} />
                          </a>
                        ) : (
                          <span className={`px-3 py-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 rounded-lg font-bold text-[10px] uppercase`}>
                            {info.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Flash Drops */}
        {drops.length > 0 && (
           <div className="mb-8 space-y-4">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase">FLASH DROPS</h3>
                 {isAdmin && (
                    <button
                      onClick={() => onManage?.('manage_drops')}
                      className="px-3 py-1 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-lg font-black text-[9px] hover:bg-indigo-500/20 transition-all tracking-widest uppercase flex items-center gap-1.5"
                    >
                      <Settings size={10} /> MANAGE
                    </button>
                  )}
               </div>
               {drops.map(drop => (
                  <FlashDropCard 
                    key={drop.id} 
                    drop={drop} 
                    isAdmin={isAdmin} 
                    firestoreService={firestoreService} 
                  />
               ))}
           </div>
        )}

        {/* Faculty Section Title */}
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-4">
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter uppercase drop-shadow-sm shrink-0">The Pillars</h2>
           </div>
           {isAdmin && (
              <button
                onClick={() => onManage?.('faculty')}
                className="px-4 py-2 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-lg font-black text-[10px] hover:bg-indigo-500/20 transition-all tracking-widest uppercase flex items-center gap-1.5"
              >
                <Settings size={12} />
                MANAGE
              </button>
           )}
        </div>

        <div className="mb-16 relative">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="flex items-center gap-4 mb-6 md:mb-8">
            <div className="flex-1"></div>
            <div className="flex gap-2">
              <button 
                onClick={() => scrollHorizontal(mastersScrollRef, 'left')}
                className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all shadow-sm shrink-0"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => scrollHorizontal(mastersScrollRef, 'right')}
                className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all shadow-sm shrink-0"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </motion.div>

          {/* Horizontal scroll container */}
          <div 
            ref={mastersScrollRef}
            className="flex overflow-x-auto gap-4 md:gap-6 pb-8 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden w-full" 
            style={{ scrollbarWidth: 'none' }}
          >
            {(faculty.length > 0 ? [...faculty].sort((a,b) => (a.order||0) - (b.order||0)) : THE_MASTERS).map((member: any) => (
              <motion.div key={member.id} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} 
                className="group relative rounded-[2rem] overflow-hidden border border-gray-200 dark:border-white/10 shadow-lg shrink-0 w-[260px] md:w-[300px] aspect-[3/4] snap-center bg-gray-100 dark:bg-[#0a0a0a]"
              >
                <ProgressiveImg src={member.photo || 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?q=80&w=400&h=500&auto=format&fit=crop'} alt={member.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 bg-gray-200 dark:bg-zinc-800" />
                
                {member.memberRole && (
                  <div className="absolute top-0 left-0 z-30">
                    <div className="px-4 py-1.5 pr-6 bg-gradient-to-b from-[#d94838] to-[#992216] shadow-md rounded-br-3xl flex items-center">
                      <span className="text-white text-[11px] md:text-xs font-black uppercase tracking-[0.15em] leading-none">
                        {member.memberRole}
                      </span>
                    </div>
                  </div>
                )}

                {member.designationLabel && (
                  <div className="absolute top-0 right-6 z-30 flex items-center justify-center py-3 px-2 bg-gradient-to-b from-[#1a1b2e] to-[#0a0b14] rounded-b-xl border-x border-b border-orange-500/80 shadow-lg shadow-orange-500/20">
                    <span className="text-white/90 text-[12px] font-black uppercase tracking-[0.3em] leading-none [writing-mode:vertical-rl] drop-shadow-md">
                      {member.designationLabel}
                    </span>
                  </div>
                )}
                
                <div 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    const slug = (member.name || '').toLowerCase().replace(/\s+/g, '-');
                    window.history.pushState(null, '', '/' + slug); 
                    window.dispatchEvent(new Event('popstate')); 
                  }} 
                  className="absolute inset-0 z-20 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity cursor-pointer flex flex-col justify-end p-4 pb-5"
                >
                  <div className="translate-y-3 group-hover:translate-y-0 transition-transform duration-300 pointer-events-none">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-0.5 leading-tight drop-shadow-md">{member.name}</h3>
                    <p className="text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1.5">{member.degree || member.role}</p>
                    
                    <div className="h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 transition-all duration-300 delay-100 ease-out overflow-hidden pointer-events-auto">
                      <div className="pt-2 mt-0.5 space-y-1">
                        {member.experience && <p className="text-white/90 text-[10px] font-bold uppercase tracking-widest pointer-events-none">{member.experience}</p>}
                        <p className="text-gray-300 text-[11px] leading-relaxed font-medium pb-1.5 line-clamp-2 pointer-events-none">
                          {member.achievement || 'Exceptional instruction driving unmatched conceptual clarity.'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap pointer-events-auto">
                      <span className="inline-block px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] text-white uppercase font-bold tracking-widest border border-white/30 pointer-events-none shadow-sm">Tap for full profile</span>
                      {member.portfolioUrl && (
                        <a 
                          href={member.portfolioUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center p-[5px] bg-indigo-500/80 text-white border border-indigo-500 rounded-full hover:bg-indigo-600 transition-all cursor-pointer shadow-md shadow-indigo-500/20"
                          title="View Portfolio"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Master Full-Screen Modal */}
        <AnimatePresence>
          {selectedMaster && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedMaster(null)}
               className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl overflow-y-auto cursor-zoom-out p-4 md:p-8"
             >
               <motion.div 
                 initial={{ scale: 0.9, y: 20 }}
                 animate={{ scale: 1, y: 0 }}
                 exit={{ scale: 0.9, y: 20 }}
                 className="relative max-w-3xl mx-auto w-full min-h-full flex flex-col items-center justify-center py-10 md:py-12"
                 onClick={e => e.stopPropagation()}
               >
                 <motion.div 
                   className="w-40 h-40 sm:w-56 sm:h-56 md:w-80 md:h-80 rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border-2 md:border-4 border-white/10 mb-6 bg-zinc-900 shrink-0"
                 >
                   <img 
                     src={selectedMaster.photo || 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?q=80&w=600&h=800&auto=format&fit=crop'} 
                     alt={selectedMaster.name} 
                     className="w-full h-full object-cover md:object-contain"
                     style={{ objectPosition: 'top' }}
                   />
                 </motion.div>
                 
                 <div className="text-center space-y-4 w-full flex flex-col items-center bg-zinc-900/50 p-6 md:p-10 rounded-3xl border border-white/5 backdrop-blur-sm">
                   <h3 className="text-2xl sm:text-3xl md:text-5xl font-black text-white uppercase italic leading-tight drop-shadow-lg max-w-2xl">{selectedMaster.name}</h3>
                   <div className="inline-block px-4 py-1.5 md:py-2 bg-indigo-500/20 md:bg-indigo-500/10 rounded-full border border-indigo-500/30">
                     <p className="text-xs md:text-sm text-indigo-300 font-black uppercase tracking-[0.2em]">{selectedMaster.degree || selectedMaster.role}</p>
                   </div>
                   
                   <div className="w-12 h-1 bg-white/10 rounded-full my-4"></div>
                   
                   <div className="text-gray-300 md:text-gray-400 font-medium max-w-xl mx-auto leading-relaxed text-sm md:text-base prose prose-sm prose-invert text-center [&>ul]:text-left [&>ul]:list-disc [&>ul]:pl-5 [&>ul>li]:mb-2">
                     <MarkdownRenderer content={selectedMaster.achievement} />
                   </div>
                   
                   {selectedMaster.experience && (
                      <div className="mt-8 pt-6 border-t border-white/10 w-full text-center">
                        <div className="inline-block px-4 py-2 bg-white/5 rounded-2xl">
                          <span className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                            <Star size={12} className="text-orange-400" />
                            {selectedMaster.experience} Excellence
                          </span>
                        </div>
                      </div>
                   )}

                   {selectedMaster.portfolioUrl && (
                      <div className="mt-6 w-full flex justify-center">
                        <a 
                          href={selectedMaster.portfolioUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl text-sm transition-all uppercase tracking-widest shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                        >
                          <ExternalLink size={16} /> View Full Portfolio
                        </a>
                      </div>
                   )}
                 </div>
                 
                 <button 
                   onClick={() => setSelectedMaster(null)}
                   className="fixed top-4 right-4 md:absolute md:-top-4 md:-right-4 p-3 md:p-4 text-white/70 hover:text-white transition-colors bg-black/60 backdrop-blur-lg hover:bg-black/80 rounded-full z-50 border border-white/10"
                   title="Close"
                 >
                   <X size={24} />
                 </button>
               </motion.div>
             </motion.div>
          )}
        </AnimatePresence>
 
        {/* Student Voices - Google Reviews Section */}
        <div className="mb-24">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="flex flex-col md:flex-row md:items-center gap-4 mb-12">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter uppercase drop-shadow-sm leading-none">Student Voices</h2>
              <div className="flex items-center gap-1.5 text-sm md:text-base bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full w-max font-bold border border-indigo-200 dark:border-indigo-800/50 shadow-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                Rated 4.9/5 on Google Maps
              </div>
            </div>
            
            <div className="h-px bg-gray-300 dark:bg-white/10 flex-1 md:ml-4"></div>
            {isAdmin && (
               <button
                 onClick={() => onManage?.('reviews')}
                 className="px-4 py-2 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-lg font-black text-[10px] hover:bg-indigo-500/20 transition-all tracking-widest uppercase flex items-center gap-1.5"
               >
                 <Settings size={12} />
                 MANAGE
               </button>
            )}
          </motion.div>

          <div className="relative group">
            <div className="absolute top-1/2 -translate-y-1/2 left-0 z-20 pointer-events-none -ml-2">
              <button 
                onClick={() => scrollHorizontal(reviewsScrollRef, 'left')}
                className="w-12 h-12 bg-white/90 dark:bg-black/90 backdrop-blur-xl rounded-full shadow-2xl flex items-center justify-center text-gray-800 dark:text-white border border-gray-200 dark:border-white/10 hover:scale-110 active:scale-95 transition-all pointer-events-auto"
              >
                <ChevronLeft size={24} />
              </button>
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 right-0 z-20 pointer-events-none -mr-2">
              <button 
                onClick={() => scrollHorizontal(reviewsScrollRef, 'right')}
                className="w-12 h-12 bg-white/90 dark:bg-black/90 backdrop-blur-xl rounded-full shadow-2xl flex items-center justify-center text-gray-800 dark:text-white border border-gray-200 dark:border-white/10 hover:scale-110 active:scale-95 transition-all pointer-events-auto"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            <div 
              ref={reviewsScrollRef}
              className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-8 px-4 -mx-4 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none' }}
            >
              {[...GOOGLE_REVIEWS, ...reviews].map((review, idx) => (
                <motion.div 
                  key={review.id || idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className="snap-center shrink-0 w-[300px] md:w-[400px] bg-white dark:bg-white/5 backdrop-blur-sm border border-gray-100 dark:border-white/10 rounded-[2rem] p-8 shadow-xl hover:shadow-2xl transition-all group/card relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover/card:opacity-20 transition-opacity">
                    <MessageCircle size={60} className="text-indigo-500" />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={16} className={i < (review.rating || 5) ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-700"} />
                      ))}
                    </div>
                    
                    <p className="text-gray-700 dark:text-gray-300 font-medium italic leading-relaxed mb-6 line-clamp-4">
                      "{review.text}"
                    </p>
                    
                    <div className="flex items-center gap-4 border-t border-gray-100 dark:border-white/10 pt-6">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-inner">
                        {(review.author || 'S').charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-sm">{review.author}</h4>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{review.time || 'Verified Student'}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          <div className="text-center mt-8">
            <a 
              href="https://share.google/VYYWtSsTTSZOciN7r" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-sm"
            >
              View More Reviews on Google Maps <ExternalLink size={14} />
            </a>
          </div>
        </div>

        <Footer branding={branding} socialLinks={socialLinks} setActiveTab={onNavigate} isVerified={isVerified} user={user} />
        
        {/* Spacer to replace padding-bottom so it doesn't get clipped */}
        <div className="h-64 shrink-0 w-full" />
      </div>
    </div>
  );
}
