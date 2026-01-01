
import React, { useState, useMemo, useEffect } from 'react';
import { Axiom, Message, ResearchState, Conversation } from './types';
import { extractAxioms, chatWithResearchStream, generateEssenceTitle } from './gemini';
import { AxiomCards } from './AxiomCards';
import { ChatSanctuary } from './ChatSanctuary';
import { ManuscriptViewer } from './ManuscriptViewer';

type ViewMode = 'chat' | 'pdf';

const STORAGE_KEY = 'knowledge_ai_sanctuary_archive_v1';

const App: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [state, setState] = useState<ResearchState>({
    activeId: null,
    pdfBase64: null,
    pdfUrl: null,
    pdfName: null,
    axioms: [],
    chatHistory: [],
    isProcessing: false,
    status: 'Ready',
    language: 'en'
  });

  const [activeView, setActiveView] = useState<ViewMode>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isInitialAnalysis, setIsInitialAnalysis] = useState(false);
  const [showAxiomsOverlay, setShowAxiomsOverlay] = useState(false);

  // تحميل الأرشيف من التخزين المحلي
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setConversations(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load archive", e);
      }
    }
  }, []);

  // حفظ الأرشيف تلقائياً عند أي تغيير
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    return () => {
      if (state.pdfUrl) URL.revokeObjectURL(state.pdfUrl);
    };
  }, [state.pdfUrl]);

  const labels = useMemo(() => ({
    en: {
      newResearch: "New Research",
      dialogue: "Dialogue Sanctuary",
      fullPdf: "Manuscript View",
      axiomsTitle: "Axiomatic Wisdom Extracted",
      uploadPrompt: "Upload manuscript",
      synthesizing: "Neural Synthesis...",
      ready: "Sanctuary Ready",
      processing: "Processing...",
      startChat: "Enter Sanctuary",
      historyHeader: "Discourse Archive",
      covenant: "Direct reading and personal comprehension are the paths to wisdom.",
      noHistory: "No prior discourses found.",
      untiltled: "New Discourse"
    },
    ar: {
      newResearch: "بحث جديد",
      dialogue: "ملاذ الحوار",
      fullPdf: "عرض المخطوطة",
      axiomsTitle: "تم استخراج الحكمة البديهية",
      uploadPrompt: "رفع المخطوطة",
      synthesizing: "جاري التوليف...",
      ready: "الملاذ جاهز",
      processing: "معالجة...",
      startChat: "دخول الملاذ",
      historyHeader: "أرشيف المحادثات",
      covenant: "القراءة المباشرة والفهم الشخصي هما المساران الوحيدان للحكمة.",
      noHistory: "لا توجد محادثات سابقة.",
      untiltled: "محادثة جديدة"
    }
  }), []);

  const t = labels[state.language];

  const startNewChat = () => {
    if (state.pdfUrl) URL.revokeObjectURL(state.pdfUrl);
    setState({
      activeId: null,
      pdfBase64: null,
      pdfUrl: null,
      pdfName: null,
      axioms: [],
      chatHistory: [],
      isProcessing: false,
      status: 'Ready',
      language: state.language
    });
    setActiveView('chat');
    setSidebarOpen(false);
  };

  const loadConversation = (conv: Conversation) => {
    if (state.pdfUrl) URL.revokeObjectURL(state.pdfUrl);
    
    let url = null;
    if (conv.pdfBase64) {
      try {
        const byteCharacters = atob(conv.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        url = URL.createObjectURL(blob);
      } catch (e) {
        console.error("PDF Recovery failed", e);
      }
    }

    setState({
      activeId: conv.id,
      pdfBase64: conv.pdfBase64,
      pdfUrl: url,
      pdfName: conv.pdfName,
      axioms: conv.axioms,
      chatHistory: conv.history,
      isProcessing: false,
      status: 'Ready',
      language: state.language
    });
    setActiveView('chat');
    setSidebarOpen(false);
  };

  const deleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(c => c.id !== id));
    if (state.activeId === id) {
      startNewChat();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    const blob = new Blob([file], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      status: t.processing,
      pdfName: file.name,
      pdfUrl: blobUrl,
      axioms: []
    }));
    setIsInitialAnalysis(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        setState(prev => ({ ...prev, pdfBase64: base64 }));
        
        try {
          const axioms = await extractAxioms(base64, state.language);
          const newId = Date.now().toString();
          
          setState(prev => ({ 
            ...prev, 
            activeId: newId,
            axioms, 
            isProcessing: false, 
            status: t.ready 
          }));
          
          setIsInitialAnalysis(false);
          setShowAxiomsOverlay(true);
          setActiveView('chat');
        } catch (error) {
          console.error(error);
          setState(prev => ({ ...prev, isProcessing: false, status: 'Error' }));
          setIsInitialAnalysis(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, isProcessing: false, status: 'Failed' }));
      setIsInitialAnalysis(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!state.pdfBase64) return;
    if (showAxiomsOverlay) setShowAxiomsOverlay(false);

    const isFirstMessage = state.chatHistory.length === 0;
    const currentId = state.activeId || Date.now().toString();
    const userMsg: Message = { role: 'user', text };
    const initialHistory = [...state.chatHistory, userMsg];
    
    setState(prev => ({ 
      ...prev, 
      activeId: currentId,
      chatHistory: [...initialHistory, { role: 'model', text: '' }],
      isProcessing: true
    }));

    try {
      const stream = chatWithResearchStream(
        state.pdfBase64, 
        initialHistory, 
        text,
        state.language
      );
      
      let fullText = "";
      for await (const chunk of stream) {
        fullText += chunk;
        setState(prev => {
          const newHistory = [...prev.chatHistory];
          if (newHistory.length > 0) {
            newHistory[newHistory.length - 1] = { role: 'model', text: fullText };
          }
          return { ...prev, chatHistory: newHistory };
        });
      }
      
      const modelResp = fullText;
      
      let dynamicTitle = t.untiltled;
      if (isFirstMessage) {
        dynamicTitle = await generateEssenceTitle(modelResp, state.language);
      } else {
        const existing = conversations.find(c => c.id === currentId);
        if (existing) dynamicTitle = existing.title;
      }

      setConversations(prevConvs => {
        const existingIdx = prevConvs.findIndex(c => c.id === currentId);
        
        const newConv: Conversation = {
          id: currentId,
          title: dynamicTitle,
          history: [...initialHistory, { role: 'model', text: modelResp }],
          pdfBase64: state.pdfBase64,
          pdfName: state.pdfName,
          axioms: state.axioms,
          timestamp: Date.now()
        };

        if (existingIdx > -1) {
          const updated = [...prevConvs];
          updated[existingIdx] = newConv;
          return updated.sort((a,b) => b.timestamp - a.timestamp);
        } else {
          return [newConv, ...prevConvs].sort((a,b) => b.timestamp - a.timestamp);
        }
      });

      setState(prev => ({ ...prev, isProcessing: false, status: 'Ready' }));

    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, isProcessing: false, status: 'Error' }));
    }
  };

  const isRtl = state.language === 'ar';

  return (
    <div className={`flex h-screen w-full bg-[#0a0f1d] text-slate-200 overflow-hidden ${isRtl ? 'flex-row-reverse' : ''}`}>
      
      {/* Sidebar Toggle */}
      <button 
        onClick={() => setSidebarOpen(true)}
        className={`fixed top-4 ${isRtl ? 'right-4' : 'left-4'} z-[4000] p-2.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-200 hover:bg-indigo-600/40 rounded-xl transition-all shadow-indigo-500/10 shadow-lg active:scale-95`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
      </button>

      {/* Overlays */}
      {isInitialAnalysis && (
        <div className="fixed inset-0 z-[5000] bg-[#0a0f1d] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin mb-10"></div>
          <h2 className="text-2xl md:text-3xl font-black academic-serif shining-title italic uppercase tracking-widest mb-4">{t.synthesizing}</h2>
          <div className="max-w-md bg-indigo-950/20 border border-indigo-500/10 p-6 rounded-2xl">
            <p className="text-sm font-medium text-indigo-300 italic">{t.covenant}</p>
          </div>
        </div>
      )}

      {showAxiomsOverlay && state.axioms.length > 0 && (
        <div className="fixed inset-0 z-[4500] bg-[#0a0f1d]/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto custom-scrollbar animate-in zoom-in duration-700">
          <div className="max-w-7xl w-full flex flex-col items-center">
            <h2 className="text-3xl md:text-5xl font-black academic-serif shining-title italic uppercase tracking-[0.3em] mb-12 text-center">{t.axiomsTitle}</h2>
            <div className="w-full mb-16"><AxiomCards axioms={state.axioms} variant="fullscreen" /></div>
            <button onClick={() => setShowAxiomsOverlay(false)} className="px-12 py-4 bg-indigo-600 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-indigo-500 transition-all shadow-indigo-500/40 shadow-xl">{t.startChat}</button>
          </div>
        </div>
      )}

      {/* Sidebar - Discourse Archive */}
      <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[4100] transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />
      
      <aside className={`fixed top-0 bottom-0 ${isRtl ? 'right-0' : 'left-0'} z-[4200] w-[80vw] md:w-72 transition-transform duration-300 ease-out bg-[#0f172a] border-x border-white/5 flex flex-col overflow-hidden shadow-2xl ${sidebarOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full')}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Memory Engine</span>
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
          </div>

          <div className="px-3 mb-4">
            <button onClick={startNewChat} className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 transition-all group shadow-inner">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white group-hover:rotate-90 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              </div>
              <span className="text-[12px] font-black uppercase tracking-widest text-white">{t.newResearch}</span>
            </button>
          </div>

          <div className="px-3 mb-6 space-y-1">
            <button onClick={() => { setActiveView('chat'); setSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${activeView === 'chat' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:bg-white/5'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              <span className="text-[11px] font-black uppercase tracking-widest">{t.dialogue}</span>
            </button>
            <button onClick={() => { setActiveView('pdf'); setSidebarOpen(false); }} disabled={!state.pdfUrl} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all disabled:opacity-10 ${activeView === 'pdf' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:bg-white/5'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>
              <span className="text-[11px] font-black uppercase tracking-widest">{t.fullPdf}</span>
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col px-3">
            <h3 className="px-3 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t.historyHeader}</h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1 pb-6">
              {conversations.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-white/5 rounded-2xl opacity-20">
                  <p className="text-[10px] italic">{t.noHistory}</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <div key={conv.id} onClick={() => loadConversation(conv)} className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${state.activeId === conv.id ? 'bg-indigo-900/30 text-indigo-100 border-indigo-500/30 font-semibold' : 'bg-transparent text-slate-400 border-transparent hover:bg-white/5'}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] leading-snug line-clamp-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                        {conv.title || t.untiltled}
                      </p>
                    </div>
                    <button onClick={(e) => deleteConversation(e, conv.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-400 transition-all active:scale-90">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-4 border-t border-white/5">
             <button onClick={() => setState(p => ({ ...p, language: p.language === 'en' ? 'ar' : 'en' }))} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all text-slate-400 group">
                <div className="flex items-center gap-3">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:rotate-180 transition-transform"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                   <span className="text-[10px] font-black uppercase tracking-widest">Global Sync</span>
                </div>
                <span className="text-[10px] font-black text-white">{state.language.toUpperCase()}</span>
             </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10">
        <header className="h-16 flex items-center justify-center px-4 z-[100] border-b border-white/5 bg-[#0a0f1d]/60 backdrop-blur-2xl">
          <h1 className="text-2xl font-black academic-serif tracking-[0.2em] uppercase italic shining-title">
            Knowledge AI
          </h1>
        </header>

        <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
          {!state.pdfBase64 && activeView === 'chat' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
               <div className="mb-12 relative">
                  <div className="absolute -inset-20 bg-indigo-600 blur-[140px] rounded-full opacity-20"></div>
                  <h2 className="text-6xl md:text-8xl font-black academic-serif italic mb-4 tracking-tighter shining-title">Sanctuary</h2>
               </div>
               <label className="group cursor-pointer w-full max-w-sm">
                  <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
                  <div className="p-10 rounded-[40px] border-2 border-dashed border-white/10 hover:border-indigo-500/30 transition-all flex flex-col items-center bg-white/[0.02] hover:bg-white/[0.04] shadow-2xl">
                    <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/10 group-hover:scale-110 transition-transform text-indigo-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">{t.uploadPrompt}</span>
                  </div>
                </label>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {activeView === 'chat' && (
                <ChatSanctuary messages={state.chatHistory} onSendMessage={handleSendMessage} isProcessing={state.isProcessing} language={state.language} />
              )}
              {activeView === 'pdf' && state.pdfBase64 && (
                <ManuscriptViewer base64={state.pdfBase64} />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
