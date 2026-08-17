import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Users, BookOpen, UserMinus, Shield, Filter, Search, UserCheck } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { pricingService } from '../services/pricingService';
import { authService, UserProfile } from '../services/authService';
import { handleFirestoreError } from '../services/firestoreService';
import toast from 'react-hot-toast';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export default function BatchRosterModule() {
  const [batches, setBatches] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [batchFaculty, setBatchFaculty] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  const [selectedBatchId, setSelectedBatchId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // We assume these startListeners are already managed if we use context, 
    // but we can listen safely since firestoreService handles duplicate unsubs
    const unsubBatches = firestoreService.listenToCollection('batches', setBatches);
    const unsubEnrolls = firestoreService.listenToCollection('enrollments', setEnrollments);
    const unsubFac = firestoreService.listenToCollection('batch_faculty', setBatchFaculty);
    const unsubFees = firestoreService.listenToCollection('fees', setFees);
    const unsubUsers = authService.listenToAllUsers(setUsers);
    
    return () => {
      unsubBatches();
      unsubEnrolls();
      unsubFac();
      unsubFees();
      unsubUsers();
    };
  }, []);

  const activeBatches = useMemo(() => {
    const list: any[] = [];
    
    // 1. Database Batches
    batches.forEach(b => {
      list.push({
        id: b.id,
        name: b.name,
        tag: b.tag || 'Regular',
        systemGrade: b.systemGrade,
        systemSubject: fees.find(f => f.id === b.feeId)?.subject || b.subject
      });
    });

    // 2. Synthetic Batches (Fallbacks)
    fees.forEach(f => {
      const gList = f.grades || (f.grade ? [f.grade] : []);
      gList.forEach((g: string) => {
        if (f.subject) {
          const exists = list.some(b => b.systemGrade === g && b.systemSubject === f.subject);
          if (!exists) {
            list.push({
              id: `system_${g}_${f.subject}`,
              name: `Class ${g} - ${f.subject}`,
              tag: 'System',
              systemGrade: g,
              systemSubject: f.subject
            });
          }
        }
      });
    });
    return list.sort((a,b) => a.name.localeCompare(b.name));
  }, [batches, fees]);

  const selectedBatch = activeBatches.find(b => b.id === selectedBatchId);
  
  const matchingEnrollments = useMemo(() => {
    if (!selectedBatch) return [];
    
    const gradeTag = selectedBatch.systemGrade;
    const requiredSubject = selectedBatch.systemSubject;
    const sq = searchQuery.toLowerCase().trim();
    
    let filtered = enrollments.filter(e => {
        // Exclude completely deleted or expelled
        if (!e.status || e.status === 'Pending' || e.status === 'Expelled' || e.status === 'Deleted') return false;

        const isSearchMatch = sq && ((e.name || '').toLowerCase().includes(sq) || 
                                     (e.whatsapp || '').toLowerCase().includes(sq) || 
                                     (e.phone || '').toLowerCase().includes(sq) ||
                                     (e.email || '').toLowerCase().includes(sq));

        if (!sq) {
            if (e.status === 'Left') return false;
            // Default view: only show students who are supposed to be in this batch
            if (gradeTag && e.grade !== gradeTag) return false;
            
            if (requiredSubject) {
               const hasSubject = e.subjects && (
                 e.subjects.includes(requiredSubject) || 
                 e.subjects.some((s: string) => s.toUpperCase() === 'ALL' || s.toUpperCase() === 'ALL SUBJECTS')
               );
               if (!hasSubject) return false;
            }
        } else {
            // If there's a search query, show ONLY search matches across ALL students
            if (!isSearchMatch) return false;
        }

        return true;
    });

    return filtered;
  }, [enrollments, selectedBatch, searchQuery]);

  const removeStudentFromSubject = async (studentId: string, subjectToRemove: string) => {
      if (!confirm(`Are you sure you want to revoke access to ${subjectToRemove}?`)) return;
      
      const toastId = toast.loading('Revoking access...');
      try {
          const student = enrollments.find(e => e.id === studentId);
          if (!student) throw new Error('Student not found');
          
          let currentSubs: string[] = student.subjects || [];
          if (currentSubs.some(s => s.toUpperCase() === 'ALL' || s.toUpperCase() === 'ALL SUBJECTS')) {
              const allAvailable = Array.from(new Set(fees.filter((f: any) => f.subject && f.subject !== 'ALL').map((f: any) => f.subject))) as string[];
              currentSubs = allAvailable;
          }
          const updatedSubjects = currentSubs.filter(s => s !== 'ALL' && s !== 'All Subjects' && s !== 'ALL SUBJECTS').filter((s: string) => s !== subjectToRemove);

          await firestoreService.updateItem('enrollments', studentId, { subjects: updatedSubjects, batchAccess: 'active' }); // ensuring fresh state
          await pricingService.syncStudentLedger(studentId, updatedSubjects, student.grade);
          toast.success(`Access to ${subjectToRemove} revoked`, { id: toastId });
      } catch (err: any) {
          toast.error(err.message, { id: toastId });
      }
  };
  
  const grantStudentSubject = async (studentId: string, subjectToGrant: string) => {
      const toastId = toast.loading('Granting access...');
      try {
          const student = enrollments.find(e => e.id === studentId);
          if (!student) throw new Error('Student not found');
          
          const updatedSubjects = Array.from(new Set([...(student.subjects || []), subjectToGrant]));
          await firestoreService.updateItem('enrollments', studentId, { subjects: updatedSubjects, batchAccess: 'active' });
          await pricingService.syncStudentLedger(studentId, updatedSubjects, student.grade);
          toast.success(`Access to ${subjectToGrant} granted`, { id: toastId });
      } catch (err: any) {
          toast.error(err.message, { id: toastId });
      }
  };

  const terminateStudent = async (studentId: string) => {
      if (!confirm(`WARNING: This will mark the student as EXTRACTED / LEFT. Are you sure?`)) return;
      
      const toastId = toast.loading('Updating student status...');
      try {
          // Just mark as removed so they don't appear in active rosters
          await firestoreService.updateItem('enrollments', studentId, { status: 'Left', feeStatus: 'Inactive' });
          toast.success('Student marked as left/terminated', { id: toastId });
      } catch (err: any) {
          toast.error(err.message, { id: toastId });
      }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden mb-6">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2 flex items-center gap-2">
            <Users size={32} className="text-blue-300" />
            Class Batches
          </h2>
          <p className="text-blue-100 font-medium tracking-wide">
             Manage subject allocations, revoke student access, and overview batch staff.
          </p>
        </div>
        <Users className="absolute -right-8 -bottom-8 w-64 h-64 text-white/10 rotate-12" />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-1/3">
           <label className="text-xs uppercase opacity-70 font-bold mb-1 block">Select Batch</label>
           <select 
             className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0b14] text-gray-900 dark:text-white outline-none focus:border-[var(--primary)] shadow-sm [&>option]:bg-white dark:[&>option]:bg-[#0a0b14] [&>option]:text-gray-900 dark:[&>option]:text-white font-medium"
             value={selectedBatchId}
             onChange={e => setSelectedBatchId(e.target.value)}
           >
             <option value="ALL">-- Select a Batch --</option>
             {activeBatches.map(b => (
                 <option key={b.id} value={b.id}>{b.name} ({b.tag})</option>
             ))}
           </select>
        </div>
        {selectedBatch && (
         <div className="w-full sm:w-2/3">
             <label className="text-xs uppercase opacity-70 font-bold mb-1 block">Search Patient / Phone</label>
             <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input 
                   type="text" 
                   className="w-full pl-10 p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                   placeholder="Search..."
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                 />
             </div>
         </div>
        )}
      </div>

      {selectedBatch ? (
          <div className="space-y-6 mt-6">
              {/* Faculty assigned to this batch */}
              <div className="glass-card p-6 border-l-4 border-indigo-500">
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                      <Shield size={20} className="text-indigo-500" />
                      Assigned Faculty
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {Array.from(new Set(batchFaculty.filter(f => f.batchId === selectedBatch.id).map(f => f.userId))).map(uid => {
                          const facs = batchFaculty.filter(f => f.batchId === selectedBatch.id && f.userId === uid);
                          const user = users.find(u => u.uid === uid);
                          return (
                              <div key={uid} className="bg-white/5 border border-[var(--border-color)] p-4 rounded-xl">
                                  <div className="font-bold">{user?.name || 'Unknown User'}</div>
                                  <div className="text-xs text-gray-500 mb-2">{user?.email}</div>
                                  <div className="flex flex-wrap gap-1">
                                      {facs.map(f => (
                                          <span key={f.id} className="text-[10px] bg-indigo-500/20 text-indigo-500 px-2 py-0.5 rounded font-black">
                                              {f.subject}
                                          </span>
                                      ))}
                                  </div>
                              </div>
                          );
                      })}
                      {batchFaculty.filter(f => f.batchId === selectedBatch.id).length === 0 && (
                          <div className="text-gray-500 text-sm italic">No faculty assigned yet.</div>
                      )}
                  </div>
              </div>

              {/* Student Roster */}
              <div className="glass-card overflow-hidden">
                  <div className="p-4 bg-[var(--primary)]/10 border-b border-[var(--border-color)] flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <Users size={20} className="text-[var(--primary)]" />
                        Student Roster ({matchingEnrollments.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead>
                              <tr className="bg-black/5 dark:bg-white/5 text-xs uppercase tracking-wider opacity-70">
                                  <th className="p-4">Student</th>
                                  <th className="p-4">Contact</th>
                                  <th className="p-4">Subjects / Access</th>
                                  <th className="p-4 text-right">Admin Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)] text-sm">
                              {matchingEnrollments.map(student => (
                                  <tr key={student.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                                      <td className="p-4">
                                          <div className="font-bold">{student.name}</div>
                                          <div className="text-[10px] text-gray-500 uppercase">{student.status || 'Active'}</div>
                                      </td>
                                      <td className="p-4 text-gray-500">
                                          <div>{student.whatsapp}</div>
                                      </td>
                                      <td className="p-4">
                                          <div className="flex flex-col gap-1">
                                              {Array.from(new Set(fees.filter(f => f.subject && f.subject !== 'ALL').map(f => f.subject))).sort().map((sub: unknown) => {
                                                  const subStr = String(sub);
                                                  const hasAccess = (student.subjects || []).includes(subStr) || (student.subjects || []).some((s: string) => s.toUpperCase() === 'ALL' || s.toUpperCase() === 'ALL SUBJECTS');
                                                  return (
                                                    <div key={subStr} className="flex gap-2 items-center justify-between bg-white/5 px-2 py-1 rounded w-[160px]">
                                                        <span className="text-[10px] font-bold">{subStr}</span>
                                                        {hasAccess ? (
                                                            <button 
                                                              onClick={() => removeStudentFromSubject(student.id, subStr)}
                                                              className="text-red-500 hover:text-white bg-red-500/10 hover:bg-red-500 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors"
                                                            >
                                                              Revoke
                                                            </button>
                                                        ) : (
                                                            <button 
                                                              onClick={() => grantStudentSubject(student.id, subStr)}
                                                              className="text-emerald-500 hover:text-white bg-emerald-500/10 hover:bg-emerald-500 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors"
                                                            >
                                                              Grant
                                                            </button>
                                                        )}
                                                    </div>
                                                  )
                                              })}
                                          </div>
                                      </td>
                                      <td className="p-4 align-top w-48">
                                          <div className="flex flex-col gap-2">
                                            <div className="flex bg-black/10 dark:bg-black/30 rounded-lg p-1 w-full justify-between">
                                                <button 
                                                    onClick={async () => {
                                                        await firestoreService.updateItem('enrollments', student.id, { batchAccess: 'active', status: 'Active' });
                                                        toast.success('Batch access overridden to Active');
                                                    }}
                                                    className={`flex-1 px-2 py-1 rounded text-[10px] font-bold transition-colors ${student.batchAccess === 'active' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-500' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
                                                >
                                                    Added
                                                </button>
                                                <button 
                                                    onClick={async () => {
                                                        await firestoreService.updateItem('enrollments', student.id, { batchAccess: 'auto', status: 'Active' });
                                                        toast.success('Batch access set to Auto');
                                                    }}
                                                    className={`flex-1 px-2 py-1 rounded text-[10px] font-bold transition-colors ${student.batchAccess === 'auto' || !student.batchAccess ? 'bg-blue-500/20 text-blue-600 dark:text-blue-500' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
                                                >
                                                    Auto
                                                </button>
                                                <button 
                                                    onClick={async () => {
                                                        await firestoreService.updateItem('enrollments', student.id, { batchAccess: 'disabled' });
                                                        toast.success('Student temporarily removed from batch access');
                                                    }}
                                                    className={`flex-1 px-2 py-1 rounded text-[10px] font-bold transition-colors ${student.batchAccess === 'disabled' ? 'bg-red-500/20 text-red-600 dark:text-red-500' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
                                                >
                                                    Removed
                                                </button>
                                            </div>
                                            <button 
                                                onClick={() => terminateStudent(student.id)}
                                                className="px-3 py-1.5 w-full justify-center bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[10px] font-bold hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1"
                                            >
                                                <UserMinus size={12} /> Discontinue
                                            </button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                              {matchingEnrollments.length === 0 && (
                                  <tr>
                                      <td colSpan={4} className="p-8 text-center text-gray-500">No students enrolled in this grade/batch.</td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      ) : (
          <div className="text-center p-12 glass-card">
             <Filter className="mx-auto text-gray-400 opacity-50 mb-4" size={48} />
             <p className="text-gray-500 text-lg">Select a batch above to view roster</p>
          </div>
      )}
    </div>
  );
}
