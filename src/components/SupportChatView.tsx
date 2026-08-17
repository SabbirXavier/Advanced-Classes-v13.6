import React, { useEffect, useState } from 'react';
import ChatRoom from './ChatRoom';
import { ArrowLeft, CheckCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { channelService, Channel } from '../services/channelService';
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

export default function SupportChatView({ user, userData, onBack }: { user: any, userData: any, onBack: () => void }) {
  const [activeTicket, setActiveTicket] = useState<string | null>(localStorage.getItem('activeSupportTicket'));
  const [ticketDetails, setTicketDetails] = useState<Channel | null>(null);

  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (!activeTicket) return;
    const unsub = channelService.listenToChannels((channels) => {
      const ticket = channels.find(c => c.id === activeTicket);
      if (ticket) {
        setTicketDetails(ticket);
      } else {
        // Ticket resolved/deleted
        setTicketDetails(null);
        localStorage.removeItem('activeSupportTicket');
        setActiveTicket(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'channels_config');
    });
    return () => unsub();
  }, [activeTicket]);

  const canCloseTicket = Boolean(
    ticketDetails?.isSupportTicket &&
    user &&
    (userData?.role === 'admin' || userData?.role === 'moderator' || ticketDetails?.ticketOwnerId === user.uid)
  );

  const handleCloseTicket = async () => {
    if (!activeTicket || !user || !canCloseTicket) return;
    if (!confirmClose) {
      setConfirmClose(true);
      setTimeout(() => setConfirmClose(false), 3000);
      return;
    }
    
    try {
      await channelService.closeSupportTicket(activeTicket, user.uid);
      toast.success('Ticket marked as solved. Auto-delete in 10 seconds.');
      setConfirmClose(false);
    } catch (error) {
      console.error('Failed to close ticket:', error);
      toast.error('Failed to close ticket');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#111] text-white flex flex-col">
      <header className="flex items-center gap-4 p-4 border-b border-white/5 bg-[#16181d]">
        <button 
          onClick={() => {
            onBack();
          }}
          className="p-2 hover:bg-white/5 rounded-full transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="font-bold">{ticketDetails?.name || 'Support Ticket'}</h2>
          <p className="text-xs text-white/50">{ticketDetails?.description || 'Your direct line to admins'}</p>
        </div>
        {canCloseTicket && (
          <button
            onClick={handleCloseTicket}
            className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${confirmClose ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            <CheckCheck size={14} />
            {confirmClose ? 'Confirm Close' : 'Ticket Close'}
          </button>
        )}
      </header>

      <div className="flex-1 overflow-hidden relative">
        {activeTicket ? (
           <ChatRoom 
             channelId={activeTicket}
             user={user}
             userData={userData}
             allUsers={[]}
             onProfileClick={() => {}}
           />
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
            <p>No active ticket to display.</p>
            <p className="text-sm">If you had an open ticket, it might have been resolved by the admins.</p>
          </div>
        )}
      </div>
    </div>
  );
}
