import React from 'react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Mail, Phone, MapPin, Smartphone, HelpCircle, FileText, ChevronRight, MessageSquare, AlertCircle, MessageCircle as MessageCircleIcon, Headphones, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export function TabDownloadApp() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-2xl text-center py-20 px-8 relative overflow-hidden shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-500/20 rounded-full flex items-center justify-center mb-6">
            <Smartphone className="text-indigo-500 dark:text-indigo-400" size={48} />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-6 tracking-tight text-gray-900 dark:text-white">Mobile App Coming Soon!</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mb-8 leading-relaxed">
            We are working hard to bring you the best learning experience on the go. The official Android and iOS applications are currently under development and will be released very soon.
          </p>
          <div className="flex gap-4">
            <div className="px-6 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-400 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Android App In Progress
            </div>
            <div className="px-6 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-400 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              iOS App In Progress
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function TabSupport({ branding, user, onNavigate }: { branding?: any, user?: any, onNavigate?: (tab: string) => void }) {
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  const handleCreateTicket = async () => {
    if (!user) {
      toast.error('Please login to create a ticket');
      return;
    }
    const existingTicket = localStorage.getItem('activeSupportTicket');
    if (existingTicket && onNavigate) {
      onNavigate('support_chat');
      return;
    }
    
    setIsCreatingTicket(true);
    const ticketId = `ticket_${user.uid}_${Date.now()}`;
    try {
      const ticketRef = doc(db, 'channels_config', ticketId);
      await setDoc(ticketRef, {
        id: ticketId,
        name: `Support: ${user.displayName || user.email}`,
        iconName: 'HelpCircle',
        description: 'In-app support ticket',
        order: 9999,
        isSupportTicket: true,
        ticketOwnerId: user.uid,
        permissions: {
          roles: { everyone: { view: false, send: false, delete: false } },
          users: { [user.uid]: { view: true, send: true, delete: false } }
        }
      });
      localStorage.setItem('activeSupportTicket', ticketId);
      if (onNavigate) {
        onNavigate('support_chat');
      }
    } catch (e) {
      console.error('Failed to create ticket', e);
      toast.error('Failed to create ticket');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 space-y-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black tracking-tight mb-4 text-gray-900 dark:text-white">Help & Support</h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">How can we assist you today?</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-2xl p-8 flex flex-col items-center text-center hover:border-indigo-500/50 transition-colors shadow-sm">
          <Headphones size={40} className="text-indigo-500 mb-4" />
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Live Chat & Tickets</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">Create a ticket to chat directly with our support team regarding payments, classes, or technical issues.</p>
          <button 
            onClick={handleCreateTicket}
            disabled={isCreatingTicket}
            className="px-6 py-2 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition disabled:opacity-50 flex items-center gap-2"
          >
            {isCreatingTicket && <Loader2 size={16} className="animate-spin" />}
            {isCreatingTicket ? 'Creating...' : 'Raise a Ticket / Live Chat'}
          </button>
        </div>
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-2xl p-8 flex flex-col items-center text-center hover:border-[#25D366]/50 transition-colors shadow-sm">
          <MessageCircleIcon size={40} className="text-[#25D366] mb-4" />
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">WhatsApp Support</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">Chat with our admins directly on WhatsApp for quick help and general inquiries.</p>
          <button 
            onClick={() => {
              const wsValue = branding?.whatsapp || import.meta.env.VITE_WHATSAPP_SUPPORT || 'https://wa.me/919876543210';
              const prefilledMessage = encodeURIComponent('Hello Admin, I want to report an issue/need help.');
              const finalUrl = wsValue.includes('?') ? `${wsValue}&text=${prefilledMessage}` : `${wsValue}?text=${prefilledMessage}`;
              window.open(finalUrl, '_blank');
            }}
            className="px-6 py-2 bg-[#25D366] text-white font-medium rounded-lg hover:bg-[#20bd5a] transition"
          >
            Chat on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

export function TabFAQs() {
  const faqs = [
    { q: "How do I enroll in a batch?", a: "To enroll, go to the 'Join Programs' tab, select your desired batch, and complete the enrollment form. Once verified, you will receive access." },
    { q: "Where can I find the study materials?", a: "Study materials are available under 'My Batch' once you are enrolled. You can find PDFs, videos, and class notes there." },
    { q: "Is the fee refundable?", a: "Please refer to our refund policy. Generally, fees are non-refundable after the first 7 days of enrollment." },
    { q: "How do I take practice tests?", a: "Navigate to the 'Tests' tab from your dashboard. Available mock tests and quizzes for your enrolled subjects will be listed there." },
    { q: "Can I access classes on mobile?", a: "Yes, our web application is fully mobile-responsive. Native Android and iOS apps are also coming soon." },
  ];

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black tracking-tight mb-4 text-gray-900 dark:text-white">Common FAQs</h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">Find answers to the most common questions.</p>
      </div>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-bold flex items-start gap-3 mb-2 text-gray-900 dark:text-white">
              <HelpCircle className="text-indigo-500 shrink-0 mt-0.5" size={20} />
              {faq.q}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 pl-8">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TabContactUs({ branding }: { branding: any }) {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black tracking-tight mb-4 text-gray-900 dark:text-white">Contact Us</h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">We'd love to hear from you.</p>
      </div>
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 p-8 rounded-2xl shadow-sm">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center">
              <Mail className="text-indigo-500 dark:text-indigo-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Email Address</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{branding?.contactEmail || branding?.email || 'support@advancedclasses.com'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center">
              <Phone className="text-emerald-500 dark:text-emerald-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Phone Number</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{branding?.contactPhone || branding?.phone || '+91 98765 43210'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/20 flex items-center justify-center">
              <MapPin className="text-rose-500 dark:text-rose-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Location</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{branding?.contactAddress || branding?.address || 'Advanced Classes, Near xyz, Sonai ASSAM pin xyxyxy'}</p>
              <div className="mt-2 space-y-1">
                {branding?.branches?.length > 0 ? (
                  branding.branches.map((branch: any, i: number) => (
                    <div key={i} className="mb-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-bold">• Branch: {branch.name}</p>
                      {branch.address && <p className="text-xs text-gray-500 pl-4">{branch.address}</p>}
                      {branch.locationUrl && (
                        <a href={branch.locationUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:text-indigo-600 font-medium pl-4 flex items-center gap-1 mt-1">
                          <MapPin size={12} /> View on Map
                        </a>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-bold">• Branch: Main Campus</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TabPrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black tracking-tight mb-4 text-gray-900 dark:text-white">Privacy Policy</h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">Your data protection is our priority.</p>
      </div>
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 p-8 rounded-2xl shadow-sm prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-300">
        <h3>1. Information We Collect</h3>
        <p>We collect information that you provide directly to us, such as when you create an account, enroll in a batch, or communicate with us.</p>
        
        <h3>2. How We Use Your Information</h3>
        <p>We use the information we collect to provide, maintain, and improve our services, to process transactions, and to communicate with you.</p>
        
        <h3>3. Data Security</h3>
        <p>We implement security measures to protect your personal information. However, no security system is impenetrable and we cannot guarantee the security of our database.</p>
        
        <h3>4. Contact Us</h3>
        <p>If you have any questions about this Privacy Policy, please contact our support team.</p>
      </div>
    </div>
  );
}
