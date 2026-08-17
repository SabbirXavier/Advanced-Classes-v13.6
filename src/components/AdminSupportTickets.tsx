import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { channelService, Channel } from '../services/channelService';
import { handleFirestoreError, OperationType } from '../services/firestoreService';

import { MessageSquare, LayoutTemplate, Trash2, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import ChatRoom from './ChatRoom';

export default function AdminSupportTickets({ user, userData }: { user: any, userData: any }) {
  const [tickets, setTickets] = useState<Channel[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmSolveId, setConfirmSolveId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'channels_config'), where('isSupportTicket', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      const ts: Channel[] = [];
      snap.forEach(doc => {
        ts.push({ id: doc.id, ...doc.data() } as Channel);
      });
      setTickets(ts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'channels_config');
    });
    return () => unsub();
  }, []);

  const handleDelete = async (e: React.MouseEvent, ticketId: string) => {
    e.stopPropagation();
    if (confirmDeleteId !== ticketId) {
      setConfirmDeleteId(ticketId);
      setConfirmSolveId(null);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }
    
    try {
      await channelService.deleteChannel(ticketId);
      if (activeTicketId === ticketId) setActiveTicketId(null);
      toast.success("Ticket deleted successfully.");
      setConfirmDeleteId(null);
    } catch (err: any) {
      console.error("Failed to delete ticket", err);
      toast.error("Failed to delete ticket: " + (err.message || "Unknown error"));
    }
  };

  const handleClose = async (e: React.MouseEvent, ticketId: string) => {
    e.stopPropagation();
    if (confirmSolveId !== ticketId) {
      setConfirmSolveId(ticketId);
      setConfirmDeleteId(null);
      setTimeout(() => setConfirmSolveId(null), 3000);
      return;
    }
    
    try {
      await channelService.closeSupportTicket(ticketId, user?.uid || 'admin');
      toast.success('Ticket marked as solved. Auto-delete in 10 seconds.');
      setConfirmSolveId(null);
    } catch (err) {
      console.error('Failed to close ticket', err);
      toast.error('Failed to close ticket');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-500 to-pink-500 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden mb-6">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black mb-2 flex items-center gap-2">
              <MessageSquare className="text-red-200" size={32} />
              Open Support Tickets
            </h2>
            <p className="text-red-100 opacity-90 font-medium tracking-wide">Manage and resolve user inquiries</p>
          </div>
          <span className="bg-black/20 text-white px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest border border-white/10 shadow-inner">
             {tickets.length} Active Tickets
          </span>
        </div>
        <MessageSquare className="absolute -right-8 -bottom-8 w-64 h-64 text-white/10 rotate-12" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        <div className="md:col-span-1 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
           {tickets.length === 0 ? (
             <div className="text-center p-8 bg-white/5 border border-white/5 rounded-2xl text-white/40">
                No active support tickets.
             </div>
           ) : (
             tickets.map(ticket => (
               <div key={ticket.id} className="relative group">
                 <button
                   onClick={() => setActiveTicketId(ticket.id)}
                   className={`w-full text-left p-4 rounded-2xl border transition-all ${activeTicketId === ticket.id ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'}`}
                 >
                   <div className="font-bold pr-8">{ticket.name}</div>
                   <div className="text-xs opacity-60 truncate pr-8">{ticket.description}</div>
                 </button>
                 <button
                   onClick={(e) => handleClose(e, ticket.id)}
                   className={`absolute right-12 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${confirmSolveId === ticket.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                   title="Mark solved"
                 >
                   <CheckCheck size={16} />
                 </button>
                 <button 
                   onClick={(e) => handleDelete(e, ticket.id)}
                   className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${confirmDeleteId === ticket.id ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-white/40 hover:text-red-400 hover:bg-red-500/10'}`}
                 >
                   <Trash2 size={16} />
                 </button>
               </div>
             ))
           )}
        </div>
        
        <div className="md:col-span-2 h-[600px] bg-[#1a1c23] border border-white/5 rounded-3xl overflow-hidden relative">
           {activeTicketId ? (
              <ChatRoom 
                channelId={activeTicketId}
                user={user}
                userData={userData}
                allUsers={[]}
                onProfileClick={() => {}}
              />
           ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 pointer-events-none">
                 <LayoutTemplate size={48} className="mb-4" />
                 <p className="font-bold">Select a ticket to begin chatting</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
