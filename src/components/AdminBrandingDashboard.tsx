import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Image as ImageIcon, 
  Type, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Upload,
  X,
  CreditCard,
  QrCode,
  Star,
  Settings,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { brandingService, BrandingConfig } from '../services/brandingService';
import { storageService } from '../services/storageService';
import { handleFirestoreError, OperationType } from '../services/firestoreService';

export default function AdminBrandingDashboard() {
  const [config, setConfig] = useState<BrandingConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    useEffect(() => {
      const unsubscribe = brandingService.listenToBranding((newConfig) => {
        setConfig(newConfig);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'branding');
      });
      return () => unsubscribe();
    }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await brandingService.updateBranding(config);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'branding/config');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !config) return;

    try {
      setUploadProgress(0);
      const uploadResult = storageService.uploadFile(file, (progress) => {
        setUploadProgress(progress);
      });
      const metadata = await uploadResult.promise;
      setConfig({ ...config, logo: metadata.url });
      setUploadProgress(null);
    } catch (err) {
      console.error('Logo upload failed', err);
      setUploadProgress(null);
      alert('Logo upload failed. Please try again.');
    }
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw size={32} className="animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
          <Palette size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold">Site Branding</h3>
          <p className="text-xs text-gray-500">Customize the look and feel of your application</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="glass-card border border-gray-200 dark:border-white/5 p-6 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <Type size={16} className="text-gray-400" />
                Application Title
              </label>
              <input 
                type="text"
                value={config.title}
                onChange={e => setConfig({ ...config, title: e.target.value })}
                className="w-full p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all"
                placeholder="Enter site title..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <ImageIcon size={16} className="text-gray-400" />
                Logo URL or Upload
              </label>
              <div className="flex gap-3">
                <input 
                  type="text"
                  value={config.logo}
                  onChange={e => setConfig({ ...config, logo: e.target.value })}
                  className="flex-1 p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all text-sm"
                  placeholder="https://..."
                />
                <label className="p-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl cursor-pointer transition-all relative">
                  <Upload size={20} className="text-gray-500" />
                  <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                  {uploadProgress !== null && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-black/80 rounded-xl flex items-center justify-center">
                      <span className="text-[10px] font-bold">{uploadProgress}%</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <CreditCard size={16} className="text-gray-400" />
                UPI ID
              </label>
              <input 
                type="text"
                value={config.upiId || ''}
                onChange={e => setConfig({ ...config, upiId: e.target.value })}
                className="w-full p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all text-sm"
                placeholder="advancedclasses@boi"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <QrCode size={16} className="text-gray-400" />
                Payment QR Code (Custom)
              </label>
              <div className="flex gap-3">
                <input 
                  type="text"
                  value={config.qrCodeUrl || ''}
                  onChange={e => setConfig({ ...config, qrCodeUrl: e.target.value })}
                  className="flex-1 p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all text-sm"
                  placeholder="Leave empty to use auto-generated QR"
                />
                <label className="p-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl cursor-pointer transition-all relative">
                  <Upload size={20} className="text-gray-500" />
                  <input type="file" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setUploadProgress(0);
                      const uploadResult = storageService.uploadFile(file, setUploadProgress);
                      const metadata = await uploadResult.promise;
                      setConfig({ ...config, qrCodeUrl: metadata.url });
                      setUploadProgress(null);
                    } catch (err) {
                      console.error('QR upload failed', err);
                      setUploadProgress(null);
                    }
                  }} accept="image/*" />
                </label>
                {config.qrCodeUrl && (
                  <button 
                    type="button"
                    onClick={() => setConfig({ ...config, qrCodeUrl: '' })}
                    className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <Settings size={16} className="text-gray-400" />
                Navigation Bar Order (Comma separated)
              </label>
              <input 
                type="text"
                value={config.navOrder?.join(', ') || 'home, batches, routine, test, downloads, studyhub, fee, join, settings'}
                onChange={e => setConfig({ ...config, navOrder: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                className="w-full p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all text-sm font-mono"
                placeholder="home, batches, routine, test, downloads, studyhub, fee, join, settings"
              />
              <p className="text-[10px] text-gray-500">Available: home, about, exclusive, batches, routine, downloads, digital_notes, join, test, fee, studyhub, admin, settings</p>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Invoice & Identity</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold flex items-center gap-2">
                    Entity / Legal Name
                  </label>
                  <input 
                    type="text"
                    value={config.entityName || ''}
                    onChange={e => setConfig({ ...config, entityName: e.target.value })}
                    className="w-full p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all text-sm"
                    placeholder="Academy Institute Pvt. Ltd."
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold flex items-center gap-2">
                    WhatsApp Number
                  </label>
                  <input 
                    type="tel"
                    value={config.whatsapp || ''}
                    onChange={e => setConfig({ ...config, whatsapp: e.target.value })}
                    className="w-full p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all text-sm"
                    placeholder="+91 9876543210"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold flex items-center gap-2">
                    Email Address (Footer)
                  </label>
                  <input 
                    type="email"
                    value={config.contactEmail || ''}
                    onChange={e => setConfig({ ...config, contactEmail: e.target.value })}
                    className="w-full p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all text-sm"
                    placeholder="support@advancedclasses.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold flex items-center gap-2">
                    Inquiries (Phone)
                  </label>
                  <input 
                    type="tel"
                    value={config.contactPhone || ''}
                    onChange={e => setConfig({ ...config, contactPhone: e.target.value })}
                    className="w-full p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all text-sm"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  Physical Address
                </label>
                <textarea 
                  value={config.contactAddress || ''}
                  onChange={e => setConfig({ ...config, contactAddress: e.target.value })}
                  className="w-full p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all text-sm min-h-[80px]"
                  placeholder="123 Education Hub, City Center..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  Invoice Promotion footer
                </label>
                <textarea 
                  value={config.invoicePromoText || ''}
                  onChange={e => setConfig({ ...config, invoicePromoText: e.target.value })}
                  className="w-full p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all text-sm"
                  placeholder="Thank you for choosing us! Refer a friend and get 10% off."
                />
              </div>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Features & Navigation</h4>
              <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={config.enableDigitalNotesNavbar || false} 
                    onChange={e => setConfig({ ...config, enableDigitalNotesNavbar: e.target.checked })} 
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${config.enableDigitalNotesNavbar ? 'bg-[var(--primary)]' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${config.enableDigitalNotesNavbar ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <div>
                  <span className="text-sm font-bold block">Enable "Advanced Digital Notes" in Navbar</span>
                  <span className="text-xs opacity-60 block">When ON, the digital library is browsable in the main menu.<br/>When OFF, it is hidden but published notes remain accessible via direct URL.</span>
                </div>
              </label>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Offline Branches</h4>
                <button 
                  type="button"
                  onClick={() => {
                    const newBranches = [...(config.branches || [])];
                    newBranches.push({ id: Math.random().toString(36).substr(2, 9), name: '', address: '', locationUrl: '' });
                    setConfig({ ...config, branches: newBranches });
                  }}
                  className="px-3 py-1 bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all"
                >
                  + Add Branch
                </button>
              </div>
              
              <div className="space-y-4">
                {(config.branches || []).map((branch, idx) => (
                  <div key={branch.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 relative group">
                    <button 
                      type="button"
                      onClick={() => {
                        const newBranches = config.branches?.filter(b => b.id !== branch.id);
                        setConfig({ ...config, branches: newBranches });
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X size={14} />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Branch Name</label>
                        <input 
                          type="text"
                          value={branch.name}
                          onChange={e => {
                            const newBranches = [...(config.branches || [])];
                            newBranches[idx].name = e.target.value;
                            setConfig({ ...config, branches: newBranches });
                          }}
                          className="w-full p-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                          placeholder="Main Branch"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Location URL</label>
                        <input 
                          type="text"
                          value={branch.locationUrl}
                          onChange={e => {
                            const newBranches = [...(config.branches || [])];
                            newBranches[idx].locationUrl = e.target.value;
                            setConfig({ ...config, branches: newBranches });
                          }}
                          className="w-full p-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                          placeholder="https://maps.google.com/..."
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Address</label>
                        <textarea 
                          value={branch.address}
                          onChange={e => {
                            const newBranches = [...(config.branches || [])];
                            newBranches[idx].address = e.target.value;
                            setConfig({ ...config, branches: newBranches });
                          }}
                          className="w-full p-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-sm min-h-[60px]"
                          placeholder="Full physical address..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">System Deadlines</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold flex items-center gap-2">
                    Batch Auto-Removal (Day of Month)
                  </label>
                  <input 
                    type="number"
                    min="1"
                    max="31"
                    value={config.batchRemovalDay ?? ''}
                    onChange={e => setConfig({ ...config, batchRemovalDay: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    className="w-full p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all text-sm"
                  />
                  <p className="text-[10px] text-gray-500">Day students are automatically removed. Leave empty for the last day of the month (11:59:59 PM).</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold flex items-center gap-2">
                    Adv. Payment Discount (Day of Month)
                  </label>
                  <input 
                    type="number"
                    min="1"
                    max="31"
                    value={config.advancedPaymentDiscountDay || 5}
                    onChange={e => setConfig({ ...config, advancedPaymentDiscountDay: parseInt(e.target.value) })}
                    className="w-full p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all text-sm"
                  />
                  <p className="text-[10px] text-gray-500">Day by which advanced payment must be made for discount.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Advanced Analytics</h4>
              
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <Shield size={16} className="text-indigo-500" />
                  Google Analytics Code
                </label>
                <textarea 
                  value={config.googleAnalyticsCode || ''}
                  onChange={e => setConfig({ ...config, googleAnalyticsCode: e.target.value })}
                  className="w-full p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all text-sm font-mono min-h-[100px]"
                  placeholder="Paste your Google Analytics tracking code here..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <Settings size={16} className="text-gray-400" />
                  Meta Pixel Code (Ads Retargeting)
                </label>
                <textarea 
                  value={config.metaPixelCode || ''}
                  onChange={e => setConfig({ ...config, metaPixelCode: e.target.value })}
                  className="w-full p-3 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-xl outline-none transition-all text-sm font-mono min-h-[100px]"
                  placeholder="Paste your Meta Pixel code here (including <script> tags)..."
                />
                <p className="text-[10px] text-gray-500">Analytics and Tracking codes will be injected into the website header for all users.</p>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-4">
              <button 
                type="submit"
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--primary)] text-white rounded-xl font-bold shadow-lg shadow-[var(--primary)]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
              >
                {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                Save Changes
              </button>
              
              <AnimatePresence mode="wait">
                {saveStatus === 'success' && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-2 text-green-500 font-bold text-sm"
                  >
                    <CheckCircle size={18} />
                    Saved!
                  </motion.div>
                )}
                {saveStatus === 'error' && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-2 text-red-500 font-bold text-sm"
                  >
                    <AlertCircle size={18} />
                    Error
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Live Preview</h4>
          <div className="glass-card border border-gray-200 dark:border-white/5 p-8 flex flex-col items-center justify-center text-center space-y-6 bg-gradient-to-br from-gray-50 to-white dark:from-[#111] dark:to-[#0a0a0a]">
            <div className="w-24 h-24 bg-[var(--primary)] rounded-3xl flex items-center justify-center shadow-2xl shadow-[var(--primary)]/20 overflow-hidden">
              {config.logo ? (
                <img src={config.logo} alt="Logo Preview" className="w-16 h-16 object-contain" />
              ) : (
                <Palette size={48} className="text-white" />
              )}
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{config.title}</h1>
              <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto text-sm">
                This is how your application will appear to users.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
