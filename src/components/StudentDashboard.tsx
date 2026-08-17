import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Clock, 
  ChevronRight, 
  Wallet, 
  History, 
  ArrowLeft, 
  Download, 
  ExternalLink,
  Layers,
  Calendar,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { brandingService, BrandingConfig } from '../services/brandingService';
import { handleFirestoreError } from '../services/firestoreService';
import toast from 'react-hot-toast';

enum OperationType {
  LIST = 'list',
  GET = 'get'
}

interface StudentDashboardProps {
  enrollment: any;
  onBack: () => void;
  branding?: BrandingConfig;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ enrollment, onBack, branding }) => {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enrollment?.id) return;

    const q = query(collection(db, 'student_monthly_fee_ledger'), where('studentId', '==', enrollment.id));
    const unsubLedger = onSnapshot(q, (snap) => {
      const sorted = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => a.month.localeCompare(b.month));
      setLedgers(sorted);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'student_monthly_fee_ledger');
      setLoading(false);
    });

    return () => unsubLedger();
  }, [enrollment?.id]);

  const handleGenerateReceipt = (ledger: any) => {
    // Implement or link to receipt generation
    toast.success('Opening receipt...');
    if (ledger.receiptUrl) {
      window.open(ledger.receiptUrl, '_blank');
    } else {
      toast.error('Receipt not available yet');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity"
          >
            <ArrowLeft size={16} /> Back to Settings
          </button>
          <a 
            href="/landing" 
            className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--primary)] hover:underline"
          >
            <ExternalLink size={12} /> Visit Landing Page
          </a>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded">
            Student ID: {enrollment?.id?.slice(-6).toUpperCase()}
          </span>
        </div>
      </div>

      <header className="space-y-2">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
          <History className="text-[var(--primary)]" size={32} />
          Student Dashboard
        </h1>
        <p className="text-sm opacity-60 max-w-xl">
          Comprehensive view of your academic fee ledger, payment history, and batch details.
        </p>
      </header>

      {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 border-l-4 border-l-blue-500">
          <p className="text-[10px] font-black uppercase opacity-40 mb-1">Total Months Paid</p>
          <p className="text-2xl font-black">{ledgers.filter(l => l.status === 'Clear' || l.status === 'Paid').length} / {ledgers.length}</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-black uppercase opacity-40 mb-1">Current Enrollment Status</p>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${enrollment?.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {enrollment?.status || 'Active'}
            </span>
          </div>
        </div>
        <div className="glass-card p-6 border-l-4 border-l-purple-500">
          <p className="text-[10px] font-black uppercase opacity-40 mb-1">Fee Plan</p>
          <p className="text-sm font-bold">₹{enrollment?.totalFee}/Month</p>
        </div>
      </div>

      {/* Batch Overview */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
            <Layers size={20} />
          </div>
          <h2 className="text-xl font-bold uppercase tracking-tight">Your Batches</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(enrollment?.subjects || []).map((sub: string) => (
            <div key={sub} className="glass-card p-5 flex items-center justify-between group hover:border-[var(--primary)]/30 transition-all cursor-pointer" onClick={() => (window as any).dispatchEvent(new CustomEvent('navigate', { detail: 'exclusive' }))}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-[var(--primary)] group-hover:scale-110 transition-transform">
                  <Calendar size={24} />
                </div>
                <div>
                  <p className="font-black uppercase tracking-tight text-sm">{sub}</p>
                  <p className="text-[10px] opacity-60">Grade: {enrollment?.grade}</p>
                </div>
              </div>
              <ChevronRight size={18} className="opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
          ))}
        </div>
      </section>

      {/* Full Year Ledger */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <FileText size={20} />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-emerald-500">Full Year Fee Ledger</h2>
          </div>
        </div>

        <div className="glass-card !p-0 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse min-w-[500px] md:min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                  <th className="p-4 text-[10px] font-black uppercase opacity-40">Month</th>
                  <th className="p-4 text-[10px] font-black uppercase opacity-40 hidden lg:table-cell">General Fee</th>
                  <th className="p-4 text-[10px] font-black uppercase opacity-40 hidden lg:table-cell">Discount</th>
                  <th className="p-4 text-[10px] font-black uppercase opacity-40 hidden lg:table-cell">Adv. Discount</th>
                  <th className="p-4 text-[10px] font-black uppercase opacity-40">Payable</th>
                  <th className="p-4 text-[10px] font-black uppercase opacity-40 hidden sm:table-cell">Paid</th>
                  <th className="p-4 text-[10px] font-black uppercase opacity-40">Status</th>
                  <th className="p-4 text-[10px] font-black uppercase opacity-40 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={8} className="p-4">
                        <div className="h-4 bg-gray-200 dark:bg-white/5 rounded w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : ledgers.length > 0 ? (
                  ledgers.slice().sort((a: any, b: any) => new Date(`${a.month}-01`).getTime() - new Date(`${b.month}-01`).getTime()).map((l: any) => {
                    const [year, monthStr] = l.month.split('-');
                    const monthIndex = parseInt(monthStr, 10) - 1;
                    const monthName = new Date(parseInt(year, 10), monthIndex, 1).toLocaleDateString('default', { month: 'long', year: 'numeric' });
                    
                    const now = new Date();
                    const deadlineDate = new Date(parseInt(year, 10), monthIndex, branding?.advancedPaymentDiscountDay || 10, 23, 59, 59);
                    const isAdvEligible = now <= deadlineDate;

                    const totalDiscount = (l.standardDiscount || 0) + (l.comboDiscount || 0);
                    const advancedDiscount = l.advancedDiscount || 0;
                    
                    const payableAmount = l.totalFee - totalDiscount - (isAdvEligible ? advancedDiscount : 0);
                    
                    const payable = l.status === 'Paid' || l.status === 'Clear' 
                      ? (l.paidAmount || l.finalPayable || payableAmount) 
                      : payableAmount;

                    return (
                      <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-white/2 transition-colors">
                        <td className="p-4">
                          <span className="font-bold text-sm">{monthName}</span>
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <span className="text-gray-500 text-sm">₹{l.totalFee}</span>
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <span className="text-red-500/70 text-sm font-medium">₹{totalDiscount}</span>
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <div className="flex flex-col">
                            <span className={`text-sm font-medium ${isAdvEligible ? 'text-emerald-500' : 'text-red-500 opacity-60'}`}>₹{l.advancedDiscount || 0}</span>
                            <span className="text-[8px] opacity-40 italic">(Before 10 {new Date(parseInt(year, 10), monthIndex, 1).toLocaleDateString('default', { month: 'short' })})</span>
                            <span className={`text-[9px] font-bold uppercase ${isAdvEligible ? 'text-emerald-600/60' : 'text-red-600/60'} mt-0.5`}>
                              {isAdvEligible ? 'Eligible' : 'Expired'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-black text-sm">₹{payable}</span>
                        </td>
                        <td className="p-4 hidden sm:table-cell">
                          <span className="text-emerald-500 text-sm font-bold">₹{l.paidAmount || 0}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            l.status === 'Clear' || l.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 
                            l.status === 'Partial' ? 'bg-orange-500/10 text-orange-500' :
                            'bg-red-500/10 text-red-500'
                          }`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleGenerateReceipt(l)}
                            className="p-2 hover:bg-white/10 rounded-lg text-blue-500 transition-colors"
                            title="Download Receipt"
                          >
                            <Download size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-12 text-center opacity-40 italic text-sm">No ledger data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Payment History */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
            <Clock size={20} />
          </div>
          <h2 className="text-xl font-bold uppercase tracking-tight">All Payment History</h2>
        </div>

        <div className="glass-card !p-0 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse min-w-[500px] md:min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                  <th className="p-4 text-[10px] font-black uppercase opacity-40">Date</th>
                  <th className="p-4 text-[10px] font-black uppercase opacity-40">Amount</th>
                  <th className="p-4 text-[10px] font-black uppercase opacity-40">Status</th>
                  <th className="p-4 text-[10px] font-black uppercase opacity-40 hidden sm:table-cell">Method</th>
                  <th className="p-4 text-[10px] font-black uppercase opacity-40 text-right">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {enrollment?.paymentHistory && enrollment.paymentHistory.length > 0 ? (
                  [...enrollment.paymentHistory].sort((a: any, b: any) => {
                    const dateA = a.updatedAt || a.verifiedAt || a.createdAt || a.date;
                    const dateB = b.updatedAt || b.verifiedAt || b.createdAt || b.date;
                    return new Date(dateB).getTime() - new Date(dateA).getTime();
                  }).map((p: any, idx: number) => {
                    const pDate = p.updatedAt || p.verifiedAt || p.createdAt || p.date;
                    return (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/2 transition-colors">
                      <td className="p-4">
                        <div className="text-sm font-bold">{new Date(pDate).toLocaleDateString()}</div>
                        <div className="text-[10px] opacity-40">{new Date(pDate).toLocaleTimeString()}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-black">₹{p.amount}</div>
                        <div className="flex gap-1 mt-1">
                          {(p.months || []).map((m: string) => (
                            <span key={m} className="px-1 py-0.5 bg-blue-500/10 text-blue-500 rounded-[4px] text-[8px] font-black uppercase">
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                          p.status === 'verified' || p.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' :
                          p.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                        <td className="p-4 hidden sm:table-cell">
                          <span className="text-[10px] font-bold opacity-60 uppercase">{p.method || 'Online'}</span>
                          <div className="text-[9px] opacity-40 font-mono">{p.transactionId}</div>
                        </td>
                      <td className="p-4 text-right">
                        {p.screenshot && (
                          <button 
                            onClick={() => window.open(p.screenshot, '_blank')}
                            className="p-2 hover:bg-white/10 rounded-lg text-indigo-500 transition-colors"
                          >
                            <ExternalLink size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-12 text-center opacity-40 italic text-sm">No payment history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Data Security Notice */}
      <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-4">
        <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
        <div className="text-[11px] opacity-70 leading-relaxed">
          <p className="font-bold text-blue-500 uppercase mb-1">Important Payment Info</p>
          Fee verification takes between 24-48 working hours. If your payment is not verified after 48 hours, please contact support via WhatsApp with your Student ID: <span className="font-black text-blue-500">{(enrollment?.id || '').toUpperCase()}</span>.
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
