import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  IndianRupee,
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Calendar, 
  PieChart as PieChartIcon, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Download,
  Trash2,
  Search,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Loader2,
  Edit2,
  ChevronRight,
  MoreVertical,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { firestoreService, handleFirestoreError } from '../services/firestoreService';
import { authService } from '../services/authService';
import { collection, query, where, getDocs, orderBy, Timestamp, limit } from 'firebase/firestore';
import { db } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
import { storageService } from '../services/storageService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Cell, 
  Pie,
  LineChart,
  Line,
  Legend
} from 'recharts';
import toast from 'react-hot-toast';
import { pricingService } from '../services/pricingService';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CATEGORIES = {
  expense: ['Teacher Salary', 'Rent', 'Electricity', 'Wifi', 'Equipment', 'Promotional', 'Miscellaneous', 'Other'],
  income: ['Fee', 'Loan', 'Grant', 'Achievement Reward', 'Other']
};

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function FinanceModule({ branding }: { branding?: any }) {
  const [finances, setFinances] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'ledger' | 'fees' | 'pending' | 'monthly_sheets'>('overview');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedFeeMonths, setSelectedFeeMonths] = useState<string[]>([]);
  const [monthlyLedgers, setMonthlyLedgers] = useState<any[]>([]);
  const [newEntry, setNewEntry] = useState({
    type: 'expense' as 'income' | 'expense',
    category: 'Other',
    amount: '',
    title: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    transactionId: '',
    screenshotUrl: '',
    studentId: '',
    studentName: ''
  });
  const [isUploading, setIsUploading] = useState(false);

  const [dateFilter, setDateFilter] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [financeLedgers, setFinanceLedgers] = useState<any[]>([]);

  const [feesData, setFeesData] = useState<any[]>([]);
  const [pendingFilters, setPendingFilters] = useState({
    search: '',
    grade: 'ALL',
    subject: 'ALL',
    status: 'ALL',
    minDue: '',
    maxDue: '',
    sortBy: 'due_desc' as 'due_desc' | 'due_asc' | 'name_asc' | 'name_desc',
    hasProofs: false
  });

  useEffect(() => {
    let unsubFinances = () => {};
    let unsubLedger = () => {};
    let unsubEnrollments = () => {};
    let unsubUsers = () => {};
    let unsubFees = () => {};
    let unsubMonthlyLedgers = () => {};

    const unsubscribeAuth = authService.onAuthChange((u) => {
      if (u) {
        const adminEmail1 = import.meta.env.VITE_ADMIN_EMAIL_1 || 'xavierscot3454@gmail.com';
        const adminEmail2 = import.meta.env.VITE_ADMIN_EMAIL_2 || 'helixsmith.xavy@gmail.com';
        const adminEmail3 = 'makeitawesom3@gmail.com';
        const isUserAdmin = u.email === adminEmail1 || u.email === adminEmail2 || u.email === adminEmail3;

        if (isUserAdmin) {
          unsubFinances = firestoreService.listenToCollection('finances', (data) => {
            setFinances(data.sort((a, b) => b.date?.seconds - a.date?.seconds));
            setLoading(false);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'finances');
          });

          unsubLedger = firestoreService.listenToCollection('finance_ledger', (data) => {
            setFinanceLedgers(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'finance_ledger');
          });

          unsubEnrollments = firestoreService.listenToCollection('enrollments', (data) => {
            setEnrollments(data);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'enrollments');
          });

          unsubUsers = firestoreService.listenToCollection('users', (data) => {
            setUsers(data);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'users');
          });

          unsubFees = firestoreService.listenToCollection('fees', (data) => {
            setFeesData(data);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'fees');
          });

          unsubMonthlyLedgers = firestoreService.listenToCollection('student_monthly_fee_ledger', (data) => {
            setMonthlyLedgers(data);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'student_monthly_fee_ledger');
          });
        } else {
           setLoading(false); // Stop loading if not admin
        }
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubFinances();
      unsubLedger();
      unsubEnrollments();
      unsubUsers();
      unsubFees();
      unsubMonthlyLedgers();
    };
  }, []);

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.amount || !newEntry.title) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const entryId = (newEntry as any).id;
      const amount = parseFloat(newEntry.amount);
      const data = {
        ...newEntry,
        amount,
        date: Timestamp.fromDate(new Date(newEntry.date)),
        updatedAt: Timestamp.now()
      };
      
      let finalFinanceId;
      if (entryId) {
        delete (data as any).id;
        await firestoreService.updateItem('finances', entryId, data);
        finalFinanceId = entryId;
        toast.success('Entry updated successfully');
      } else {
        finalFinanceId = await firestoreService.addItem('finances', {
          ...data,
          createdAt: Timestamp.now()
        });
        toast.success('Entry added successfully');
      }

      // If FEE, process splits and ledgers
      if (!entryId && newEntry.category === 'Fee' && newEntry.studentId) {
        const _toastId = toast.loading('Syncing with Ledger & Payroll...');
        const student = users.find(u => u.id === newEntry.studentId);
        
        // Use first selected month or current month
        const monthForRecord = selectedFeeMonths.length > 0 ? selectedFeeMonths[0] : new Date().toISOString().slice(0, 7);

        // 1. Record in payment history (skip regular ledger sum logic)
        const paymentId = await pricingService.recordPaymentAndUpdateLedger({
          studentId: newEntry.studentId,
          studentName: student?.name || newEntry.studentName,
          month: monthForRecord,
          months: selectedFeeMonths.length > 0 ? selectedFeeMonths : undefined,
          amount: amount,
          mode: 'admin_panel',
          transactionId: newEntry.transactionId || newEntry.notes || `FIN-${finalFinanceId}`,
          skipLedgerUpdate: true
        });

        // 2. Automatically Verify & Distribute directly
        await pricingService.verifyPaymentAndApplyToLedger(newEntry.studentId, amount, paymentId, selectedFeeMonths);

        // 3. Compute Faculty Splits
        let facultyPool = amount * 0.5; // Fixed 50% split assumption from fallback logic
        const adminCut = amount - facultyPool;
        const subjectSplits: Record<string, number> = {};
        if (student?.subjects) {
          student.subjects.forEach((sub: string) => {
            subjectSplits[sub] = Math.floor(facultyPool / student.subjects.length);
          });
        }
        
        // 4. Save to finance_ledger for payroll display
        await firestoreService.addItem('finance_ledger', {
          studentId: newEntry.studentId,
          studentName: student?.name || '',
          amountPaid: amount,
          adminCut: adminCut,
          facultyCut: facultyPool,
          subjectSplits: subjectSplits,
          date: new Date().toISOString(),
          enrollmentId: newEntry.studentId,
          isDistributed: false,
          source: 'admin_panel',
          title: newEntry.title,
          amount: amount,
          type: 'income',
          category: 'fee',
          notes: newEntry.notes,
          transactionId: newEntry.transactionId,
          linkedFinanceId: finalFinanceId
        });
        
        toast.success('Fully synced with Ledger & Payroll!', { id: _toastId });
      }
      
      setIsAddModalOpen(false);
      setSelectedFeeMonths([]);
      setNewEntry({
        type: 'expense',
        category: 'Other',
        amount: '',
        title: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        transactionId: '',
        screenshotUrl: '',
        studentId: '',
        studentName: ''
      });
    } catch (err) {
      toast.error('Failed to save entry');
    }
  };

  const filteredFinances = finances; // Show all transactions without time filter

  const totals = filteredFinances.reduce((acc, f) => {
    if (f.type === 'income') acc.income += f.amount;
    else acc.expense += f.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const analyticsFinances = finances.filter(f => {
    const fDate = f.date.toDate();
    const start = new Date(dateFilter.start);
    start.setHours(0,0,0,0);
    const end = new Date(dateFilter.end);
    end.setHours(23,59,59,999);
    return fDate >= start && fDate <= end;
  });

  const realTotals = analyticsFinances.reduce((acc, f) => {
    if (f.type === 'income') acc.income += f.amount;
    else acc.expense += f.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const chartData = analyticsFinances.reduce((acc: any[], f) => {
    const dateStr = f.date.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const existing = acc.find(d => d.date === dateStr);
    if (existing) {
      if (f.type === 'income') existing.income += f.amount;
      else existing.expense += f.amount;
    } else {
      acc.push({ date: dateStr, income: f.type === 'income' ? f.amount : 0, expense: f.type === 'expense' ? f.amount : 0 });
    }
    return acc;
  }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const categoryData = analyticsFinances.reduce((acc: any[], f) => {
    const existing = acc.find(c => c.name === f.category);
    if (existing) {
      existing.value += f.amount;
    } else {
      acc.push({ name: f.category, value: f.amount });
    }
    return acc;
  }, []);

  const pendingPayments = enrollments.filter(e => e.feeStatus !== 'Paid');
  const pendingSubjects = Array.from(new Set(
    pendingPayments.flatMap(e => (e.subjects || []) as string[])
  )).sort();
  const getPendingAmount = (e: any) => Math.max(0, Number(e.totalFee || 0) - Number(e.discount || 0) - Number(e.totalPaid || 0));
  const syncMonthlyFeeCollections = async (e: any, amount: number, paymentId: string, txId = '', months?: string[]) => {
    const month = months && months.length > 0 ? months[0] : new Date().toISOString().slice(0, 7);
    await pricingService.recordPaymentAndUpdateLedger({
      studentId: e.id,
      studentName: e.name || 'Unknown Student',
      month,
      months,
      amount: Number(amount || 0),
      paymentId,
      transactionId: txId,
      mode: 'admin-finance',
    });
  };
  const filteredPendingPayments = pendingPayments
    .filter((e: any) => {
      const search = pendingFilters.search.trim().toLowerCase();
      const due = getPendingAmount(e);
      const statusOk = pendingFilters.status === 'ALL' ? true : (e.feeStatus || 'Pending') === pendingFilters.status;
      const gradeOk = pendingFilters.grade === 'ALL' ? true : (e.grade || '') === pendingFilters.grade;
      const subjectOk = pendingFilters.subject === 'ALL'
        ? true
        : (e.subjects || []).includes(pendingFilters.subject);
      const searchOk = !search
        ? true
        : `${e.name || ''} ${e.email || ''} ${e.whatsapp || ''}`.toLowerCase().includes(search);
      const minOk = pendingFilters.minDue === '' ? true : due >= Number(pendingFilters.minDue);
      const maxOk = pendingFilters.maxDue === '' ? true : due <= Number(pendingFilters.maxDue);
      const proofsOk = !pendingFilters.hasProofs ? true : (e.paymentHistory && e.paymentHistory.some((ph:any) => ph.status === 'pending'));
      return statusOk && gradeOk && subjectOk && searchOk && minOk && maxOk && proofsOk;
    })
    .sort((a: any, b: any) => {
      if (pendingFilters.sortBy === 'due_desc') return getPendingAmount(b) - getPendingAmount(a);
      if (pendingFilters.sortBy === 'due_asc') return getPendingAmount(a) - getPendingAmount(b);
      if (pendingFilters.sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      return (a.name || '').localeCompare(b.name || '');
    });
  
  // Advance fee prediction: count students enrolled but might need next month payment
  // For demo, just showing pending.

  if (loading) return <div className="flex justify-center items-center py-20"><Clock className="animate-spin text-[var(--primary)]" /></div>;

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2 flex items-center gap-2 text-white">
            <Wallet className="text-white" />
            Financial Management
          </h2>
          <p className="text-blue-100 opacity-80 font-medium">Track income, expenses, and fee collection</p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <input 
            type="date" 
            value={dateFilter.start}
            onChange={e => setDateFilter({...dateFilter, start: e.target.value})}
            className="p-2 bg-white/10 border border-white/20 rounded-xl text-xs outline-none text-white focus:border-white [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
          />
          <span className="opacity-80">to</span>
          <input 
            type="date" 
            value={dateFilter.end}
            onChange={e => setDateFilter({...dateFilter, end: e.target.value})}
            className="p-2 bg-white/10 border border-white/20 rounded-xl text-xs outline-none text-white focus:border-white [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
          />
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="p-3 bg-white text-blue-600 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all font-bold"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg text-green-500">
              <TrendingUp size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-green-500/50">Total Income</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black">₹{realTotals.income.toLocaleString()}</h3>
            <p className="text-xs opacity-60 flex items-center gap-1">
              <ArrowUpRight size={14} className="text-green-500" />
              Includes fees & other sources
            </p>
          </div>
        </div>

        <div className="glass-card p-6 bg-gradient-to-br from-red-500/10 to-orange-500/5 border-red-500/20">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-red-500/20 rounded-lg text-red-500">
              <TrendingDown size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-red-500/50">Total Expenses</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black">₹{realTotals.expense.toLocaleString()}</h3>
            <p className="text-xs opacity-60 flex items-center gap-1">
              <ArrowDownRight size={14} className="text-red-500" />
              Salaries, rent, overheads
            </p>
          </div>
        </div>

        <div className="glass-card p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500">
              <Wallet size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500/50">Net Balance</span>
          </div>
          <div className="space-y-1">
            <h3 className={`text-3xl font-black ${realTotals.income - realTotals.expense >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ₹{(realTotals.income - realTotals.expense).toLocaleString()}
            </h3>
            <p className="text-xs opacity-60">Cash Flow Balance</p>
          </div>
        </div>
      </div>

      {/* Detailed Itemized Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 border-green-500/10">
          <h4 className="text-sm font-black uppercase tracking-widest text-green-500 mb-4 flex items-center gap-2">
            <TrendingUp size={16} /> Income Breakdown
          </h4>
          <div className="space-y-3">
            {CATEGORIES.income.map(cat => {
              const total = analyticsFinances.filter(f => f.type === 'income' && f.category === cat).reduce((sum, f) => sum + f.amount, 0);
              const percent = realTotals.income > 0 ? (total / realTotals.income) * 100 : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{cat}</span>
                    <span>₹{total.toLocaleString()} ({percent.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      className="h-full bg-green-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-6 border-red-500/10">
          <h4 className="text-sm font-black uppercase tracking-widest text-red-500 mb-4 flex items-center gap-2">
            <TrendingDown size={16} /> Expense Breakdown
          </h4>
          <div className="space-y-3">
            {CATEGORIES.expense.map(cat => {
              const total = analyticsFinances.filter(f => f.type === 'expense' && f.category === cat).reduce((sum, f) => sum + f.amount, 0);
              const percent = realTotals.expense > 0 ? (total / realTotals.expense) * 100 : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{cat}</span>
                    <span>₹{total.toLocaleString()} ({percent.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      className="h-full bg-red-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl w-fit flex-wrap">
        <button 
          onClick={() => setActiveView('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeView === 'overview' ? 'bg-white dark:bg-[#1e1e1e] text-[var(--primary)] shadow-sm' : 'text-gray-500'}`}
        >
          Analytics
        </button>
        <button 
          onClick={() => setActiveView('ledger')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeView === 'ledger' ? 'bg-white dark:bg-[#1e1e1e] text-[var(--primary)] shadow-sm' : 'text-gray-500'}`}
        >
          Transaction Logs
        </button>
        <button 
          onClick={() => setActiveView('fees')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeView === 'fees' ? 'bg-white dark:bg-[#1e1e1e] text-[var(--primary)] shadow-sm' : 'text-gray-500'}`}
        >
          Student Fees
        </button>
        <button 
          onClick={() => setActiveView('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeView === 'pending' ? 'bg-white dark:bg-[#1e1e1e] text-[var(--primary)] shadow-sm' : 'text-gray-500'}`}
        >
          Verification {pendingPayments.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[8px]">{pendingPayments.length}</span>}
        </button>
        <button 
          onClick={() => setActiveView('monthly_sheets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeView === 'monthly_sheets' ? 'bg-white dark:bg-[#1e1e1e] text-[var(--primary)] shadow-sm' : 'text-gray-500'}`}
        >
          Monthly Sheets
        </button>
        <button 
          onClick={() => setActiveView('payroll' as any)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeView === 'payroll' as any ? 'bg-white dark:bg-[#1e1e1e] text-[var(--primary)] shadow-sm' : 'text-gray-500'}`}
        >
          Faculty Payroll
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'splits' as any && (
          <motion.div 
            key="splits"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card overflow-hidden"
          >
            <div className="p-4 border-b border-white/10">
              <h3 className="font-bold flex items-center gap-2">
                <Wallet size={18} /> SPLIT LEDGER LOGS
              </h3>
              <p className="text-xs opacity-60 mt-1">Detailed log of 50-50 automatic fee splits (Admin vs Faculty).</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 dark:bg-white/5">
                  <tr>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50">Date</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50">Student Info</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50 text-right">Amount Paid</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50 text-right">Admin Cut (50%)</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50 text-right">Faculty Pool (50%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {financeLedgers.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-4 text-xs font-medium whitespace-nowrap">
                        {new Date(log.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-bold">{log.studentName}</div>
                        <div className="flex gap-1 mt-1">
                          {(log.subjects || []).map((s: string) => (
                            <span key={s} className="px-1.5 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] text-[8px] rounded font-bold uppercase">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-sm font-black text-right">
                        ₹{log.amountPaid?.toLocaleString()}
                      </td>
                      <td className="p-4 text-sm font-black text-right text-indigo-500">
                        ₹{log.adminCut?.toLocaleString()}
                      </td>
                      <td className="p-4 text-sm font-black text-right text-emerald-500">
                        ₹{log.facultyCut?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {financeLedgers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-12 text-center opacity-30 italic font-medium">
                        No split ledger records found. Standard payments directly add income. Full logic is configured in Enrollments.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeView === 'payroll' as any && (
          <motion.div 
            key="payroll"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-emerald-500/10 p-5 rounded-3xl border border-emerald-500/20">
              <div>
                <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">Faculty Payroll Dashboard</h3>
                <p className="text-xs opacity-60 font-medium">Automatic salary tracking based on student payments (Per Paid Student Model).</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card !p-5 border-l-4 border-l-emerald-500">
                <p className="text-xs uppercase font-black opacity-50 tracking-widest mb-1">Total Faculty Pool</p>
                <div className="text-3xl font-black text-emerald-500">
                  ₹{financeLedgers.reduce((acc, log) => acc + (Number(log.facultyCut) || 0), 0).toLocaleString()}
                </div>
              </div>
              <div className="glass-card !p-5 border-l-4 border-l-indigo-500">
                <p className="text-xs uppercase font-black opacity-50 tracking-widest mb-1">Admin Retained</p>
                <div className="text-3xl font-black text-indigo-500">
                  ₹{financeLedgers.reduce((acc, log) => acc + (Number(log.adminCut) || 0), 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h4 className="font-bold">Subject-wise Salary Breakdown</h4>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100 dark:bg-white/5">
                    <tr>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50">Subject</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50 text-right">Accumulated Salary </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {Object.entries(
                      financeLedgers.reduce((acc: Record<string, number>, log) => {
                        if (log.subjectSplits) {
                          Object.entries(log.subjectSplits).forEach(([sub, amt]) => {
                            acc[sub] = (acc[sub] || 0) + Number(amt);
                          });
                        }
                        return acc;
                      }, {})
                    ).map(([sub, total]) => (
                      <tr key={sub} className="hover:bg-gray-50/50 dark:hover:bg-white/5 px-4 transition-colors">
                        <td className="p-4 text-sm font-bold">{sub}</td>
                        <td className="p-4 text-sm font-black text-right text-emerald-400">₹{total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeView === 'overview' && (
          <motion.div 
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="glass-card p-6 min-h-[400px]">
              <h4 className="text-sm font-bold mb-6 flex items-center gap-2">
                <TrendingUp size={16} className="text-[var(--primary)]" />
                Income vs Expense Flow
              </h4>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-6 min-h-[400px]">
              <h4 className="text-sm font-bold mb-6 flex items-center gap-2">
                <PieChartIcon size={16} className="text-[var(--primary)]" />
                Category Distribution
              </h4>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {activeView === 'ledger' && (
          <motion.div 
            key="ledger"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card overflow-hidden"
          >
            <div className="p-4 flex justify-between items-center border-b border-white/10">
              <h3 className="font-bold flex items-center gap-2">
                <FileText size={18} /> TRANSACTION LOGS
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const worksheet = XLSX.utils.json_to_sheet(filteredFinances.map(f => ({
                      'Date': f.date.toDate().toLocaleString('en-IN'),
                      'Description': f.title,
                      'Category': f.category,
                      'Transaction Id': f.transactionId || '',
                      'Notes/Salary Months': f.notes || '',
                      'Income': f.type === 'income' ? f.amount : 0,
                      'Expense': f.type === 'expense' ? f.amount : 0
                    })));
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, `Transaction_Logs`);
                    XLSX.writeFile(workbook, `Transactions.xlsx`);
                  }}
                  className="flex items-center gap-2 text-xs bg-[var(--primary)] text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-all font-bold"
                >
                  <Download size={14} /> XLSX
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 dark:bg-white/5">
                  <tr>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50">Date & Time</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50">Description</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50">Payment Mode / Details</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50 text-right">Income</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50 text-right">Expense</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredFinances.map(f => (
                    <tr key={f.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-4 text-xs font-medium whitespace-nowrap">
                        {f.date.toDate().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-bold">{f.title}</div>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-gray-200 dark:bg-white/10 rounded text-[9px] font-bold uppercase tracking-wider">
                          {f.category}
                        </span>
                        {f.notes && <div className="text-[10px] opacity-70 mt-1 italic break-words max-w-[200px]">Note: {f.notes}</div>}
                      </td>
                      <td className="p-4 text-xs">
                        {f.transactionId && <div className="font-mono text-[10px] bg-black/5 dark:bg-white/5 p-1 rounded inline-block mb-1">Txn: {f.transactionId}</div>}
                        {f.screenshotUrl && (
                          <div className="mt-1">
                            <a href={f.screenshotUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                              <ImageIcon size={12} /> View Proof
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-sm font-black text-right text-green-500">
                        {f.type === 'income' ? `+₹${f.amount.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-4 text-sm font-black text-right text-red-500">
                        {f.type === 'expense' ? `-₹${f.amount.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-4 flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setNewEntry({
                              type: f.type,
                              category: f.category,
                              amount: f.amount.toString(),
                              title: f.title,
                              date: f.date.toDate().toISOString().split('T')[0],
                              notes: f.notes || '',
                              transactionId: f.transactionId || '',
                              screenshotUrl: f.screenshotUrl || '',
                              studentId: f.studentId || '',
                              studentName: f.studentName || ''
                            });
                            (newEntry as any).id = f.id;
                            setIsAddModalOpen(true);
                          }}
                          className="p-2 text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => firestoreService.deleteItem('finances', f.id)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredFinances.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center opacity-30 italic font-medium">
                        No transactions found for the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-100 dark:bg-white/5 font-black border-t border-gray-200 dark:border-white/10 text-sm">
                  <tr>
                    <td colSpan={3} className="p-4 text-right uppercase tracking-[0.2em] opacity-50">Period Totals</td>
                    <td className="p-4 text-right text-green-500">₹{realTotals.income.toLocaleString()}</td>
                    <td className="p-4 text-right text-red-500">₹{realTotals.expense.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>
        )}

        {activeView === 'fees' && (
          <motion.div 
            key="fees"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrollments.filter(e => e.feeStatus === 'Paid').slice(0, 10).map(e => (
                <div key={e.id} className="glass-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-bold">{e.name}</div>
                      <div className="text-[10px] opacity-60 uppercase">{e.grade} • Paid in Full</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black">₹{e.totalFee - (e.discount || 0)}</div>
                    <div className="text-[10px] opacity-40 italic">{new Date(e.createdAt?.seconds * 1000).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
              <p className="text-sm opacity-50 mb-4">Detailed student reports available in verified section.</p>
              <button 
                 onClick={() => {
                   const csvRows = [
                     ['Name', 'Email', 'Grade', 'Fee Status', 'Total Fee', 'Enrollment Date'],
                     ...enrollments.map(e => [
                       e.name, e.email, e.grade, e.feeStatus, e.totalFee, 
                       e.createdAt?.toDate ? e.createdAt.toDate().toLocaleDateString() : 'N/A'
                     ])
                   ];
                   const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
                   const link = document.createElement("a");
                   link.setAttribute("href", encodeURI(csvContent));
                   link.setAttribute("download", `enrollment_report_${new Date().toISOString().split('T')[0]}.csv`);
                   document.body.appendChild(link);
                   link.click();
                 }}
                 className="px-6 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 mx-auto"
              >
                <Download size={14} /> Export CSV Report
              </button>
            </div>
          </motion.div>
        )}

        {activeView === 'pending' && (
          <motion.div 
            key="pending"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {pendingPayments.length > 0 && (
              <div className="glass-card p-4 space-y-3 border-amber-500/20">
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  <input
                    type="text"
                    placeholder="Search student / phone"
                    value={pendingFilters.search}
                    onChange={(e) => setPendingFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="p-2 bg-white/5 border border-white/10 rounded-xl text-xs outline-none"
                  />
                  <select
                    value={pendingFilters.grade}
                    onChange={(e) => setPendingFilters(prev => ({ ...prev, grade: e.target.value }))}
                    className="p-2 bg-white/5 border border-white/10 rounded-xl text-xs outline-none"
                  >
                    <option value="ALL">All Classes</option>
                    {['IX', 'X', 'XI', 'XII'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <select
                    value={pendingFilters.subject}
                    onChange={(e) => setPendingFilters(prev => ({ ...prev, subject: e.target.value }))}
                    className="p-2 bg-white/5 border border-white/10 rounded-xl text-xs outline-none"
                  >
                    <option value="ALL">All Subjects</option>
                    {pendingSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input
                    type="number"
                    placeholder="Min Due"
                    value={pendingFilters.minDue}
                    onChange={(e) => setPendingFilters(prev => ({ ...prev, minDue: e.target.value }))}
                    className="p-2 bg-white/5 border border-white/10 rounded-xl text-xs outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Max Due"
                    value={pendingFilters.maxDue}
                    onChange={(e) => setPendingFilters(prev => ({ ...prev, maxDue: e.target.value }))}
                    className="p-2 bg-white/5 border border-white/10 rounded-xl text-xs outline-none"
                  />
                  <select
                    value={pendingFilters.sortBy}
                    onChange={(e) => setPendingFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                    className="p-2 bg-white/5 border border-white/10 rounded-xl text-xs outline-none"
                  >
                    <option value="due_desc">Due: High to Low</option>
                    <option value="due_asc">Due: Low to High</option>
                    <option value="name_asc">Name: A-Z</option>
                    <option value="name_desc">Name: Z-A</option>
                  </select>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setPendingFilters(prev => ({ ...prev, hasProofs: !prev.hasProofs }))}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${pendingFilters.hasProofs ? 'bg-indigo-500 text-white shadow-lg' : 'bg-white/5 border border-white/10 text-gray-300'}`}
                    >
                      <CheckCircle2 size={14} /> Only Has Proofs
                    </button>
                    <div className="text-[11px] font-bold px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center whitespace-nowrap">
                      Showing {filteredPendingPayments.length}/{pendingPayments.length}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {pendingPayments.length > 0 && (
              <div className="flex justify-end pr-2">
                <button 
                  onClick={() => {
                    const count = filteredPendingPayments.length;
                    if (!confirm(`This will prepare reminders for ${count} students. Continue?`)) return;
                    toast.success('Check your browser tabs! Reminders prepared.');
                    filteredPendingPayments.forEach((e, idx) => {
                      setTimeout(() => {
                        const msg = `*PAYMENT REMINDER*
👤 *Student:* ${e.name}
💰 *Dues:* ₹${getPendingAmount(e)}
📅 *Status:* ${e.feeStatus}

Please clear your pending dues at the earliest.`;
                        window.open(`https://wa.me/${e.whatsapp?.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
                        firestoreService.addItem('reminder_logs', {
                          studentId: e.id,
                          studentName: e.name,
                          phone: e.whatsapp || '',
                          mode: 'bulk',
                          status: 'link_opened',
                          channel: 'whatsapp',
                          messageSnapshot: msg
                        }).catch(console.error);
                      }, idx * 500); // Stagger popups
                    });
                  }}
                  className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
                >
                  <MessageCircle size={14} /> WhatsApp/Sms Fee Reminder (API) ({filteredPendingPayments.length})
                </button>
              </div>
            )}
            {filteredPendingPayments.map(e => (
              <div key={e.id} className="glass-card p-4 flex flex-col gap-4 border-amber-500/10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg shrink-0">
                      <AlertCircle size={24} />
                    </div>
                    <div>
                      <h5 className="font-bold">{e.name}</h5>
                      <p className="text-[10px] opacity-60">
                        {e.email} • <span className="font-bold text-amber-500 uppercase">{e.feeStatus}</span>
                      </p>
                      <div className="flex gap-2 mt-1">
                        <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-[8px] font-bold">Grade {e.grade}</span>
                        <span className="px-1.5 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded text-[8px] font-bold">₹{e.totalFee} Total</span>
                        <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[8px] font-bold">₹{getPendingAmount(e)} Pending</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={async () => {
                        if (!confirm(`Mark ${e.name} as Paid and generate revenue entry?`)) return;
                      const paidAmount = e.totalFee - (e.discount || 0);
                      const adminCut = Math.floor(paidAmount * 0.5);
                      const facultyPool = paidAmount - adminCut;

                      const nextMonth = new Date();
                      nextMonth.setMonth(nextMonth.getMonth() + 1);
                      nextMonth.setDate(branding?.advancedPaymentDiscountDay || 5); 

                      await firestoreService.updateItem('enrollments', e.id, { 
                        feeStatus: 'Paid',
                        expiryDate: nextMonth.toISOString()
                      });
                      
                      // 1. Add to Finances (Main Revenue)
                      await firestoreService.addItem('finances', {
                        type: 'income',
                        category: 'Fee',
                        amount: paidAmount,
                        title: `Fee Collection: ${e.name}`,
                        date: Timestamp.now(),
                        createdAt: Timestamp.now(),
                        notes: `Offline fee collection for ${e.id} (Grade ${e.grade})`
                      });

                      const selectedFees = feesData.filter(f => 
                        (e.subjects || []).includes(f.subject) &&
                        (f.grade === e.grade || (f.grades && f.grades.includes(e.grade)))
                      );
                      const totalBasePrice = selectedFees.reduce((sum, f) => sum + (Number(f.originalPrice || 0) - Number(f.discount || 0)), 0);
                      
                      const subjectSplits: Record<string, number> = {};
                      if (totalBasePrice > 0) {
                         selectedFees.forEach(f => {
                           const ratio = (Number(f.originalPrice || 0) - Number(f.discount || 0)) / totalBasePrice;
                           subjectSplits[f.subject] = Math.floor(facultyPool * ratio);
                         });
                      } else {
                         (e.subjects || []).forEach((sub: string) => {
                           subjectSplits[sub] = Math.floor(facultyPool / (e.subjects?.length || 1));
                         });
                      }

                      // 2. Add to Split Ledger for Faculty Payroll
                      await firestoreService.addItem('finance_ledger', {
                        studentId: e.id,
                        studentName: e.name,
                        grade: e.grade,
                        subjects: e.subjects || [],
                        amountPaid: paidAmount,
                        adminCut: adminCut,
                        facultyCut: facultyPool,
                        subjectSplits: subjectSplits,
                        date: new Date().toISOString(),
                        enrollmentId: e.id,
                        isDistributed: false,
                        source: 'admin_panel'
                      });

                      await syncMonthlyFeeCollections(e, paidAmount, `admin_offline_${Date.now()}`);

                      toast.success('Payment recorded & 50-50 split generated.');
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-bold hover:scale-105 transition-all"
                  >
                    Accept Payment (Offline)
                  </button>
                    <button 
                      onClick={() => {
                        const msg = `*PAYMENT REMINDER*
👤 *Student:* ${e.name}
📚 *Batch:* ${e.grade}
💰 *Dues:* ₹${getPendingAmount(e)}
📅 *Status:* ${e.feeStatus}

Please clear your pending dues to continue accessing batch materials.`;
                        window.open(`https://wa.me/${e.whatsapp?.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
                        firestoreService.addItem('reminder_logs', {
                          studentId: e.id,
                          studentName: e.name,
                          phone: e.whatsapp || '',
                          mode: 'single',
                          status: 'link_opened',
                          channel: 'whatsapp',
                          messageSnapshot: msg
                        }).catch(console.error);
                      }}
                      className="flex-1 sm:flex-none px-4 py-2 bg-indigo-500/10 text-indigo-500 rounded-xl text-xs font-bold flex justify-center items-center gap-2"
                    >
                    Send WhatsApp Reminder (Whatsapp Web App Reminder)
                  </button>
                </div>
              </div>
              {e.paymentHistory && e.paymentHistory.some((ph: any) => ph.status === 'pending') && (
                  <div className="w-full mt-4 pt-4 border-t border-amber-500/10 space-y-3">
                    <h6 className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Pending Uploaded Proofs</h6>
                    {e.paymentHistory.filter((ph: any) => ph.status === 'pending').map((ph: any, idx: number) => (
                      <div key={idx} className="bg-black/20 p-3 rounded-xl flex items-center justify-between text-sm">
                        <div className="space-y-1">
                          <span className="font-bold">₹{ph.amount}</span>
                          {ph.transactionId && <span className="block text-[10px] opacity-50 font-mono">Txn: {ph.transactionId}</span>}
                          {ph.months && ph.months.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ph.months.map((m: string) => (
                                <span key={m} className="px-1.5 py-0.5 bg-amber-500/20 text-amber-500 text-[8px] rounded font-black uppercase">
                                  {new Date(`${m}-01`).toLocaleDateString('default', { month: 'short', year: '2-digit' })}
                                </span>
                              ))}
                            </div>
                          )}
                          {ph.notes && <span className="block text-[10px] opacity-50 italic">Note: {ph.notes}</span>}
                          <span className="block text-[9px] opacity-30">{new Date(ph.createdAt || ph.date).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {(ph.screenshot || ph.screenshotUrl) && (
                            <div className="flex gap-2">
                              <button 
                                onClick={() => window.open(ph.screenshot || ph.screenshotUrl, '_blank')}
                                className="px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-bold hover:bg-blue-500/20"
                              >
                                View Preview
                              </button>
                              <button 
                                onClick={async () => {
                                  try {
                                    const response = await fetch(ph.screenshot || ph.screenshotUrl);
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.style.display = 'none';
                                    a.href = url;
                                    a.download = `payment_proof_${ph.transactionId || 'screenshot'}.jpg`;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                  } catch (err) {
                                    console.error('Failed to download image', err);
                                    toast.error('Failed to download image directly. Try View Preview instead.');
                                  }
                                }}
                                className="px-3 py-1.5 bg-purple-500/10 text-purple-500 rounded-lg text-xs font-bold hover:bg-purple-500/20 flex items-center gap-1"
                              >
                                Download
                              </button>
                            </div>
                          )}
                          <button 
                            onClick={async () => {
                              if (!confirm(`Mark this proof as Verified & Accept Payment?`)) return;
                              
                              const paidAmount = Number(ph.amount);
                              const adminCut = Math.floor(paidAmount * 0.5);
                              const facultyPool = paidAmount - adminCut;
                              
                              const nextMonth = new Date();
                              nextMonth.setMonth(nextMonth.getMonth() + 1);
                              nextMonth.setDate(branding?.advancedPaymentDiscountDay || 5); 

                              // 1. Update Enrollment (Atomic)
                              await firestoreService.updatePaymentHistoryAtomic(e.id, ph.id, 'verified', {
                                totalPaid: (e.totalPaid || 0) + paidAmount,
                                expiryDate: nextMonth.toISOString()
                              });
                              
                              // 2. We already pushed into finances from student side as 'pending', let's find it and verify it
                              try {
                                const q = query(collection(db, 'finances'), where('transactionId', '==', ph.transactionId));
                                const snap = await getDocs(q);
                                if (!snap.empty) {
                                  await firestoreService.updateItem('finances', snap.docs[0].id, { status: 'verified' });
                                }
                              } catch(err) {
                                console.error('Could not verify finance log', err);
                              }
                              
                              // 2.5 Apply payment to academic month ledgers
                              await pricingService.verifyPaymentAndApplyToLedger(e.id, paidAmount, ph.id, ph.months);
                              
                              // 3. Generate Faculty Splits
                              const selectedFees = feesData.filter(f => 
                                (e.subjects || []).includes(f.subject) &&
                                (f.grade === e.grade || (f.grades && f.grades.includes(e.grade)))
                              );
                              const totalBasePrice = selectedFees.reduce((sum, f) => sum + (Number(f.originalPrice || 0) - Number(f.discount || 0)), 0);
                              
                              const subjectSplits: Record<string, number> = {};
                              if (totalBasePrice > 0) {
                                 selectedFees.forEach(f => {
                                   const ratio = (Number(f.originalPrice || 0) - Number(f.discount || 0)) / totalBasePrice;
                                   subjectSplits[f.subject] = Math.floor(facultyPool * ratio);
                                 });
                              } else {
                                 (e.subjects || []).forEach((sub: string) => {
                                   subjectSplits[sub] = Math.floor(facultyPool / (e.subjects?.length || 1));
                                 });
                              }

                              await firestoreService.addItem('finance_ledger', {
                                studentId: e.id,
                                studentName: e.name,
                                grade: e.grade,
                                subjects: e.subjects || [],
                                amountPaid: paidAmount,
                                adminCut: adminCut,
                                facultyCut: facultyPool,
                                subjectSplits: subjectSplits,
                                date: new Date().toISOString(),
                                enrollmentId: e.id,
                                isDistributed: false,
                                source: 'admin_panel'
                              });

                              await syncMonthlyFeeCollections(e, paidAmount, ph.id || `proof_${Date.now()}`, ph.transactionId || '');

                              toast.success('Proof Verified & Ledger Generated!');
                            }}
                            className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg text-xs font-bold hover:bg-green-500/20"
                          >
                            Verify
                          </button>
                          <button 
                            onClick={async () => {
                              if (!confirm(`Reject this proof?`)) return;
                              await firestoreService.updatePaymentHistoryAtomic(e.id, ph.id, 'rejected');
                              
                              try {
                                const q = query(collection(db, 'finances'), where('transactionId', '==', ph.transactionId));
                                const snap = await getDocs(q);
                                if (!snap.empty) {
                                  await firestoreService.updateItem('finances', snap.docs[0].id, { status: 'rejected' });
                                }
                              } catch(err) {
                                console.error('Could not verify finance log', err);
                              }
                              toast.error('Proof Rejected');
                            }}
                            className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500/20"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {filteredPendingPayments.length === 0 && (
              <div className="p-20 text-center glass-card opacity-30 italic">
                No pending records found for selected filters.
              </div>
            )}
          </motion.div>
        )}

        {activeView === 'monthly_sheets' && (
          <motion.div 
            key="monthly_sheets"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {Array.from(new Set(monthlyLedgers.map(l => l.month))).sort((a, b) => b.localeCompare(a)).map(month => {
              const ledgersForMonth = monthlyLedgers.filter(l => l.month === month);
              
              // Map student grades using enrollments state or use ledger stored data
              const ledgersWithGrade = ledgersForMonth.map(l => {
                const enrollment = enrollments.find(e => e.id === l.studentId);
                return {
                  ...l,
                  grade: enrollment?.grade || l.grade || 'Unknown',
                  phone: enrollment?.whatsapp || l.phone || ''
                };
              });

              // Group by grade
              const groupedByGrade: Record<string, any[]> = {};
              ledgersWithGrade.forEach(l => {
                if (!groupedByGrade[l.grade]) groupedByGrade[l.grade] = [];
                groupedByGrade[l.grade].push(l);
              });

              return (
                <div key={month} className="glass-card !p-0 overflow-hidden mb-6">
                  <div className="p-4 bg-black/20 border-b border-[var(--border-color)]">
                    <h3 className="text-lg font-black tracking-widest uppercase">
                      {new Date(`${month}-01`).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                    </h3>
                  </div>
                  
                  {Object.keys(groupedByGrade).sort().map(grade => {
                    const gradeLedgers = groupedByGrade[grade];
                    
                    const handleDownloadXlsx = () => {
                      const worksheet = XLSX.utils.json_to_sheet(gradeLedgers.map(l => ({
                        'Student Name': l.studentName,
                        'Subjects': (l.subjects || []).join(', '),
                        'Base Fee': l.totalFee,
                        'Std. Discount': Number(l.standardDiscount || 0),
                        'Combo Discount': l.comboDiscount || 0,
                        'Adv. Discount': l.advancedDiscount || 0,
                        'Final Payable': l.finalPayable,
                        'Paid': l.paidAmount,
                        'Balance': l.balance,
                        'Status': l.status
                      })));
                      const workbook = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(workbook, worksheet, `Class ${grade}`);
                      XLSX.writeFile(workbook, `Fee_Sheet_${month}_Grade_${grade}.xlsx`);
                    };

                    const handleDownloadPdf = () => {
                      const doc = new jsPDF();
                      doc.text(`Fee Sheet - ${month} - Class ${grade}`, 14, 15);
                      
                      const tableColumn = ["Student Name", "Base Fee", "Std. Disc", "Combo Disc", "Payable", "Paid", "Balance"];
                      const tableRows = gradeLedgers.map(l => [
                        l.studentName,
                        l.totalFee,
                        Number(l.standardDiscount || 0),
                        l.comboDiscount || 0,
                        l.finalPayable,
                        l.paidAmount,
                        l.balance
                      ]);

                      (doc as any).autoTable({
                        startY: 20,
                        head: [tableColumn],
                        body: tableRows,
                        theme: 'striped',
                        headStyles: { fillColor: [79, 70, 229] }
                      });

                      doc.save(`Fee_Sheet_${month}_Grade_${grade}.pdf`);
                    };

                    return (
                      <div key={grade} className="border-b last:border-0 border-[var(--border-color)] pb-2">
                        <div className="p-4 flex items-center justify-between bg-black/10">
                          <h4 className="font-bold text-[var(--primary)] uppercase">Class {grade}</h4>
                          <div className="flex items-center gap-2">
                            <button onClick={handleDownloadXlsx} className="flex items-center gap-2 text-xs bg-[var(--primary)]/10 text-[var(--primary)] px-3 py-1.5 rounded-lg hover:bg-[var(--primary)]/20">
                              <Download size={14} /> XLSX
                            </button>
                            <button onClick={handleDownloadPdf} className="flex items-center gap-2 text-xs bg-[var(--primary)]/10 text-[var(--primary)] px-3 py-1.5 rounded-lg hover:bg-[var(--primary)]/20">
                              <Download size={14} /> PDF
                            </button>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-white/5 text-[10px] uppercase opacity-70">
                                <th className="p-3">Student</th>
                                <th className="p-3">Base Fee</th>
                                <th className="p-3">Std. Disc</th>
                                <th className="p-3">Combo Disc</th>
                                <th className="p-3">Payable</th>
                                <th className="p-3">Paid</th>
                                <th className="p-3">Balance</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {gradeLedgers.map(l => (
                                <tr key={l.id} className="border-b border-[var(--border-color)] hover:bg-white/5 transition-colors text-xs">
                                  <td className="p-3">
                                    <div className="font-bold">{l.studentName}</div>
                                    <div className="text-[9px] opacity-50">{(l.subjects || []).join(', ')}</div>
                                  </td>
                                  <td className="p-3 opacity-60">₹{Number(l.totalFee || 0).toLocaleString()}</td>
                                  <td className="p-3 opacity-60">-₹{Number(l.standardDiscount || 0).toLocaleString()}</td>
                                  <td className="p-3 opacity-60">-₹{Number(l.comboDiscount || 0).toLocaleString()}</td>
                                  <td className="p-3 font-bold text-blue-500">₹{Number(l.finalPayable || 0).toLocaleString()}</td>
                                  <td className="p-3 font-bold text-green-500">₹{Number(l.paidAmount || 0).toLocaleString()}</td>
                                  <td className="p-3 font-bold text-red-500">₹{Number(l.balance || 0).toLocaleString()}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${
                                      l.status === 'Clear' ? 'bg-green-500/20 text-green-500' :
                                      l.status === 'Pending' ? 'bg-orange-500/20 text-orange-500' :
                                      'bg-blue-500/20 text-blue-500'
                                    }`}>
                                      {l.status}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    {l.balance > 0 && l.phone && (
                                      <button 
                                        onClick={() => {
                                          const subjectStr = (l.subjects || []).join(', ');
                                          const monthStr = new Date(`${l.month}-01`).toLocaleDateString('default', { month: 'long', year: 'numeric' });
                                          const msg = `*FEES REMINDER*\n\n👤 *Student:* ${l.studentName}\n📚 *Class:* ${grade}\n📖 *Subjects:* ${subjectStr}\n🕒 *Month:* ${monthStr}\n\n💰 *Total Payable:* ₹${l.finalPayable}\n✅ *Paid:* ₹${l.paidAmount}\n❗ *Pending Balance:* ₹${l.balance}\n\nPlease clear the pending dues for the month of ${monthStr}. Ignore if already paid.`;
                                          window.open(`https://wa.me/${l.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded text-xs font-bold hover:bg-amber-500/20"
                                      >
                                        <MessageCircle size={14} /> Send Reminder
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            
            {monthlyLedgers.length === 0 && (
              <div className="p-20 text-center glass-card opacity-30 italic">
                No monthly ledger records found.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#1e1e1e] rounded-3xl p-8 shadow-2xl border border-white/5 space-y-6"
            >
              <h3 className="text-2xl font-black italic tracking-tight">
                {(newEntry as any).id ? 'EDIT TRANSACTION' : 'ADD TRANSACTION'}
              </h3>
              
              <form onSubmit={handleSaveEntry} className="space-y-4">
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
                  <button 
                    type="button"
                    onClick={() => setNewEntry({...newEntry, type: 'expense', category: CATEGORIES.expense[0]})}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newEntry.type === 'expense' ? 'bg-red-500 text-white' : 'text-gray-500'}`}
                  >
                    Expense
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewEntry({...newEntry, type: 'income', category: CATEGORIES.income[0]})}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newEntry.type === 'income' ? 'bg-green-500 text-white' : 'text-gray-500'}`}
                  >
                    Income
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase opacity-50 tracking-widest pl-1">Category</label>
                    <select 
                      value={newEntry.category}
                      onChange={e => {
                        const cat = e.target.value;
                        setNewEntry({...newEntry, category: cat});
                      }}
                      className="w-full p-4 bg-gray-100 dark:bg-white/10 border border-transparent focus:border-[var(--primary)] rounded-2xl outline-none text-sm transition-all [&>option]:bg-white dark:[&>option]:bg-[#1e1e1e] dark:text-white"
                    >
                      {CATEGORIES[newEntry.type].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase opacity-50 tracking-widest pl-1">Date</label>
                    <input 
                      type="date" 
                      value={newEntry.date}
                      onChange={e => setNewEntry({...newEntry, date: e.target.value})}
                      className="w-full p-4 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-2xl outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                {newEntry.category === 'Fee' && (
                  <div className="space-y-4 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 mb-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase opacity-50 tracking-widest pl-1">Link to Student</label>
                      <select 
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold outline-none [&>option]:bg-[#1e1e1e]"
                        value={newEntry.studentId}
                        onChange={e => {
                          const student = users.find(u => u.id === e.target.value);
                          setSelectedFeeMonths([]); // reset
                          setNewEntry({
                            ...newEntry, 
                            studentId: e.target.value,
                            studentName: student?.name || '',
                            title: student ? `Fee Receipt: ${student.name}` : newEntry.title,
                            amount: '' // reset amount
                          });
                        }}
                      >
                        <option value="">Select Student...</option>
                        {users.filter(u => u.role === 'student' || !u.role).map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))}
                      </select>
                    </div>

                    {newEntry.studentId && (() => {
                      const pendingLedgers = monthlyLedgers.filter(l => l.studentId === newEntry.studentId && (Number(l.balance) > 0 || l.status === 'Pending' || l.status === 'Partial')).sort((a,b) => a.month.localeCompare(b.month));
                      return (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase opacity-50 tracking-widest pl-1">Select Pending Months ({pendingLedgers.length})</label>
                          <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                            {pendingLedgers.map(l => (
                              <label key={l.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10">
                                <div className="flex items-center gap-3">
                                  <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-gray-300"
                                    checked={selectedFeeMonths.includes(l.month)}
                                    onChange={(e) => {
                                      let newMonths = [...selectedFeeMonths];
                                      if (e.target.checked) newMonths.push(l.month);
                                      else newMonths = newMonths.filter(m => m !== l.month);
                                      setSelectedFeeMonths(newMonths);
                                      
                                      // Auto calc amount
                                      const total = newMonths.reduce((sum, m) => {
                                        const ml = pendingLedgers.find(lx => lx.month === m);
                                        return sum + Number(ml?.balance || ml?.finalPayable || 0);
                                      }, 0);
                                      setNewEntry(prev => ({...prev, amount: total ? String(total) : ''}));
                                    }}
                                  />
                                  <span className="text-sm font-bold">{new Date(l.month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                                </div>
                                <span className="text-sm font-black text-amber-500">₹{l.balance || l.finalPayable}</span>
                              </label>
                            ))}
                            {pendingLedgers.length === 0 && <p className="text-xs opacity-50 italic">No pending fees.</p>}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase opacity-50 tracking-widest pl-1">Transaction ID / Ref</label>
                        <input 
                          type="text"
                          value={newEntry.transactionId}
                          onChange={e => setNewEntry({...newEntry, transactionId: e.target.value})}
                          placeholder="UTR / UPI Ref No."
                          className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-sm outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase opacity-50 tracking-widest pl-1">Payment Image (Optional)</label>
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setIsUploading(true);
                              try {
                                const { promise } = storageService.uploadFile(file, () => {});
                                const meta = await promise;
                                setNewEntry({...newEntry, screenshotUrl: meta.url});
                                toast.success('Image uploaded!');
                              } catch (err) {
                                toast.error('Upload failed');
                              } finally {
                                setIsUploading(false);
                              }
                            }}
                            className="hidden" 
                            id="payment-screenshot"
                          />
                          <label 
                            htmlFor="payment-screenshot"
                            className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-dashed border-white/20 rounded-2xl text-[10px] font-black cursor-pointer hover:bg-white/10 transition-all uppercase"
                          >
                            {isUploading ? <Loader2 className="animate-spin" size={14}/> : <ImageIcon size={14}/>}
                            {newEntry.screenshotUrl ? 'Change Image' : 'Upload Screenshot'}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase opacity-50 tracking-widest pl-1">Title / Description</label>
                  <input 
                    type="text" 
                    value={newEntry.title}
                    onChange={e => setNewEntry({...newEntry, title: e.target.value})}
                    placeholder="e.g. Monthly Electricity Bill"
                    className="w-full p-4 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-2xl outline-none text-sm transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase opacity-50 tracking-widest pl-1">Amount (₹)</label>
                  <input 
                    type="number" 
                    value={newEntry.amount}
                    onChange={e => setNewEntry({...newEntry, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full p-4 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-2xl outline-none text-lg font-black transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase opacity-50 tracking-widest pl-1">Notes (Optional)</label>
                  <textarea 
                    value={newEntry.notes}
                    onChange={e => setNewEntry({...newEntry, notes: e.target.value})}
                    placeholder="Add any extra details..."
                    className="w-full p-4 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-[var(--primary)] rounded-2xl outline-none text-sm min-h-[80px] transition-all"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-[var(--primary)] text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-[var(--primary)]/20 hover:opacity-90 active:scale-95 transition-all"
                >
                  Confirm Entry
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
