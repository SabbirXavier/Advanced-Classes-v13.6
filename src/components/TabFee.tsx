import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, QrCode, CreditCard, CheckCircle2, AlertCircle, Upload, Clock, Download as DownloadIcon, ExternalLink, UserPlus, Plus, Edit, Trash2, Save, X, Image as ImageIcon, FileText, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { updateDoc, doc, serverTimestamp, addDoc, collection, Timestamp, query, where, getDocs, writeBatch, onSnapshot } from 'firebase/firestore';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';
import { firestoreService, handleFirestoreError } from '../services/firestoreService';
import { pricingService } from '../services/pricingService';
import EnrollmentSection from './EnrollmentSection';
import MarkdownRenderer from './MarkdownRenderer';
import toast, { Toaster } from 'react-hot-toast';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface TabFeeProps {
  branding?: any;
}

function TabFee({ branding }: TabFeeProps) {
  const [user, setUser] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingFee, setEditingFee] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFee, setNewFee] = useState<{
    subject: string;
    originalPrice: number;
    discount: number;
    advancedPaymentDiscount: number;
    grade: string;
    grades?: string[];
  }>({
    subject: '',
    originalPrice: 0,
    discount: 0,
    advancedPaymentDiscount: 0,
    grade: 'XII',
    grades: ['XII']
  });

  useEffect(() => {
    let mounted = true;
    const loadPricing = async () => {
      try {
        const pricing = await pricingService.getSubjectPricing();
        if (mounted) setFees(pricing as any[]);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'fees');
        console.error('Failed to load subject pricing, fallback to fees collection', error);
        const fallback = await firestoreService.getCollection('fees');
        if (mounted) setFees(fallback);
      }
    };
    loadPricing();

    const unsubscribeAuth = authService.onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Check if admin
        const adminEmail1 = import.meta.env.VITE_ADMIN_EMAIL_1 || 'xavierscot3454@gmail.com';
        const adminEmail2 = import.meta.env.VITE_ADMIN_EMAIL_2 || 'helixsmith.xavy@gmail.com';
        const adminEmail3 = 'makeitawesom3@gmail.com';
        if (firebaseUser.email === adminEmail1 || firebaseUser.email === adminEmail2 || firebaseUser.email === adminEmail3) {
          setIsAdmin(true);
        }

        if (firebaseUser.email) {
          const unsubEnroll = firestoreService.listenToUserEnrollment(firebaseUser.email, (data) => {
            setEnrollment(data);
            setLoading(false);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'enrollments');
          });
          return () => {
            unsubEnroll();
          };
        }
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    let unsubLedger = () => {};
    if (enrollment && enrollment.id) {
      // Auto-sync ledger if subjects exist and we haven't synced recently or advanced discount is missing
      const shouldSync = enrollment.subjects && enrollment.subjects.length > 0;
      if (shouldSync) {
        pricingService.syncStudentLedger(enrollment.id, enrollment.subjects, enrollment.grade);
      }

      const q = query(collection(db, 'student_monthly_fee_ledger'), where('studentId', '==', enrollment.id));
      unsubLedger = onSnapshot(q, (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        data.sort((a, b) => a.month.localeCompare(b.month));
        setLedgers(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'student_monthly_fee_ledger');
      });
    }
    return () => unsubLedger();
  }, [enrollment]);

  const upiId = branding?.upiId || "advancedclasses@boi";
  const [selectedLedgers, setSelectedLedgers] = useState<any[]>([]);

  const getNetPayable = () => {
    // Priority: Explicitly selected > Next Unpaid > Current Month > Enrollment Default
    const effectiveSelected = selectedLedgers.length > 0 
      ? selectedLedgers 
      : ledgers.filter(l => l.status !== 'Clear' && l.status !== 'Paid').slice(0, 1);

    if (effectiveSelected.length > 0) {
      return effectiveSelected.reduce((acc, ledger) => {
        const [year, monthStr] = ledger.month.split('-');
        const deadlineDate = new Date(parseInt(year, 10), parseInt(monthStr, 10) - 1, branding?.advancedPaymentDiscountDay || 10, 23, 59, 59);
        const isExpired = new Date() > deadlineDate;
        const basePayable = (ledger.totalFee || 0) - (ledger.discount || 0);
        const payable = isExpired ? basePayable : basePayable - (ledger.advancedDiscount || 0);
        return acc + payable;
      }, 0);
    }
    
    // Fallback but correctly using next unpaid logic if selectable list is empty
    const nextUnpaid = ledgers.find(l => l.status !== 'Clear' && l.status !== 'Paid');
    if (nextUnpaid) {
      const [year, monthStr] = nextUnpaid.month.split('-');
      const deadlineDate = new Date(parseInt(year, 10), parseInt(monthStr, 10) - 1, branding?.advancedPaymentDiscountDay || 10, 23, 59, 59);
      const isExpired = new Date() > deadlineDate;
      const basePayable = (nextUnpaid.totalFee || 0) - (nextUnpaid.discount || 0);
      return isExpired ? basePayable : basePayable - (nextUnpaid.advancedDiscount || 0);
    }
    
    const totalFee = enrollment?.totalFee || 0;
    const discount = enrollment?.discount || 0;
    return totalFee - discount;
  }
  const netPayable = getNetPayable();

  const [isPaymentConfirmOpen, setIsPaymentConfirmOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    transactionId: '',
    screenshotUrl: '',
    notes: '',
    amount: '',
    months: [] as string[]
  });
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollment) return;
    if (!paymentData.transactionId) return toast.error('Enter transaction ID');
    if (!paymentData.screenshotUrl) return toast.error('Please upload payment screenshot');
    
    setIsSubmittingPayment(true);
    const toastId = toast.loading('Submitting payment proof...');
    
    try {
      const selectedMonths = paymentData.months.length > 0 ? paymentData.months : (selectedLedgers.length > 0 ? selectedLedgers.map(l => l.month) : []);
      
      const newPayment = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        date: new Date().toISOString(), // Keep date for backward compatibility in TabFee
        amount: paymentData.amount || netPayable.toString(),
        status: 'pending',
        transactionId: paymentData.transactionId,
        screenshot: paymentData.screenshotUrl,
        screenshotUrl: paymentData.screenshotUrl, // Consistency
        notes: paymentData.notes,
        months: selectedMonths,
        source: 'student_portal'
      };
      
      await firestoreService.submitPaymentAtomic(enrollment.id, newPayment);
      
      // Also add to global finances for admin review
      await addDoc(collection(db, 'finances'), {
        type: 'income',
        category: 'Fee',
        amount: parseFloat(paymentData.amount || netPayable.toString()),
        title: `Fee Payment: ${enrollment.name}`,
        studentId: enrollment.id || user?.uid || '',
        studentName: enrollment.name,
        transactionId: paymentData.transactionId,
        screenshotUrl: paymentData.screenshotUrl,
        selectedMonths: selectedMonths,
        notes: paymentData.notes,
        date: Timestamp.now(),
        status: 'pending',
        createdAt: serverTimestamp()
      }).catch(err => {
        handleFirestoreError(err, OperationType.CREATE, 'finances');
      });

      toast.success('Payment submitted! Admin will verify soon.', { id: toastId });
      setIsPaymentConfirmOpen(false);
      setPaymentData({ transactionId: '', screenshotUrl: '', notes: '', amount: '', months: [] });
      setSelectedLedgers([]); // Clear selection after success
    } catch (err: any) {
      console.error('Payment Submission Error:', err);
      toast.error(`Failed to submit: ${err.message || 'Check connection'}`, { id: toastId });
    } finally {
      setIsSubmittingPayment(false);
    }
  };
  const upiLink = `upi://pay?pa=${upiId}&pn=Advanced%20Classes&am=${netPayable}&cu=INR`;

  const confirmOnWhatsApp = async () => {
    if (!enrollment) return;
    
    // Record the payment in history as pending
    try {
      const paymentRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        amount: netPayable,
        status: 'pending',
        screenshot: '' // Student will send via WhatsApp
      };
      await firestoreService.submitPayment(enrollment.id, paymentRecord);
    } catch (err) {
      console.error('Failed to record payment history', err);
    }

    const msg = `*PAYMENT CONFIRMATION*
👤 Student: ${enrollment.name}
📧 Email: ${enrollment.email}
📚 Batch: ${enrollment.grade}
💰 Amount: ₹${netPayable}
✅ Status: Payment Done. Please verify.`;

    window.open(
      "https://wa.me/916001539070?text=" + encodeURIComponent(msg),
      "_blank"
    );
  };

  const downloadQR = () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(upiLink)}`;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `Payment_QR_${enrollment?.name || 'Student'}.png`;
    link.target = "_blank";
    link.click();
  };

  const handleAddFee = async () => {
    if (!newFee.subject) return;
    try {
      await pricingService.createSubjectPricing({
        ...newFee,
        finalPrice: newFee.originalPrice - newFee.discount - newFee.advancedPaymentDiscount,
      });
      const refreshed = await pricingService.getSubjectPricing();
      setFees(refreshed as any[]);
      setShowAddForm(false);
      setNewFee({ subject: '', originalPrice: 0, discount: 0, advancedPaymentDiscount: 0, grade: 'XII', grades: ['XII'] });
      toast.success('Fee added successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'fees');
      toast.error('Failed to add fee');
    }
  };

  const handleUpdateFee = async () => {
    if (!editingFee || !editingFee.subject) return;
    try {
      await pricingService.updateSubjectPricing(editingFee.id, {
        ...editingFee,
        finalPrice: editingFee.originalPrice - editingFee.discount - (editingFee.advancedPaymentDiscount || 0),
      });
      const refreshed = await pricingService.getSubjectPricing();
      setFees(refreshed as any[]);
      setEditingFee(null);
      toast.success('Fee updated successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `fees/${editingFee.id}`);
      toast.error('Failed to update fee');
    }
  };

  const handleDeleteFee = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this fee?')) return;
    try {
      await pricingService.softDeleteSubjectPricing(id);
      setFees(prev => prev.filter((f: any) => f.id !== id));
      toast.success('Fee deleted successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `fees/${id}`);
      toast.error('Failed to delete fee');
    }
  };

  if (loading) return <div className="text-center p-10 opacity-50 font-bold">Loading...</div>;

  if (!user || !enrollment) {
    return (
      <div className="space-y-6 pb-20">
        <Toaster position="top-center" />
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
              <Wallet size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-tight">FEE PAGE</h2>
              <p className="text-xs opacity-70 uppercase tracking-widest font-bold">Official Pricing & Billing</p>
              <a 
                href="https://drive.google.com/file/d/1RrGU4_efhj6XaEuQIauOAWiy6-KZi5sr/view" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-1 text-[10px] font-black text-[var(--primary)] uppercase tracking-wider hover:underline"
              >
                <FileText size={10} /> View Official 2026-27 Fee Policy
              </a>
            </div>
          </div>
          {isAdmin && (
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="p-2 bg-[var(--primary)] text-white rounded-lg hover:scale-110 transition-transform"
              title="Add New Fee"
            >
              <Plus size={20} />
            </button>
          )}
        </div>

        {isAdmin && showAddForm && (
          <div className="glass-card mb-6 border-[var(--primary)]/30">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Plus size={18} /> Add New Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <input 
                type="text" 
                placeholder="Subject Name" 
                value={newFee.subject} 
                onChange={e => setNewFee({...newFee, subject: e.target.value})}
                className="p-2 rounded bg-white/10 border border-[var(--border-color)] outline-none text-sm"
              />
              <div className="flex flex-wrap gap-2 items-center">
                {['IX', 'X', 'XI', 'XII'].map(g => (
                  <label key={g} className="flex items-center gap-1 text-xs bg-white/5 px-2 py-1 rounded border border-[var(--border-color)] cursor-pointer hover:bg-white/10">
                    <input 
                      type="checkbox" 
                      checked={(newFee.grades || [newFee.grade]).includes(g)}
                      onChange={e => {
                        const currentGrades = newFee.grades || (newFee.grade ? [newFee.grade] : []);
                        const newGrades = e.target.checked 
                          ? [...currentGrades, g]
                          : currentGrades.filter((cg: string) => cg !== g);
                        setNewFee({...newFee, grades: newGrades, grade: newGrades[0] || ''});
                      }}
                      className="rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                    {g}
                  </label>
                ))}
              </div>
              <input 
                type="number" 
                placeholder="Original Price" 
                value={newFee.originalPrice || ''} 
                onChange={e => setNewFee({...newFee, originalPrice: Number(e.target.value)})}
                className="p-2 rounded bg-white/10 border border-[var(--border-color)] outline-none text-sm"
              />
              <input 
                type="number" 
                placeholder="Discount" 
                value={newFee.discount || ''} 
                onChange={e => setNewFee({...newFee, discount: Number(e.target.value)})}
                className="p-2 rounded bg-white/10 border border-[var(--border-color)] outline-none text-sm"
              />
              <input 
                type="number" 
                placeholder="Adv. Payment Discount" 
                value={newFee.advancedPaymentDiscount || ''} 
                onChange={e => setNewFee({...newFee, advancedPaymentDiscount: Number(e.target.value)})}
                className="p-2 rounded bg-white/10 border border-[var(--border-color)] outline-none text-sm"
              />
              <div className="flex gap-2">
                <button onClick={handleAddFee} className="flex-1 bg-[var(--success)] text-white rounded-lg font-bold text-xs">Save</button>
                <button onClick={() => setShowAddForm(false)} className="px-3 bg-white/10 rounded-lg"><X size={16} /></button>
              </div>
            </div>
          </div>
        )}

        {!user && (
          <div className="glass-card bg-yellow-500/10 border-yellow-500/20 mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-yellow-600 dark:text-yellow-500">
              <AlertCircle size={20} />
              <p className="text-sm font-bold">Login to view your personalized fee structure and pay online.</p>
            </div>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'settings' }))}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-xs font-bold"
            >
              Login Now
            </button>
          </div>
        )}

        {user && !enrollment && (
          <div className="glass-card bg-blue-500/10 border-blue-500/20 mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-500">
              <AlertCircle size={20} />
              <p className="text-sm font-bold">You are not enrolled in any batch yet. Enroll now to view your fees.</p>
            </div>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('open-enrollment'))}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold"
            >
              Enroll Now
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card overflow-hidden !p-0">
              <div className="p-5 border-b border-[var(--border-color)] bg-white/5">
                <h3 className="font-bold">Subject-wise Pricing</h3>
                <p className="text-xs opacity-60">Standard rates for session 2026-27</p>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse min-w-[800px] md:min-w-0">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-[var(--border-color)] bg-gray-50 dark:bg-white/5">
                      <th className="p-4 text-xs font-bold uppercase opacity-60">Subject</th>
                      <th className="p-4 text-xs font-bold uppercase opacity-60">Class</th>
                      <th className="p-4 text-xs font-bold uppercase opacity-60">General Price</th>
                      <th className="p-4 text-xs font-bold uppercase opacity-60">Discount</th>
                      <th className="p-4 text-xs font-bold uppercase opacity-60 text-indigo-400">Adv. Discount</th>
                      <th className="p-4 text-xs font-bold uppercase opacity-60">Final Price</th>
                      {isAdmin && <th className="p-4 text-xs font-bold uppercase opacity-60 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {fees.sort((a, b) => (a.order || 0) - (b.order || 0)).map(fee => (
                      <tr key={fee.id} className="border-b border-gray-100 dark:border-[var(--border-color)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold text-gray-900 dark:text-white">
                          {editingFee?.id === fee.id ? (
                            <input 
                              type="text" 
                              value={editingFee.subject} 
                              onChange={e => setEditingFee({...editingFee, subject: e.target.value})}
                              className="w-full p-1 rounded bg-white dark:bg-white/10 border border-[var(--primary)] outline-none text-sm text-gray-900 dark:text-white"
                            />
                          ) : (
                            <div className="flex items-center gap-2 group/name">
                              <MarkdownRenderer content={fee.subject} inline />
                              {isAdmin && (
                                <button 
                                  onClick={() => setEditingFee(fee)}
                                  className="p-1 opacity-0 group-hover/name:opacity-100 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-all text-gray-400"
                                  title="Edit Subject"
                                >
                                  <Edit size={12} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4 opacity-70">
                          {editingFee?.id === fee.id ? (
                            <div className="flex flex-wrap gap-1">
                              {['IX', 'X', 'XI', 'XII'].map(g => (
                                <label key={g} className="flex items-center gap-1 text-[10px] bg-white dark:bg-white/5 px-1.5 py-0.5 rounded border border-gray-200 dark:border-[var(--border-color)] cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10">
                                  <input 
                                    type="checkbox" 
                                    checked={(editingFee.grades || [editingFee.grade]).includes(g)}
                                    onChange={e => {
                                      const currentGrades = editingFee.grades || (editingFee.grade ? [editingFee.grade] : []);
                                      const newGrades = e.target.checked 
                                        ? [...currentGrades, g]
                                        : currentGrades.filter((cg: string) => cg !== g);
                                      setEditingFee({...editingFee, grades: newGrades, grade: newGrades[0] || ''});
                                    }}
                                    className="rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)] w-3 h-3"
                                  />
                                  <span className="text-gray-700 dark:text-gray-300">{g}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {(fee.grades || [fee.grade || 'XII']).map((g: string) => (
                                <span key={g} className="bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                  {g}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-4 opacity-70 text-gray-600 dark:text-gray-400">
                          {editingFee?.id === fee.id ? (
                            <input 
                              type="number" 
                              value={editingFee.originalPrice} 
                              onChange={e => setEditingFee({...editingFee, originalPrice: Number(e.target.value)})}
                              className="w-20 p-1 rounded bg-white dark:bg-white/10 border border-[var(--primary)] outline-none text-sm text-gray-900 dark:text-white"
                            />
                          ) : (
                            `₹${fee.originalPrice}`
                          )}
                        </td>
                        <td className="p-4 text-green-600 dark:text-green-500 font-medium">
                          {editingFee?.id === fee.id ? (
                            <input 
                              type="number" 
                              value={editingFee.discount} 
                              onChange={e => setEditingFee({...editingFee, discount: Number(e.target.value)})}
                              className="w-20 p-1 rounded bg-white dark:bg-white/10 border border-[var(--primary)] outline-none text-sm text-gray-900 dark:text-white"
                            />
                          ) : (
                            `-₹${fee.discount || 0}`
                          )}
                        </td>
                        <td className="p-4 text-indigo-600 dark:text-indigo-400 font-medium">
                          {editingFee?.id === fee.id ? (
                            <input 
                              type="number" 
                              value={editingFee.advancedPaymentDiscount || 0} 
                              onChange={e => setEditingFee({...editingFee, advancedPaymentDiscount: Number(e.target.value)})}
                              className="w-20 p-1 rounded bg-white dark:bg-white/10 border border-[var(--primary)] outline-none text-sm text-gray-900 dark:text-white"
                            />
                          ) : (
                            `-₹${fee.advancedPaymentDiscount || 0}`
                          )}
                        </td>
                        <td className="p-4 text-lg font-extrabold text-[var(--primary)]">
                          ₹{editingFee?.id === fee.id ? (editingFee.originalPrice - editingFee.discount - (editingFee.advancedPaymentDiscount || 0)) : fee.finalPrice}
                        </td>
                        {isAdmin && (
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {editingFee?.id === fee.id ? (
                                <>
                                  <button onClick={handleUpdateFee} className="text-[var(--success)] p-1 hover:bg-[var(--success)]/10 rounded" title="Save">
                                    <Save size={18} />
                                  </button>
                                  <button onClick={() => setEditingFee(null)} className="text-gray-500 p-1 hover:bg-gray-500/10 rounded" title="Cancel">
                                    <X size={18} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => setEditingFee(fee)} className="text-blue-500 p-1 hover:bg-blue-500/10 rounded" title="Edit">
                                    <Edit size={18} />
                                  </button>
                                  <button onClick={() => handleDeleteFee(fee.id)} className="text-[var(--danger)] p-1 hover:bg-[var(--danger)]/10 rounded" title="Delete">
                                    <Trash2 size={18} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card bg-[var(--primary)]/5 border-[var(--primary)]/20">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] flex-shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 className="font-bold mb-1">Ready to Join?</h4>
                  <p className="text-sm opacity-80 mb-4">Select your subjects and enroll now to start your journey with us!</p>
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-enrollment'))}
                    className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-[var(--primary)]/20 transition-all flex items-center justify-center gap-2"
                  >
                    <UserPlus size={18} /> Enroll Now
                  </button>
                </div>
              </div>
            </div>

            <div className="glass-card">
              <h4 className="font-bold mb-3 text-sm uppercase tracking-wider opacity-70">Payment Methods</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-[var(--border-color)]">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <QrCode size={16} />
                  </div>
                  <span className="text-sm font-medium">UPI / QR Scan</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-[var(--border-color)]">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                    <CreditCard size={16} />
                  </div>
                  <span className="text-sm font-medium">Bank Transfer</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <EnrollmentSection branding={branding} />
      </div>
    );
  }

  const handleGenerateReceipt = async (ledger: any) => {
    const toastId = toast.loading('Generating receipt...');
    try {
      const { generateReceiptPDF } = await import('../utils/pdfGenerator');
      
      const studentName = enrollment?.name || 'Student';
      const studentEmail = user?.email || enrollment?.email || '';
      const studentPhone = enrollment?.whatsapp || '';
      const studentGrade = enrollment?.grade || '';
      const studentSubjects = enrollment?.subjects || [];
      
      await generateReceiptPDF(ledger, studentName, studentEmail, studentPhone, studentGrade, studentSubjects);
      toast.success('Receipt downloaded successfully', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate receipt', { id: toastId });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
          <Wallet size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-tight">FEE PAGE</h2>
          <p className="text-xs opacity-70 uppercase tracking-widest font-bold">Smart Billing System</p>
          <a 
            href="https://drive.google.com/file/d/1RrGU4_efhj6XaEuQIauOAWiy6-KZi5sr/view" 
            target="_blank" 
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 mt-1 text-[10px] font-black text-[var(--primary)] uppercase tracking-wider hover:underline"
          >
            <FileText size={10} /> View Official Fee Policy (RBI Compliant)
          </a>
        </div>
      </div>

      {selectedLedgers.length > 0 && (
         <div className="glass-card mb-6 overflow-hidden">
            <button onClick={() => setSelectedLedgers([])} className="mb-4 text-xs font-bold uppercase tracking-widest bg-white/10 px-4 py-2 text-[var(--primary)] border border-[var(--primary)]/30 rounded-lg hover:bg-[var(--primary)] hover:text-white transition-colors flex items-center gap-2 cursor-pointer">
               ← Clear Added Months
            </button>
            <h3 className="text-xl font-black uppercase text-[var(--primary)] mb-4">Invoice Summary</h3>
            
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-[700px] md:min-w-0">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>
                    <th className="p-3 text-xs font-black uppercase tracking-wider opacity-60">Month</th>
                    <th className="p-3 text-xs font-black uppercase tracking-wider opacity-60">Price</th>
                    <th className="p-3 text-xs font-black uppercase tracking-wider opacity-60">Discount</th>
                    <th className="p-3 text-xs font-black uppercase tracking-wider opacity-60">Adv. Discount</th>
                    <th className="p-3 text-xs font-black uppercase tracking-wider opacity-60 text-right">Payable</th>
                    <th className="p-3 text-xs font-black uppercase tracking-wider opacity-60 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {selectedLedgers.map(l => {
                    const [year, monthStr] = l.month.split('-');
                    const deadline = branding?.advancedPaymentDiscountDay || 10;
                    const deadlineDate = new Date(parseInt(year, 10), parseInt(monthStr, 10) - 1, deadline, 23, 59, 59);
                    const isExpired = new Date() > deadlineDate;
                    const isAdvEligible = !isExpired;
                    
                    const totalBaseDiscount = (l.standardDiscount || 0) + (l.comboDiscount || 0);
                    const advancedDiscount = l.advancedDiscount || 0;
                    const payable = (l.totalFee || 0) - totalBaseDiscount - (isAdvEligible ? advancedDiscount : 0);
                    
                    return (
                      <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="p-3 font-bold text-sm text-gray-900 dark:text-white">
                          {new Date(`${l.month}-01`).toLocaleDateString('default', { month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-3 text-sm opacity-70 text-gray-600 dark:text-gray-400">₹{l.totalFee}</td>
                        <td className="p-3 text-sm text-red-600 dark:text-red-400">₹{l.discount || 0}</td>
                        <td className={`p-3 text-sm ${isExpired ? 'text-red-500 dark:text-red-400 font-bold' : 'text-green-600 dark:text-green-400 font-bold'}`}>
                           ₹{(l.advancedDiscount || 0)}
                           <span className="block text-[8px] uppercase tracking-tighter">({isExpired ? 'Expired' : 'Eligible'})</span>
                        </td>
                        <td className="p-3 text-sm font-black text-blue-600 dark:text-blue-400 text-right">₹{payable}</td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => setSelectedLedgers(selectedLedgers.filter(sl => sl.id !== l.id))}
                            className="bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-500/20 px-2 py-1 rounded text-xs font-bold transition-colors"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[var(--primary)]/10">
                  <tr>
                    <td className="p-4 text-right font-black uppercase text-sm text-gray-700 dark:text-white" colSpan={4}>Total:</td>
                    <td className="p-4 text-right font-black text-xl text-emerald-600 dark:text-[var(--success)]">₹{netPayable}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
         </div>
      )}

      <div className="glass-card flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">My Enrollment & Fees</h3>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${enrollment.feeStatus === 'Paid' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
              {enrollment.feeStatus === 'Paid' ? 'NO OUTSTANDING DUES LEFT' : (enrollment.feeStatus || 'Pending')}
            </span>
          </div>
          
          <div className="bg-white/5 border border-[var(--border-color)] rounded-xl p-5 mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase opacity-50 font-bold block mb-1">Batch / Class</label>
                <div className="font-bold text-[var(--primary)] text-lg">Class {enrollment.grade}</div>
              </div>
              <div>
                <label className="text-[10px] uppercase opacity-50 font-bold block mb-1">Enrolled Slots / Batch</label>
                <div className="font-bold text-gray-900 dark:text-white">
                  {enrollment.slots || enrollment.batchName || (enrollment.grade ? `Class ${enrollment.grade} - System Batch` : 'Not assigned yet')}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase opacity-50 font-bold block mb-1">Enrolled Subjects</label>
              <div className="flex flex-wrap gap-2">
                {enrollment.subjects?.map((sub: string) => (
                  <span key={sub} className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold rounded-lg border border-[var(--primary)]/20">
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 text-sm mt-4">
            <div className="flex flex-col gap-2 bg-white/5 p-4 rounded-xl border border-[var(--border-color)]">
              <div className="flex justify-between items-center">
                <span className="font-bold uppercase tracking-wider text-xs opacity-70">
                  {selectedLedgers.length > 0 ? `Combined Monthly Fee (${selectedLedgers.length} Added)` : `Expected Monthly Fee (${new Date().toLocaleDateString('default', { month: 'long', year: 'numeric' })})`}
                </span>
                <span className="text-3xl font-extrabold text-[var(--primary)]">₹{netPayable}</span>
              </div>
              {selectedLedgers.length > 0 && (
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">
                  Months Added: {selectedLedgers.map(l => new Date(`${l.month}-01`).toLocaleDateString('default', { month: 'short', year: 'numeric' })).join(', ')}
                </div>
              )}
            </div>
            
            <div className="mt-8">
              <h4 className="font-bold text-sm uppercase tracking-widest opacity-80 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={18} />
                  Active Fee Ledger
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      (window as any).dispatchEvent(new CustomEvent('navigate', { detail: 'settings' }));
                      setTimeout(() => {
                        (window as any).dispatchEvent(new CustomEvent('openDashboard'));
                      }, 100);
                    }}
                    className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded text-[10px] font-black uppercase tracking-tighter hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20"
                  >
                    Full Ledger & History
                  </button>
                  <button 
                    onClick={async () => {
                      const tid = toast.loading('Refreshing fee ledger...');
                      try {
                        await pricingService.syncStudentLedger(enrollment.id, enrollment.subjects, enrollment.grade);
                        toast.success('Ledger updated with latest pricing', { id: tid });
                      } catch (err) {
                        toast.error('Failed to sync pricing', { id: tid });
                      }
                    }}
                    className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded text-[10px] font-black uppercase tracking-tighter hover:bg-[var(--primary)] hover:text-white transition-all border border-[var(--primary)]/20"
                  >
                    Sync Prices
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={async () => {
                        if(confirm('This will reset ALL months back to PENDING and clear 0 balances. Are you sure?')) {
                          const tid = toast.loading('Resetting fee ledger...');
                          try {
                            const q = query(collection(db, 'student_monthly_fee_ledger'), where('studentId', '==', enrollment.id));
                            const snap = await getDocs(q);
                            const batch = writeBatch(db);
                            snap.docs.forEach(d => {
                              const l = d.data();
                              batch.update(d.ref, {
                                status: 'Pending',
                                paidAmount: 0,
                                balance: l.finalPayable || l.totalFee - (l.discount || 0)
                              });
                            });
                            await batch.commit();
                            toast.success('Ledger reset successfully', { id: tid });
                          } catch (err) {
                            console.error(err);
                            toast.error('Failed to reset', { id: tid });
                          }
                        }
                      }}
                      className="px-3 py-1 bg-red-500/10 text-red-500 rounded text-[10px] font-black uppercase tracking-tighter hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                    >
                      Reset Ledger
                    </button>
                  )}
                </div>
              </h4>
              {ledgers.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-[var(--border-color)] rounded-xl opacity-60">
                  <p className="text-xs font-bold uppercase">Generating Ledger...</p>
                  <p className="text-[10px] mt-1">Your academic year ledger is currently being processed.</p>
                </div>
              ) : (
                <div className="overflow-x-auto bg-white/5 border border-[var(--border-color)] rounded-xl scrollbar-thin">
                  <table className="w-full text-left border-collapse min-w-[350px] md:min-w-[500px]">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-[var(--border-color)] text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black/20">
                                <th className="p-3">Month</th>
                                <th className="p-3 hidden lg:table-cell">General Fee</th>
                                <th className="p-3 hidden lg:table-cell">Discount</th>
                                <th className="p-3 w-48 hidden lg:table-cell">Adv. Payment Discount</th>
                                <th className="p-3">Payable</th>
                                <th className="p-3 hidden sm:table-cell">Paid</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {ledgers
                              .filter((l, index, arr) => {
                                const now = new Date();
                                const monthDate = new Date(`${l.month}-01`);
                                const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                                const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

                                // Show all past and current months
                                if (monthDate <= currentMonthStart) return true;
                                
                                // Show next month
                                if (monthDate.getTime() === nextMonthStart.getTime()) return true;

                                // Always show the FIRST unpaid month
                                const firstUnpaid = arr.find(ledger => !['Clear', 'Paid'].includes(ledger.status) && ledger.balance !== 0);
                                if (firstUnpaid && firstUnpaid.id === l.id) return true;

                                return false;
                              })
                              .sort((a, b) => new Date(`${a.month}-01`).getTime() - new Date(`${b.month}-01`).getTime())
                              .map(l => {
                                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                const [year, monthStr] = l.month.split('-');
                                const monthIndex = parseInt(monthStr, 10) - 1;
                                const deadlineDate = new Date(parseInt(year, 10), monthIndex, branding?.advancedPaymentDiscountDay || 10, 23, 59, 59);
                                const isExpired = new Date() > deadlineDate;
                                
                                const basePayable = (l.totalFee || 0) - (l.discount || 0);
                                const currentPayable = isExpired ? basePayable : basePayable - (l.advancedDiscount || 0);
 
                                return (
                                <tr key={l.id} className="border-b border-gray-100 dark:border-[var(--border-color)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="p-3 font-bold text-sm text-gray-900 dark:text-white">
                                      {new Date(`${l.month}-01`).toLocaleDateString('default', { month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="p-3 text-gray-600 dark:text-gray-300 hidden lg:table-cell">₹{l.totalFee}</td>
                                    <td className="p-3 text-red-600 dark:text-red-400 font-bold hidden lg:table-cell">₹{l.discount || 0}</td>
                                    <td className="p-3 text-xs w-48 hidden lg:table-cell">
                                       <div className="flex flex-col items-start gap-0.5">
                                          <span className={`font-bold ${isExpired ? 'text-red-500 dark:text-red-400 opacity-50' : 'text-emerald-600 dark:text-emerald-400'}`}>₹{l.advancedDiscount || 0}</span>
                                          <span className={`text-[9px] font-bold uppercase ${isExpired ? 'text-red-500/70' : 'text-emerald-600/70'}`}>({isExpired ? 'Expired' : 'Eligible'})</span>
                                          <span className="text-gray-500 dark:text-gray-300 font-medium whitespace-nowrap text-[8px]">(Before {branding?.advancedPaymentDiscountDay || 10} {monthNames[monthIndex]})</span>
                                       </div>
                                    </td>
                                    <td className="p-3 font-bold text-blue-600 dark:text-blue-400">
                                      ₹{['Clear', 'Paid'].includes(l.status) ? l.finalPayable : currentPayable}
                                    </td>
                                    <td className="p-3 text-emerald-600 dark:text-[var(--success)] font-bold hidden sm:table-cell">₹{l.paidAmount}</td>
                                    <td className="p-3">
                                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                                        l.status === 'Pending' ? 'bg-red-500/20 text-red-600 dark:text-red-500' :
                                        ['Paid', 'Clear', 'Success', 'Verified'].includes(l.status) || l.balance === 0 ? 'bg-green-500/20 text-green-600 dark:text-green-500' :
                                        l.status === 'Partial' ? 'bg-orange-500/20 text-orange-600 dark:text-orange-500' :
                                        'bg-gray-100 dark:bg-gray-500/20 text-gray-500 dark:text-gray-400'
                                      }`}>
                                        <span className="sm:hidden">
                                          {l.status === 'Pending' ? 'P' :
                                           (l.balance === 0 || ['Clear', 'Paid'].includes(l.status)) ? 'Pd' :
                                           l.status?.charAt(0)}
                                        </span>
                                        <span className="hidden sm:inline">
                                          {l.status === 'Pending' ? 'Pending' :
                                           (l.balance === 0 || ['Clear', 'Paid'].includes(l.status)) ? 'Paid' :
                                           l.status}
                                        </span>
                                      </span>
                                    </td>
                                     <td className="p-3 text-right">
                                       {l.status === 'Clear' ? (
                                         <button 
                                            onClick={() => handleGenerateReceipt(l)}
                                            className="px-2 py-1 md:px-3 md:py-1 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white rounded text-[10px] md:text-xs font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
                                         >
                                           Receipt
                                         </button>
                                       ) : (
                                         <button 
                                            onClick={() => {
                                              if (selectedLedgers.find(sl => sl.id === l.id)) {
                                                 setSelectedLedgers(selectedLedgers.filter(sl => sl.id !== l.id));
                                              } else {
                                                 setSelectedLedgers([...selectedLedgers, l]);
                                              }
                                            }}
                                            className={`px-2 py-1 md:px-3 md:py-1 text-white rounded text-[10px] md:text-xs font-bold transition-all shadow-sm ${selectedLedgers.find(sl => sl.id === l.id) ? 'bg-indigo-600 opacity-90' : 'bg-[var(--primary)] hover:scale-105 active:scale-95'}`}
                                         >
                                           {selectedLedgers.find(sl => sl.id === l.id) ? 'Added' : 'Add'}
                                         </button>
                                       )}
                                    </td>
                                </tr>
                                )
                            })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="md:w-1/3 flex flex-col gap-4">
          <div className="bg-white/5 border border-[var(--border-color)] rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <h4 className="font-bold text-sm uppercase mb-2">{(selectedLedgers.length > 0 || ledgers.find(l => l.status !== 'Clear' && l.status !== 'Paid')) ? 'Total Due For Selected' : "Next Month's Fee"}</h4>
            <div className="text-3xl font-black text-[var(--primary)] mb-2">₹{netPayable}</div>
            <p className="text-xs font-medium text-amber-500 bg-amber-500/10 px-3 py-2 rounded-lg mb-4">
              You must pay your fees on or before {branding?.advancedPaymentDiscountDay || 10}{['st', 'nd', 'rd'][(branding?.advancedPaymentDiscountDay || 10) === 1 ? 0 : (branding?.advancedPaymentDiscountDay || 10) === 2 ? 1 : (branding?.advancedPaymentDiscountDay || 10) === 3 ? 2 : 3] || 'th'} of every month.
            </p>
            <a 
              href="#payment-methods"
              className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold shadow-lg hover:opacity-90 flex justify-center items-center gap-2"
            >
              Pay Now
            </a>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-lg">Early Bird Offer</div>
            
            <div className="mt-2 text-green-500 flex items-center justify-center mb-3">
              <CheckCircle2 size={32} />
            </div>
            
            <h4 className="font-black text-center text-green-500 uppercase tracking-widest text-sm mb-2">Discount Applied</h4>
            <p className="text-center text-xs opacity-80 leading-relaxed font-medium">
              You are receiving a special discounted rate of ₹{netPayable}/month by paying ahead of deadlines.
            </p>
            <p className="text-center text-xs opacity-60 mt-3 border-t border-green-500/20 pt-3 italic">
              * Valid strictly for payments before the {branding?.advancedPaymentDiscountDay || 10}{['st', 'nd', 'rd'][(branding?.advancedPaymentDiscountDay || 10) === 1 ? 0 : (branding?.advancedPaymentDiscountDay || 10) === 2 ? 1 : (branding?.advancedPaymentDiscountDay || 10) === 3 ? 2 : 3] || 'th'} of every month.
            </p>
          </div>
        </div>
      </div>

      <div id="payment-methods" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option 1: Payment QR */}
        <div className="glass-card flex flex-col items-center justify-center text-center p-8">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4">
            <QrCode size={24} />
          </div>
          <h3 className="font-bold mb-1 uppercase tracking-tight">Option 1: Payment QR</h3>
          <p className="text-xs opacity-70 mb-6">UPI ID: {upiId}</p>
          
          <div 
            className="bg-white p-4 rounded-2xl mb-4 cursor-pointer hover:scale-105 transition-transform shadow-lg"
            onClick={() => window.open(upiLink, '_blank')}
            title="Click to open UPI App"
          >
            <img 
              src={branding?.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`}
              alt="Payment QR Code"
              className="w-48 h-48 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <p className="text-xs opacity-70 mb-4 font-medium">Click QR to open UPI App</p>
          
          <button 
            onClick={downloadQR}
            className="flex items-center gap-2 text-[var(--primary)] text-sm font-bold hover:underline bg-[var(--primary)]/5 px-4 py-2 rounded-lg"
          >
            <DownloadIcon size={16} /> Download QR Code
          </button>
        </div>

        {/* Option 2: Direct Payment */}
        <div className="glass-card flex flex-col p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <CreditCard size={24} />
            </div>
            <div>
              <h3 className="font-bold uppercase tracking-tight">Option 2: Direct Payment</h3>
              <p className="text-xs opacity-70 font-mono">{upiId}</p>
            </div>
          </div>

          <div className="bg-white/5 border border-[var(--border-color)] rounded-xl p-5 mb-6 text-sm space-y-3 opacity-90">
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</span>
              <p>Pay using UPI ID or scan the QR code.</p>
            </div>
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</span>
              <p>Take a screenshot of the successful payment.</p>
            </div>
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</span>
              <p>Click "I Have Paid" to send details via WhatsApp.</p>
            </div>
          </div>

          <div className="mt-auto space-y-4">
            <a 
              href={upiLink}
              className="w-full py-4 bg-[var(--primary)] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[var(--primary)]/90 transition-all shadow-lg hover:-translate-y-0.5"
            >
              <ExternalLink size={20} /> Pay Now (₹{netPayable})
            </a>
            
            <button 
              onClick={() => {
                setPaymentData({ ...paymentData, amount: netPayable.toString() });
                setIsPaymentConfirmOpen(true);
              }}
              className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#128C7E] transition-all shadow-lg hover:-translate-y-0.5"
            >
              <CheckCircle2 size={20} /> I Have Paid
            </button>
          </div>
        </div>
      </div>

      {/* Payment History Section */}
      <div className="mt-12 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Clock size={20} />
          </div>
          <h3 className="text-xl font-bold uppercase tracking-tight">Payment History</h3>
        </div>

        <div className="glass-card overflow-hidden !p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse min-w-[350px] md:min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-[var(--border-color)] bg-gray-50 dark:bg-white/5">
                  <th className="p-4 text-xs font-bold uppercase opacity-60">Date</th>
                  <th className="p-4 text-xs font-bold uppercase opacity-60">Amount</th>
                  <th className="p-4 text-xs font-bold uppercase opacity-60">Status</th>
                  <th className="p-4 text-xs font-bold uppercase opacity-60 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {enrollment.paymentHistory && enrollment.paymentHistory.length > 0 ? (
                  [...enrollment.paymentHistory].sort((a: any, b: any) => {
                    const dateA = a.updatedAt || a.verifiedAt || a.createdAt || a.date;
                    const dateB = b.updatedAt || b.verifiedAt || b.createdAt || b.date;
                    return new Date(dateB).getTime() - new Date(dateA).getTime();
                  }).map((payment: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{new Date(payment.date).toLocaleDateString()}</div>
                        <div className="text-[10px] opacity-50 text-gray-500">{new Date(payment.date).toLocaleTimeString()}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">₹{payment.amount}</div>
                        {payment.months && payment.months.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {payment.months.map((m: string) => (
                              <span key={m} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-500 rounded text-[9px] font-bold uppercase">
                                {new Date(`${m}-01`).toLocaleDateString('default', { month: 'short', year: '2-digit' })}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          payment.status === 'Paid' || payment.status === 'verified' ? 'bg-green-500/20 text-green-600 dark:text-green-500' : 
                          payment.status === 'rejected' ? 'bg-red-500/20 text-red-600 dark:text-red-500' : 
                          'bg-yellow-500/20 text-amber-600 dark:text-yellow-500'
                        }`}>
                          {payment.status === 'pending' ? 'Review Requested' : (window.innerWidth < 768 ? payment.status?.charAt(0) : payment.status) || 'Review Requested'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {payment.screenshot ? (
                          <button 
                            onClick={() => window.open(payment.screenshot, '_blank')}
                            className="text-[var(--primary)] text-xs font-bold hover:underline"
                          >
                            Receipt
                          </button>
                        ) : (
                          <span className="text-xs opacity-40 italic text-gray-500">Offline</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-12 text-center opacity-50 text-sm italic text-gray-500">
                      No payment history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {isPaymentConfirmOpen && createPortal(
        <div className="fixed inset-0 z-[9999] p-4 bg-black/60 backdrop-blur-md overflow-y-auto flex items-center justify-center">
          <div className="min-h-full flex items-center justify-center py-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex flex-col gap-6 relative"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold uppercase italic text-gray-900 dark:text-white">Submit Payment Proof</h3>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Verification Request</p>
                </div>
                <button 
                  onClick={() => setIsPaymentConfirmOpen(false)}
                  className="p-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-white rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
               <div className="space-y-1 relative">
                 <label className="text-[10px] font-black uppercase opacity-40 ml-1">For Months</label>
                 <button
                   type="button"
                   onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                   className="w-full p-4 bg-gray-100 dark:bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-[11px] font-black uppercase tracking-wider transition-all hover:bg-white/10"
                 >
                   <span>
                     {(paymentData.months.length > 0 ? paymentData.months : selectedLedgers.map(sl => sl.month)).length > 0
                       ? (paymentData.months.length > 0 ? paymentData.months : selectedLedgers.map(sl => sl.month))
                           .map(m => new Date(`${m}-01`).toLocaleDateString('default', { month: 'short', year: '2-digit' }))
                           .join(', ')
                       : 'Select Months'}
                   </span>
                   <ChevronDown size={14} className={`transition-transform duration-300 ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
                 </button>

                 {isMonthDropdownOpen && (
                   <div className="absolute z-[100] top-full left-0 w-full mt-2 p-2 bg-white dark:bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                     <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-hide">
                       {ledgers.filter(l => l.status !== 'Clear').map(l => {
                         const currentSelected = paymentData.months.length > 0 ? paymentData.months : (selectedLedgers.map(sl => sl.month));
                         const isSelected = currentSelected.includes(l.month);
                         return (
                           <div 
                             key={l.id}
                             onClick={() => {
                               if (isSelected) {
                                 setPaymentData(prev => ({ ...prev, months: currentSelected.filter(m => m !== l.month) }));
                                 if (selectedLedgers.find(sl => sl.id === l.id)) {
                                   setSelectedLedgers(selectedLedgers.filter(sl => sl.id !== l.id));
                                 }
                               } else {
                                 setPaymentData(prev => ({ ...prev, months: [...currentSelected, l.month] }));
                                 if (!selectedLedgers.find(sl => sl.id === l.id)) {
                                   setSelectedLedgers([...selectedLedgers, l]);
                                 }
                               }
                             }}
                             className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-[var(--primary)]/10' : 'hover:bg-white/5'}`}
                           >
                             <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-white/20'}`}>
                               {isSelected && <Check size={10} className="text-white" />}
                             </div>
                             <span className={`text-[10px] font-black uppercase tracking-tight ${isSelected ? 'text-[var(--primary)]' : 'opacity-60'}`}>
                               {new Date(`${l.month}-01`).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                             </span>
                           </div>
                         );
                       })}
                       {ledgers.filter(l => l.status !== 'Clear').length === 0 && (
                         <div className="p-4 text-[10px] opacity-40 italic text-center">No pending months found</div>
                       )}
                     </div>
                   </div>
                 )}
                 <p className="text-[9px] opacity-40 ml-1 italic mt-1">* Optional: Select specific months if paying in bulk</p>
               </div>

               <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase opacity-40 ml-1">Paid Amount (₹)</label>
                 <input 
                   type="number"
                   required
                   value={paymentData.amount || netPayable}
                   onChange={e => setPaymentData(prev => ({...prev, amount: e.target.value}))}
                   className="w-full p-4 bg-gray-100 dark:bg-white/5 border border-white/10 rounded-2xl font-bold outline-none focus:border-[var(--primary)]"
                 />
               </div>

               <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase opacity-40 ml-1">Transaction ID / UPI Reference</label>
                 <input 
                   required
                   value={paymentData.transactionId}
                   onChange={e => setPaymentData(prev => ({...prev, transactionId: e.target.value}))}
                   className="w-full p-4 bg-gray-100 dark:bg-white/5 border border-white/10 rounded-2xl font-bold outline-none focus:border-[var(--primary)]"
                   placeholder="12 Digit No."
                 />
               </div>

               <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase opacity-40 ml-1">Payment Image / Screenshot</label>
                 <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*"
                      id="wa-screenshot"
                      className="hidden"
                      disabled={isUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploading(true);
                        setUploadProgress(0);
                        const toastId = toast.loading('Uploading screenshot...');
                        try {
                          const { promise } = storageService.uploadFile(file, (prog) => {
                             setUploadProgress(prog);
                          });
                          const meta = await promise;
                          setPaymentData(prev => ({ ...prev, screenshotUrl: meta.url }));
                          toast.success('Screenshot uploaded', { id: toastId });
                        } catch (err) {
                          toast.error('Upload failed', { id: toastId });
                        } finally {
                          setIsUploading(false);
                          setUploadProgress(0);
                        }
                      }}
                    />
                    <label 
                      htmlFor="wa-screenshot"
                      className={`flex flex-col items-center justify-center gap-2 w-full p-6 bg-gray-100 dark:bg-white/5 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-all font-bold text-sm overflow-hidden relative ${isUploading ? 'opacity-80 cursor-not-allowed' : ''}`}
                    >
                      {isUploading && (
                        <div 
                           className="absolute left-0 bottom-0 h-1 bg-[var(--primary)] transition-all ease-out duration-300"
                           style={{ width: `${uploadProgress}%` }}
                        />
                      )}
                      <div className="flex items-center gap-3">
                         {isUploading ? (
                           <Upload className="animate-bounce" size={20} />
                         ) : paymentData.screenshotUrl ? (
                           <CheckCircle2 className="text-green-500" size={24} />
                         ) : (
                           <ImageIcon className="opacity-40" size={24} />
                         )}
                         <span className="text-sm">
                           {isUploading ? `Uploading... ${Math.round(uploadProgress)}%` : paymentData.screenshotUrl ? 'Image Attached Successfully' : 'Upload Screenshot / Receipt'}
                         </span>
                      </div>
                      {!isUploading && !paymentData.screenshotUrl && (
                        <span className="text-[10px] opacity-40 uppercase tracking-widest font-black">Click here to browse</span>
                      )}
                    </label>
                 </div>
               </div>

               <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase opacity-40 ml-1">Additional Notes</label>
                 <textarea 
                   value={paymentData.notes}
                   onChange={e => setPaymentData(prev => ({...prev, notes: e.target.value}))}
                   className="w-full p-4 bg-gray-100 dark:bg-white/5 border border-white/10 rounded-2xl text-sm min-h-[80px]"
                   placeholder="Optional details..."
                 />
               </div>

               <button 
                type="submit"
                disabled={isSubmittingPayment || isUploading}
                className="w-full py-4 bg-[var(--primary)] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[var(--primary)]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
               >
                 {isSubmittingPayment ? 'Submitting...' : 'Confirm Submission'}
               </button>
            </form>
          </motion.div>
        </div>
      </div>,
      document.body
    )}
  </div>
);
}

export default TabFee;
