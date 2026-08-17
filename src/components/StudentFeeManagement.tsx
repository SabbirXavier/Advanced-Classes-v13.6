import React, { useState, useEffect, useMemo } from 'react';
import { 
  IndianRupee, Users, FileText, Calendar, TrendingUp, AlertCircle, 
  Search, CheckCircle2, ChevronDown, Clock, Download, ChevronRight, X, User,
  MoreVertical, Eye, Image as ImageIcon, Check, Filter, Settings, Plus, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { collection, query, where, getDocs, orderBy, Timestamp, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { firestoreService, handleFirestoreError } from '../services/firestoreService';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
import { pricingService } from '../services/pricingService';
import toast from 'react-hot-toast';

export default function StudentFeeManagement({ branding }: { branding?: any }) {
  // Date Filtering (Moved to top to prevent initialization errors)
  const [dateFilterType, setDateFilterType] = useState<'all' | 'month' | 'year' | 'date'>('month');
  const [dateFilterValue, setDateFilterValue] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [monthlyLedgers, setMonthlyLedgers] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected state
  const [viewMode, setViewMode] = useState<'students' | 'verifications'>('students');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationStatusFilter, setVerificationStatusFilter] = useState<'pending' | 'verified' | 'failed' | 'all'>('pending');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  
  const currentMonthDisplay = useMemo(() => {
    if (dateFilterType === 'all') return 'All Time';
    if (!dateFilterValue) return 'Select Filter';
    if (dateFilterType === 'month') {
      return new Date(dateFilterValue + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }
    return dateFilterValue;
  }, [dateFilterType, dateFilterValue]);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Navigation
  const [activeTab, setActiveTab] = useState('profile');
  const [selectedReportMonth, setSelectedReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reportClassFilter, setReportClassFilter] = useState('ALL');

  const filteredMonthlyLedgers = useMemo(() => {
    return monthlyLedgers.filter(l => {
      const monthMatch = l.month === selectedReportMonth;
      const classMatch = reportClassFilter === 'ALL' || l.grade === reportClassFilter;
      return monthMatch && classMatch;
    });
  }, [monthlyLedgers, selectedReportMonth, reportClassFilter]);

  const reportStats = useMemo(() => {
    const totalExp = filteredMonthlyLedgers.reduce((sum, l) => sum + (l.finalPayable || 0), 0);
    const totalPaid = filteredMonthlyLedgers.reduce((sum, l) => sum + (l.paidAmount || 0), 0);
    const totalPend = filteredMonthlyLedgers.reduce((sum, l) => sum + (l.balance || 0), 0);
    const collectionRate = totalExp > 0 ? (totalPaid / totalExp) * 100 : 0;
    return { totalExp, totalPaid, totalPend, collectionRate };
  }, [filteredMonthlyLedgers]);

  const [offlinePaymentModalOpen, setOfflinePaymentModalOpen] = useState(false);
  const [offlinePaymentAmount, setOfflinePaymentAmount] = useState('');
  const [offlinePaymentNotes, setOfflinePaymentNotes] = useState('');
  const [isSubmittingOfflinePayment, setIsSubmittingOfflinePayment] = useState(false);

  useEffect(() => {
    const unsubEnrolls = firestoreService.listenToCollection('enrollments', (data) => {
      setEnrollments(data);
    });
    const unsubLedgers = firestoreService.listenToCollection('student_monthly_fee_ledger', (data) => {
      setMonthlyLedgers(data);
      setLoading(false);
    });
    const unsubFees = firestoreService.listenToCollection('fees', (data) => {
      setFees(data);
    });

    return () => {
      unsubEnrolls();
      unsubLedgers();
      unsubFees();
    };
  }, []);

  const selectedStudent = useMemo(() => enrollments.find(e => e.id === selectedStudentId), [enrollments, selectedStudentId]);

  const allSubjects = useMemo(() => {
    const subs = new Set<string>();
    enrollments.forEach(e => {
      if (e.subjects) e.subjects.forEach((s:string) => subs.add(s));
    });
    return Array.from(subs).sort();
  }, [enrollments]);

  const filteredLedgers = useMemo(() => {
     let filtered = monthlyLedgers.filter(l => enrollments.some(e => e.id === l.studentId));
     if (dateFilterType === 'month' && dateFilterValue) {
       filtered = filtered.filter(l => l.month === dateFilterValue); // format YYYY-MM
     } else if (dateFilterType === 'year' && dateFilterValue) {
       filtered = filtered.filter(l => l.month?.startsWith(dateFilterValue)); // format YYYY
     }
     
     // Apply class filter if not ALL
     if (selectedClass !== 'ALL') {
       filtered = filtered.filter(l => l.grade === selectedClass);
     }
     
     return filtered;
  }, [monthlyLedgers, dateFilterType, dateFilterValue, selectedClass, enrollments]);

  const stats = useMemo(() => {
    // Determine the relevant students for the current view/filter
    // If a class is selected, "Total Students" should reflect students in that class
    const studentsInCurrentView = enrollments.filter(e => {
        const classMatch = selectedClass === 'ALL' || e.grade === selectedClass;
        const subjectMatch = selectedSubject === 'ALL' || (e.subjects && e.subjects.includes(selectedSubject));
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          if (!(e.name?.toLowerCase().includes(q) || e.whatsapp?.includes(q) || e.email?.toLowerCase().includes(q))) {
            return false;
          }
        }
        return classMatch && subjectMatch;
    });

    const activeEnrollments = studentsInCurrentView.filter(e => e.status !== 'Inactive');
    
    // We want the aggregates to be based precisely on the table displayed.
    // However, if the user sees 'All Time' we sum up all ledgers matching the table students.
    // If there's a specific month, and the student DOES NOT have a ledger, we still expect the base fee.
    
    let totalExpected = 0;
    let totalCollected = 0;
    let totalPending = 0;

    studentsInCurrentView.forEach(e => {
      // Find ledgers for this student matching the current date filters
      let studentLedgers = monthlyLedgers.filter(l => l.studentId === e.id);
      
      if (dateFilterType === 'month' && dateFilterValue) {
        studentLedgers = studentLedgers.filter(l => l.month === dateFilterValue);
      } else if (dateFilterType === 'year' && dateFilterValue) {
        studentLedgers = studentLedgers.filter(l => l.month?.startsWith(dateFilterValue));
      }

      if (studentLedgers.length > 0) {
        studentLedgers.forEach(l => {
          totalExpected += (Number(l.finalPayable) || Number(l.totalFee) || 0);
          totalCollected += (Number(l.paidAmount) || 0);
          totalPending += (Number(l.balance) || 0);
        });
      } else {
        // If the student doesn't have a ledger for the filtered view (e.g. Month), 
        // we should fallback to their base totalFee and consider it pending.
        // If dateFilterType === 'all', we don't know how many months to expect, so maybe just 1 month.
        // The most logical fallback for missing ledger in a single month view is 1 * totalFee.
        if (dateFilterType === 'month' && dateFilterValue) {
           let expectedForMissing = 0;
           if (e.subjects && e.subjects.length > 0) {
             const selectedFees = fees.filter(f => e.subjects.includes(f.subject) && (!f.grades || f.grades.includes(e.grade) || f.grade === e.grade || !f.grade));
             const discountedAmount = selectedFees.reduce((sum, f) => sum + ((Number(f.originalPrice) || 0) - (Number(f.discount) || 0)), 0);
             expectedForMissing = discountedAmount;
           }

           totalExpected += expectedForMissing;
           
           // If their feeStatus on enrollment says 'Paid' we can assume it's collected
           if (e.feeStatus === 'Paid' || e.feeStatus === 'Clear' || e.feeStatus === 'Verified') {
              totalCollected += expectedForMissing;
           } else {
              totalPending += expectedForMissing;
           }
        }
      }
    });

    const studentIdsInPeriod = new Set(filteredLedgers.map(l => l.studentId));
    const totalStudentsCount = Math.max(studentsInCurrentView.length, studentIdsInPeriod.size);

    return {
      totalStudents: totalStudentsCount,
      activeStudents: Math.max(activeEnrollments.length, studentIdsInPeriod.size),
      studentsInPeriod: studentIdsInPeriod.size,
      totalExpected,
      totalCollected,
      totalPending,
    };
  }, [enrollments, filteredLedgers, selectedClass, selectedSubject, searchQuery, dateFilterType, dateFilterValue, monthlyLedgers, fees]);

  const collectionPercent = useMemo(() => {
    if (!stats.totalExpected) return "0.00";
    return ((stats.totalCollected / stats.totalExpected) * 100).toFixed(2);
  }, [stats.totalCollected, stats.totalExpected]);

  const allVerifications = useMemo(() => {
    const list: any[] = [];
    enrollments.forEach(e => {
      if (e.paymentHistory) {
        e.paymentHistory.forEach((ph: any) => {
          if (verificationStatusFilter === 'all' || ph.status === verificationStatusFilter) {
            list.push({ ...ph, studentId: e.id, studentName: e.name, studentGrade: e.grade });
          }
        });
      }
    });
    return list.sort((a, b) => {
      const dateA = a.updatedAt || a.verifiedAt || a.createdAt || a.date;
      const dateB = b.updatedAt || b.verifiedAt || b.createdAt || b.date;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [enrollments, verificationStatusFilter]);

  const pendingCount = useMemo(() => {
    let count = 0;
    enrollments.forEach(e => {
      if (e.paymentHistory) {
        e.paymentHistory.forEach((ph: any) => {
          if (ph.status === 'pending') count++;
        });
      }
    });
    return count;
  }, [enrollments]);

  const filteredStudents = useMemo(() => {
    let result = enrollments.filter(e => {
      if (selectedClass !== 'ALL' && e.grade !== selectedClass) return false;
      if (selectedSubject !== 'ALL' && !(e.subjects || []).includes(selectedSubject)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!(e.name?.toLowerCase().includes(q) || e.whatsapp?.includes(q) || e.email?.toLowerCase().includes(q))) {
          return false;
        }
      }
      return true;
    });

    // Apply Sorting
    return [...result].sort((a, b) => {
      let valA: any = a[sortConfig.key];
      let valB: any = b[sortConfig.key];

      if (sortConfig.key === 'feeStatus') {
        const mLedgerA = dateFilterType === 'month' && dateFilterValue 
          ? monthlyLedgers.find(l => l.studentId === a.id && l.month === dateFilterValue)
          : null;
        const mLedgerB = dateFilterType === 'month' && dateFilterValue 
          ? monthlyLedgers.find(l => l.studentId === b.id && l.month === dateFilterValue)
          : null;
        valA = mLedgerA?.status || a.feeStatus || 'Pending';
        valB = mLedgerB?.status || b.feeStatus || 'Pending';
      }

      if (sortConfig.key === 'lastPaymentDate') {
        valA = a.lastPaymentAttempt?.seconds || 0;
        valB = b.lastPaymentAttempt?.seconds || 0;
      }

      if (typeof valA === 'string') {
        return sortConfig.direction === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    });
  }, [enrollments, selectedClass, selectedSubject, searchQuery, sortConfig, dateFilterType, dateFilterValue, monthlyLedgers]);

  const toggleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleBatchAccess = async (access: string) => {
    if (!selectedStudent) return;
    try {
      const updates: any = { batchAccess: access };
      if (access === 'active' || access === 'auto') {
        if (selectedStudent.status && selectedStudent.status !== 'Active') {
           updates.status = 'Active';
        }
      }
      await firestoreService.updateItem('enrollments', selectedStudent.id, updates);
      toast.success(`Batch access set to ${access}`);
    } catch (err) {
      toast.error('Failed to update batch access');
    }
  };

  const handleBatchAccessWithId = async (id: string, access: string) => {
    try {
      const updates: any = { batchAccess: access };
      if (access === 'active' || access === 'auto') {
        const student = enrollments.find(e => e.id === id);
        if (student && student.status && student.status !== 'Active') {
           updates.status = 'Active';
        }
      }
      await firestoreService.updateItem('enrollments', id, updates);
      toast.success(`Batch access set to ${access}`);
    } catch (err) {
      toast.error('Failed to update batch access');
    }
  };

  const handleRevertPayment = async (paymentId: string, amount: number, explicitStudentId?: string) => {
    const studentIdToUse = explicitStudentId || selectedStudentId;
    const targetStudent = enrollments.find(e => e.id === studentIdToUse);
    if (!targetStudent || !confirm('Are you sure you want to revert this payment back to pending? This will adjust the ledger balances.')) return;
    
    const toastId = toast.loading('Reverting payment...');
    try {
      // 1. Get the payment entry to see if it had specific months
      const paymentEntry = (targetStudent.paymentHistory || []).find((ph: any) => ph.id === paymentId);
      const targetMonths = paymentEntry?.months || [];

      // 1. Mark payment as pending in enrollment (Atomically)
      await firestoreService.updatePaymentHistoryAtomic(targetStudent.id, paymentId, 'pending');

      // 2. Adjust ledgers
      let snap;
      try {
        const q = query(collection(db, 'student_monthly_fee_ledger'), where('studentId', '==', targetStudent.id));
        snap = await getDocs(q);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'student_monthly_fee_ledger');
        throw error;
      }
      let ledgers = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      
      // If we have target months, prioritize them
      if (targetMonths.length > 0) {
        ledgers = ledgers.filter(l => targetMonths.includes(l.month));
        ledgers.sort((a, b) => b.month.localeCompare(a.month)); // Revert newest of the targeted months first
      } else {
        ledgers.sort((a, b) => b.month.localeCompare(a.month)); // Newest first fallback
      }

      let amountToSubtract = Number(amount);
      const batch = writeBatch(db);

      for (const ledger of ledgers) {
        if (amountToSubtract <= 0) break;
        const currentPaid = Number(ledger.paidAmount || 0);
        
        if (currentPaid > 0) {
          const subtracted = Math.min(currentPaid, amountToSubtract);
          const newPaid = Math.max(0, currentPaid - subtracted);
          const newBalance = Number(ledger.finalPayable || 0) - newPaid;
          const newStatus = newBalance >= Number(ledger.finalPayable || 0) ? 'Pending' : (newBalance > 0 ? 'Partial' : 'Clear');

          batch.update(doc(db, 'student_monthly_fee_ledger', ledger.id), {
            paidAmount: newPaid,
            balance: newBalance,
            status: newStatus,
            updatedAt: serverTimestamp()
          });
          amountToSubtract -= subtracted;
        }
      }
      await batch.commit();

      // 3. Update Finances collection if exists
      if (paymentEntry?.transactionId) {
        const financesCollection = await firestoreService.getCollection('finances');
        const relatedFinanceDocs = financesCollection.filter((f: any) => f.transactionId === paymentEntry.transactionId);
        
        for (const f of relatedFinanceDocs) {
           await firestoreService.updateItem('finances', f.id, { status: 'pending', updatedAt: new Date().toISOString() });
        }
      }

      toast.success('Payment reverted to pending state.', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to revert payment.', { id: toastId });
    }
  };

  const handleRecordOfflinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !offlinePaymentAmount || isNaN(Number(offlinePaymentAmount))) return;
    
    setIsSubmittingOfflinePayment(true);
    const toastId = toast.loading('Recording payment...');
    try {
      const paidAmount = Number(offlinePaymentAmount);
      const studentId = selectedStudent.id;
      const month = new Date().toISOString().slice(0, 7);
      
      const paymentId = await pricingService.recordPaymentAndUpdateLedger({
        studentId,
        studentName: selectedStudent.name,
        month,
        amount: paidAmount,
        mode: 'cash',
        transactionId: offlinePaymentNotes || 'offline_cash',
        skipLedgerUpdate: true // Don't modify ledger here, let verifyPaymentAndApplyToLedger handle the distribution
      });
      
      await pricingService.verifyPaymentAndApplyToLedger(studentId, paidAmount, paymentId);
      
      // Calculate Faculty splits 50/50
      const facultyPool = paidAmount * 0.5;
      const adminCut = paidAmount - facultyPool;
      const subjectSplits: Record<string, number> = {};
      (selectedStudent.subjects || []).forEach((sub: string) => {
        subjectSplits[sub] = Math.floor(facultyPool / (selectedStudent.subjects?.length || 1));
      });

      // Add to Ledger with splitting setup
      await firestoreService.addItem('finance_ledger', {
        studentId: studentId,
        studentName: selectedStudent.name,
        amountPaid: paidAmount,
        adminCut: adminCut,
        facultyCut: facultyPool,
        subjectSplits: subjectSplits,
        date: new Date().toISOString(),
        enrollmentId: studentId,
        isDistributed: false,
        source: 'admin_panel',
        title: `Offline Payment: ${selectedStudent.name}`,
        amount: paidAmount,
        type: 'income',
        category: 'fee',
        notes: offlinePaymentNotes,
      });

      toast.success('Offline payment recorded & payroll split generated.', { id: toastId });
      setOfflinePaymentModalOpen(false);
      setOfflinePaymentAmount('');
      setOfflinePaymentNotes('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to record payment', { id: toastId });
    } finally {
      setIsSubmittingOfflinePayment(false);
    }
  };

  const handleVerifyPayment = async (payment: any, explicitStudentId?: string) => {
    const studentIdToUse = explicitStudentId || selectedStudentId;
    const targetStudent = enrollments.find(e => e.id === studentIdToUse);
    if (!targetStudent || !confirm('Mark this payment as verified?')) return;
    const toastId = toast.loading('Verifying payment...');
    try {
      await firestoreService.updatePaymentHistoryAtomic(targetStudent.id, payment.id, 'verified', { verifiedAt: new Date().toISOString() });
      
      // Update ledgers with specific months if provided
      await pricingService.verifyPaymentAndApplyToLedger(targetStudent.id, Number(payment.amount), payment.id, payment.months);

      // Update Finances collection if exists
      const financesSnap = await firestoreService.getCollection('finances');
      const relatedFinanceDocs = financesSnap.filter((f: any) => f.transactionId === payment.transactionId || (f.studentId === targetStudent.id && f.amount === Number(payment.amount) && f.status === 'pending'));
      
      for (const f of relatedFinanceDocs) {
         await firestoreService.updateItem('finances', f.id, { status: 'verified', updatedAt: new Date().toISOString() });
      }

      toast.success('Verified payment successfully.', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Verification failed.', { id: toastId });
    }
  };

  const handleSendVerificationRequest = async () => {
    if (!selectedStudent || !selectedStudent.whatsapp) {
       toast.error('Student does not have a WhatsApp number registered.');
       return;
    }
    const msg = `*PAYMENT VERIFICATION REQUIRED*\n\nHi ${selectedStudent.name},\nWe noticed your pending fee. Could you please upload a screenshot or proof of your recent payment?\n\nLogin to the portal & open the "Smart Billing System": ${window.location.origin}`;
    window.open(`https://wa.me/${selectedStudent.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleGenerateReceipt = async (ledger: any) => {
    if (!selectedStudent) return;
    const toastId = toast.loading('Generating receipt...');
    try {
      const { generateReceiptPDF } = await import('../utils/pdfGenerator');
      await generateReceiptPDF(
        ledger, 
        selectedStudent.name, 
        selectedStudent.email || '', 
        selectedStudent.whatsapp || '', 
        selectedStudent.grade || '',
        selectedStudent.subjects || []
      );
      toast.success('Receipt downloaded successfully', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate receipt', { id: toastId });
    }
  };

  const handleGenerateLedger = async () => {
    if (!selectedStudent) return;
    const toastId = toast.loading('Generating ledger...');
    try {
      await pricingService.syncStudentLedger(selectedStudent.id, selectedStudent.subjects, selectedStudent.grade);
      toast.success('Ledger generated successfully.', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate ledger.', { id: toastId });
    }
  };

  const handleGenerateAllLedgers = async () => {
    const toastId = toast.loading('Syncing all student ledgers...');
    try {
      for (const student of enrollments) {
        if (!student.subjects || student.subjects.length === 0) continue;
        await pricingService.syncStudentLedger(student.id, student.subjects, student.grade);
      }
      toast.success('All ledgers synchronized successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to sync ledgers.', { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-600 to-teal-600 p-8 rounded-3xl text-white shadow-xl relative">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2 flex items-center gap-2">
            Student Fee Management
          </h2>
          <p className="text-emerald-100 opacity-80 font-medium">View and manage student fees, payments, discounts and ledger.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 relative z-10">
        <div className="flex bg-gray-100 dark:bg-black/20 p-1 rounded-lg border border-gray-200 dark:border-white/10 shadow-sm">
            <button
              onClick={() => setViewMode('students')}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${viewMode === 'students' ? 'bg-white dark:bg-[#1e1e1e] text-emerald-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
            >
              Fee Tracker
            </button>
            <button
              onClick={() => setViewMode('verifications')}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-bold transition-colors flex items-center justify-center gap-2 ${viewMode === 'verifications' ? 'bg-white dark:bg-[#1e1e1e] text-emerald-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
            >
              Verification
              {pendingCount > 0 && <span className="px-1.5 py-0.5 bg-red-500 text-white rounded text-[10px]">{pendingCount}</span>}
            </button>
          </div>
          <button 
            onClick={handleGenerateAllLedgers}
            className="w-full md:w-auto px-4 py-2 bg-white dark:bg-white/20 border border-gray-200 dark:border-white/30 text-gray-700 dark:text-white font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-white/30 text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <TrendingUp size={16} /> <span className="md:inline">Sync All Ledgers</span>
          </button>
          <select 
            value={selectedClass} 
            onChange={e => setSelectedClass(e.target.value)}
            className="w-full md:w-auto p-2 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg text-sm text-gray-700 dark:text-white outline-none focus:border-emerald-500 shadow-sm [&>option]:bg-white dark:[&>option]:bg-gray-900"
          >
            <option value="ALL">All Classes</option>
            <option value="IX">Class IX</option>
            <option value="X">Class X</option>
            <option value="XI">Class XI</option>
            <option value="XII">Class XII</option>
          </select>
          <div className="relative">
            <button 
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="px-3 py-2.5 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/10 rounded-lg text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors focus:ring-2 focus:ring-emerald-500 shadow-sm flex items-center gap-2"
            >
              <Calendar size={18} />
              <span className="text-xs font-bold whitespace-nowrap">{currentMonthDisplay}</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isCalendarOpen ? 'rotate-180' : ''}`} />
            </button>
            {isCalendarOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/10 rounded-xl p-4 shadow-2xl z-50 w-64 overflow-visible">
                <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-sm flex items-center justify-between">
                  Filter Ledgers
                  <button onClick={() => { setDateFilterType('all'); setDateFilterValue(''); setIsCalendarOpen(false); }} className="text-[10px] bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded hover:bg-red-500/30">Clear</button>
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Filter Type</label>
                    <select 
                      value={dateFilterType} 
                      onChange={e => { setDateFilterType(e.target.value as any); setDateFilterValue(''); }}
                      className="w-full text-sm bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-700 dark:text-white outline-none focus:border-emerald-500 [&>option]:bg-white dark:[&>option]:bg-gray-900"
                    >
                      <option value="all">All Time</option>
                      <option value="month">Specific Month</option>
                      <option value="year">Specific Year</option>
                    </select>
                  </div>
                  {dateFilterType === 'month' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1 mt-2">Select Month</label>
                      <input 
                        type="month" 
                        value={dateFilterValue}
                        onChange={e => {
                          setDateFilterValue(e.target.value);
                          setIsCalendarOpen(false);
                          toast.success('Month Applied');
                        }}
                        className="w-full text-sm bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white outline-none focus:border-emerald-500 [color-scheme:light] dark:[color-scheme:dark]" 
                      />
                    </motion.div>
                  )}
                  {dateFilterType === 'year' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1 mt-2">Select Year</label>
                      <input 
                        type="number" 
                        min="2020" max="2100"
                        placeholder="YYYY"
                        value={dateFilterValue}
                        onChange={e => setDateFilterValue(e.target.value)}
                        onBlur={() => {
                          if (dateFilterValue) {
                            setIsCalendarOpen(false);
                            toast.success('Year Applied');
                          }
                        }}
                        className="w-full text-sm bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-gray-900 dark:text-white outline-none focus:border-emerald-500" 
                      />
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'verifications' ? (
        <div className="glass-card bg-white dark:bg-[#1e1e1e]/80 border border-gray-200 dark:border-white/10">
          <div className="p-4 border-b border-gray-200 dark:border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Payment Verification Queue
            </h3>
            <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl border border-gray-200 dark:border-white/10">
              {(['all', 'pending', 'verified', 'failed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setVerificationStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    verificationStatusFilter === status
                      ? 'bg-[var(--primary)] text-white shadow-lg'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-black/20 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4">Date</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4 hidden md:table-cell">Transaction / Mode</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {allVerifications.length > 0 ? (
                  allVerifications.map((payment: any, i: number) => (
                    <tr key={payment.id || i} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-4 font-medium text-gray-600 dark:text-gray-300">
                        <div className="flex flex-col">
                          <span>{(payment.createdAt || payment.date) ? new Date(payment.createdAt || payment.date).toLocaleDateString() : 'Unknown'}</span>
                          <span className="md:hidden text-[10px] text-gray-400 uppercase">{payment.mode || 'ONLINE'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-gray-900 dark:text-white truncate max-w-[120px] md:max-w-none">{payment.studentName}</div>
                        <div className="text-[10px] text-gray-500">Class {payment.studentGrade}</div>
                        {payment.months && payment.months.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {payment.months.slice(0, 2).map((m: string) => (
                              <span key={m} className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[9px] font-bold uppercase">
                                {new Date(`${m}-01`).toLocaleDateString('default', { month: 'short', year: '2-digit' })}
                              </span>
                            ))}
                            {payment.months.length > 2 && <span className="text-[9px] text-gray-500">+{payment.months.length - 2} more</span>}
                          </div>
                        )}
                        <div className="mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                            payment.status === 'verified' || payment.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                            payment.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                            'bg-red-500/20 text-red-500'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-gray-900 dark:text-white">₹{payment.amount}</td>
                      <td className="p-4 text-xs hidden md:table-cell">
                        <div className="text-gray-600 dark:text-gray-300 uppercase font-medium">{payment.mode || 'ONLINE'}</div>
                        {payment.transactionId && <div className="text-gray-500 break-all max-w-[150px]">{payment.transactionId}</div>}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex flex-col md:flex-row items-center justify-end gap-2">
                          {(payment.screenshot || payment.screenshotUrl) && (
                            <button
                              onClick={() => window.open(payment.screenshot || payment.screenshotUrl, '_blank')}
                              className="p-1.5 md:px-3 md:py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center gap-1.5"
                              title="View Payment Proof"
                            >
                              <ImageIcon size={14} />
                              <span className="hidden md:inline text-[10px] font-bold uppercase">View Proof</span>
                            </button>
                          )}
                          
                          {payment.status === 'pending' ? (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleVerifyPayment(payment, payment.studentId)}
                                className="px-2 py-1 md:px-3 md:py-1.5 bg-green-500 text-white rounded-lg text-[10px] md:text-xs font-bold hover:bg-green-600 transition-colors"
                              >
                                {window.innerWidth < 768 ? <Check size={14} /> : 'Verify'}
                              </button>
                              <button 
                                onClick={async () => {
                                  if (confirm('Decline this payment verification?')) {
                                     await firestoreService.updatePaymentHistoryAtomic(payment.studentId, payment.id, 'failed');
                                     toast.success('Payment declined');
                                  }
                                }}
                                className="px-2 py-1 md:px-3 md:py-1.5 bg-red-500 text-white rounded-lg text-[10px] md:text-xs font-bold hover:bg-red-600 transition-colors"
                              >
                                {window.innerWidth < 768 ? <X size={14} /> : 'Decline'}
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={async () => {
                                if (payment.status === 'verified') {
                                  await handleRevertPayment(payment.id, payment.amount, payment.studentId);
                                } else if (payment.status === 'failed') {
                                  // Change from failed back to pending
                                  if (confirm('Reset this failed payment back to pending review?')) {
                                    await firestoreService.updatePaymentHistoryAtomic(payment.studentId, payment.id, 'pending');
                                    toast.success('Status reset to pending');
                                  }
                                }
                              }}
                              className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-500/30 transition-colors"
                            >
                                <span className="hidden md:inline">{payment.status === 'verified' ? 'Revert to Pending' : 'Retry Verification'}</span>
                                <span className="md:hidden">{payment.status === 'verified' ? 'Rev' : 'Try'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 italic">No {verificationStatusFilter === 'all' ? '' : verificationStatusFilter} verifications found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-card p-5 flex flex-col gap-1">
          <div className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total Students</div>
          <div className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalStudents}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">{stats.activeStudents} Active Students</span>
          </div>
        </div>

        <div className="glass-card p-5 flex flex-col gap-1">
          <div className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total Expected</div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">₹{stats.totalExpected.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-gray-600 dark:text-gray-400 font-bold uppercase mt-2">All Students • {currentMonthDisplay}</div>
        </div>

        <div className="glass-card p-5 flex flex-col gap-1">
          <div className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total Collected</div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">₹{stats.totalCollected.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-gray-600 dark:text-gray-400 font-bold uppercase mt-2">All Students • {currentMonthDisplay}</div>
        </div>

        <div className="glass-card p-5 flex flex-col gap-1">
          <div className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total Pending</div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">₹{stats.totalPending.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-gray-600 dark:text-gray-400 font-bold uppercase mt-2">All Students • {currentMonthDisplay}</div>
        </div>

        <div className="glass-card p-5 flex flex-col gap-1 justify-between">
          <div>
            <div className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Collection %</div>
            <div className="text-3xl font-black text-gray-900 dark:text-white transition-all">{collectionPercent}%</div>
          </div>
          <div className="w-full bg-black/5 dark:bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden border border-gray-200 dark:border-white/5">
            <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${collectionPercent}%` }}
               className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 glass-card p-4 space-y-4">
        {(selectedClass !== 'ALL' || selectedSubject !== 'ALL' || dateFilterType !== 'all') && (
          <div className="flex flex-wrap gap-2 mb-2 animate-in fade-in slide-in-from-top-1 duration-300">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg">
              <Filter size={10} /> Filters Active:
            </span>
            {selectedClass !== 'ALL' && (
              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-lg border border-gray-200 dark:border-white/10 flex items-center gap-1 shadow-sm">
                Class {selectedClass}
                <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => setSelectedClass('ALL')} />
              </span>
            )}
            {selectedSubject !== 'ALL' && (
              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-lg border border-gray-200 dark:border-white/10 flex items-center gap-1 shadow-sm">
                Subject: {selectedSubject}
                <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => setSelectedSubject('ALL')} />
              </span>
            )}
            {dateFilterType !== 'all' && (
              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-lg border border-gray-200 dark:border-white/10 flex items-center gap-1 shadow-sm">
                {currentMonthDisplay}
                <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => { setDateFilterType('all'); setDateFilterValue(''); }} />
              </span>
            )}
            <button 
              onClick={() => {
                setSelectedClass('ALL');
                setSelectedSubject('ALL');
                setDateFilterType('all');
                setDateFilterValue('');
              }}
              className="text-[10px] font-bold text-red-500 hover:text-red-600 px-2 py-1 border border-red-500/20 rounded-lg bg-red-500/5 transition-colors"
            >
              Clear All
            </button>
          </div>
        )}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-gray-200 dark:border-white/10 pb-4">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">Student Roster</h3>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full md:w-64 pl-9 pr-4 py-2 bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-[var(--primary)]"
              />
            </div>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="p-2 bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-[var(--primary)]"
            >
              <option value="ALL">All Subjects</option>
              {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-black/10 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
                <th className="p-3 cursor-pointer hover:bg-black/5 transition-colors" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-1">
                    Student Info
                    {sortConfig.key === 'name' && <ChevronDown size={14} className={sortConfig.direction === 'desc' ? 'rotate-180' : ''} />}
                  </div>
                </th>
                <th className="p-3 hidden md:table-cell cursor-pointer hover:bg-black/5 transition-colors" onClick={() => toggleSort('grade')}>
                  <div className="flex items-center gap-1">
                    Class/Subjects
                    {sortConfig.key === 'grade' && <ChevronDown size={14} className={sortConfig.direction === 'desc' ? 'rotate-180' : ''} />}
                  </div>
                </th>
                <th className="p-3 hidden md:table-cell cursor-pointer hover:bg-black/5 transition-colors" onClick={() => toggleSort('lastPaymentDate')}>
                  <div className="flex items-center gap-1">
                    Last Active
                    {sortConfig.key === 'lastPaymentDate' && <ChevronDown size={14} className={sortConfig.direction === 'desc' ? 'rotate-180' : ''} />}
                  </div>
                </th>
                <th className="p-3 text-center cursor-pointer hover:bg-black/5 transition-colors" onClick={() => toggleSort('feeStatus')}>
                  <div className="flex items-center justify-center gap-1">
                    Fee Status
                    {sortConfig.key === 'feeStatus' && <ChevronDown size={14} className={sortConfig.direction === 'desc' ? 'rotate-180' : ''} />}
                  </div>
                </th>
                <th className="p-3 text-center hidden md:table-cell">Batch Access</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredStudents.map(e => (
                <tr key={e.id} className={`border-b border-gray-100 dark:border-white/5 transition-colors ${selectedStudentId === e.id ? 'bg-[var(--primary)]/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                  <td className="p-3">
                    <div className="font-bold text-gray-900 dark:text-white leading-tight">{e.name}</div>
                    <div className="text-[10px] text-gray-500">{e.email}</div>
                    <div className="md:hidden mt-1 flex items-center gap-2">
                       <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded text-[9px]">Class {e.grade}</span>
                       <a href={`tel:${e.whatsapp}`} className="text-blue-500 text-[10px]">Call</a>
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded text-[10px] mr-2">Class {e.grade}</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">{(e.subjects || []).join(', ')}</span>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <div className="text-gray-500 dark:text-gray-400 text-xs">
                      {e.lastPaymentAttempt ? new Date(e.lastPaymentAttempt.toDate()).toLocaleDateString() : 'No Activity'}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {(() => {
                      const monthLedger = dateFilterType === 'month' && dateFilterValue 
                        ? monthlyLedgers.find(l => l.studentId === e.id && l.month === dateFilterValue)
                        : null;
                      
                      const currentStatus = monthLedger ? monthLedger.status : (e.feeStatus || 'Pending');
                      const displayStatus = currentStatus === 'Clear' ? 'Paid' : currentStatus;
                      
                      return (
                        <select 
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase outline-none cursor-pointer ${
                            ['Paid', 'Clear', 'Success', 'Verified'].includes(displayStatus) ? 'bg-green-500/20 text-green-500 border border-green-500/30' :
                            (displayStatus === 'Pending' || !displayStatus) ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                            'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          }`}
                          value={displayStatus || 'Pending'}
                          onChange={async (event) => {
                            const newStatus = event.target.value;
                            const toastId = toast.loading(`Updating status to ${newStatus}...`);
                            try {
                              if (monthLedger) {
                                if (newStatus === 'Paid' || newStatus === 'Clear') {
                                  // Record actual payment to keep history accurate
                                  let earlyBirdEligible = false;
                                  const advDiscount = Number(monthLedger.advancedDiscount || 0);
                                  if (advDiscount > 0) {
                                     const [year, monthStr] = monthLedger.month.split('-');
                                     const deadlineDate = new Date(parseInt(year, 10), parseInt(monthStr, 10) - 1, 10, 23, 59, 59);
                                     if (new Date() <= deadlineDate) earlyBirdEligible = true;
                                  }
                                  
                                  const bal = Number(monthLedger.balance || monthLedger.finalPayable || 0);
                                  // if they haven't paid anything yet, full payment amount is calculated
                                  let paymentAmountToRecord = earlyBirdEligible ? Math.max(0, bal - advDiscount) : bal;
                                  
                                  const paymentId = await pricingService.recordPaymentAndUpdateLedger({
                                    studentId: e.id,
                                    studentName: e.name,
                                    month: monthLedger.month,
                                    months: [monthLedger.month],
                                    amount: paymentAmountToRecord,
                                    mode: 'admin_override',
                                    transactionId: 'Admin Override'
                                  });
                                  
                                  // verify the payment to trigger ledger early bird waive
                                  await pricingService.verifyPaymentAndApplyToLedger(e.id, paymentAmountToRecord, paymentId, [monthLedger.month]);
                                } else if (newStatus === 'Pending') {
                                  // Note: We don't delete history here, but we revert the ledger
                                  await firestoreService.updateItem('student_monthly_fee_ledger', monthLedger.id, {
                                    status: newStatus,
                                    paidAmount: 0,
                                    balance: monthLedger.finalPayable,
                                    updatedAt: serverTimestamp()
                                  });
                                }
                                
                                // Update global if current month
                                const currentMonthStr = new Date().toISOString().slice(0, 7);
                                if (dateFilterValue === currentMonthStr) {
                                  await firestoreService.updateItem('enrollments', e.id, { feeStatus: newStatus === 'Paid' || newStatus === 'Clear' ? 'Paid' : 'Pending' });
                                }
                              } else {
                                // Update global field
                                await firestoreService.updateItem('enrollments', e.id, { feeStatus: newStatus });
                              }
                              toast.success(`Status updated`, { id: toastId });
                            } catch (err) {
                              toast.error(`Update failed`, { id: toastId });
                            }
                          }}
                        >
                          <option value="Pending" className="bg-white dark:bg-gray-900 text-red-600 dark:text-red-500">PENDING</option>
                          <option value="Paid" className="bg-white dark:bg-gray-900 text-green-600 dark:text-green-500">PAID</option>
                          {monthLedger && <option value="Partial" className="bg-white dark:bg-gray-900 text-orange-600 dark:text-orange-500">PARTIAL</option>}
                        </select>
                      );
                    })()}
                  </td>
                  <td className="p-3 text-center hidden md:table-cell">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => { setSelectedStudentId(e.id); handleBatchAccessWithId(e.id, 'active'); }}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${e.batchAccess === 'active' ? 'bg-green-500/20 text-green-600 dark:text-green-500' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
                      >
                        Active
                      </button>
                      <button 
                        onClick={() => { setSelectedStudentId(e.id); handleBatchAccessWithId(e.id, 'disabled'); }}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${e.batchAccess === 'disabled' ? 'bg-red-500/20 text-red-600 dark:text-red-500' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
                      >
                        Removed
                      </button>
                      <button 
                        onClick={() => { setSelectedStudentId(e.id); handleBatchAccessWithId(e.id, 'auto'); }}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${e.batchAccess === 'auto' || !e.batchAccess ? 'bg-blue-500/20 text-blue-600 dark:text-blue-500' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
                      >
                        Auto
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <button 
                      onClick={() => setSelectedStudentId(selectedStudentId === e.id ? '' : e.id)}
                      className={`px-3 py-1.5 md:px-4 md:py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all ${selectedStudentId === e.id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                    >
                      {selectedStudentId === e.id ? 'Viewing' : (window.innerWidth < 768 ? 'Manage' : 'Manage Account')}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 italic">No students match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-white/10 mt-6 overflow-x-auto hide-scrollbar">
        {[
          { id: 'profile', label: 'Profile' },
          { id: 'ledger', label: 'Fee Ledger' },
          { id: 'payments', label: 'Payments' },
          { id: 'requests', label: 'Payment Requests', badge: selectedStudent?.paymentHistory?.filter((p:any) => p.status==='pending').length || 0 },
          { id: 'reports', label: 'Reports' },
          { id: 'adjustments', label: 'Adjustments History' },
          { id: 'notes', label: 'Notes' },
          { id: 'documents', label: 'Documents' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.id 
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400' 
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:border-gray-600'
            }`}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span className="px-1.5 py-0.5 bg-indigo-500 text-white text-[10px] rounded-full font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {selectedStudent ? (
           <div className="space-y-4">
             {activeTab === 'profile' && (
               <div className="glass-card">
                 <h3 className="font-bold text-gray-900 dark:text-white mb-4">Student Profile & Allocation</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-4">
                     <div>
                       <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Student Name</label>
                       <input 
                         type="text" 
                         value={selectedStudent.name || ''} 
                         disabled
                         className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-gray-900 dark:text-white text-sm"
                       />
                     </div>
                     <div>
                       <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Enrolled Slots (Comma separated batch numbers/IDs)</label>
                       <input 
                         type="text" 
                         defaultValue={selectedStudent.slots || ''} 
                         onBlur={async (e) => {
                           const updatedSlots = e.target.value;
                           if (updatedSlots !== selectedStudent.slots) {
                             const toastId = toast.loading('Updating slots...');
                             try {
                               await firestoreService.updateItem('enrollments', selectedStudent.id, { slots: updatedSlots });
                               toast.success('Slots updated successfully', { id: toastId });
                             } catch (err) {
                               toast.error('Failed to update slots', { id: toastId });
                             }
                           }
                         }}
                         placeholder="e.g. BATCH-A, BATCH-B"
                         className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-gray-900 dark:text-white text-sm outline-none focus:border-[var(--primary)]"
                       />
                     </div>
                   </div>
                 </div>
               </div>
             )}
             {activeTab === 'ledger' && (
               <div className="glass-card">
                  <div className="flex justify-between items-center p-4 border-b border-white/10">
                    <p className="text-xs text-gray-400">Month-wise fee ledger. All amounts are in INR.</p>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 border border-[#2a2a2a] bg-[#1e1e1e] text-green-500 rounded-lg text-xs font-bold hover:bg-green-500/10 flex items-center gap-1.5">
                        <Plus size={14} /> Add Adjustment
                      </button>
                      <button className="px-3 py-1.5 border border-[#2a2a2a] bg-[#1e1e1e] text-gray-300 rounded-lg text-xs font-bold hover:bg-white/5 flex items-center gap-1.5">
                        <Settings size={14} /> Ledger Settings
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-black/20 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="p-4">Month</th>
                          <th className="p-4">Total Fee</th>
                          <th className="p-4">Std. Discount</th>
                          <th className="p-4">Combo Discount</th>
                          <th className="p-4">Adv. Discount</th>
                          <th className="p-4">Final Payable</th>
                          <th className="p-4">Paid Amount</th>
                          <th className="p-4">Balance</th>
                          <th className="p-4 text-center">Status</th>
                          <th className="p-4 text-center">Adv. Deadline</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {monthlyLedgers.filter(l => l.studentId === selectedStudent.id).map((ledger, idx) => {
                           const monthName = new Date(ledger.month + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
                           return (
                             <tr key={ledger.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                               <td className="p-4 font-medium">{monthName}</td>
                               <td className="p-4 opacity-70">₹{ledger.totalFee}</td>
                               <td className="p-4 opacity-70">- ₹{ledger.standardDiscount || 0}</td>
                               <td className="p-4 opacity-70">- ₹{ledger.comboDiscount || 0}</td>
                               <td className="p-4 text-green-400 font-bold">- ₹{ledger.advancedDiscount || 0}</td>
                               <td className="p-4 font-bold">₹{ledger.finalPayable}</td>
                               <td className="p-4 font-bold text-green-500">₹{ledger.paidAmount}</td>
                               <td className="p-4 font-bold text-red-400">₹{ledger.balance}</td>
                                <td className="p-4 text-center">
                                  <select 
                                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-transform outline-none cursor-pointer ${
                                   ['Paid', 'Clear', 'Success'].includes(ledger.status) || ledger.balance === 0 ? 'bg-green-500/20 text-green-500 border border-green-500/30' :
                                   ledger.status === 'Partial' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                                   'bg-red-500/20 text-red-500 border border-red-500/30'
                                 }`}
                                    value={ledger.balance === 0 ? 'Paid' : (ledger.status === 'Clear' ? 'Paid' : ledger.status)}
                                    onChange={async (e) => {
                                       const newStatus = e.target.value;
                                       const toastId = toast.loading('Updating ledger status...');
                                       try {
                                         let newPaid = ledger.paidAmount || 0;
                                         let newBalance = ledger.balance || 0;
                                         if (newStatus === 'Paid') {
                                           newPaid = ledger.finalPayable;
                                           newBalance = 0;
                                         } else if (newStatus === 'Pending') {
                                           newPaid = 0;
                                           newBalance = ledger.finalPayable;
                                         }
                                         
                                         await firestoreService.updateItem('student_monthly_fee_ledger', ledger.id, {
                                            status: newStatus,
                                            paidAmount: newPaid,
                                            balance: newBalance
                                         });
                                         
                                         const currentMonthStr = new Date().toISOString().slice(0, 7);
                                         if (ledger.month === currentMonthStr) {
                                            await firestoreService.updateItem('enrollments', selectedStudent.id, {
                                                feeStatus: newStatus === 'Paid' ? 'Paid' : 'Pending'
                                            });
                                         }
                                         toast.success('Ledger updated successfully', { id: toastId });
                                       } catch (err) {
                                         toast.error('Failed to update ledger', { id: toastId });
                                       }
                                    }}
                                  >
                                    <option value="Paid" className="bg-gray-900 text-green-500">PAID</option>
                                    <option value="Pending" className="bg-gray-900 text-red-500">PENDING</option>
                                    <option value="Partial" className="bg-gray-900 text-yellow-500">PARTIAL</option>
                                  </select>
                               </td>
                               <td className="p-4 text-center text-xs">
                                  <div className="text-gray-300">{String(branding?.advancedPaymentDiscountDay || 5).padStart(2, '0')} {monthName.split(' ')[0]}</div>
                                  <div className="text-[9px] text-red-400">(Expired)</div>
                               </td>
                               <td className="p-4 text-right flex justify-end gap-2 items-center">
                                  {ledger.balance > 0 && selectedStudent.whatsapp && (
                                    <button 
                                      onClick={() => {
                                        const subjectStr = (ledger.subjects || []).join(', ');
                                        const msg = `*FEES REMINDER*\n\n👤 *Student:* ${selectedStudent.name}\n📚 *Class:* ${selectedStudent.grade}\n📖 *Subjects:* ${subjectStr}\n🕒 *Month:* ${monthName}\n\n💰 *Total Payable:* ₹${ledger.finalPayable}\n✅ *Paid:* ₹${ledger.paidAmount}\n❗ *Pending Balance:* ₹${ledger.balance}\n\nPlease clear the pending dues for the month of ${monthName}. Ignore if already paid.`;
                                        window.open(`https://wa.me/${selectedStudent.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                                      }}
                                      className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-lg text-xs font-bold hover:bg-amber-500/20 transition-colors whitespace-nowrap"
                                    >
                                      Remind
                                    </button>
                                  )}
                                  <button 
                                     onClick={() => handleGenerateReceipt(ledger)}
                                     className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors"
                                  >
                                    View Receipt
                                  </button>
                               </td>
                             </tr>
                           )
                        })}
                        {monthlyLedgers.filter(l => l.studentId === selectedStudent.id).length === 0 && (
                          <tr>
                            <td colSpan={10} className="p-8 text-center text-gray-500 italic">
                               No ledger entries found. The ledger might not have been generated yet.
                               <button onClick={handleGenerateLedger} className="mt-4 px-4 py-2 bg-indigo-500/20 text-indigo-400 font-bold rounded-lg hover:bg-indigo-500/30 block mx-auto transition-colors">
                                 Generate Ledger Now
                               </button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
               </div>
             )}
             {activeTab === 'payments' && (
               <div className="glass-card overflow-hidden">
                 <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                   <h3 className="font-bold text-gray-900 dark:text-white">Payment History</h3>
                   <button 
                     onClick={() => setOfflinePaymentModalOpen(true)}
                     className="px-3 py-1.5 bg-green-500/20 text-green-500 rounded-lg text-xs font-bold hover:bg-green-500/30 flex items-center gap-1.5"
                   >
                     <Plus size={14} /> Record Offline Payment
                   </button>
                 </div>
                 <div className="p-0 overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="bg-black/20 text-gray-400 text-xs font-medium uppercase tracking-wider">
                         <th className="p-4">Date</th>
                         <th className="p-4">Request ID</th>
                         <th className="p-4">Amount</th>
                         <th className="p-4">Mode / TXN</th>
                         <th className="p-4">Status</th>
                         <th className="p-4 text-right">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="text-sm">
                       {selectedStudent.paymentHistory && selectedStudent.paymentHistory.length > 0 ? (
                         [...selectedStudent.paymentHistory].sort((a,b) => {
                             const dateA = a.updatedAt || a.verifiedAt || a.createdAt || a.date;
                             const dateB = b.updatedAt || b.verifiedAt || b.createdAt || b.date;
                             return new Date(dateB).getTime() - new Date(dateA).getTime();
                          }).map((payment: any, i: number) => (
                           <tr key={payment.id || i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                             <td className="p-4 font-medium text-gray-600 dark:text-gray-300">
                                {(() => {
                                  const d = payment.updatedAt || payment.verifiedAt || payment.createdAt || payment.date;
                                  return d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : 'Unknown';
                                })()}
                             </td>
                             <td className="p-4 text-gray-500 text-xs max-w-[150px] truncate">{payment.id || 'N/A'}</td>
                             <td className="p-4 font-bold text-gray-900 dark:text-white">₹{payment.amount}</td>
                             <td className="p-4 text-xs">
                               <div className="text-gray-300 uppercase font-medium">{payment.mode || 'UPI / ONLINE'}</div>
                               {payment.transactionId && <div className="text-gray-500 break-all">{payment.transactionId}</div>}
                             </td>
                             <td className="p-4">
                               <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                 payment.status === 'verified' || payment.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                                 payment.status === 'rejected' || payment.status === 'failed' ? 'bg-red-500/20 text-red-500' :
                                 payment.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                                 payment.status === 'reverted' ? 'bg-orange-500/20 text-orange-400' :
                                 'bg-gray-500/20 text-gray-400'
                               }`}>
                                 {payment.status}
                               </span>
                             </td>
                             <td className="p-4 text-right">
                               {(payment.status === 'completed' || payment.status === 'verified') && (
                                 <button 
                                   onClick={() => handleRevertPayment(payment.id, payment.amount)}
                                   className="px-3 py-1 bg-white/5 border border-white/10 text-gray-300 rounded-lg text-xs font-bold hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors"
                                 >
                                   Revert
                                 </button>
                               )}
                               {(payment.status === 'pending') && (
                                 <button 
                                   onClick={() => handleVerifyPayment(payment)}
                                   className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-500 rounded-lg text-xs font-bold hover:bg-green-500/30 transition-colors ml-2"
                                 >
                                   Verify
                                 </button>
                               )}
                               {(payment.screenshotUrl || payment.screenshot) && (
                                 <a 
                                   href={payment.screenshotUrl || payment.screenshot} 
                                   target="_blank" 
                                   rel="noopener"
                                   className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-lg text-xs font-bold hover:bg-blue-500/30 transition-colors ml-2 inline-block"
                                 >
                                   Image
                                 </a>
                               )}
                             </td>
                           </tr>
                         ))
                       ) : (
                         <tr>
                           <td colSpan={6} className="p-8 text-center text-gray-500 italic">No payments recorded.</td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                  </div>
                </div>
              )}

              {activeTab === 'requests' && (
                <div className="glass-card">
                  <div className="p-8 text-center space-y-4 max-w-lg mx-auto">
                    <CheckCircle2 className="mx-auto text-indigo-400 opacity-50" size={48} />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Payment Requests & Verification</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Send a WhatsApp link to the student requesting payment verification. They will be directed to upload a screenshot or Transaction ID to clear their pending dues.
                    </p>
                    <button 
                      onClick={handleSendVerificationRequest}
                      className="px-6 py-3 bg-[var(--primary)] text-white font-bold rounded-xl hover:bg-[var(--primary)]/90 transition-all shadow-lg w-full flex items-center justify-center gap-2"
                    >
                      <TrendingUp size={18} /> Send Verification Request
                    </button>
                    <p className="text-xs text-gray-500 mt-4">
                      Submitted payment proofs can be verified directly from the main <strong className="text-gray-700 dark:text-gray-300">Admin Finance Module &rarr; Verification Queue</strong>.
                    </p>
                  </div>
                </div>
             )}
             {activeTab === 'reports' && (
                <div className="space-y-6">
                  <div className="glass-card grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                      <label className="text-[10px] uppercase font-bold text-gray-500 block mb-2">Analysis Month</label>
                      <input 
                        type="month" 
                        value={selectedReportMonth} 
                        onChange={e => setSelectedReportMonth(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-[var(--primary)] [color-scheme:dark]"
                      />
                    </div>
                    {(() => {
                      const monthLedgers = monthlyLedgers.filter(l => l.month === selectedReportMonth);
                      const totalExp = monthLedgers.reduce((sum, l) => sum + (l.finalPayable || 0), 0);
                      const totalPaid = monthLedgers.reduce((sum, l) => sum + (l.paidAmount || 0), 0);
                      const totalPend = monthLedgers.reduce((sum, l) => sum + (l.balance || 0), 0);
                      return (
                        <>
                          <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                            <div className="text-[10px] uppercase font-bold text-green-400 opacity-60">Collected ({selectedReportMonth})</div>
                            <div className="text-2xl font-black text-white">₹{totalPaid.toLocaleString()}</div>
                            <div className="text-[10px] text-green-400 mt-1">Expected: ₹{totalExp.toLocaleString()}</div>
                          </div>
                          <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                            <div className="text-[10px] uppercase font-bold text-red-400 opacity-60">Pending ({selectedReportMonth})</div>
                            <div className="text-2xl font-black text-white">₹{totalPend.toLocaleString()}</div>
                            <div className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                              Defaulters: {monthLedgers.filter(l => l.balance > 0).length}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="glass-card">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <Filter size={16} /> Month-wise Defaulters & Followups
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-black/20 text-gray-400 uppercase tracking-wider font-bold">
                            <th className="p-3">Student</th>
                            <th className="p-3">Phone</th>
                            <th className="p-3">Payable</th>
                            <th className="p-3">Paid</th>
                            <th className="p-3">Balance</th>
                            <th className="p-3">Last Attempt</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyLedgers
                            .filter(l => l.month === selectedReportMonth && l.balance > 0)
                            .map(l => {
                              const student = enrollments.find(e => e.id === l.studentId);
                              return (
                                <tr key={l.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                  <td className="p-3">
                                    <div className="font-bold text-white">{l.studentName}</div>
                                    <div className="opacity-50 text-[10px] uppercase">{l.grade}</div>
                                  </td>
                                  <td className="p-3 text-gray-400">{l.phone || student?.whatsapp || 'N/A'}</td>
                                  <td className="p-3 opacity-70">₹{l.finalPayable}</td>
                                  <td className="p-3 text-green-500">₹{l.paidAmount}</td>
                                  <td className="p-3 text-red-400 font-bold">₹{l.balance}</td>
                                  <td className="p-3 opacity-50">
                                    {student?.lastPaymentAttempt ? new Date(student.lastPaymentAttempt.toDate()).toLocaleDateString() : 'Never'}
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="flex justify-end gap-1">
                                      <button 
                                        onClick={() => {
                                          const msg = `*FEES REMINDER*\n\nHi ${l.studentName},\nYou have a pending balance of ₹${l.balance} for ${new Date(l.month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}.\nPlease clear it as soon as possible.`;
                                          window.open(`https://wa.me/${(l.phone || student?.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                                        }}
                                        className="p-1.5 bg-green-500/10 text-green-500 rounded border border-green-500/20 hover:bg-green-500/20"
                                        title="WhatsApp Reminder"
                                      >
                                        <TrendingUp size={14} />
                                      </button>
                                      <button 
                                        onClick={() => { setSelectedStudentId(l.studentId); setActiveTab('ledger'); }}
                                        className="p-1.5 bg-blue-500/10 text-blue-500 rounded border border-blue-500/20 hover:bg-blue-500/20"
                                        title="View Full Ledger"
                                      >
                                        <Eye size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          }
                          {monthlyLedgers.filter(l => l.month === selectedReportMonth && l.balance > 0).length === 0 && (
                            <tr>
                              <td colSpan={7} className="p-10 text-center opacity-50 italic">No defaulters found for this month! All students have cleared their dues.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
             {/* Other tabs placeholder */}
             {['adjustments', 'notes', 'documents'].includes(activeTab) && (
               <div className="p-8 text-center text-gray-400 glass-card flex flex-col items-center">
                 <Settings size={32} className="mb-4 opacity-50 text-indigo-400" />
                 <h3 className="text-lg font-bold text-white mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module</h3>
                 <p className="text-sm max-w-md">The {activeTab} system is currently being rolled out and will be accessible shortly. Please use the primary ledger and payments tabs to record transactions for now.</p>
               </div>
             )}
           </div>
        ) : (
          <div className="glass-card p-12 text-center flex flex-col items-center justify-center text-gray-500">
            <User size={48} className="mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-gray-300">No Student Selected</h3>
            <p className="text-sm mt-1">Please select a student from the dropdown above to view their fee ledger and details.</p>
          </div>
        )}
      </div>
      </>
      )}

      {createPortal(
        <AnimatePresence>
          {offlinePaymentModalOpen && selectedStudent && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
              onClick={() => setOfflinePaymentModalOpen(false)}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 p-6 rounded-3xl w-full max-w-md shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] relative mx-auto my-auto"
                onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => setOfflinePaymentModalOpen(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 bg-gray-100 dark:bg-white/5 rounded-full"
                >
                  <X size={20} />
                </button>
                
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Record Offline Payment</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Record a cash/offline payment for <span className="text-[var(--primary)] font-bold">{selectedStudent.name}</span>.
                    <br/><span className="text-amber-600 dark:text-amber-400">This automatically splits to Faculty Payroll.</span>
                  </p>
                </div>

                <form onSubmit={handleRecordOfflinePayment} className="space-y-5">
                  <div>
                    <label className="text-xs font-bold uppercase text-gray-400 dark:opacity-50 block mb-1.5">Amount Paid (₹)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="number"
                        required
                        min="1"
                        className="w-full pl-10 pr-4 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl font-black text-xl text-gray-900 dark:text-white placeholder-gray-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 outline-none transition-all"
                        placeholder="0.00"
                        value={offlinePaymentAmount}
                        onChange={(e) => setOfflinePaymentAmount(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold uppercase text-gray-400 dark:opacity-50 block mb-1.5">Payment Mode / Notes</label>
                    <textarea
                      className="w-full p-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 outline-none transition-all min-h-[100px] resize-none"
                      placeholder="e.g. Cash collected by Admin, Offline Check #12345"
                      value={offlinePaymentNotes}
                      onChange={(e) => setOfflinePaymentNotes(e.target.value)}
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setOfflinePaymentModalOpen(false)}
                      className="px-4 py-3.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-white rounded-2xl text-sm font-bold transition-all flex-1"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmittingOfflinePayment}
                      className="px-4 py-3.5 bg-[var(--primary)] hover:brightness-110 text-white rounded-2xl text-sm font-bold transition-all flex-1 disabled:opacity-50 shadow-lg shadow-[var(--primary)]/20"
                    >
                      {isSubmittingOfflinePayment ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="animate-spin" size={18} />
                          <span>Saving...</span>
                        </div>
                      ) : 'Record Receipt'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}    </div>
  );
}

