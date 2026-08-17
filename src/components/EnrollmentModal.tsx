import React, { useState, useEffect } from 'react';
import { X, LogIn, UserPlus, Phone, Chrome, User, ArrowLeft, ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import confetti from 'canvas-confetti';
import toast, { Toaster } from 'react-hot-toast';
import { firestoreService, handleFirestoreError, OperationType } from '../services/firestoreService';
import { authService } from '../services/authService';
import { pricingService } from '../services/pricingService';
import { analyticsService } from '../services/analyticsService';

export default function EnrollmentModal({ branding }: { branding?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [whatsappError, setWhatsappError] = useState('');
  const [fees, setFees] = useState<any[]>([]);
  const [activeComboRules, setActiveComboRules] = useState<any[]>([]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'guest'>('signup');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginName, setLoginName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [pricingPreview, setPricingPreview] = useState({ totalBaseAmount: 0, discountedAmount: 0, totalAdvancedDiscount: 0, discount: 0, standardDiscount: 0, comboDiscount: 0 });
  const [payInAdvance, setPayInAdvance] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    grade: 'XII',
    whatsapp: '',
    instagram: '',
    subjects: [] as string[]
  });

  useEffect(() => {
    const handleOpen = (e: any) => {
      if (e.detail?.subjects && Array.isArray(e.detail.subjects)) {
        setFormData(prev => ({ ...prev, subjects: e.detail.subjects, grade: e.detail.grade || prev.grade }));
      } else if (e.detail?.subject) {
        setFormData(prev => ({ ...prev, subjects: [e.detail.subject], grade: e.detail.grade || prev.grade }));
      } else if (e.detail?.grade) {
        setFormData(prev => ({ ...prev, grade: e.detail.grade, subjects: [] }));
      }
      analyticsService.logEvent({
        event: 'form_open',
        page: 'enrollment',
        itemName: e.detail?.subject || 'general'
      });
      setIsOpen(true);
    };
    window.addEventListener('open-enrollment', handleOpen as EventListener);

    const unsubAuth = authService.onAuthChange((u) => {
      setUser(u);
      if (u) {
        setShowLoginPrompt(false);
      }
    });
    
    const unsubFees = firestoreService.listenToCollection('fees', setFees, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'fees');
    });
    
    pricingService.getPricingRules().then(rules => {
      setActiveComboRules(rules.filter(r => r.type === 'combo' && r.isActive !== false && r.name && r.action?.value));
    });

    return () => {
      window.removeEventListener('open-enrollment', handleOpen as EventListener);
      unsubAuth();
      unsubFees();
    };
  }, []);

  const handleSubjectToggle = (subject: string) => {
    const isSelected = !formData.subjects.includes(subject);
    analyticsService.logEvent({
      event: 'click',
      section: 'enrollment_form',
      itemName: subject,
      itemId: isSelected ? 'select' : 'deselect'
    });
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject) 
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  useEffect(() => {
    let active = true;

    const refreshPricingPreview = async () => {
      if (formData.subjects.length === 0 || fees.length === 0) {
        if (active) {
          setPricingPreview({ totalBaseAmount: 0, discountedAmount: 0, totalAdvancedDiscount: 0, discount: 0, standardDiscount: 0, comboDiscount: 0 });
        }
        return;
      }

      try {
        const quote = await pricingService.calculateQuote({
          subjects: formData.subjects,
          grade: formData.grade,
          feeItems: fees,
          payInAdvance
        });
        if (active) {
          setPricingPreview({
            totalBaseAmount: quote.totalBaseAmount,
            discountedAmount: quote.discountedAmount,
            totalAdvancedDiscount: quote.totalAdvancedDiscount || 0,
            discount: quote.discount,
            standardDiscount: quote.standardDiscount,
            comboDiscount: quote.comboDiscount
          });
        }
      } catch (error) {
        console.error('Failed to calculate pricing preview', error);
        const selectedFees = fees.filter(f => formData.subjects.includes(f.subject));
        const totalBaseAmount = selectedFees.reduce((sum, f) => sum + (Number(f.originalPrice) || 0), 0);
        let discountedAmount = selectedFees.reduce((sum, f) => sum + ((Number(f.originalPrice) || 0) - (Number(f.discount) || 0)), 0);
        const totalAdvancedDiscount = selectedFees.reduce((sum, f) => sum + (Number(f.advancedPaymentDiscount) || 0), 0);
        const standardDiscount = totalBaseAmount - discountedAmount;
        if (payInAdvance) {
          discountedAmount = Math.max(0, discountedAmount - totalAdvancedDiscount);
        }
        if (active) {
          setPricingPreview({ totalBaseAmount, discountedAmount, totalAdvancedDiscount, discount: Math.max(0, totalBaseAmount - discountedAmount), standardDiscount, comboDiscount: 0 });
        }
      }
    };

    refreshPricingPreview();

    return () => {
      active = false;
    };
  }, [fees, formData.grade, formData.subjects, payInAdvance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhatsappError('');

    if (!user) {
      setShowLoginPrompt(true);
      setAuthMode('signup');
      return;
    }

    if (!formData.name || formData.subjects.length === 0) {
      toast.error('Please enter a name and select at least one subject.');
      return;
    }
    
    const phone = formData.whatsapp.replace(/\D/g, '');
    if (phone.length !== 10 || !/^[6-9]/.test(phone)) {
      setWhatsappError('Invalid phone number. Please enter a valid 10-digit mobile number.');
      return;
    }

    const toastId = toast.loading('Processing enrollment...', { id: 'enrollment' });

    try {
      const enrollmentData = {
        name: formData.name,
        email: user?.email || '',
        grade: formData.grade,
        whatsapp: formData.whatsapp,
        instagram: formData.instagram.replace('@', ''),
        subjects: formData.subjects,
        feeStatus: 'Pending',
        updatedAt: new Date().toISOString()
      };

      let studentId = '';

      // Check for existing enrollment by email or whatsapp
      const existing = await firestoreService.findEnrollment(user?.email, formData.whatsapp) as any;

      if (existing) {
        studentId = existing.id;
        // Update existing enrollment using transaction to preserve history
        const enrollRef = doc(db, 'enrollments', studentId);
        
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(enrollRef);
          if (!snap.exists()) throw new Error("Enrollment not found");
          
          const currentData = snap.data() as any;
          transaction.update(enrollRef, {
            ...enrollmentData,
            paymentHistory: currentData.paymentHistory || [],
            createdAt: currentData.createdAt || enrollmentData.updatedAt,
            updatedAt: serverTimestamp()
          });
        });
      } else {
        // Create new enrollment
        studentId = await firestoreService.addItem('enrollments', {
          ...enrollmentData,
          createdAt: new Date().toISOString()
        }) ?? '';
      }

      // Stage 2: Ledger Generation
      if (studentId) {
        toast.loading('Generating ledger...', { id: toastId });
        await pricingService.generateStudentLedgerAsync(studentId, enrollmentData, pricingPreview)
          .catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `student_monthly_fee_ledger/${studentId}`);
            console.error("Ledger generation failed:", err);
          });
      }

      toast.success(existing ? 'Enrollment Updated! 🔄' : 'Seat Locked! 🚀', { id: toastId });

      analyticsService.logEvent({
        event: 'form_submit',
        page: 'enrollment',
        section: formData.grade,
        itemName: formData.subjects.join(', ')
      });

      setIsOpen(false);
      setFormData({ name: '', grade: 'XII', whatsapp: '', instagram: '', subjects: [] });
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#10b981', '#f59e0b']
      });
    } catch (err) {
      console.error("Enrollment error trace:", err);
      // Attempt to extract more info
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      toast.error(`Error: ${errorMessage.substring(0, 50)}${errorMessage.length > 50 ? '...' : ''}`, { id: toastId });
      
      try {
        handleFirestoreError(err, OperationType.WRITE, 'enrollments');
      } catch (innerErr) {
        // Just log it, don't crash the UI further
        console.error("Firestore logging failed:", innerErr);
      }
    }
  };

  const getSubjectsForGrade = (grade: string) => {
    return fees
      .filter(f => {
        if (f.grades && Array.isArray(f.grades)) {
          return f.grades.includes(grade);
        }
        return !f.grade || f.grade === grade;
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(f => f.subject);
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await authService.signInWithGoogle();
      toast.success('Logged in with Google!');
    } catch (err: any) {
      console.error("Google Login Error:", err);
      toast.error(err.message || 'Google login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    setPasswordError('');

    if (loginPhone.length < 10) {
      setPhoneError('Please enter a valid 10-digit number');
      return;
    }
    if (loginPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setIsLoggingIn(true);
    try {
      if (authMode === 'signup') {
        if (!loginName) {
          toast.error('Please enter your name');
          return;
        }
        await authService.signUpWithPhoneAndPassword(loginPhone, loginPassword, loginName);
        toast.success('Account created successfully!');
      } else {
        await authService.signInWithPhoneAndPassword(loginPhone, loginPassword);
        toast.success('Logged in successfully!');
      }
    } catch (err: any) {
      console.error(err);
      const errorCode = err.code || '';
      
      if (errorCode.includes('email-already-in-use')) {
        setPhoneError('This number is already registered');
      } else if (errorCode.includes('user-not-found')) {
        setPhoneError('No account found with this number');
      } else if (errorCode.includes('wrong-password')) {
        setPasswordError('Incorrect password');
      } else if (errorCode.includes('invalid-email')) {
        setPhoneError('Invalid phone number format');
      } else if (errorCode.includes('weak-password')) {
        setPasswordError('Password is too weak');
      } else if (errorCode.includes('invalid-credential')) {
        toast.error('Invalid phone number or password');
      } else {
        toast.error('Authentication failed. Please try again.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginName.trim()) {
      toast.error('Please enter a display name');
      return;
    }
    setIsLoggingIn(true);
    try {
      await authService.signInAsGuest(loginName.trim());
      toast.success('Connected as Guest!');
    } catch (err) {
      console.error(err);
      toast.error('Guest login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isOpen) return null;

  const renderAuthPrompt = () => (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center mx-auto text-[var(--primary)]">
          <LogIn size={32} />
        </div>
        <h2 className="text-2xl font-bold">Registration Required</h2>
        <p className="text-sm opacity-60">Create an account to enroll in {(formData.grade || 'batch')}.</p>
      </div>

      <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-2xl">
        <button 
          onClick={() => setAuthMode('signup')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all ${authMode === 'signup' ? 'bg-white dark:bg-gray-800 text-[var(--primary)] shadow-sm' : 'text-gray-500 opacity-60 hover:opacity-100'}`}
        >
          <UserPlus size={18} />
          Sign Up
        </button>
        <button 
          onClick={() => setAuthMode('login')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all ${authMode === 'login' ? 'bg-white dark:bg-gray-800 text-[var(--primary)] shadow-sm' : 'text-gray-500 opacity-60 hover:opacity-100'}`}
        >
          <LogIn size={18} />
          Sign In
        </button>
      </div>

      {(authMode === 'login' || authMode === 'signup') && (
        <form onSubmit={handlePhoneAuth} className="space-y-4">
          {authMode === 'signup' && (
            <div>
              <label className="text-[10px] font-bold uppercase opacity-50 ml-1">Your Full Name</label>
              <input 
                type="text" 
                required 
                value={loginName} 
                onChange={e => setLoginName(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-100 dark:bg-white/10 border border-transparent focus:border-[var(--primary)] outline-none"
                placeholder="Ex: John Doe"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase opacity-50 ml-1">Phone Number</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">+91</span>
              <input 
                type="tel" 
                required 
                value={loginPhone} 
                onChange={e => {
                  setLoginPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                  setPhoneError('');
                }}
                className={`w-full p-3 pl-12 rounded-xl bg-gray-100 dark:bg-white/10 border ${phoneError ? 'border-red-500' : 'border-transparent'} focus:border-[var(--primary)] outline-none transition-colors`}
                placeholder="10-digit mobile"
              />
            </div>
            {phoneError && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold">{phoneError}</p>}
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase opacity-50 ml-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                required 
                value={loginPassword} 
                onChange={e => {
                  setLoginPassword(e.target.value);
                  setPasswordError('');
                }}
                className={`w-full p-3 rounded-xl bg-gray-100 dark:bg-white/10 border ${passwordError ? 'border-red-500' : 'border-transparent'} focus:border-[var(--primary)] outline-none transition-colors`}
                placeholder="Min 6 characters"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordError && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold">{passwordError}</p>}
          </div>

          <button 
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-4 bg-[var(--primary)] text-white rounded-2xl font-bold shadow-lg shadow-[var(--primary)]/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isLoggingIn ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200 dark:border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-wider">Other ways to join</span>
            <div className="flex-grow border-t border-gray-200 dark:border-white/10"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <Chrome size={18} className="text-red-500" />
              Google
            </button>
            <button 
              type="button"
              onClick={() => setAuthMode('guest')}
              disabled={isLoggingIn}
              className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <User size={18} className="text-blue-500" />
              Guest
            </button>
          </div>
        </form>
      )}

      {authMode === 'guest' && (
        <form onSubmit={handleGuestLogin} className="space-y-4">
          <button 
            type="button"
            onClick={() => setAuthMode('signup')}
            className="flex items-center gap-2 text-sm font-bold text-[var(--primary)] hover:underline"
          >
            <ArrowLeft size={16} />
            Back to registration
          </button>

          <div>
            <label className="text-[10px] font-bold uppercase opacity-50 ml-1">Preferred Display Name</label>
            <input 
              type="text" 
              required 
              value={loginName} 
              onChange={e => setLoginName(e.target.value)}
              className="w-full p-3 rounded-xl bg-gray-100 dark:bg-white/10 border border-transparent focus:border-[var(--primary)] outline-none"
              placeholder="Ex: Guest Student"
              autoFocus
            />
          </div>

          <button 
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold shadow-xl hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isLoggingIn ? 'Connecting...' : 'Continue as Guest'}
          </button>
          
          <p className="text-[10px] text-center opacity-40 italic">Note: Guest accounts have limited access and profiles are temporary.</p>
        </form>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Toaster position="top-center" />
      <div className="w-full max-w-md max-h-[90vh] rounded-[24px] overflow-y-auto relative bg-[#8b8b8b]/10 dark:bg-[#1f1f1f]/80 backdrop-blur-3xl p-6 shadow-2xl border border-white/30 dark:border-white/10">
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[var(--primary)]/40 to-transparent -z-10 rounded-t-[24px]"></div>
        
        <button 
          onClick={() => {
            setIsOpen(false);
            setShowLoginPrompt(false);
          }} 
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-900 dark:text-white"
        >
          <X size={20} />
        </button>

        {showLoginPrompt ? (
          renderAuthPrompt()
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4 text-[var(--primary)] flex items-center gap-2">
              <UserPlus size={24} />
              Join a Batch
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold opacity-70 mb-1 block text-gray-900 dark:text-white">Full Name *</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 focus:border-[var(--primary)] outline-none text-gray-900 dark:text-white" placeholder="Student or Friend's Name" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold opacity-70 mb-1 block text-gray-900 dark:text-white">Class *</label>
              <select value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value, subjects: []})} className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 focus:border-[var(--primary)] outline-none appearance-none [&>option]:bg-white dark:[&>option]:bg-gray-900 [&>option]:text-gray-900 dark:[&>option]:text-white text-gray-900 dark:text-white">
                {Array.from(new Set(fees.flatMap((f: any) => f.grades || (f.grade ? [f.grade] : [])))).sort().length > 0 ? (
                  Array.from(new Set(fees.flatMap((f: any) => f.grades || (f.grade ? [f.grade] : [])))).sort().map((g: any) => (
                     <option key={g} value={g}>{isNaN(Number(g)) ? `Class ${g}` : `Class ${g}`}</option>
                  ))
                ) : (
                  <>
                    <option value="XII">Class XII</option>
                    <option value="XI">Class XI</option>
                    <option value="X">Class X</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold opacity-70 mb-1 block text-gray-900 dark:text-white">Instagram Handle</label>
              <input 
                type="text" 
                value={formData.instagram} 
                onChange={e => {
                  let val = e.target.value;
                  if (val && !val.startsWith('@')) val = '@' + val;
                  setFormData({...formData, instagram: val});
                }} 
                className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 focus:border-[var(--primary)] outline-none text-gray-900 dark:text-white" 
                placeholder="@username" 
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold opacity-70 mb-1 block text-gray-900 dark:text-white">WhatsApp Number *</label>
            <input 
              type="tel" 
              required 
              value={formData.whatsapp} 
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setFormData({...formData, whatsapp: val});
                if (whatsappError) setWhatsappError('');
              }} 
              className={`w-full p-2.5 rounded-xl bg-gray-100 dark:bg-white/10 border ${whatsappError ? 'border-red-500' : 'border-gray-200 dark:border-white/10'} focus:border-[var(--primary)] outline-none transition-colors text-gray-900 dark:text-white`} 
              placeholder="10-digit mobile number" 
            />
            {whatsappError && (
              <p className="text-[10px] text-red-500 mt-1 font-bold animate-pulse">{whatsappError}</p>
            )}
          </div>

          <div className="pt-2">
            {activeComboRules.length > 0 && (
              <div className="mb-4">
                {activeComboRules.map(rule => (
                  <div key={rule.id} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-black uppercase text-green-700 dark:text-green-400 bg-green-500/20 rounded-lg border border-green-500/30 shadow-sm">
                    <span>🎁</span>
                    {rule.name}: SAVE ₹{rule.action.value}
                  </div>
                ))}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {getSubjectsForGrade(formData.grade).map(sub => (
                <div 
                  key={sub} 
                  onClick={() => handleSubjectToggle(sub)}
                  className={`py-3 px-2 rounded-xl text-xs font-bold text-center cursor-pointer border shadow-sm transition-all ${formData.subjects.includes(sub) ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20' : 'bg-gray-200/80 dark:bg-white/10 border-white/40 dark:border-white/5 opacity-90 text-gray-800 dark:text-gray-200 hover:bg-gray-300/80 dark:hover:bg-white/20'}`}
                >
                  {sub}
                </div>
              ))}
            </div>
          </div>

          {formData.subjects.length > 0 && (() => {
            const { totalBaseAmount, discountedAmount, totalAdvancedDiscount, standardDiscount, comboDiscount } = pricingPreview;
            const totalSavings = totalBaseAmount - discountedAmount;

            return (
              <div className="flex flex-col gap-4 pt-4 border-t border-gray-300 dark:border-white/10">
                {totalAdvancedDiscount > 0 && (
                  <div className="bg-gray-100/50 dark:bg-transparent rounded-xl p-0">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative mt-0.5 flex items-center justify-center w-5 h-5 border border-gray-400 dark:border-gray-500 rounded bg-white dark:bg-white/10 overflow-hidden transition-all group-hover:border-[var(--primary)] shadow-sm shrink-0">
                        <input 
                          type="checkbox" 
                          checked={payInAdvance}
                          onChange={(e) => setPayInAdvance(e.target.checked)}
                          className="absolute opacity-0 w-full h-full cursor-pointer"
                        />
                        {payInAdvance && <CheckCircle size={14} className="text-[var(--primary)]" />}
                      </div>
                      <div>
                        <div className="text-sm font-black text-gray-900 dark:text-white leading-tight">
                          I will pay in advance and get additional ₹{totalAdvancedDiscount} discount
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                          * Advanced payment discount is applicable only if fees are paid before the {branding?.advancedPaymentDiscountDay || 5}{['st', 'nd', 'rd'][(branding?.advancedPaymentDiscountDay || 5) === 1 ? 0 : (branding?.advancedPaymentDiscountDay || 5) === 2 ? 1 : (branding?.advancedPaymentDiscountDay || 5) === 3 ? 2 : 3] || 'th'} of every month.
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                <div className="border border-indigo-500/20 bg-indigo-500/5 rounded-2xl p-5 space-y-4 shadow-inner relative overflow-hidden group/breakdown">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                  
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-white uppercase tracking-tighter">Your Savings Plan</h4>
                    <span className="text-[10px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded tracking-widest uppercase">Live Quote</span>
                  </div>
                  
                  <div className="space-y-3 relative z-10">
                    {/* Step 1: Base */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[9px]">1. Original Fee</span>
                      <span className="text-gray-400 line-through font-bold">₹{totalBaseAmount}</span>
                    </div>
                  
                    {/* Step 2: Standard Discount */}
                    {standardDiscount > 0 && (
                      <div className="flex justify-between items-center text-xs animate-in slide-in-from-left duration-300">
                        <span className="text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest text-[9px]">2. After Support Discount</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 line-through font-bold text-[10px]">₹{totalBaseAmount}</span>
                          <ArrowRight size={10} className="text-gray-300" />
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">₹{totalBaseAmount - standardDiscount}</span>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Special/Combo/Advanced */}
                    {(comboDiscount > 0 || (payInAdvance && totalAdvancedDiscount > 0)) && (
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-indigo-500/10">
                        <span className="text-gray-700 dark:text-gray-300 font-black uppercase tracking-widest text-[9px]">3. Final Merit Offer</span>
                        <div className="flex items-center gap-2">
                           {standardDiscount > 0 ? (
                             <>
                               <span className="text-gray-400 line-through font-bold text-[10px]">₹{totalBaseAmount - standardDiscount}</span>
                               <ArrowRight size={10} className="text-gray-300" />
                             </>
                           ) : (
                              <>
                                <span className="text-gray-400 line-through font-bold text-[10px]">₹{totalBaseAmount}</span>
                                <ArrowRight size={10} className="text-gray-300" />
                              </>
                           )}
                           <span className="text-green-600 dark:text-green-400 font-black text-sm">₹{discountedAmount}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-indigo-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Effective Monthly Fee</span>
                        <span className="text-3xl font-black text-white leading-none mt-1">₹{discountedAmount}</span>
                      </div>
                      <div className="bg-green-500 text-white px-3 py-2 rounded-xl flex flex-col items-center justify-center shadow-lg shadow-green-500/20">
                        <span className="text-[9px] font-black uppercase tracking-tighter">Total Savings</span>
                        <span className="text-sm font-black tracking-tighter">₹{totalSavings}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-xs mt-2">
                  <span className="text-green-600 dark:text-green-500 font-bold flex items-center gap-2"><span className="text-[16px]">🏷️</span> You save ₹{totalSavings} every<br/>month</span>
                  <span className="text-green-700 dark:text-green-500 font-black flex flex-col items-end">Total Savings: <span className="text-sm">₹{totalSavings}/month</span></span>
                </div>
              </div>
            );
          })()}

          <button type="submit" className="w-full py-4 mt-6 bg-[var(--primary)] text-white rounded-xl font-black text-base shadow-lg hover:opacity-90 transition-opacity">
            Enroll Now
          </button>
          
          <div className="mt-4 text-center">
            <a 
              href="https://drive.google.com/file/d/1RrGU4_efhj6XaEuQIauOAWiy6-KZi5sr/view?usp=drivesdk" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-[var(--primary)] font-bold hover:underline"
            >
              View Payment Fee Policy
            </a>
          </div>
        </form>
      </>
    )}
  </div>
</div>
  );
}
