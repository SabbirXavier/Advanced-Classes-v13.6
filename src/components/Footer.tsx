import React from 'react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { 
  Instagram, 
  Linkedin, 
  Youtube, 
  Mail, 
  ArrowRight,
  Sparkles,
  GraduationCap,
  Users,
  Award,
  BookOpen,
  Heart,
  Facebook,
  Twitter,
  MessageCircle
} from 'lucide-react';
import { WhatsAppIcon } from './FloatingWhatsApp';

export default function Footer({ branding, socialLinks, setActiveTab, isVerified, user }: { branding?: any; socialLinks?: any; setActiveTab?: (tab: string) => void; isVerified?: boolean; user?: any }) {
  const currentYear = new Date().getFullYear();

  const handleNav = (e: React.MouseEvent, targetTab: string, hash?: string, requiresVerification?: boolean) => {
    e.preventDefault();
    if (requiresVerification) {
      if (!user) {
        toast.error('You must log in to access this.');
        return;
      }
      if (!isVerified) {
        toast.error('You must be enrolled in a batch to access this.');
        return;
      }
    }

    if (setActiveTab) {
      if (typeof window !== 'undefined' && window.location.pathname === '/landing') {
        const url = new URL(window.location.origin);
        if (hash) { url.hash = hash; }
        window.location.href = url.toString();
        return;
      }
      
      setActiveTab(targetTab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (hash) {
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  };

  const footerLinks = [
    {
      title: 'Academy',
      links: [
        { name: 'About Us', action: (e: any) => handleNav(e, 'about') },
        { name: 'Our Faculty', action: (e: any) => handleNav(e, 'home', 'pillars') },
        { name: 'Courses', action: (e: any) => handleNav(e, 'home', 'programs') },
        { name: 'Success Stories', action: (e: any) => handleNav(e, 'home', 'voices') }
      ]
    },
    {
      title: 'Resources',
      links: [
        { name: 'PDFs & Resources', action: (e: any) => handleNav(e, 'downloads') },
        { name: 'Study Material', action: (e: any) => handleNav(e, 'exclusive', undefined, true) },
        { name: 'Practice Tests', action: (e: any) => handleNav(e, 'test') },
        { name: 'Video Lectures', action: (e: any) => handleNav(e, 'exclusive', undefined, true) },
        { name: 'Download App', action: (e: any) => handleNav(e, 'downloadapp') }
      ]
    },
    {
      title: 'Support',
      links: [
        { name: 'Help & Support', action: (e: any) => handleNav(e, 'support') },
        { name: 'Common FAQs', action: (e: any) => handleNav(e, 'faqs') },
        { name: 'Contact Us', action: (e: any) => handleNav(e, 'contactus') },
        { name: 'Privacy Policy', action: (e: any) => handleNav(e, 'privacy') }
      ]
    }
  ];

  const getSocialIcon = (iconName: string) => {
    const lower = iconName.toLowerCase();
    if (lower.includes('group') || lower === 'users') return Users;
    switch (lower) {
      case 'instagram': return Instagram;
      case 'youtube': return Youtube;
      case 'linkedin': return Linkedin;
      case 'whatsapp': return WhatsAppIcon;
      case 'twitter': return Twitter;
      case 'facebook': return Facebook;
      default: return Mail;
    }
  };

  const supportEmail = branding?.contactEmail || branding?.email || 'support@advancedclasses.com';
  const mailUrl = `mailto:${supportEmail}?subject=Support%20Request`;
  
  let rawNumber = '919876543210';
  const whatsappProp = branding?.whatsapp || import.meta.env.VITE_WHATSAPP_SUPPORT || '';
  if (whatsappProp) {
    const digits = whatsappProp.replace(/\D/g, '');
    if (digits.length >= 10) {
      rawNumber = digits;
    }
  }
  const prefilledMessage = encodeURIComponent("Hi! I'm interested in the courses on your website and would love to get more details.");
  const finalWhatsappUrl = `https://wa.me/${rawNumber}?text=${prefilledMessage}`;

  return (
    <footer className="relative mt-20 pt-20 pb-20 md:pb-32 border-t border-gray-200 dark:border-white/10" style={{ backgroundColor: 'var(--bg-color)' }}>
      {/* Subtle modern background gradient overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-100 bg-gradient-to-t from-[var(--primary)]/5 to-transparent"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-20">
          <div className="md:col-span-5 space-y-6">
            <h2 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
              {branding?.logo ? (
                <img src={branding.logo} alt="Logo" className="h-10 w-auto object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <BookOpen className="text-indigo-500" size={20} />
                </div>
              )}
              <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                {branding?.title || branding?.name || 'Academy'}
              </span>
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm text-sm leading-relaxed font-medium">
              Empowering students with premium educational resources, interactive live classes, and data-driven performance tracking to ensure academic excellence.
            </p>
            <div className="flex gap-3 pt-4">
              {(socialLinks || []).map((social: any) => {
                const Icon = getSocialIcon(social.icon);
                return (
                  <a
                    key={social.id}
                    href={social.url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 transition-all duration-300 hover:-translate-y-1 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 shadow-sm"
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
              {/* Added native mail link */}
              <a href={mailUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 transition-all duration-300 hover:-translate-y-1 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 shadow-sm" title="Email Support">
                 <Mail size={18} />
              </a>
              {/* Added WhatsApp Support link */}
              <a href={finalWhatsappUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center text-[#25D366] transition-all duration-300 hover:-translate-y-1 hover:bg-[#25D366] hover:text-white shadow-sm" title="WhatsApp Support">
                 <WhatsAppIcon size={18} />
              </a>
            </div>
          </div>
          
          <div className="md:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-8">
            {footerLinks.map((section, idx) => (
              <div key={idx} className="space-y-6">
                <h4 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-[0.2em]">{section.title}</h4>
                <ul className="space-y-4">
                  {section.links.map((link, lIdx) => (
                    <li key={lIdx}>
                      <button 
                        onClick={link.action} 
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 font-medium transition-colors text-left"
                      >
                        {link.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Global Footer Meta */}
        <div className="pt-8 border-t border-gray-200 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>&copy; {currentYear} {branding?.title || branding?.name}. All rights reserved.</span>
            <div className="hidden md:block w-1 h-1 rounded-full bg-gray-300 dark:bg-white/20"></div>
            <div className="flex gap-4">
              <button onClick={(e) => handleNav(e, 'privacy')} className="hover:text-indigo-500 transition-colors">Privacy Policy</button>
              <button onClick={(e) => handleNav(e, 'contactus')} className="hover:text-indigo-500 transition-colors">Contact</button>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 group cursor-pointer justify-center text-xs font-medium text-gray-400">
               <span>Developed with</span>
               <motion.span 
                 animate={{ scale: [1, 1.2, 1] }}
                 transition={{ repeat: Infinity, duration: 2 }}
                 className="text-rose-500"
               >
                 <Heart size={12} fill="currentColor" />
               </motion.span>
               <span>by</span>
               <a 
                 href="https://instagram.com/xavy.dev" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="text-gray-600 dark:text-gray-300 hover:text-indigo-500 font-bold transition-colors"
               >
                 Xavy.dev
               </a>
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
