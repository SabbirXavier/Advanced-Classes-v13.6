import React, { useRef, useState, useEffect } from 'react';
import { Download, Edit2, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { brandingService } from '../services/brandingService';

export default function FlexCardGenerator({ 
  user, 
  onClose,
}: { 
  user: any; 
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(true);
  const [branding, setBranding] = useState<any>(null);
  const [cardData, setCardData] = useState({
    name: user?.name || 'Faculty Name',
    role: 'Senior Educator',
    qualification: 'M.Sc., B.Ed.',
    phone: user?.phone || '+91 00000 00000',
    photoUrl: user?.photoURL || user?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`,
    bannerUrl: 'https://assets.qrcode-ai.com/software/branded-url-link-shortener/branded-url-link-shortener-og-banner.png',
    quote: 'Inspiring minds, shaping the future.',
    promoContent: 'Join the most advanced learning platform to shape your future.',
    theme: 'indigo'
  });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    brandingService.getBranding().then(res => setBranding(res));
  }, []);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, allowTaint: true, backgroundColor: null });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `FlexCard-${cardData.name}.png`;
      link.click();
    } catch (e) {
      console.error('Failed to generate image', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const themeColors = {
    indigo: { text: 'text-indigo-200', textLight: 'text-indigo-100', bg: 'bg-indigo-900', bgGlow: 'bg-indigo-400/20', border: 'border-indigo-800', dot: 'bg-indigo-400', shadow: 'shadow-indigo-900/50', cardBg: 'bg-slate-900', cardText: 'text-slate-100', footer: 'bg-slate-950', quote: 'text-indigo-300' },
    emerald: { text: 'text-emerald-200', textLight: 'text-emerald-100', bg: 'bg-emerald-900', bgGlow: 'bg-emerald-400/20', border: 'border-emerald-800', dot: 'bg-emerald-400', shadow: 'shadow-emerald-900/50', cardBg: 'bg-[#064e3b]', cardText: 'text-emerald-50', footer: 'bg-[#022c22]', quote: 'text-emerald-300' },
    rose: { text: 'text-rose-200', textLight: 'text-rose-100', bg: 'bg-rose-900', bgGlow: 'bg-rose-400/20', border: 'border-rose-800', dot: 'bg-rose-400', shadow: 'shadow-rose-900/50', cardBg: 'bg-[#4c0519]', cardText: 'text-rose-50', footer: 'bg-[#22000a]', quote: 'text-rose-300' },
    amber: { text: 'text-amber-200', textLight: 'text-amber-100', bg: 'bg-amber-900', bgGlow: 'bg-amber-400/20', border: 'border-amber-800', dot: 'bg-amber-400', shadow: 'shadow-amber-900/50', cardBg: 'bg-[#451a03]', cardText: 'text-amber-50', footer: 'bg-[#290e01]', quote: 'text-amber-300' },
    violet: { text: 'text-violet-200', textLight: 'text-violet-100', bg: 'bg-violet-900', bgGlow: 'bg-violet-400/20', border: 'border-violet-800', dot: 'bg-violet-400', shadow: 'shadow-violet-900/50', cardBg: 'bg-[#2e1065]', cardText: 'text-violet-50', footer: 'bg-[#1c083b]', quote: 'text-violet-300' },
    sky: { text: 'text-sky-200', textLight: 'text-sky-100', bg: 'bg-sky-900', bgGlow: 'bg-sky-400/20', border: 'border-sky-800', dot: 'bg-sky-400', shadow: 'shadow-sky-900/50', cardBg: 'bg-[#082f49]', cardText: 'text-sky-50', footer: 'bg-[#02182b]', quote: 'text-sky-300' },
    matrix: { text: 'text-[#0f0]', textLight: 'text-[#0f0]', bg: 'bg-black', bgGlow: 'bg-[#0f0]/20', border: 'border-[#0f0]/30', dot: 'bg-[#0f0]', shadow: 'shadow-[#0f0]/50', cardBg: 'bg-black', cardText: 'text-white', footer: 'bg-[#050505]', quote: 'text-[#0f0]' },
    synthwave: { text: 'text-fuchsia-400', textLight: 'text-fuchsia-200', bg: 'bg-fuchsia-900/50', bgGlow: 'bg-fuchsia-500/30', border: 'border-fuchsia-700', dot: 'bg-cyan-400', shadow: 'shadow-fuchsia-600/50', cardBg: 'bg-gradient-to-br from-[#2e0854] to-[#0f021e]', cardText: 'text-white', footer: 'bg-black', quote: 'text-cyan-300' }
  };
  const activeTheme = themeColors[cardData.theme as keyof typeof themeColors] || themeColors.indigo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1a1a2e] rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col lg:flex-row relative">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition">
           <X size={20} />
        </button>

        {/* Left Side - Editor */}
        <div className="flex-1 p-8 bg-gray-50 dark:bg-black/20 border-r border-gray-200 dark:border-white/5 space-y-6 overflow-y-auto max-h-[90vh]">
           <div className="flex justify-between items-center">
             <h2 className="text-xl font-bold dark:text-white uppercase tracking-tight">Flex Card Editor</h2>
             <button onClick={() => setIsEditing(!isEditing)} className="text-indigo-500 hover:text-indigo-400 p-2 bg-indigo-500/10 rounded-xl">
               <Edit2 size={16} />
             </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-1">Display Name</label>
                <input 
                  value={cardData.name} 
                  onChange={e => setCardData({...cardData, name: e.target.value})}
                  className="w-full p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-1">Designation & Role</label>
                <input 
                  value={cardData.role} 
                  onChange={e => setCardData({...cardData, role: e.target.value})}
                  className="w-full p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-1">Banner Image URL</label>
                <input 
                  value={cardData.bannerUrl} 
                  onChange={e => setCardData({...cardData, bannerUrl: e.target.value})}
                  className="w-full p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-1">Profile Photo URL</label>
                <input 
                  value={cardData.photoUrl} 
                  onChange={e => setCardData({...cardData, photoUrl: e.target.value})}
                  className="w-full p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-1">Qualifications</label>
                <input 
                  value={cardData.qualification} 
                  onChange={e => setCardData({...cardData, qualification: e.target.value})}
                  className="w-full p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-1">Contact Number</label>
                <input 
                  value={cardData.phone} 
                  onChange={e => setCardData({...cardData, phone: e.target.value})}
                  className="w-full p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-1">Inspirational Quote</label>
                <input 
                  value={cardData.quote} 
                  onChange={e => setCardData({...cardData, quote: e.target.value})}
                  className="w-full p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-1">Theme Color</label>
                <select 
                  value={cardData.theme} 
                  onChange={e => setCardData({...cardData, theme: e.target.value})}
                  className="w-full p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="indigo">Indigo / Default</option>
                  <option value="emerald">Emerald / Green</option>
                  <option value="rose">Rose / Red</option>
                  <option value="amber">Amber / Gold</option>
                  <option value="violet">Violet / Purple</option>
                  <option value="sky">Sky / Blue</option>
                  <option value="matrix">Matrix / Hacker</option>
                  <option value="synthwave">Synthwave / Retro</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-1">Institutional Message</label>
                <textarea 
                  value={cardData.promoContent} 
                  onChange={e => setCardData({...cardData, promoContent: e.target.value})}
                  className="w-full p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-colors min-h-[80px]"
                />
              </div>
           </div>

           <button 
             onClick={handleDownload}
             disabled={isGenerating}
             className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 rounded-2xl flex items-center justify-center gap-2 transition hover:scale-[1.02]"
           >
             {isGenerating ? 'Generating...' : <><Download size={18} /> Download HD Card</>}
           </button>
        </div>

        {/* Right Side - Live Preview */}
        <div className="flex-1 p-8 flex items-center justify-center bg-gray-100 dark:bg-[#0f0f1a] relative overflow-hidden min-h-[700px]">
           {/* Decorative Blobs */}
           <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
           <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/20 blur-[80px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>
           
           {/* The Target Card Wrapper designed perfectly */}
           <div 
             ref={cardRef} 
             className={`w-[420px] h-[600px] rounded-[32px] relative shadow-2xl ${activeTheme.shadow} flex flex-col ${activeTheme.cardBg} ${activeTheme.cardText} overflow-hidden`}
           >
             {/* Dynamic Dot Pattern overlay */}
             <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at center, #000000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
             
             {/* Header / Banner */}
             <div className="h-[220px] w-full relative group/banner">
                {cardData.bannerUrl && (
                    <img src={cardData.bannerUrl} className="w-full h-full object-cover" crossOrigin="anonymous" alt="Banner" />
                )}
                {isEditing && (
                  <button 
                    onClick={() => {
                      const url = window.prompt("Enter new Banner Image URL:", cardData.bannerUrl);
                      if (url) setCardData({ ...cardData, bannerUrl: url });
                    }}
                    className="absolute inset-0 m-auto w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover/banner:opacity-100 transition-opacity z-20 hover:bg-black/70"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#f8fafc] via-transparent to-black/60" />
                <div className="absolute top-6 left-6 flex items-center justify-between z-10 w-[calc(100%-48px)]">
                   {branding?.logo ? (
                     <img src={branding.logo} className="h-10 object-contain drop-shadow-md" crossOrigin="anonymous" />
                   ) : (
                     <span className="font-black tracking-widest text-white uppercase drop-shadow-lg text-xl">{branding?.entityName || branding?.title || 'Academy'}</span>
                   )}
                   <span className="text-[10px] font-black text-white bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full uppercase tracking-widest border border-white/10 shadow-lg">ID CARD</span>
                </div>
             </div>

             {/* Profile Image - Overlapping banner */}
             <div className="absolute top-32 left-8 w-[140px] h-[140px] rounded-3xl border-4 border-[#f8fafc] shadow-2xl bg-white z-20 rotate-3 transition-transform hover:rotate-0 group/photo overflow-hidden">
                <img src={cardData.photoUrl} alt="Teacher" className="w-full h-full object-cover" crossOrigin="anonymous" />
                {isEditing && (
                  <button 
                    onClick={() => {
                      const url = window.prompt("Enter new Profile Photo URL:", cardData.photoUrl);
                      if (url) setCardData({ ...cardData, photoUrl: url });
                    }}
                    className="absolute inset-0 m-auto w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity z-30 hover:bg-black/70"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
             </div>

              {/* Body */}
             <div className="flex-1 mt-12 px-8 flex flex-col relative z-10">
                <h1 className="text-[32px] font-black tracking-tight leading-none mb-1">{cardData.name}</h1>
                <h2 className={`${activeTheme.text} font-bold text-sm tracking-widest uppercase mb-3`}>{cardData.role}</h2>
                <div className="text-[11px] font-black uppercase tracking-widest bg-white/10 border border-white/20 py-1.5 px-3 rounded-lg w-fit shadow-sm">
                  {cardData.qualification}
                </div>
                
                <div className="mt-5 relative">
                  <p className={`text-[15px] font-bold ${activeTheme.quote} italic leading-snug`}>"{cardData.quote}"</p>
                </div>
                
                {/* Institutional Message */}
                <div className={`mt-auto mb-6 bg-gradient-to-br ${activeTheme.bg} border ${activeTheme.border} rounded-2xl p-4 shadow-sm relative overflow-hidden`}>
                  <div className={`absolute top-0 right-0 w-16 h-16 ${activeTheme.bgGlow} blur-xl rounded-full translate-x-1/2 -translate-y-1/2`}></div>
                  <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${activeTheme.dot}`}></div>
                      <p className={`text-[9px] font-black ${activeTheme.text} uppercase tracking-widest opacity-80`}>{branding?.entityName || branding?.title || 'INSTITUTION'}</p>
                  </div>
                  <p className={`text-[13px] ${activeTheme.textLight} font-bold leading-relaxed pr-2`}>
                    {cardData.promoContent}
                  </p>
                </div>
             </div>

             {/* Footer */}
             <div className={`h-24 ${activeTheme.footer} w-full flex items-center justify-between px-8 relative z-10`}>
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/5">
                     <span className="text-white text-xl">📞</span>
                   </div>
                   <div className="text-left">
                     <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Contact Line</p>
                     <p className="text-[17px] font-black text-white tracking-wide">{cardData.phone}</p>
                   </div>
                </div>
                <div className="w-12 h-12 p-1.5 bg-white rounded-xl shadow-lg border border-slate-200">
                  {/* Basic QR code placeholder targeting WhatsApp */}
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent('https://wa.me/'+cardData.phone.replace(/[^0-9]/g, ''))}`} alt="QR" className="w-full h-full rounded" crossOrigin="anonymous" />
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

