import React, { useState, useEffect, useRef } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Save, Plus, Edit2, Trash2, Eye, FileText, ChevronRight, Folder, FolderOpen, ArrowLeft, Download, FileDown, CheckCircle, XCircle } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { toast } from 'react-hot-toast';
import html2pdf from 'html2pdf.js';
import { brandingService } from '../services/brandingService';

export interface DigitalNote {
  id: string;
  title: string;
  slug: string;
  class: string;
  subject: string;
  chapter: string;
  content: string;
  author: string;
  isPublic: boolean;
  createdAt: any;
  updatedAt: any;
}

export default function TabDigitalNotes({ branding }: { branding: any }) {
  const [notes, setNotes] = useState<DigitalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'explorer' | 'editor'>('explorer');
  const [currentPath, setCurrentPath] = useState<{class?: string, subject?: string, chapter?: string}>({});
  const [selectedForCompile, setSelectedForCompile] = useState<Set<string>>(new Set());
  
  const [editingNote, setEditingNote] = useState<Partial<DigitalNote> | null>(null);
  const [editorMode, setEditorMode] = useState<'quill' | 'code' | 'preview'>('quill');

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const q = query(collection(db, 'digital_notes'), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const data: DigitalNote[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as DigitalNote);
      });
      setNotes(data);
    } catch (err: any) {
      console.error("Error fetching notes:", err);
      toast.error('Could not load notes. Database might be offline or building indexes.', { id: 'admin-notes-error' });
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNode = async () => {
    if (!editingNote || !editingNote.title || !editingNote.class || !editingNote.subject || !editingNote.chapter) {
      toast.error('Please fill required fields (Title, Class, Subject, Chapter)');
      return;
    }

    const payload = {
      ...editingNote,
      slug: editingNote.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      updatedAt: serverTimestamp()
    };

    try {
      if (editingNote.id) {
        await updateDoc(doc(db, 'digital_notes', editingNote.id), payload);
        toast.success('Note updated');
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, 'digital_notes'), payload);
        toast.success('Note created');
      }
      setView('explorer');
      setEditingNote(null);
      fetchNotes();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save note');
    }
  };

  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'digital_notes', id));
      toast.success('Note deleted');
      setNoteToDelete(null);
      fetchNotes();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete note');
    }
  };

  const togglePublish = async (note: DigitalNote) => {
    try {
      await updateDoc(doc(db, 'digital_notes', note.id), {
        isPublic: !note.isPublic,
        updatedAt: serverTimestamp()
      });
      toast.success(note.isPublic ? 'Note hidden' : 'Note published publicly');
      fetchNotes();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  const startNewNote = () => {
    setEditingNote({
      title: '',
      class: currentPath.class || '',
      subject: currentPath.subject || '',
      chapter: currentPath.chapter || '',
      content: '',
      author: 'Admin', // ideally auth.currentUser.displayName
      isPublic: false
    });
    setView('editor');
  };

  const handleExportPDF = (note: DigitalNote) => {
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 40px; color: #333;">
        <h1 style="font-size: 24px; color: #1e3a8a; margin-bottom: 5px;">${note.title}</h1>
        <div style="font-size: 12px; color: #666; margin-bottom: 30px; padding-bottom: 10px; border-bottom: 2px solid #eee;">
          Class: ${note.class} | Subject: ${note.subject} | Chapter: ${note.chapter}<br/>
          Author: ${note.author} | Generated on: ${new Date().toLocaleDateString()}
        </div>
        <div class="ql-editor" style="font-size: 14px; line-height: 1.6;">
          ${note.content}
        </div>
      </div>
    `;
    
    // Add quill core styles for proper rendering of lists etc
    const style = document.createElement('style');
    style.innerHTML = `
      .ql-editor { padding: 0; }
      .ql-editor p { margin-bottom: 15px; }
      .ql-editor ul, .ql-editor ol { padding-left: 20px; margin-bottom: 15px; }
      .ql-editor img { max-width: 100%; height: auto; }
      .ql-editor pre { background: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; font-family: monospace; }
      .ql-editor blockquote { border-left: 4px solid #ccc; padding-left: 10px; margin-left: 0; color: #666; font-style: italic; }
    `;
    element.appendChild(style);

    const opt = {
      margin:       [12.7, 12.7, 12.7, 12.7] as [number, number, number, number], // top, left, bottom, right
      filename:     `${note.slug}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    toast.promise(
      html2pdf().set(opt).from(element).save(),
      {
        loading: 'Generating PDF...',
        success: 'PDF downloaded!',
        error: 'Failed to generate PDF'
      }
    );
  };

  const handleExportDOCX = (note: DigitalNote) => {
    // A simple DOCX export using HTML Blob (Word can read this format)
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title><style>@page WordSection1 { size: 210mm 297mm; margin: 12.7mm 12.7mm 12.7mm 12.7mm; } div.WordSection1 { page: WordSection1; }</style></head><body><div class='WordSection1'>";
    const footer = "</div></body></html>";
    const body = `
      <h1 style="color: #1e3a8a;">${note.title}</h1>
      <p style="color: #666; font-size: 10pt;">
        <strong>Class:</strong> ${note.class} | 
        <strong>Subject:</strong> ${note.subject} | 
        <strong>Chapter:</strong> ${note.chapter}<br/>
      </p>
      <hr/>
      ${note.content}
    `;
    const sourceHTML = header + body + footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `${note.slug}.docx`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
    toast.success('DOCX downloaded!');
  };

  // Hierarchy calculations
  const classes = Array.from(new Set(notes.map(n => n.class))).filter(Boolean).sort();
  
  const renderExplorer = () => {
    if (!currentPath.class) {
      // First Level: Classes
      return (
        <div className="flex flex-col gap-2">
          {classes.map(c => (
            <button key={c} onClick={() => setCurrentPath({class: c})} className="py-3 px-4 bg-white dark:bg-white/5 border border-[var(--border-color)] rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                  <FolderOpen size={18} className="text-indigo-500 dark:text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{c}</h3>
                  <p className="text-[10px] text-gray-500">{notes.filter(n => n.class === c).length} Topics</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
          {classes.length === 0 && <div className="py-8 text-center text-gray-400 font-medium text-sm">No notes created yet.</div>}
        </div>
      );
    }
    
    if (!currentPath.subject) {
      // Second Level: Subjects within a Class
      const subjects = Array.from(new Set(notes.filter(n => n.class === currentPath.class).map(n => n.subject))).filter(Boolean).sort();
      return (
        <div className="flex flex-col gap-2">
          {subjects.map(s => (
            <button key={s} onClick={() => setCurrentPath({...currentPath, subject: s})} className="py-3 px-4 bg-white dark:bg-white/5 border border-[var(--border-color)] rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <Folder size={18} className="text-blue-500 dark:text-blue-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{s}</h3>
                  <p className="text-[10px] text-gray-500">{notes.filter(n => n.class === currentPath.class && n.subject === s).length} Notes</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      );
    }

    if (!currentPath.chapter) {
      // Third Level: Chapters within a Subject
      const chapters = Array.from(new Set(notes.filter(n => n.class === currentPath.class && n.subject === currentPath.subject).map(n => n.chapter))).filter(Boolean).sort();
      return (
        <div className="flex flex-col gap-2">
          {chapters.map(ch => (
            <button key={ch} onClick={() => setCurrentPath({...currentPath, chapter: ch})} className="py-2.5 px-4 bg-white dark:bg-white/5 border border-[var(--border-color)] rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all flex items-center justify-between group">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                  <Folder size={16} className="text-emerald-500 dark:text-emerald-400" />
                </div>
                <div className="text-left overflow-hidden">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate w-full" title={ch}>{ch}</h3>
                  <p className="text-[10px] text-gray-500">{notes.filter(n => n.class === currentPath.class && n.subject === currentPath.subject && n.chapter === ch).length} Notes</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
          ))}
        </div>
      );
    }

    // Fourth Level: Notes within a Chapter
    const chapterNotes = notes.filter(n => n.class === currentPath.class && n.subject === currentPath.subject && n.chapter === currentPath.chapter);
    
    const handleCompileChapter = () => {
      const notesToCompile = chapterNotes.filter(n => selectedForCompile.has(n.id));
        
      if (notesToCompile.length === 0) return;

      const element = document.createElement('div');
      let combinedHTML = `
        <div style="font-family: Arial, sans-serif; padding: 40px; color: #333;">
          <h1 style="font-size: 28px; color: #1e3a8a; margin-bottom: 5px; text-align: center;">${currentPath.chapter}</h1>
          <div style="font-size: 14px; color: #666; margin-bottom: 30px; padding-bottom: 10px; border-bottom: 2px solid #eee; text-align: center;">
            Class: ${currentPath.class} | Subject: ${currentPath.subject}
          </div>
      `;

      notesToCompile.forEach((note, index) => {
        combinedHTML += `
          <div style="page-break-before: ${index > 0 ? 'always' : 'auto'}; margin-bottom: 40px;">
            <h2 style="font-size: 20px; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px;">${note.title}</h2>
            <div class="ql-editor" style="font-size: 14px; line-height: 1.6;">
              ${note.content}
            </div>
          </div>
        `;
      });

      combinedHTML += `</div>`;
      element.innerHTML = combinedHTML;

      const style = document.createElement('style');
      style.innerHTML = `
        .ql-editor { padding: 0; }
        .ql-editor p { margin-bottom: 15px; }
        .ql-editor ul, .ql-editor ol { padding-left: 20px; margin-bottom: 15px; }
        .ql-editor img { max-width: 100%; height: auto; }
        .ql-editor pre { background: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; font-family: monospace; }
        .ql-editor blockquote { border-left: 4px solid #ccc; padding-left: 10px; margin-left: 0; color: #666; font-style: italic; }
      `;
      element.appendChild(style);

      const opt = {
        margin:       [12.7, 12.7, 12.7, 12.7] as [number, number, number, number],
        filename:     `${currentPath.chapter}_Compiled.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      toast.promise(
        html2pdf().set(opt).from(element).save(),
        {
          loading: 'Compiling Chapter PDF...',
          success: 'Chapter PDF downloaded!',
          error: 'Failed to compile PDF'
        }
      );
    };

    return (
      <div className="space-y-4">
        {chapterNotes.length > 0 && (
          <div className="flex justify-end items-center gap-4">
            <span className="text-xs font-medium text-gray-500">{selectedForCompile.size} selected</span>
            <button 
              onClick={handleCompileChapter} 
              disabled={selectedForCompile.size === 0}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg transition-all shadow-red-500/30 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              <FileDown size={16} /> Compile Selected PDF
            </button>
          </div>
        )}
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-[var(--border-color)] overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 border-b border-[var(--border-color)] text-xs uppercase tracking-wider text-gray-500">
                <th className="p-4 font-bold w-12 text-center">
                  <input type="checkbox" onChange={(e) => {
                    if (e.target.checked) setSelectedForCompile(new Set(chapterNotes.map(n => n.id)));
                    else setSelectedForCompile(new Set());
                  }} checked={chapterNotes.length > 0 && selectedForCompile.size === chapterNotes.length} className="rounded border-gray-300 dark:border-white/10" />
                </th>
                <th className="p-4 font-bold">Topic / Title</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold">Last Updated</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-sm">
              {chapterNotes.map(note => (
                <tr key={note.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <td className="p-4 text-center">
                    <input type="checkbox" checked={selectedForCompile.has(note.id)} onChange={(e) => {
                      const newSet = new Set(selectedForCompile);
                      if (e.target.checked) newSet.add(note.id);
                      else newSet.delete(note.id);
                      setSelectedForCompile(newSet);
                    }} className="rounded border-gray-300 dark:border-white/10" />
                  </td>
                  <td className="p-4 font-medium flex items-center gap-2">
                    <FileText size={16} className="text-indigo-500" />
                    <span>{note.title}</span>
                  </td>
                  <td className="p-4">
                    <button onClick={() => togglePublish(note)} className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md flex items-center gap-1 ${note.isPublic ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'}`}>
                      {note.isPublic ? <><CheckCircle size={12}/> Published</> : <><Eye size={12}/> Draft</>}
                    </button>
                  </td>
                  <td className="p-4 opacity-70">
                    {note.updatedAt?.toDate ? note.updatedAt.toDate().toLocaleDateString() : 'Just now'}
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <a href={`/digital-notes/${encodeURIComponent(note.class)}/${encodeURIComponent(note.subject)}/${encodeURIComponent(note.chapter)}/${note.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors text-blue-500" title="View Public Page">
                      <Eye size={16} />
                    </a>
                    <button onClick={() => handleExportPDF(note)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors text-red-500" title="Export PDF">
                      <FileDown size={16} />
                    </button>
                    <button onClick={() => handleExportDOCX(note)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors text-blue-600" title="Export DOCX">
                      <Download size={16} />
                    </button>
                    <button onClick={() => { setEditingNote(note); setView('editor'); }} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors mx-1" title="Edit Note">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => setNoteToDelete(note.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors text-red-500" title="Delete Note">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {chapterNotes.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500">No notes found in this chapter.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

  const renderEditorForm = () => {
    if (!editingNote) return null;
    return (
      <div className="flex flex-col w-full min-h-[calc(100vh-160px)] animate-in fade-in slide-in-from-right-4 duration-300">
        
        {/* Mobile Tab Workspace Switcher */}
        <div className="lg:hidden w-full overflow-x-auto hide-scrollbar border-b border-[var(--border-color)] mb-4">
          <div className="flex w-max min-w-full space-x-1 p-1 bg-gray-50/50 dark:bg-white/5 rounded-xl">
            <button onClick={() => setView('explorer')} className="px-4 py-2 text-sm font-bold rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
              <Folder size={16} className="inline mr-2 mb-0.5" /> Explorer
            </button>
            <button onClick={() => setEditorMode('quill')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${editorMode === 'quill' ? 'bg-white shadow dark:bg-[#1e1e1e] text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
              <Edit2 size={16} className="inline mr-2 mb-0.5" /> Content
            </button>
            <button onClick={() => setEditorMode('code')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${editorMode === 'code' ? 'bg-white shadow dark:bg-[#1e1e1e] text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
               <span className="font-mono text-xs mr-1">&lt;/&gt;</span> Code
            </button>
            <button onClick={() => setEditorMode('preview')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${editorMode === 'preview' ? 'bg-white shadow dark:bg-[#1e1e1e] text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
              <Eye size={16} className="inline mr-2 mb-0.5" /> Preview
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 w-full">
            <button onClick={() => setView('explorer')} className="hidden lg:flex p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft size={20} />
            </button>
            <input 
              type="text"
              placeholder="Note Title / Main Heading..."
              value={editingNote.title || ''}
              onChange={e => setEditingNote({...editingNote, title: e.target.value})}
              className="bg-transparent text-xl md:text-2xl font-black outline-none border-none placeholder-gray-300 dark:placeholder-gray-700 w-full rounded focus:ring-2 focus:ring-indigo-500/20 px-2 -ml-2 transition-all"
            />
          </div>
          <div className="flex gap-2 shrink-0 ml-4">
            {editingNote.id && (
              <a 
                href={`/digital-notes/${encodeURIComponent(editingNote.class || '')}/${encodeURIComponent(editingNote.subject || '')}/${encodeURIComponent(editingNote.chapter || '')}/${editingNote.slug}`}
                target="_blank" rel="noopener noreferrer"
                className="hidden sm:flex px-4 py-2 text-gray-700 dark:text-gray-300 font-bold rounded-xl border border-[var(--border-color)] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors items-center gap-2"
                title="View Published Page"
              >
                <Eye size={18}/> View Live
              </a>
            )}
            <button onClick={handleSaveNode} className="px-5 py-2 bg-[var(--primary)] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-600 transition-colors shadow-lg">
              <Save size={18} />
              <span className="hidden sm:inline">Save</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col flex-1 h-full min-h-0 bg-white dark:bg-[#111214] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="hidden lg:flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-gray-50/50 dark:bg-white/5">
            <label className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${editingNote.isPublic ? 'bg-green-500' : 'bg-yellow-500'}`} />
              Workspace {editingNote.isPublic ? '(Published)' : '(Draft)'}
            </label>
            <div className="flex items-center gap-2 bg-gray-200/50 dark:bg-white/10 p-1 rounded-xl">
              <button 
                onClick={() => setEditorMode('quill')}
                className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-all ${editorMode === 'quill' ? 'bg-white shadow text-indigo-600 dark:bg-[#1e1e1e] dark:text-indigo-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
              >
                Rich Text
              </button>
              <button 
                onClick={() => setEditorMode('code')}
                className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-all ${editorMode === 'code' ? 'bg-white shadow text-indigo-600 dark:bg-[#1e1e1e] dark:text-indigo-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
              >
                <span className="font-mono">&lt;HTML/&gt;</span> code
              </button>
              <button 
                onClick={() => setEditorMode('preview')}
                className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-all ${editorMode === 'preview' ? 'bg-white shadow text-indigo-600 dark:bg-[#1e1e1e] dark:text-indigo-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
              >
                Preview HTML
              </button>
            </div>
          </div>

          <div className="w-full flex-1 min-h-[60vh] lg:min-h-[500px] flex flex-col relative bg-white dark:bg-[#0c0c0c]">
            {editorMode === 'code' ? (
              <textarea 
                value={editingNote.content || ''}
                onChange={e => setEditingNote({...editingNote, content: e.target.value})}
                className="absolute inset-0 w-full h-full p-4 md:p-6 font-mono text-[13px] md:text-sm bg-[#1e1e1e] text-green-400 focus:outline-none resize-none hide-scrollbar"
                placeholder="<!-- Paste your HTML code here -->"
              />
            ) : editorMode === 'preview' ? (
              <iframe
                title="Preview Workspace"
                className="absolute inset-0 w-full h-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin allow-popups"
                srcDoc={`
                  <!DOCTYPE html>
                  <html lang="en">
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                      body { 
                        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        margin: 0;
                        padding: 2rem;
                        background: #ffffff;
                        color: #111827;
                      }
                      /* Basic Reset & Typography matching Quill */
                      .ql-editor { font-size: 16px; line-height: 1.6; }
                      img { max-width: 100%; height: auto; border-radius: 8px; }
                      pre { background: #f3f4f6; padding: 1rem; border-radius: 8px; overflow-x: auto; }
                      blockquote { border-left: 4px solid #e5e7eb; margin: 0; padding-left: 1rem; color: #4b5563; }
                      
                      @media (max-width: 640px) {
                        body { padding: 1rem; }
                      }
                    </style>
                  </head>
                  <body>
                    <div class="ql-editor">${editingNote.content || '<p style="color: #9ca3af; font-family: monospace;">No HTML content to preview.</p>'}</div>
                  </body>
                  </html>
                `}
              />
            ) : (
              <ReactQuill 
                theme="snow" 
                value={editingNote.content || ''} 
                onChange={val => setEditingNote({...editingNote, content: val})} 
                className="absolute inset-0 flex flex-col w-full h-full bg-white dark:bg-transparent"
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                    [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
                    ['link', 'image', 'video', 'code-block'],
                    ['clean']
                  ]
                }}
              />
            )}
          </div>
        </div>

        {/* Metadata Settings / Hierarchy Displayed under workspace */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-white dark:bg-[#111214] p-4 md:p-5 rounded-2xl border border-[var(--border-color)] shadow-sm mb-8">
          <div>
            <label className="text-[10px] font-bold opacity-70 block mb-1 uppercase tracking-wider text-indigo-500">Class Label</label>
            <input type="text" placeholder="Class 11" value={editingNote.class || ''} onChange={e => setEditingNote({...editingNote, class: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-[#111214] focus:border-indigo-500 rounded-xl px-4 py-2.5 outline-none transition-all text-sm font-medium" />
          </div>
          <div>
            <label className="text-[10px] font-bold opacity-70 block mb-1 uppercase tracking-wider text-blue-500">Subject</label>
            <input type="text" placeholder="Physics" value={editingNote.subject || ''} onChange={e => setEditingNote({...editingNote, subject: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-[#111214] focus:border-indigo-500 rounded-xl px-4 py-2.5 outline-none transition-all text-sm font-medium" />
          </div>
          <div>
            <label className="text-[10px] font-bold opacity-70 block mb-1 uppercase tracking-wider text-emerald-500">Chapter</label>
            <input type="text" placeholder="Thermodynamics" value={editingNote.chapter || ''} onChange={e => setEditingNote({...editingNote, chapter: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-[#111214] focus:border-indigo-500 rounded-xl px-4 py-2.5 outline-none transition-all text-sm font-medium" />
          </div>
          <div>
            <label className="text-[10px] font-bold opacity-70 block mb-1 uppercase tracking-wider text-purple-500">URL Slug</label>
            <input type="text" placeholder="thermodynamics" value={editingNote.slug || ''} onChange={e => setEditingNote({...editingNote, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})} className="w-full bg-gray-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-[#111214] focus:border-indigo-500 rounded-xl px-4 py-2.5 outline-none transition-all text-sm font-mono" />
          </div>
          <div className="row-start-1 sm:row-auto lg:col-start-5 flex flex-col justify-center">
            <label className="flex items-center gap-3 cursor-pointer bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-[var(--border-color)] hover:bg-gray-100 dark:hover:bg-white/10 transition-colors w-full h-full">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={editingNote.isPublic || false} onChange={e => setEditingNote({...editingNote, isPublic: e.target.checked})} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${editingNote.isPublic ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${editingNote.isPublic ? 'transform translate-x-4' : ''}`}></div>
              </div>
              <span className="text-sm font-bold truncate">{editingNote.isPublic ? 'Public' : 'Publish'}</span>
            </label>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <FolderOpen className="text-indigo-500 mb-1" /> Advanced Digital Notes
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage and publish structured educational HTML notes and SEO optimized pages.</p>
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-white/5 border border-[var(--border-color)] px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-colors text-sm font-bold opacity-80">
            <input 
              type="checkbox" 
              checked={branding?.enableDigitalNotesNavbar || false}
              onChange={async (e) => {
                const val = e.target.checked;
                try {
                  toast.loading('Updating navigation settings...', { id: 'nav-update' });
                  await brandingService.updateBranding({ enableDigitalNotesNavbar: val });
                  toast.success(val ? 'Added to Navigation Bar' : 'Removed from Navigation Bar', { id: 'nav-update' });
                } catch (err) {
                  console.error(err);
                  toast.error('Failed to update navigation settings', { id: 'nav-update' });
                }
              }}
              className="accent-indigo-500 rounded cursor-pointer w-4 h-4"
            />
            Show in Navigation
          </label>
          <button onClick={startNewNote} className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/30">
            <Plus size={18} />
            Create Note
          </button>
        </div>
      </div>

      {/* Main Layout Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-indigo-500">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-medium animate-pulse">Loading Digital Notes Database...</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
          {/* Left Panel: File Explorer */}
          <div className={`w-full flex-col gap-4 flex transition-all ${view === 'editor' ? 'hidden lg:flex lg:w-[35%] shrink-0' : 'lg:w-[100%]'}`}>
            {/* Explorer Breadcrumbs */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-white dark:bg-[#111214] border border-[var(--border-color)] rounded-xl font-mono text-sm overflow-x-auto whitespace-nowrap hide-scrollbar shadow-sm">
              <button onClick={() => setCurrentPath({})} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded flex items-center gap-1 transition-colors">
                <Folder size={16} className="text-indigo-500" /> Root
              </button>
              {currentPath.class && (
                <>
                  <ChevronRight size={14} className="opacity-50" />
                  <button onClick={() => setCurrentPath({ class: currentPath.class })} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors">
                    {currentPath.class}
                  </button>
                </>
              )}
              {currentPath.subject && (
                <>
                  <ChevronRight size={14} className="opacity-50" />
                  <button onClick={() => setCurrentPath({ class: currentPath.class, subject: currentPath.subject })} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors">
                    {currentPath.subject}
                  </button>
                </>
              )}
              {currentPath.chapter && (
                <>
                  <ChevronRight size={14} className="opacity-50" />
                  <span className="p-1 opacity-70">
                    {currentPath.chapter}
                  </span>
                </>
              )}
            </div>

            <div className="bg-white dark:bg-[#111214] border border-[var(--border-color)] rounded-2xl p-4 shadow-sm min-h-[400px]">
              {renderExplorer()}
            </div>
          </div>
          
          {/* Right Panel: Editor */}
          {view === 'editor' && (
            <div className={`w-full ${view === 'editor' ? 'lg:w-[65%]' : 'hidden'}`}>
              {renderEditorForm()}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {noteToDelete && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111214] border border-[var(--border-color)] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-2">Delete Note</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">Are you sure you want to delete this note? This action cannot be undone.</p>
            <div className="flex justify-end gap-3 font-bold text-sm">
              <button 
                onClick={() => setNoteToDelete(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(noteToDelete)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
