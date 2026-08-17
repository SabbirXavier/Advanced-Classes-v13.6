import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Settings, 
  Save, 
  RefreshCw, 
  Plus,
  Trash2,
  Image as ImageIcon,
  Users,
  Trophy,
  Layout,
  Upload,
  X,
  Star,
  GripVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { landingService, LandingConfig, Achiever, Faculty, Program, Review } from '../services/landingService';
import { storageService } from '../services/storageService';
import { firestoreService, handleFirestoreError, OperationType } from '../services/firestoreService';
import toast from 'react-hot-toast';

export default function AdminLandingDashboard() {
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [achievers, setAchievers] = useState<Achiever[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState<'config' | 'achievers' | 'faculty' | 'programs' | 'reviews'>('config');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  useEffect(() => {
    const unsubConfig = landingService.listenToConfig(setConfig, (error) => {
      handleFirestoreError(error, OperationType.GET, 'landing_config');
    });
    const unsubAchievers = landingService.listenToAchievers(setAchievers, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'achievers');
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
      unsubConfig();
      unsubAchievers();
      unsubFaculty();
      unsubPrograms();
      unsubReviews();
    };
  }, []);

  const handleSaveConfig = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      await landingService.updateConfig(config);
      toast.success('Landing config saved!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'landing_config');
      toast.error('Failed to save config');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File, callback: (url: string) => void) => {
    try {
      setUploadProgress(0);
      const uploadResult = storageService.uploadFile(file, setUploadProgress);
      const metadata = await uploadResult.promise;
      callback(metadata.url);
      setUploadProgress(null);
      toast.success('Photo uploaded!');
    } catch (err) {
      console.error(err);
      setUploadProgress(null);
      toast.error('Upload failed');
    }
  };

  if (!config) return <div className="flex justify-center py-12"><RefreshCw className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
            <Layout size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold">Landing Page Manager</h3>
            <p className="text-xs text-gray-500">Manage achievers, faculty, and site copy</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/10 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2">
            <span className="opacity-50 select-none">URL:</span>
            <span>{window.location.origin}/landing</span>
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/landing`);
              toast.success('Landing Page Link Copied!');
            }}
            className="px-3 py-1.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg text-xs font-bold hover:bg-[var(--primary)]/20 transition-all"
          >
            Copy Link
          </button>
          <button 
            onClick={() => window.open('/landing', '_blank')}
            className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-xs font-bold hover:opacity-90 transition-all"
          >
            Visit Page
          </button>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'config' ? 'bg-white dark:bg-gray-800 text-[var(--primary)] shadow-sm' : 'text-gray-500'}`}
        >
          <Settings size={14} /> Main Copy
        </button>
        <button 
          onClick={() => setActiveTab('achievers')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'achievers' ? 'bg-white dark:bg-gray-800 text-[var(--primary)] shadow-sm' : 'text-gray-500'}`}
        >
          <Trophy size={14} /> Achievers
        </button>
        <button 
          onClick={() => setActiveTab('faculty')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'faculty' ? 'bg-white dark:bg-gray-800 text-[var(--primary)] shadow-sm' : 'text-gray-500'}`}
        >
          <Users size={14} /> The Pillars (Faculty)
        </button>
        <button 
          onClick={() => setActiveTab('programs')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'programs' ? 'bg-white dark:bg-gray-800 text-[var(--primary)] shadow-sm' : 'text-gray-500'}`}
        >
          <Layout size={14} /> Programs
        </button>
        <button 
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'reviews' ? 'bg-white dark:bg-gray-800 text-[var(--primary)] shadow-sm' : 'text-gray-500'}`}
        >
          <Star size={14} /> Reviews
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'config' && (
          <motion.div 
            key="config"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="glass-card p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Hero Title</label>
                    <input 
                      type="text"
                      value={config.heroTitle}
                      onChange={e => setConfig({ ...config, heroTitle: e.target.value })}
                      className="w-full p-3 bg-gray-100 dark:bg-white/5 rounded-xl outline-none border border-transparent focus:border-[var(--primary)] text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Hero Subtitle</label>
                    <textarea 
                      value={config.heroSubtitle}
                      onChange={e => setConfig({ ...config, heroSubtitle: e.target.value })}
                      className="w-full p-3 bg-gray-100 dark:bg-white/5 rounded-xl outline-none border border-transparent focus:border-[var(--primary)] text-sm min-h-[100px]"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold flex items-center gap-2">
                      <ImageIcon size={16} className="text-[var(--primary)]" />
                      Hero Background Image 1
                    </label>
                    <div className="flex gap-3">
                      <input 
                        type="text"
                        value={config.heroImageUrl || ''}
                        onChange={e => setConfig({ ...config, heroImageUrl: e.target.value })}
                        className="flex-1 p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all text-xs"
                        placeholder="Image URL..."
                      />
                      <label className="p-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl cursor-pointer transition-all relative">
                        <Upload size={20} className="text-gray-500" />
                        <input type="file" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file, url => setConfig({ ...config, heroImageUrl: url }));
                        }} accept="image/*" />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold flex items-center gap-2">
                      <ImageIcon size={16} className="text-[var(--primary)]" />
                      Hero Background Image 2
                    </label>
                    <div className="flex gap-3">
                      <input 
                        type="text"
                        value={config.heroImageUrl2 || ''}
                        onChange={e => setConfig({ ...config, heroImageUrl2: e.target.value })}
                        className="flex-1 p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all text-xs"
                        placeholder="Image URL..."
                      />
                      <label className="p-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl cursor-pointer transition-all relative">
                        <Upload size={20} className="text-gray-500" />
                        <input type="file" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file, url => setConfig({ ...config, heroImageUrl2: url }));
                        }} accept="image/*" />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold flex items-center gap-2">
                      <ImageIcon size={16} className="text-[var(--primary)]" />
                      Hero Background Image 3
                    </label>
                    <div className="flex gap-3">
                      <input 
                        type="text"
                        value={config.heroImageUrl3 || ''}
                        onChange={e => setConfig({ ...config, heroImageUrl3: e.target.value })}
                        className="flex-1 p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all text-xs"
                        placeholder="Image URL..."
                      />
                      <label className="p-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl cursor-pointer transition-all relative">
                        <Upload size={20} className="text-gray-500" />
                        <input type="file" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file, url => setConfig({ ...config, heroImageUrl3: url }));
                        }} accept="image/*" />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold flex items-center gap-2">
                      <ImageIcon size={16} className="text-[var(--primary)]" />
                      About Section Image
                    </label>
                    <div className="flex gap-3">
                      <input 
                        type="text"
                        value={config.aboutImageUrl || ''}
                        onChange={e => setConfig({ ...config, aboutImageUrl: e.target.value })}
                        className="flex-1 p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all text-xs"
                        placeholder="Image URL..."
                      />
                      <label className="p-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl cursor-pointer transition-all relative">
                        <Upload size={20} className="text-gray-500" />
                        <input type="file" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file, url => setConfig({ ...config, aboutImageUrl: url }));
                        }} accept="image/*" />
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                    <h4 className="text-sm font-black uppercase text-indigo-500 mb-4">🏠 Home Page Slider (Auth)</h4>
                    <div className="space-y-6">
                      {[1, 2, 3].map(num => (
                        <div key={num} className="space-y-2">
                          <label className="text-xs font-bold text-gray-500">Home Slider Image {num}</label>
                          <div className="flex gap-3">
                            <input 
                              type="text"
                              value={(config as any)[`homeHeroImageUrl${num === 1 ? '' : num}`] || ''}
                              onChange={e => setConfig({ ...config, [`homeHeroImageUrl${num === 1 ? '' : num}`]: e.target.value })}
                              className="flex-1 p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all text-xs"
                              placeholder="Home Page Image URL..."
                            />
                            <label className="p-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl cursor-pointer transition-all relative">
                              <Upload size={20} className="text-gray-500" />
                              <input type="file" className="hidden" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhotoUpload(file, url => setConfig({ ...config, [`homeHeroImageUrl${num === 1 ? '' : num}`]: url }));
                              }} accept="image/*" />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">Stats Indicators</h4>
                  <button 
                    onClick={() => setConfig({ ...config, stats: [...config.stats, { label: '', value: '' }] })}
                    className="p-1.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg hover:bg-[var(--primary)]/20 transition-all"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {config.stats.map((stat, i) => (
                    <div key={i} className="p-4 bg-gray-100 dark:bg-white/5 rounded-2xl relative group">
                      <button 
                        onClick={() => setConfig({ ...config, stats: config.stats.filter((_, idx) => idx !== i) })}
                        className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X size={12} />
                      </button>
                      <input 
                        placeholder="Value (e.g. 98%)"
                        value={stat.value}
                        onChange={e => {
                          const newStats = [...config.stats];
                          newStats[i].value = e.target.value;
                          setConfig({ ...config, stats: newStats });
                        }}
                        className="w-full bg-transparent border-none outline-none font-black text-xl mb-1"
                      />
                      <textarea 
                        placeholder="Label (e.g. Success Rate)"
                        value={stat.label}
                        onChange={e => {
                          const newStats = [...config.stats];
                          newStats[i].label = e.target.value;
                          setConfig({ ...config, stats: newStats });
                        }}
                        className="w-full bg-transparent border-none outline-none text-[10px] uppercase font-bold opacity-60 min-h-[40px] leading-tight"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">Features</h4>
                  <button 
                    onClick={() => setConfig({ ...config, features: [...config.features, { title: '', description: '', icon: 'Zap' }] })}
                    className="p-1.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg hover:bg-[var(--primary)]/20 transition-all"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {config.features.map((feature, i) => (
                    <div key={i} className="p-5 bg-gray-100 dark:bg-white/5 rounded-2xl relative group space-y-3">
                      <button 
                        onClick={() => setConfig({ ...config, features: config.features.filter((_, idx) => idx !== i) })}
                        className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X size={12} />
                      </button>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold opacity-50 uppercase flex items-center gap-2">
                          <ImageIcon size={12} /> Feature Image (Optional)
                        </label>
                        <div className="flex gap-2">
                          <input 
                            placeholder="Image URL"
                            value={feature.imageUrl || ''}
                            onChange={e => {
                              const newFeatures = [...config.features];
                              newFeatures[i].imageUrl = e.target.value;
                              setConfig({ ...config, features: newFeatures });
                            }}
                            className="flex-1 bg-white dark:bg-gray-800 p-2 rounded-lg text-xs outline-none border border-transparent focus:border-[var(--primary)]"
                          />
                          <label className="p-2 bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg cursor-pointer transition-all relative">
                            <Upload size={14} className="text-gray-500" />
                            <input type="file" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) handlePhotoUpload(file, url => {
                                const newFeatures = [...config.features];
                                newFeatures[i].imageUrl = url;
                                setConfig({ ...config, features: newFeatures });
                              });
                            }} accept="image/*" />
                          </label>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <select 
                          value={feature.icon}
                          onChange={e => {
                            const newFeatures = [...config.features];
                            newFeatures[i].icon = e.target.value;
                            setConfig({ ...config, features: newFeatures });
                          }}
                          className="bg-white dark:bg-gray-800 p-2 rounded-lg text-xs outline-none border border-transparent focus:border-[var(--primary)] text-[var(--primary)] font-bold"
                        >
                          <option value="Zap">Zap</option>
                          <option value="Brain">Brain</option>
                          <option value="Radio">Radio</option>
                          <option value="MessageSquare">MessageSquare</option>
                          <option value="Star">Star</option>
                          <option value="ShieldCheck">Shield</option>
                          <option value="Target">Target</option>
                          <option value="Clock">Clock</option>
                        </select>
                        <input 
                          placeholder="Feature Title"
                          value={feature.title}
                          onChange={e => {
                            const newFeatures = [...config.features];
                            newFeatures[i].title = e.target.value;
                            setConfig({ ...config, features: newFeatures });
                          }}
                          className="flex-1 bg-transparent border-none outline-none font-bold text-sm"
                        />
                      </div>
                      <textarea 
                        placeholder="Feature Description"
                        value={feature.description}
                        onChange={e => {
                          const newFeatures = [...config.features];
                          newFeatures[i].description = e.target.value;
                          setConfig({ ...config, features: newFeatures });
                        }}
                        className="w-full bg-transparent border-none outline-none text-xs opacity-70 min-h-[60px]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="w-full py-4 bg-[var(--primary)] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                Save Landing Configuration
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'achievers' && (
           <motion.div key="achievers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
             <div className="flex justify-between items-center bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-100 dark:border-white/5">
               <div>
                 <h4 className="font-bold">Managed Achievers ({achievers.length})</h4>
                 <p className="text-[10px] text-gray-500">Drag items to reorder them on the landing page.</p>
               </div>
               <button 
                 onClick={async () => {
                   await firestoreService.addItem('achievers', { 
                     name: 'New Student', 
                     rank: '1st', 
                     percentage: '95%', 
                     grade: 'XII', 
                     batch: 'Master Minds', 
                     achievementTitle: 'Letter in Physics',
                     photo: '', 
                     achievement: 'Achieved top rank in school exam', 
                     year: '2025',
                     order: achievers.length 
                   });
                 }}
                 className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-bold flex items-center gap-2"
               >
                 <Plus size={14} /> Add Achiever
               </button>
             </div>
             <div className="space-y-4">
               {achievers.map((a) => (
                 <div key={a.id} className="glass-card p-6 space-y-4 relative group/item overflow-hidden">
                   <div className="space-y-4">
                     <div className="flex flex-col sm:flex-row gap-6">
                       <div className="w-full sm:w-32 space-y-2">
                         <div className="w-full h-40 bg-gray-100 dark:bg-white/5 rounded-xl overflow-hidden relative group shrink-0">
                           {a.photo ? (
                             <img src={a.photo} className="w-full h-full object-contain" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-gray-400">
                               <ImageIcon size={32} />
                             </div>
                           )}
                           <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={e => e.stopPropagation()}>
                             <Upload size={20} className="text-white" />
                             <input type="file" className="hidden" onChange={e => {
                               const file = e.target.files?.[0];
                               if (file) handlePhotoUpload(file, url => firestoreService.updateItem('achievers', a.id!, { photo: url }));
                             }} />
                           </label>
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-bold opacity-50 uppercase">Photo URL</label>
                           <input 
                             className="w-full bg-gray-100 dark:bg-white/5 p-2 rounded-lg text-[10px] outline-none border border-transparent focus:border-[var(--primary)]" 
                             value={a.photo} 
                             onChange={e => firestoreService.updateItem('achievers', a.id!, { photo: e.target.value })}
                             placeholder="Paste Image URL" 
                           />
                         </div>
                       </div>
 
                       <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1">
                           <label className="text-[10px] font-bold opacity-50 uppercase">Order</label>
                           <input 
                             type="number"
                             className="w-full bg-gray-100 dark:bg-white/5 p-2 rounded-lg text-sm font-bold outline-none border border-transparent focus:border-[var(--primary)]" 
                             value={a.order ?? 0} 
                             onChange={e => firestoreService.updateItem('achievers', a.id!, { order: Number(e.target.value) })}
                           />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-bold opacity-50 uppercase">Full Name</label>
                           <input 
                             className="w-full bg-gray-100 dark:bg-white/5 p-2 rounded-lg text-sm font-bold outline-none border border-transparent focus:border-[var(--primary)]" 
                             value={a.name} 
                             onChange={e => firestoreService.updateItem('achievers', a.id!, { name: e.target.value })}
                             placeholder="Full Name" 
                           />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-bold opacity-50 uppercase">Achievement Title</label>
                           <input 
                             className="w-full bg-gray-100 dark:bg-white/5 p-2 rounded-lg text-sm outline-none border border-transparent focus:border-[var(--primary)]" 
                             value={a.achievementTitle} 
                             onChange={e => firestoreService.updateItem('achievers', a.id!, { achievementTitle: e.target.value })}
                             placeholder="e.g. Letter in Chemistry" 
                           />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-bold opacity-50 uppercase">Rank/Position</label>
                           <input 
                             className="w-full bg-gray-100 dark:bg-white/5 p-2 rounded-lg text-sm outline-none border border-transparent focus:border-[var(--primary)]" 
                             value={a.rank} 
                             onChange={e => firestoreService.updateItem('achievers', a.id!, { rank: e.target.value })}
                             placeholder="e.g. 1st / District Top" 
                           />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-bold opacity-50 uppercase">Percentage/Score</label>
                           <input 
                             className="w-full bg-gray-100 dark:bg-white/5 p-2 rounded-lg text-sm outline-none border border-transparent focus:border-[var(--primary)]" 
                             value={a.percentage} 
                             onChange={e => firestoreService.updateItem('achievers', a.id!, { percentage: e.target.value })}
                             placeholder="e.g. 98.4%" 
                           />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-bold opacity-50 uppercase">Batch Name</label>
                           <input 
                             className="w-full bg-gray-100 dark:bg-white/5 p-2 rounded-lg text-sm outline-none border border-transparent focus:border-[var(--primary)]" 
                             value={a.batch} 
                             onChange={e => firestoreService.updateItem('achievers', a.id!, { batch: e.target.value })}
                             placeholder="e.g. NEET 2026 / Master Minds" 
                           />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] font-bold opacity-50 uppercase">Class/Grade</label>
                           <input 
                             className="w-full bg-gray-100 dark:bg-white/5 p-2 rounded-lg text-sm outline-none border border-transparent focus:border-[var(--primary)]" 
                             value={a.grade} 
                             onChange={e => firestoreService.updateItem('achievers', a.id!, { grade: e.target.value })}
                             placeholder="e.g. XII" 
                           />
                         </div>
                         <div className="space-y-1 md:col-span-2">
                           <label className="text-[10px] font-bold opacity-50 uppercase">Detailed Achievement Note</label>
                           <textarea 
                             className="w-full bg-gray-100 dark:bg-white/5 p-2 rounded-lg text-xs outline-none border border-transparent focus:border-[var(--primary)] min-h-[60px]" 
                             value={a.achievement} 
                             onChange={e => firestoreService.updateItem('achievers', a.id!, { achievement: e.target.value })}
                             placeholder="Description of achievement" 
                           />
                         </div>
                       </div>
                     </div>
                     <div className="flex gap-2">
                      <button onClick={() => firestoreService.deleteItem('achievers', a.id!)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 text-xs font-bold w-full"><Trash2 size={14} /> Remove Student Record</button>
                     </div>
                   </div>
                  </div>
               ))}
             </div>
           </motion.div>
        )}

        {activeTab === 'faculty' && (
           <motion.div key="faculty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
             <div className="flex justify-between items-center bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-100 dark:border-white/5">
               <div>
                 <h4 className="font-bold">The Pillars ({faculty.length})</h4>
                 <p className="text-[10px] text-gray-500">Drag items to reorder them on the landing page.</p>
               </div>
               <button 
                 onClick={async () => {
                   await firestoreService.addItem('faculty', { name: 'New Pillar', degree: 'Subject Expert', experience: '5+ Years', photo: '', subjects: [], achievement: '', order: faculty.length });
                 }}
                 className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-bold flex items-center gap-2"
               >
                 <Plus size={14} /> Add Pillar
               </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {faculty.map((f) => (
                 <div key={f.id} className="glass-card p-4 space-y-4 relative overflow-hidden">
                   <div className="flex gap-4">
                     <div className="w-24 space-y-2">
                       <div className="w-full h-28 bg-gray-100 dark:bg-white/5 rounded-xl overflow-hidden relative group shrink-0">
                         {f.photo ? (
                           <img src={f.photo} className="w-full h-full object-contain" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-gray-400">
                             <ImageIcon size={24} />
                           </div>
                         )}
                         <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={e => e.stopPropagation()}>
                           <Upload size={16} className="text-white" />
                           <input type="file" className="hidden" onChange={e => {
                             const file = e.target.files?.[0];
                             if (file) handlePhotoUpload(file, url => firestoreService.updateItem('faculty', f.id!, { photo: url }));
                           }} />
                         </label>
                       </div>
                       <input 
                         onClick={e => e.stopPropagation()}
                         className="w-full bg-gray-100 dark:bg-white/5 p-1 rounded text-[8px] outline-none border border-transparent focus:border-[var(--primary)]" 
                         value={f.photo} 
                         onChange={e => firestoreService.updateItem('faculty', f.id!, { photo: e.target.value })}
                         placeholder="Photo URL" 
                       />
                     </div>
                     <div className="flex-1 space-y-2">
                       <input 
                         className="w-full bg-transparent font-bold border-b border-white/5 focus:border-[var(--primary)] outline-none" 
                         value={f.name} 
                         onChange={e => firestoreService.updateItem('faculty', f.id!, { name: e.target.value })}
                         placeholder="Name" 
                       />
                       <div className="flex items-center gap-2">
                         <label className="text-[8px] font-bold opacity-50 uppercase">Order:</label>
                         <input 
                           type="number"
                           className="flex-1 bg-gray-100 dark:bg-white/5 p-1 rounded text-xs outline-none border border-transparent focus:border-[var(--primary)]" 
                           value={f.order ?? 0} 
                           onChange={e => firestoreService.updateItem('faculty', f.id!, { order: Number(e.target.value) })}
                         />
                       </div>
                       <input 
                         onClick={e => e.stopPropagation()}
                         className="w-full bg-transparent text-xs border-b border-white/5 focus:border-[var(--primary)] outline-none text-rose-500 font-bold" 
                         value={f.memberRole || ''} 
                         onChange={e => firestoreService.updateItem('faculty', f.id!, { memberRole: e.target.value })}
                         placeholder="Member Role (e.g. Founder, Admin)" 
                       />
                       <input 
                         onClick={e => e.stopPropagation()}
                         className="w-full bg-transparent text-xs border-b border-white/5 focus:border-[var(--primary)] outline-none text-indigo-500 font-bold" 
                         value={f.designationLabel || ''} 
                         onChange={e => firestoreService.updateItem('faculty', f.id!, { designationLabel: e.target.value })}
                         placeholder="Designation Label" 
                       />
                       <input 
                         onClick={e => e.stopPropagation()}
                         className="w-full bg-transparent text-xs border-b border-white/5 focus:border-[var(--primary)] outline-none" 
                         value={f.degree} 
                         onChange={e => firestoreService.updateItem('faculty', f.id!, { degree: e.target.value })}
                         placeholder="Degree" 
                       />
                       <input 
                         onClick={e => e.stopPropagation()}
                         className="w-full bg-transparent text-xs border-b border-white/5 focus:border-[var(--primary)] outline-none" 
                         value={f.experience} 
                         onChange={e => firestoreService.updateItem('faculty', f.id!, { experience: e.target.value })}
                         placeholder="Years Experience" 
                       />
                       <input 
                         onClick={e => e.stopPropagation()}
                         className="w-full bg-transparent text-xs border-b border-white/5 focus:border-[var(--primary)] outline-none" 
                         value={f.studentsMentored || ''} 
                         onChange={e => firestoreService.updateItem('faculty', f.id!, { studentsMentored: e.target.value })}
                         placeholder="Students Mentored" 
                       />
                       <input 
                         onClick={e => e.stopPropagation()}
                         className="w-full bg-transparent text-xs border-b border-white/5 focus:border-[var(--primary)] outline-none" 
                         value={f.coursesDelivered || ''} 
                         onChange={e => firestoreService.updateItem('faculty', f.id!, { coursesDelivered: e.target.value })}
                         placeholder="Courses Delivered" 
                       />
                       <input 
                         onClick={e => e.stopPropagation()}
                         className="w-full bg-transparent text-xs border-b border-white/5 focus:border-[var(--primary)] outline-none" 
                         value={f.successRate || ''} 
                         onChange={e => firestoreService.updateItem('faculty', f.id!, { successRate: e.target.value })}
                         placeholder="Success Rate" 
                       />
                       <textarea 
                         onClick={e => e.stopPropagation()}
                         className="w-full bg-transparent text-[10px] border-b border-white/5 focus:border-[var(--primary)] outline-none min-h-[40px]" 
                         value={f.achievement} 
                         onChange={e => firestoreService.updateItem('faculty', f.id!, { achievement: e.target.value })}
                         placeholder="Summary/Achievements" 
                       />
                       <input 
                         onClick={e => e.stopPropagation()}
                         className="w-full bg-transparent text-xs border-b border-white/5 focus:border-[var(--primary)] outline-none text-blue-500" 
                         value={f.portfolioUrl || ''} 
                         onChange={e => firestoreService.updateItem('faculty', f.id!, { portfolioUrl: e.target.value })}
                         placeholder="Portfolio URL (Optional)" 
                       />
                     </div>
                   </div>
                   <button onClick={() => firestoreService.deleteItem('faculty', f.id!)} className="w-full py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all flex justify-center"><Trash2 size={16} /></button>
                 </div>
               ))}
             </div>
           </motion.div>
        )}

        {activeTab === 'programs' && (
           <motion.div key="programs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
             <div className="flex justify-between items-center bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-100 dark:border-white/5">
               <div>
                 <h4 className="font-bold">Home Programs ({programs.length})</h4>
                 <p className="text-[10px] text-gray-500">Enter order numbers to sort items on the home page.</p>
               </div>
               <div className="flex gap-2">
                 {programs.length === 0 && (
                   <button 
                     onClick={async () => {
                       const defaults = [
                         { title: 'Class XII Masters', subtitle: 'Physics • Chemistry • Biology • Math', tag: 'Initiate', imageUrl: '/ClosedUPDigitalBoard Teaching.png', primaryBtnText: '', secondaryBtnText: '' },
                         { title: 'Class XI Science', subtitle: 'Physics • Chemistry • Biology • Math', tag: 'Initiate', imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2070&auto=format&fit=crop', primaryBtnText: '', secondaryBtnText: '' },
                         { title: 'JEE & NEET', subtitle: 'Rigorous Problem Solving • Test Series', tag: 'Enter The Arena', imageUrl: '/Advanced Classes team.png', primaryBtnText: '', secondaryBtnText: '' },
                         { title: 'Class X Foundation', subtitle: 'Adv. Maths • Gen. Science • Gen. Maths', tag: 'Initiate', imageUrl: '/Classroom.png', primaryBtnText: '', secondaryBtnText: '' }
                       ];
                       for (let i = 0; i < defaults.length; i++) {
                         await firestoreService.addItem('programs', { ...defaults[i], order: i });
                       }
                     }}
                     className="px-4 py-2 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg text-xs font-bold flex items-center gap-2"
                   >
                     Load Defaults
                   </button>
                 )}
                 <button 
                   onClick={async () => {
                     await firestoreService.addItem('programs', { title: 'New Program', subtitle: 'Program Description', tag: 'NEW TAG', primaryBtnText: 'Enroll Now', secondaryBtnText: 'View Details', imageUrl: '', order: programs.length });
                   }}
                   className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-bold flex items-center gap-2"
                 >
                   <Plus size={14} /> Add Program
                 </button>
               </div>
             </div>
             <div className="space-y-4">
               {programs.map((p) => (
                 <div key={p.id} className="glass-card p-4 space-y-4 relative overflow-hidden">
                   <div className="flex gap-4">
                     <div className="w-24 space-y-2">
                       <div className="w-full h-28 bg-gray-100 dark:bg-white/5 rounded-xl overflow-hidden relative group shrink-0">
                         {p.imageUrl ? (
                           <img src={p.imageUrl} className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-gray-400">
                             <ImageIcon size={24} />
                           </div>
                         )}
                         <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={e => e.stopPropagation()}>
                           <Upload size={16} className="text-white" />
                           <input type="file" className="hidden" onChange={e => {
                             const file = e.target.files?.[0];
                             if (file) handlePhotoUpload(file, url => firestoreService.updateItem('programs', p.id!, { imageUrl: url }));
                           }} />
                         </label>
                       </div>
                       <input 
                         onClick={e => e.stopPropagation()}
                         className="w-full bg-gray-100 dark:bg-white/5 p-1 rounded text-[8px] outline-none border border-transparent focus:border-[var(--primary)]" 
                         value={p.imageUrl} 
                         onChange={e => firestoreService.updateItem('programs', p.id!, { imageUrl: e.target.value })}
                         placeholder="Image URL" 
                       />
                     </div>
                     <div className="flex-1 space-y-2">
                       <input 
                         className="w-full bg-transparent font-bold border-b border-white/5 focus:border-[var(--primary)] outline-none" 
                         value={p.title} 
                         onChange={e => firestoreService.updateItem('programs', p.id!, { title: e.target.value })}
                         placeholder="Title" 
                       />
                       <div className="flex items-center gap-2">
                         <label className="text-[10px] font-bold opacity-50 uppercase">Order:</label>
                         <input 
                           type="number"
                           className="flex-1 bg-gray-100 dark:bg-white/5 p-1 rounded text-xs outline-none border border-transparent focus:border-[var(--primary)]" 
                           value={p.order ?? 0} 
                           onChange={e => firestoreService.updateItem('programs', p.id!, { order: Number(e.target.value) })}
                         />
                       </div>
                       <input 
                         onClick={e => e.stopPropagation()}
                         className="w-full bg-transparent text-xs border-b border-white/5 focus:border-[var(--primary)] outline-none text-gray-500" 
                         value={p.tag} 
                         onChange={e => firestoreService.updateItem('programs', p.id!, { tag: e.target.value })}
                         placeholder="Tag (e.g., A COMPLETE ACADEMIC SYSTEM)" 
                       />
                       <textarea 
                         onClick={e => e.stopPropagation()}
                         className="w-full bg-transparent text-xs border-b border-white/5 focus:border-[var(--primary)] outline-none min-h-[40px]" 
                         value={p.subtitle} 
                         onChange={e => firestoreService.updateItem('programs', p.id!, { subtitle: e.target.value })}
                         placeholder="Subtitle / Description" 
                       />
                       <div className="flex gap-2">
                         <input 
                           onClick={e => e.stopPropagation()}
                           className="w-full bg-transparent text-xs border-b border-white/5 focus:border-[var(--primary)] outline-none" 
                           value={p.primaryBtnText} 
                           onChange={e => firestoreService.updateItem('programs', p.id!, { primaryBtnText: e.target.value })}
                           placeholder="Primary CTA" 
                         />
                         <input 
                           onClick={e => e.stopPropagation()}
                           className="w-full bg-transparent text-xs border-b border-white/5 focus:border-[var(--primary)] outline-none" 
                           value={p.secondaryBtnText} 
                           onChange={e => firestoreService.updateItem('programs', p.id!, { secondaryBtnText: e.target.value })}
                           placeholder="Secondary CTA" 
                         />
                       </div>
                     </div>
                   </div>
                   <button onClick={() => firestoreService.deleteItem('programs', p.id!)} className="w-full py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all flex justify-center"><Trash2 size={16} /></button>
                 </div>
               ))}
             </div>
           </motion.div>
        )}

        {activeTab === 'reviews' && (
           <motion.div key="reviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
             <div className="flex justify-between items-center bg-white dark:bg-[#111] p-4 rounded-xl border border-gray-100 dark:border-white/5">
               <h4 className="font-bold">Student Voices ({reviews.length})</h4>
               <div className="flex gap-2">
                 {reviews.length === 0 && (
                   <button 
                     onClick={async () => {
                       const defaults = [
                         { author: "Rahul Das", rating: 5, time: "2 weeks ago", text: "Best coaching in Sonai. The smart boards make understanding physics so much easier. Highly recommended for JEE & NEET." },
                         { author: "Sneha L.", rating: 5, time: "1 month ago", text: "Personal attention is real here. The teachers actually know where you are struggling and help you overcome it. Great environment." },
                         { author: "Aman Hussain", rating: 5, time: "3 months ago", text: "Advanced Classes transformed my result. The weekly tests and performance tracking kept me on my toes. The digital attendance system is also very modern." }
                       ];
                       for (let i = 0; i < defaults.length; i++) {
                         await firestoreService.addItem('reviews', { ...defaults[i], order: i });
                       }
                     }}
                     className="px-4 py-2 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg text-xs font-bold flex items-center gap-2"
                   >
                     Load Defaults
                   </button>
                 )}
                 <button 
                   onClick={async () => {
                     await firestoreService.addItem('reviews', { author: 'New Student', rating: 5, time: 'Just now', text: 'Great experience!', order: reviews.length });
                   }}
                   className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-bold flex items-center gap-2"
                 >
                   <Plus size={14} /> Add Review
                 </button>
               </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {reviews.map((r) => (
                 <div key={r.id} className="glass-card p-4 space-y-4 flex flex-col relative overflow-hidden">
                   <div className="flex-1 space-y-3">
                     <div className="flex gap-2 justify-between">
                       <input 
                         className="flex-1 bg-transparent font-bold border-b border-white/5 focus:border-[var(--primary)] outline-none" 
                         value={r.author} 
                         onChange={e => firestoreService.updateItem('reviews', r.id!, { author: e.target.value })}
                         placeholder="Author Name" 
                       />
                       <div className="flex flex-col items-end gap-1">
                         <input 
                           className="w-16 bg-transparent text-right font-bold text-orange-500 border-b border-white/5 focus:border-orange-500 outline-none" 
                           type="number"
                           min="1" max="5"
                           value={r.rating} 
                           onChange={e => firestoreService.updateItem('reviews', r.id!, { rating: Number(e.target.value) })}
                           placeholder="Stars" 
                         />
                         <div className="flex items-center gap-1">
                           <label className="text-[10px] font-bold opacity-50 uppercase">Order:</label>
                           <input 
                             type="number"
                             className="w-12 bg-gray-100 dark:bg-white/5 p-1 rounded text-[10px] outline-none border border-transparent focus:border-[var(--primary)]" 
                             value={r.order ?? 0} 
                             onChange={e => firestoreService.updateItem('reviews', r.id!, { order: Number(e.target.value) })}
                           />
                         </div>
                       </div>
                     </div>
                     <input 
                       className="w-full bg-transparent text-xs border-b border-white/5 focus:border-[var(--primary)] outline-none text-gray-500" 
                       value={r.time} 
                       onChange={e => firestoreService.updateItem('reviews', r.id!, { time: e.target.value })}
                       placeholder="Time (e.g. 2 weeks ago)" 
                     />
                     <textarea 
                       className="w-full bg-transparent text-sm border border-white/5 rounded-lg p-2 focus:border-[var(--primary)] outline-none min-h-[80px]" 
                       value={r.text} 
                       onChange={e => firestoreService.updateItem('reviews', r.id!, { text: e.target.value })}
                       placeholder="Review Text..." 
                     />
                   </div>
                   <button onClick={() => firestoreService.deleteItem('reviews', r.id!)} className="w-full py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all flex justify-center"><Trash2 size={16} /></button>
                 </div>
               ))}
             </div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
