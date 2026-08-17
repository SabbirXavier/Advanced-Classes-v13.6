import React, { useState, useEffect } from 'react';
import { FlaskConical, Atom, Dna, Calculator, Download, FolderOpen, Shield, Lock, Edit, Trash2, Plus, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { firestoreService, handleFirestoreError } from '../services/firestoreService';
import MarkdownRenderer from './MarkdownRenderer';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
import MaterialViewer from './MaterialViewer';
import { auth } from '../firebase';

const iconMap: Record<string, any> = {
  FlaskConical,
  Atom,
  Dna,
  Calculator,
  Download,
  FolderOpen
};

export default function TabDownloads({ isAdmin }: { isAdmin?: boolean }) {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingMaterial, setViewingMaterial] = useState<any | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    subject: '',
    color: '#4f46e5',
    icon: 'Download',
    links: [] as any[]
  });

  useEffect(() => {
    return firestoreService.listenToCollection('downloads', (data) => {
      setDownloads(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'downloads');
    });
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this material?')) return;
    try {
      await deleteDoc(doc(db, 'downloads', id));
      toast.success('Material deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      await updateDoc(doc(db, 'downloads', id), data);
      setEditingMaterial(null);
      toast.success('Material updated');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, link: any) => {
    if (link.isProtected) {
      e.preventDefault();
      setViewingMaterial(link);
      return;
    }
    const url = link.url;
    const label = link.label;
    if (url.startsWith('data:')) {
      e.preventDefault();
      const a = document.createElement('a');
      a.href = url;
      // Extract extension if possible, otherwise default to .pdf
      let ext = '.pdf';
      if (url.includes('image/png')) ext = '.png';
      else if (url.includes('image/jpeg')) ext = '.jpg';
      else if (url.includes('application/msword')) ext = '.doc';
      else if (url.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) ext = '.docx';
      
      a.download = label.includes('.') ? label : `${label}${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (loading) return <div className="text-center p-10 opacity-50 font-bold">Loading...</div>;

  return (
    <div className="space-y-5">
      <AnimatePresence>
        {viewingMaterial && (
          <MaterialViewer 
            material={viewingMaterial} 
            user={auth.currentUser} 
            onClose={() => setViewingMaterial(null)} 
          />
        )}
      </AnimatePresence>
      <div className="mb-5 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Study Materials</h2>
          <p className="text-sm opacity-70 mt-1">Class XII - Chapterwise & PYQs</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => toast.error('Use Admin Panel (Resource Vault) to add more')}
            className="p-2 bg-[var(--primary)] text-white rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {downloads.map(dl => {
          const MainIcon = iconMap[dl.icon] || Download;
          const isEditing = editingMaterial?.id === dl.id;

          return (
            <div key={dl.id} className="glass-card !p-4 group relative">
              {isAdmin && !isEditing && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingMaterial(dl)} className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDelete(dl.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md" style={{ backgroundColor: dl.color }}>
                  <MainIcon size={20} />
                </div>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editingMaterial.subject} 
                    onChange={e => setEditingMaterial({...editingMaterial, subject: e.target.value})}
                    className="bg-white/10 p-1 rounded outline-none border border-white/20"
                  />
                ) : (
                  <b className="tracking-wide" style={{ color: dl.color }}>
                    <MarkdownRenderer content={dl.subject} inline />
                  </b>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                {dl.links.map((link: any, i: number) => {
                   const LinkIcon = iconMap[link.icon] || (link.isProtected ? Shield : Download);
                   return (
                     <div key={i} className="flex gap-2 items-center group/link">
                       <a 
                         href={link.url} 
                         onClick={(e) => handleLinkClick(e, link)} 
                         target="_blank" 
                         rel="noreferrer" 
                         className={`flex-grow flex justify-between items-center p-3 rounded-xl border font-semibold transition-all hover:text-white hover:-translate-y-0.5 hover:shadow-md ${
                           link.isProtected 
                             ? 'bg-indigo-500/5 text-indigo-500 border-indigo-500/20 hover:bg-indigo-600 hover:border-indigo-600' 
                             : 'bg-white/10 dark:bg-black/10 text-[var(--text-color)] border-[var(--border-color)] hover:bg-[var(--primary)] hover:border-[var(--primary)]'
                         }`}
                       >
                         <span className="flex items-center gap-2">
                           {isEditing ? (
                             <input 
                               value={editingMaterial.links[i].label}
                               onChange={e => {
                                 const newLinks = [...editingMaterial.links];
                                 newLinks[i] = { ...newLinks[i], label: e.target.value };
                                 setEditingMaterial({ ...editingMaterial, links: newLinks });
                               }}
                               className="bg-white/20 p-1 rounded outline-none border border-white/20 text-xs w-48"
                               onClick={e => e.stopPropagation()}
                             />
                           ) : (
                             <MarkdownRenderer content={link.label} inline />
                           )}
                           {link.isProtected && <Lock size={12} className="opacity-50" />}
                         </span>
                         <LinkIcon size={18} />
                       </a>
                       {isEditing && (
                         <div className="flex gap-1">
                            <button 
                              onClick={() => {
                                const newLinks = [...editingMaterial.links];
                                newLinks[i] = { ...newLinks[i], isProtected: !newLinks[i].isProtected };
                                setEditingMaterial({ ...editingMaterial, links: newLinks });
                              }}
                              className={`p-2 rounded-lg border transition-all ${editingMaterial.links[i].isProtected ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500'}`}
                              title={editingMaterial.links[i].isProtected ? "Protected (Requires Sign-In)" : "Public"}
                            >
                              <Shield size={12} />
                            </button>
                            <button 
                              onClick={() => {
                                const newLinks = editingMaterial.links.filter((_: any, idx: number) => idx !== i);
                                setEditingMaterial({ ...editingMaterial, links: newLinks });
                              }}
                              className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white border border-red-500/20 transition-all"
                            >
                              <X size={12} />
                            </button>
                         </div>
                       )}
                     </div>
                   );
                 })}
                 {isEditing && (
                   <button 
                     onClick={() => {
                       const newLinks = [...editingMaterial.links, { label: 'New Link', url: '', icon: 'Download', isProtected: false }];
                       setEditingMaterial({ ...editingMaterial, links: newLinks });
                     }}
                     className="mt-2 p-2 px-4 border border-dashed border-gray-300 dark:border-white/20 rounded-xl text-xs font-bold opacity-60 hover:opacity-100 flex items-center justify-center gap-2"
                   >
                     <Plus size={14} /> Add Another Link (Update URL in Resource Vault)
                   </button>
                 )}
              </div>
              
              {isEditing && (
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setEditingMaterial(null)} className="p-2 px-4 bg-gray-500/10 text-gray-500 rounded-xl font-bold text-xs uppercase tracking-widest">
                    Cancel
                  </button>
                  <button onClick={() => handleUpdate(dl.id, editingMaterial)} className="p-2 px-4 bg-green-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                    <Save size={14} /> Save Changes
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
