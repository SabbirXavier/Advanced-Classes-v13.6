import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { DigitalNote } from './TabDigitalNotes';
import { FileText, Folder, FolderOpen, Calendar, Clock, User, ChevronRight, Share2, Library } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import 'react-quill-new/dist/quill.snow.css';

import { BrandingConfig } from '../services/brandingService';

// Public Note Viewer Component
export function PublicDigitalNoteViewer({ branding, classId, subjectId, chapterId, slug }: { branding?: BrandingConfig, classId: string, subjectId: string, chapterId: string, slug: string }) {
  const [note, setNote] = useState<DigitalNote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const q = query(
          collection(db, 'digital_notes'),
          where('class', '==', decodeURIComponent(classId)),
          where('subject', '==', decodeURIComponent(subjectId)),
          where('chapter', '==', decodeURIComponent(chapterId)),
          where('slug', '==', slug)
        );
        const sn = await getDocs(q);
        if (!sn.empty) {
          const fetchedNote = { id: sn.docs[0].id, ...sn.docs[0].data() } as DigitalNote;
          if (fetchedNote.isPublic) {
            setNote(fetchedNote);
          } else {
            console.warn("Note is not public");
            setNote(null);
          }
        } else {
          setNote(null);
        }
      } catch (err: any) {
        console.error("Error fetching note:", err);
        toast.error('Failed to load note content. Please try again.', { id: 'note-error' });
      } finally {
        setLoading(false);
      }
    };
    fetchNote();
  }, [classId, subjectId, chapterId, slug]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: note?.title,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-indigo-500">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-medium animate-pulse">Loading Academic Content...</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <FileText size={64} className="text-gray-300 dark:text-gray-700 mb-6" />
        <h1 className="text-2xl font-black mb-2">Note Not Found</h1>
        <p className="text-gray-500 max-w-md">The study material you are looking for does not exist, has been archived, or is not publicly directly accessible.</p>
        <button onClick={() => window.location.href = '/'} className="mt-8 px-6 py-2 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition">Return Home</button>
      </div>
    );
  }

  // Calculate reading time
  const wordCount = note.content ? note.content.replace(/<[^>]*>?/gm, '').split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full bg-white/60 dark:bg-black/40 border-b border-gray-100 dark:border-white/5 px-3 py-2 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 group">
            {branding?.logo ? (
              <img src={branding.logo} alt={branding?.title} className="h-6 w-auto rounded object-contain group-hover:opacity-80 transition-opacity" />
            ) : (
              <div className="h-7 w-7 rounded bg-indigo-500 flex items-center justify-center text-white font-bold text-xs">AC</div>
            )}
            <span className="font-semibold text-base text-gray-900 dark:text-gray-100 hidden sm:inline">{branding?.title || 'Advanced Classes'}</span>
          </button>
          <button onClick={() => { if (window.history.length > 2) { window.history.back(); } else { window.location.href = '/digital-notes'; } }} className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            Back to Library
          </button>
        </div>
      </div>
      <article className="w-full pb-24 pt-6 md:pt-10">
      <div className="max-w-4xl mx-auto px-6 py-8 md:p-12 bg-white dark:bg-[#111214] rounded-2xl md:rounded-[32px] shadow-lg border border-gray-100 dark:border-white/10 w-full relative z-10">
      {/* Breadcrumb Information Block */}
      <div className="mb-8 max-w-4xl">
        <div className="flex flex-wrap items-center gap-1.5 text-xs md:text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-4 tracking-wide uppercase">
          <span>{note.class}</span>
          <span className="opacity-50 text-gray-400">/</span>
          <span>{note.subject}</span>
          <span className="opacity-50 text-gray-400">/</span>
          <span>{note.chapter}</span>
        </div>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-6 leading-[1.1] tracking-tight">
          {note.title}
        </h1>

        <div className="flex pl-1 pr-1 flex-wrap items-center gap-x-4 gap-y-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 border-y border-gray-100 dark:border-white/10 py-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
              {note.author.charAt(0)}
            </div>
            <span className="font-medium text-gray-700 dark:text-gray-200">{note.author}</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            <Calendar size={14} className="opacity-70" />
            <span>{note.updatedAt?.toDate ? note.updatedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="opacity-70" />
            <span>{readingTime} min</span>
          </div>
          
          <button onClick={handleShare} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
            <Share2 size={14} />
          </button>
        </div>
      </div>

      {/* Rendered Content */}
      <div className="w-full relative mt-8 sm:mt-12 bg-transparent text-[#1f2937] dark:text-[#d1d5db]">
        {/* Custom overrides for images/tables not covered by Quill */}
        <style dangerouslySetInnerHTML={{__html: `
          .native-quill-renderer img { max-width: 100%; height: auto; border-radius: 8px; margin: 1.5rem 0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
          .native-quill-renderer table { max-width: 100%; overflow-x: auto; display: block; border-collapse: collapse; margin: 1rem 0; }
          .native-quill-renderer th, .native-quill-renderer td { border: 1px solid var(--border-color, #e5e7eb); padding: 0.5rem; text-align: left; }
          .native-quill-renderer th { background-color: rgba(0,0,0,0.03); }
          .dark .native-quill-renderer th { background-color: rgba(255,255,255,0.05); }
          .native-quill-renderer .ql-editor { padding: 0; font-size: 1.05rem; line-height: 1.7; overflow-y: visible; color: inherit; }
          .native-quill-renderer p, .native-quill-renderer ul, .native-quill-renderer ol, .native-quill-renderer li { color: inherit; }
          .native-quill-renderer h1, .native-quill-renderer h2, .native-quill-renderer h3, .native-quill-renderer h4 { color: inherit; }
          @media (max-width: 640px) {
            .native-quill-renderer .ql-editor { padding: 0; font-size: 1rem; line-height: 1.6; }
          }
        `}} />
        <div 
          className="ql-snow native-quill-renderer w-full"
        >
          <div 
            className="ql-editor prose dark:prose-invert max-w-none !p-0 sm:!p-2"
            dangerouslySetInnerHTML={{ __html: note.content || '' }} 
          />
        </div>
      </div>
      
      <div className="mt-16 pt-8 border-t border-gray-100 dark:border-white/10 text-center text-sm text-gray-400">
        <p>End of Note</p>
      </div>
      </div>
    </article>
    </div>
  );
}

// Public Library Explorer Component
export function PublicDigitalNotesLibrary({ branding, onNavigate }: { branding?: BrandingConfig, onNavigate?: (path: string) => void }) {
  const [notes, setNotes] = useState<DigitalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState<{class?: string, subject?: string, chapter?: string}>({});
  
  useEffect(() => {
    const fetchPublicNotes = async () => {
      try {
        const q = query(collection(db, 'digital_notes'), where('isPublic', '==', true));
        const sn = await getDocs(q);
        let data: DigitalNote[] = [];
        sn.forEach(doc => {
          data.push({ id: doc.id, ...doc.data() } as DigitalNote);
        });
        // Sort in memory to avoid requiring complex composite index
        data.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
        setNotes(data);
      } catch (err: any) {
        console.error("Error fetching notes:", err);
        // Ensure we handle index errors gracefully by assuming no notes
        toast.error('Could not load notes. Database might be offline or synchronizing.', { id: 'notes-error' });
      } finally {
        setLoading(false);
      }
    };
    fetchPublicNotes();
  }, []);

  const classes = Array.from(new Set(notes.map(n => n.class))).filter(Boolean).sort();

  const handleNoteClick = (note: DigitalNote) => {
    const url = `/digital-notes/${encodeURIComponent(note.class)}/${encodeURIComponent(note.subject)}/${encodeURIComponent(note.chapter)}/${note.slug}`;
    if (onNavigate) {
      onNavigate(url);
    } else {
      window.location.href = url;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 w-full relative">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-indigo-500">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!currentPath.class) {
      if (classes.length === 0) {
        return (
          <div className="text-center py-24 px-4 bg-white/40 dark:bg-transparent rounded-3xl border border-gray-200 dark:border-white/5">
            <Library size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Notes Available</h3>
            <p className="text-gray-500">There are no publicly published notes available at this time.</p>
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-2 md:gap-3">
          {classes.map((c, i) => (
            <motion.button 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={c} 
              onClick={() => setCurrentPath({class: c})} 
              className="text-left py-3 px-4 md:py-4 md:px-5 bg-white dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl md:rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 shrink-0 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
                  <FolderOpen className="text-indigo-500 dark:text-indigo-400" size={20} />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{c}</h3>
                  <p className="text-xs text-gray-500">{notes.filter(n => n.class === c).length} Topics</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          ))}
        </div>
      );
    }
    
    if (!currentPath.subject) {
      const subjects = Array.from(new Set(notes.filter(n => n.class === currentPath.class).map(n => n.subject))).filter(Boolean).sort();
      return (
        <div className="flex flex-col gap-2 md:gap-3">
          {subjects.map((s, i) => (
            <motion.button 
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              key={s} onClick={() => setCurrentPath({...currentPath, subject: s})} 
              className="py-3 px-4 md:py-4 md:px-5 bg-white dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl md:rounded-2xl flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 shrink-0 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <Folder className="text-blue-500 dark:text-blue-400" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-base md:text-lg text-gray-900 dark:text-white">{s}</h3>
                  <p className="text-xs text-gray-500">{notes.filter(n => n.class === currentPath.class && n.subject === s).length} Notes</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          ))}
        </div>
      );
    }

    if (!currentPath.chapter) {
      const chapters = Array.from(new Set(notes.filter(n => n.class === currentPath.class && n.subject === currentPath.subject).map(n => n.chapter))).filter(Boolean).sort();
      return (
        <div className="flex flex-col gap-2">
          {chapters.map((ch, i) => (
            <motion.button 
              initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
              key={ch} onClick={() => setCurrentPath({...currentPath, chapter: ch})} 
              className="py-3 px-4 border-b border-gray-100 dark:border-white/5 last:border-0 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-left"
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Chapter</span>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{ch}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {notes.filter(n => n.class === currentPath.class && n.subject === currentPath.subject && n.chapter === ch).length} Notes
                </span>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            </motion.button>
          ))}
        </div>
      );
    }

    const chapterNotes = notes.filter(n => n.class === currentPath.class && n.subject === currentPath.subject && n.chapter === currentPath.chapter);
    return (
      <div className="flex flex-col gap-2">
        {chapterNotes.map((note, i) => (
          <motion.button 
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            key={note.id} 
            onClick={() => handleNoteClick(note)} 
            className="py-3 px-4 flex gap-4 bg-white/50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl hover:bg-white dark:hover:bg-white/10 transition-all text-left group items-center"
          >
            <div className="w-8 h-8 shrink-0 bg-gray-100 dark:bg-white/10 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400">
              <FileText size={16} />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{note.title}</h3>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1 flex items-center gap-2">
                <span className="flex items-center gap-1"><Clock size={10}/> {note.updatedAt?.toDate ? note.updatedAt.toDate().toLocaleDateString() : 'Recent'}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><User size={10}/> {note.author}</span>
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center flex-1">
      <div className="w-full bg-white/60 dark:bg-black/40 border-b border-gray-100 dark:border-white/5 px-3 py-2 sticky top-0 z-50 shadow-sm backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 group">
            {branding?.logo ? (
              <img src={branding.logo} alt={branding?.title} className="h-6 w-auto rounded object-contain group-hover:opacity-80 transition-opacity" />
            ) : (
              <div className="h-7 w-7 rounded bg-indigo-500 flex items-center justify-center text-white font-bold text-xs">AC</div>
            )}
            <span className="font-semibold text-base text-gray-900 dark:text-gray-100">{branding?.title || 'Advanced Classes'}</span>
          </button>
          <span className="text-xs font-medium text-gray-500">Library</span>
        </div>
      </div>

    <div className="max-w-4xl mx-auto w-full pb-20 pt-6 min-h-screen px-3 md:px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Library</h1>
        <p className="text-sm text-gray-500 max-w-2xl">Browse digital notes and study materials.</p>
      </div>

      {Object.keys(currentPath).length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-6 text-xs md:text-sm font-medium w-full">
          <button onClick={() => setCurrentPath({})} className="text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Library</button>
          
          {currentPath.class && (
            <>
              <ChevronRight size={14} className="text-gray-300" />
              <button onClick={() => setCurrentPath({class: currentPath.class})} className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate max-w-[100px] md:max-w-[150px]">{currentPath.class}</button>
            </>
          )}
          
          {currentPath.subject && (
            <>
              <ChevronRight size={14} className="text-gray-300" />
              <button onClick={() => setCurrentPath({class: currentPath.class, subject: currentPath.subject})} className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate max-w-[100px] md:max-w-[150px]">{currentPath.subject}</button>
            </>
          )}

          {currentPath.chapter && (
            <>
              <ChevronRight size={14} className="text-gray-300" />
              <span className="text-indigo-600 dark:text-indigo-400 truncate max-w-[100px] md:max-w-[150px]">{currentPath.chapter}</span>
            </>
          )}
        </div>
      )}

      {renderContent()}
    </div>
    </div>
  );
}
