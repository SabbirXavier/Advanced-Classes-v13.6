import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  increment,
  getDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from './firestoreService';

export interface SubjectPricing {
  id?: string;
  subject: string;
  originalPrice: number;
  discount: number;
  advancedPaymentDiscount?: number;
  finalPrice: number;
  grade?: string;
  grades?: string[];
  isActive?: boolean;
}

export interface PricingRule {
  id?: string;
  name?: string;
  isActive?: boolean;
  priority?: number;
  validFrom?: string;
  validTo?: string;
  grades?: string[];
  grade?: string;
  type?: 'combo' | 'advance' | 'seasonal' | string;
  conditions?: {
    minSubjects?: number;
    includesAllSubjects?: string[];
    includesAnySubjects?: string[];
    advanceDays?: number;
  };
  action?: {
    mode?: 'flat' | 'percentage' | 'fixed_total' | 'per_subject';
    value?: number;
    maxDiscount?: number;
  };
}

export interface PricingQuoteInput {
  subjects: string[];
  grade?: string;
  feeItems: SubjectPricing[];
  paymentDate?: Date;
  enrollmentDate?: Date;
  payInAdvance?: boolean;
}

export interface PricingQuote {
  totalBaseAmount: number;
  totalAdvancedDiscount: number;
  discountedAmount: number;
  discount: number;
  standardDiscount: number;
  comboDiscount: number;
  appliedRuleIds: string[];
}

export interface MonthlyLedgerInput {
  studentId: string;
  studentName: string;
  month: string; // YYYY-MM
  amount: number;
  paymentId?: string;
  transactionId?: string;
  mode?: string;
  months?: string[];
  skipLedgerUpdate?: boolean;
}

const normalizePricing = (item: any): SubjectPricing => {
  const originalPrice = Number(item.originalPrice || item.price || 0);
  const discount = Number(item.discount || 0);
  const advancedPaymentDiscount = Number(item.advancedPaymentDiscount || 0);
  return {
    id: item.id,
    subject: item.subject || '',
    originalPrice,
    discount,
    advancedPaymentDiscount,
    finalPrice: originalPrice - discount - advancedPaymentDiscount,
    grade: item.grade || '',
    grades: item.grades || (item.grade ? [item.grade] : []),
    isActive: item.isActive ?? true,
  };
};

const dateInRange = (date: Date, start?: string, end?: string) => {
  if (start) {
    const startDate = new Date(start);
    if (!Number.isNaN(startDate.getTime()) && date < startDate) {
      return false;
    }
  }
  if (end) {
    const endDate = new Date(end);
    if (!Number.isNaN(endDate.getTime()) && date > endDate) {
      return false;
    }
  }
  return true;
};

const applyRuleToAmount = (amount: number, subjects: string[], rule: PricingRule) => {
  const mode = rule.action?.mode || 'flat';
  const value = Number(rule.action?.value || 0);
  const maxDiscount = Number(rule.action?.maxDiscount || Number.POSITIVE_INFINITY);

  let discount = 0;
  switch (mode) {
    case 'percentage':
      discount = (amount * value) / 100;
      break;
    case 'fixed_total':
      return Math.max(0, value);
    case 'per_subject':
      discount = subjects.length * value;
      break;
    case 'flat':
    default:
      discount = value;
      break;
  }

  const boundedDiscount = Math.min(discount, maxDiscount, amount);
  return Math.max(0, amount - boundedDiscount);
};

const ruleMatches = (rule: PricingRule, subjects: string[], grade?: string, paymentDate = new Date(), enrollmentDate = new Date()) => {
  if (rule.isActive === false) return false;

  const grades = Array.isArray(rule.grades)
    ? rule.grades
    : (rule.grade ? [rule.grade] : []);
  if (grade && grades.length > 0 && !grades.includes(grade)) {
    return false;
  }

  if (!dateInRange(paymentDate, rule.validFrom, rule.validTo)) {
    return false;
  }

  if (rule.conditions?.minSubjects && subjects.length < Number(rule.conditions.minSubjects)) {
    return false;
  }

  if (rule.conditions?.includesAllSubjects?.length) {
    const needsAll = rule.conditions.includesAllSubjects.every((s) => subjects.includes(s));
    if (!needsAll) return false;
  }

  if (rule.conditions?.includesAnySubjects?.length) {
    const hasAny = rule.conditions.includesAnySubjects.some((s) => subjects.includes(s));
    if (!hasAny) return false;
  }

  if (rule.type === 'advance' && rule.conditions?.advanceDays) {
    const msDiff = enrollmentDate.getTime() - paymentDate.getTime();
    const dayDiff = msDiff / (1000 * 60 * 60 * 24);
    if (dayDiff < Number(rule.conditions.advanceDays)) {
      return false;
    }
  }

  return true;
};

export const pricingService = {
  async getSubjectPricing(): Promise<SubjectPricing[]> {
    try {
      const feesSnap = await getDocs(collection(db, 'fees'));
      return feesSnap.docs
        .map((d) => normalizePricing({ id: d.id, ...d.data() }))
        .filter((p) => p.isActive !== false)
        .sort((a, b) => a.subject.localeCompare(b.subject));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'fees');
      return [];
    }
  },

  async getPricingRules(): Promise<PricingRule[]> {
    try {
      const rulesSnap = await getDocs(collection(db, 'pricing_rules'));
      return rulesSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as PricingRule)
        .filter((r) => r.isActive !== false)
        .sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'pricing_rules');
      return [];
    }
  },

  async calculateQuote(input: PricingQuoteInput): Promise<PricingQuote> {
    const normalizeGrade = (g: string) => g.trim().toUpperCase().replace(/^CLASS\s+/i, '').replace(/\s+/g, '');
    const normalizeSubject = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '');
    const normalizedTargetGrade = input.grade ? normalizeGrade(input.grade) : '';
    
    console.log(`Calculating quote for: Grade=${normalizedTargetGrade}, Subjects=${JSON.stringify(input.subjects)}`);

    const selectedFees = input.feeItems.filter((f) => {
      const targetSubjects = input.subjects.map(s => normalizeSubject(s));
      const feeSubject = normalizeSubject(f.subject);
      
      const subjectMatch = targetSubjects.includes(feeSubject);
      const feeGrades = (f.grades || (f.grade ? [f.grade] : [])).map(g => normalizeGrade(g));
      const gradeMatch = !normalizedTargetGrade || feeGrades.includes(normalizedTargetGrade) || feeGrades.length === 0;
      
      if (subjectMatch && gradeMatch) console.log(`Matched Fee: ${f.subject} (Price: ${f.originalPrice}, Adv: ${f.advancedPaymentDiscount})`);
      return subjectMatch && gradeMatch;
    });

    const totalBaseAmount = selectedFees.reduce((sum, f) => sum + (Number(f.originalPrice || 0)), 0);
    const standardDiscount = selectedFees.reduce((sum, f) => sum + (Number(f.discount || 0)), 0);
    const baseFinalAmount = Number(totalBaseAmount) - Number(standardDiscount);

    const totalAdvancedDiscount = selectedFees.reduce((sum, f) => sum + (Number(f.advancedPaymentDiscount || 0)), 0);
    console.log(`Calculated Total Advanced Discount: ${totalAdvancedDiscount} from ${selectedFees.length} fees`);

    const rules = await this.getPricingRules();
    let currentAmount = Number(baseFinalAmount);
    
    let comboDiscount = 0;
    let ruleAdvancedDiscount = 0;
    const appliedRuleIds: string[] = [];

    for (const rule of rules) {
      if (!ruleMatches(rule, input.subjects, input.grade, input.paymentDate, input.enrollmentDate)) {
        continue;
      }
      
      const updatedAmount = Number(applyRuleToAmount(currentAmount, input.subjects, rule));
      const discountVal = Number(currentAmount) - Number(updatedAmount);
      
      if (discountVal > 0) {
        if (rule.type === 'advance') {
          ruleAdvancedDiscount += Number(discountVal);
        } else {
          comboDiscount += Number(discountVal);
        }
        currentAmount = Number(updatedAmount);
        if (rule.id) appliedRuleIds.push(rule.id);
      }
    }

    let finalAmount = Number(currentAmount);
    const advancedDiscountCombined = Number(totalAdvancedDiscount) + Number(ruleAdvancedDiscount);
    
    if (input.payInAdvance) {
      finalAmount = Math.max(0, Number(finalAmount) - Number(advancedDiscountCombined));
    }

    return {
      totalBaseAmount: Number(totalBaseAmount),
      totalAdvancedDiscount: Number(advancedDiscountCombined),
      discountedAmount: Number(finalAmount),
      discount: Number(standardDiscount) + Number(comboDiscount),
      standardDiscount: Number(standardDiscount),
      comboDiscount: Number(comboDiscount),
      appliedRuleIds,
    };
  },

  async createSubjectPricing(pricing: SubjectPricing) {
    const planRef = doc(collection(db, 'fees'));
    const payload = {
      id: planRef.id,
      ...pricing,
      finalPrice: Number(pricing.originalPrice || 0) - Number(pricing.discount || 0) - Number(pricing.advancedPaymentDiscount || 0),
      isActive: pricing.isActive ?? true,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(planRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `fees/${planRef.id}`);
    }

    return { feesId: planRef.id, pricingPlanId: planRef.id };
  },

  async updateSubjectPricing(id: string, pricing: SubjectPricing) {
    const payload = {
      ...pricing,
      finalPrice: Number(pricing.originalPrice || 0) - Number(pricing.discount || 0) - Number(pricing.advancedPaymentDiscount || 0),
      updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(doc(db, 'fees', id), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `fees/${id}`);
    }
  },

  async softDeleteSubjectPricing(id: string) {
    const payload = { isActive: false, updatedAt: serverTimestamp() };
    try {
      await updateDoc(doc(db, 'fees', id), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `fees/${id}`);
    }
  },

  async recordPaymentAndUpdateLedger(input: MonthlyLedgerInput) {
    const paymentRef = doc(collection(db, 'fee_payments'));
    
    const paymentAmount = Number(input.amount || 0);
    const targetMonths = input.months && input.months.length > 0 ? input.months : [input.month];
    const createdAtIso = new Date().toISOString();

    const paymentEntry = {
      id: paymentRef.id,
      paymentId: paymentRef.id,
      studentId: input.studentId,
      studentName: input.studentName,
      month: input.month,
      months: targetMonths,
      amount: paymentAmount,
      mode: input.mode || 'upi',
      transactionId: input.transactionId || '',
      status: 'verified',
      createdAt: createdAtIso,
      updatedAt: createdAtIso,
      source: 'admin_recorded'
    };

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Create payment record
        transaction.set(paymentRef, {
          ...paymentEntry,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // 2. Update Enrollment
        const enrollRef = doc(db, 'enrollments', input.studentId);
        const enrollSnap = await transaction.get(enrollRef);
        
        if (enrollSnap.exists()) {
          const enrollment = enrollSnap.data();
          const history = enrollment.paymentHistory || [];
          // Double check for duplicates inside transaction
          if (!history.some((p: any) => p.id === paymentEntry.id)) {
            transaction.update(enrollRef, {
              paymentHistory: [...history, paymentEntry],
              feeStatus: 'Paid',
              updatedAt: serverTimestamp()
            });
          }
        }

        // 3. Update Ledgers
        if (targetMonths.length > 0 && !input.skipLedgerUpdate) {
          const amountPerMonth = paymentAmount / targetMonths.length;
          
          for (const m of targetMonths) {
            const ledgerId = `${input.studentId}_${m}`;
            const ledgerRef = doc(db, 'student_monthly_fee_ledger', ledgerId);
            
            // Note: We don't necessarily have to read the ledger if we use increment,
            // but since we are in a transaction, let's just update.
            transaction.update(ledgerRef, {
              paidAmount: increment(amountPerMonth),
              balance: increment(-amountPerMonth),
              status: 'Clear',
              lastPaymentId: paymentRef.id,
              updatedAt: serverTimestamp()
            });
          }
        }
      });
      return paymentRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transaction_record_payment');
      throw error;
    }
  },

  async generateStudentLedgerAsync(studentId: string, enrollmentData: any, pricingPreview: any) {
    try {
      const now = new Date();
      let currentMonth = now.getMonth() + 1; // 1 to 12
      let currentYear = now.getFullYear();

      // Academic year ends in April.
      // If enrolled in May - Dec (2024), ends April 2025.
      // If enrolled in Jan - Apr (2025), ends April 2025.
      
      let endYear = currentYear;
      if (currentMonth > 4) {
        endYear = currentYear + 1;
      }
      
      const batch = writeBatch(db);
      
      while (currentYear < endYear || (currentYear === endYear && currentMonth <= 4)) {
        const monthStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
        const monthKey = `${studentId}_${monthStr}`;
        const ledgerRef = doc(db, 'student_monthly_fee_ledger', monthKey);
        
        batch.set(ledgerRef, {
          studentId,
          studentName: enrollmentData.name,
          month: monthStr,
          totalFee: pricingPreview.totalBaseAmount || 0,
          standardDiscount: pricingPreview.standardDiscount || 0,
          comboDiscount: pricingPreview.comboDiscount || 0,
          discount: pricingPreview.discount || 0, // Keep total discount for backward compatibility
          advancedDiscount: pricingPreview.totalAdvancedDiscount || 0,
          finalPayable: pricingPreview.discountedAmount || 0,
          paidAmount: 0,
          balance: pricingPreview.discountedAmount || 0,
          status: 'Pending',
          subjects: enrollmentData.subjects,
          grade: enrollmentData.grade || '',
          phone: enrollmentData.whatsapp || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }
      
      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'batch_generate_ledger');
      }
      console.log(`Successfully generated academic ledger for student ${studentId}`);
    } catch (error) {
      console.error(`Failed to generate ledger for student ${studentId}:`, error);
    }
  },

  async verifyPaymentAndApplyToLedger(studentId: string, paymentAmount: number, paymentHistoryId: string, specificMonths?: string[]) {
    try {
      let q = query(collection(db, 'student_monthly_fee_ledger'), 
                      where('studentId', '==', studentId),
                      where('status', 'in', ['Pending', 'Partial']));
      let snap = await getDocs(q);
      
      // If no pending ledgers found, maybe they haven't been generated yet. Let's sync and try again.
      if (snap.empty) {
         await this.syncStudentLedger(studentId);
         snap = await getDocs(q);
      }
      
      let ledgers = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      
      if (specificMonths && specificMonths.length > 0) {
        ledgers = ledgers.filter(l => specificMonths.includes(l.month));
        
        // If specific months are requested but still missing from ledgers (e.g. paying in advance for a future month not synced yet):
        for (const targetMonth of specificMonths) {
           if (!ledgers.find(l => l.month === targetMonth)) {
              await this.syncStudentLedger(studentId); // sync will create missing months if logic allows
              const refreshedSnap = await getDocs(q);
              ledgers = refreshedSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })).filter(l => specificMonths.includes(l.month));
              break;
           }
        }
      }

      ledgers.sort((a, b) => a.month.localeCompare(b.month)); // Sort oldest first
      
      let paymentDate = new Date();
      if (paymentHistoryId) {
         const enrollSnap = await getDoc(doc(db, 'enrollments', studentId));
         if (enrollSnap.exists()) {
            const data = enrollSnap.data();
            const history = data.paymentHistory || [];
            const paymentRecord = history.find((h: any) => h.id === paymentHistoryId);
            if (paymentRecord && (paymentRecord.date || paymentRecord.createdAt)) {
               paymentDate = new Date(paymentRecord.date || paymentRecord.createdAt);
            }
         }
      }
      
      let remainingAmount = paymentAmount;
      const batch = writeBatch(db);
      
      for (const ledger of ledgers) {
        if (remainingAmount <= 0) break;
        
        let due = Number(ledger.balance || ledger.finalPayable || 0);
        let currentFinalPayable = Number(ledger.finalPayable || 0);
        
        const advDiscount = Number(ledger.advancedDiscount || 0);
        if (advDiscount > 0) {
           const [year, monthStr] = ledger.month.split('-');
           const deadlineDate = new Date(parseInt(year, 10), parseInt(monthStr, 10) - 1, 10, 23, 59, 59);
           
           // If they paid before the deadline OR their payment exactly matches the discounted amount
           if (paymentDate <= deadlineDate || remainingAmount === (currentFinalPayable - advDiscount)) {
               // Make sure we haven't already reduced finalPayable
               // In the original sync, finalPayable = totalFee - standardDiscount - comboDiscount
               // We can simply adjust finalPayable and due down by the advancedDiscount
               if (currentFinalPayable > advDiscount && currentFinalPayable > (ledger.paidAmount || 0)) {
                   currentFinalPayable -= advDiscount;
                   due = Math.max(0, due - advDiscount);
               }
           }
        }
        
        const amountToApply = Math.min(due, remainingAmount);
        
        if (amountToApply > 0 || currentFinalPayable !== Number(ledger.finalPayable)) {
          const newPaid = Number(ledger.paidAmount || 0) + amountToApply;
          const newBalance = Math.max(0, currentFinalPayable - newPaid);
          const newStatus = newBalance <= 0 ? 'Clear' : 'Partial';
          
          batch.update(doc(db, 'student_monthly_fee_ledger', ledger.id), {
            paidAmount: newPaid,
            balance: newBalance,
            status: newStatus,
            finalPayable: currentFinalPayable,
            updatedAt: serverTimestamp()
          });
          
          remainingAmount -= amountToApply;
        }
      }
      
      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'batch_verify_payment');
      }
      console.log(`Payment of ₹${paymentAmount} applied to ledgers for student ${studentId}. Remaining unapplied: ₹${remainingAmount}`);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'student_monthly_fee_ledger');
      console.error('Failed to apply payment to ledgers:', error);
      return false;
    }
  },

  async syncStudentLedger(studentId: string, subjects?: string[], grade?: string) {
    try {
      let finalSubjects = subjects;
      let finalGrade = grade;
      let studentName = '';
      let studentPhone = '';

      // If subjects or grade not provided, fetch from enrollment
      const snapObj = await getDoc(doc(db, 'enrollments', studentId));
      if (snapObj.exists()) {
        const data = snapObj.data();
        finalSubjects = finalSubjects || data.subjects || [];
        finalGrade = finalGrade || data.grade || '';
        studentName = data.name || 'Unknown Student';
        studentPhone = data.whatsapp || '';
      }

      if (!finalSubjects || finalSubjects.length === 0) return;

      const feeItems = await this.getSubjectPricing();
      console.log('Fee Items for sync:', JSON.stringify(feeItems.map(f => ({ s: f.subject, g: f.grades, ad: f.advancedPaymentDiscount }))));
      
      const quote = await this.calculateQuote({
        subjects: finalSubjects,
        grade: finalGrade,
        feeItems,
        payInAdvance: false // Monthly ledger calculation should NOT include advanced payment discount unless actually paid in advance as a full year plan.
      });

      console.log('Quote for sync:', JSON.stringify(quote));

      const q = query(collection(db, 'student_monthly_fee_ledger'), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);

      const existingMonths: string[] = [];

      snap.docs.forEach(d => {
        const ledger = d.data();
        existingMonths.push(ledger.month);

        if (ledger.status !== 'Clear' && ledger.status !== 'Paid' && ledger.status !== 'Verified') {
          const totalBaseAmount = Number(quote.totalBaseAmount) || 0;
          const standardDiscount = Number(quote.standardDiscount) || 0;
          const comboDiscount = Number(quote.comboDiscount) || 0;
          const totalDiscount = Number(standardDiscount) + Number(comboDiscount);
          const advancedDiscount = Number(quote.totalAdvancedDiscount) || 0;
          const finalPayable = Number(quote.discountedAmount) || 0;
          const paidAmount = Number(ledger.paidAmount) || 0;

          batch.update(d.ref, {
            studentName: studentName || ledger.studentName,
            totalFee: totalBaseAmount,
            standardDiscount: standardDiscount,
            comboDiscount: comboDiscount,
            discount: totalDiscount,
            advancedDiscount: advancedDiscount,
            finalPayable: finalPayable,
            balance: Math.max(0, finalPayable - paidAmount),
            subjects: finalSubjects,
            grade: finalGrade,
            updatedAt: serverTimestamp()
          });
        }
      });

      // Create missing months for the academic year
      const now = new Date();
      let currentMonth = now.getMonth() + 1; // 1 to 12
      let currentYear = now.getFullYear();
      let endYear = currentYear;
      if (currentMonth > 4) {
        endYear = currentYear + 1;
      }
      
      while (currentYear < endYear || (currentYear === endYear && currentMonth <= 4)) {
        const monthStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
        if (!existingMonths.includes(monthStr)) {
          const monthKey = `${studentId}_${monthStr}`;
          const ledgerRef = doc(db, 'student_monthly_fee_ledger', monthKey);
          
          batch.set(ledgerRef, {
            studentId,
            studentName: studentName,
            month: monthStr,
            totalFee: quote.totalBaseAmount || 0,
            standardDiscount: quote.standardDiscount || 0,
            comboDiscount: quote.comboDiscount || 0,
            discount: (quote.standardDiscount || 0) + (quote.comboDiscount || 0), 
            advancedDiscount: 0,
            finalPayable: quote.discountedAmount || 0,
            paidAmount: 0,
            balance: quote.discountedAmount || 0,
            status: 'Pending',
            subjects: finalSubjects,
            grade: finalGrade,
            phone: studentPhone,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'batch_sync_ledger');
      }
      console.log(`Synced ledgers for student ${studentId}`);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'student_monthly_fee_ledger');
      console.error(`Failed to sync ledger for ${studentId}:`, error);
      return false;
    }
  }
};
