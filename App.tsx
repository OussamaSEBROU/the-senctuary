import React, { useState, useMemo, useEffect } from 'react';
import { Axiom, Message, ResearchState, Conversation } from './types';
import { extractAxioms, chatWithResearchStream, generateConversationTitle } from './gemini';
import { AxiomCards } from './AxiomCards';
import { ChatSanctuary } from './ChatSanctuary';
import { ManuscriptViewer } from './ManuscriptViewer';

type ViewMode = 'chat' | 'pdf' | 'about' | 'help';

const App: React.FC = () => {
  const [state, setState] = useState<ResearchState>({
    pdfBase64: null,
    pdfUrl: null,
    pdfName: null,
    axioms: [],
    chatHistory: [],
    isProcessing: false,
    status: 'Ready',
    language: 'en',
    conversations: [],
    activeConversationId: null
  });

  const [activeView, setActiveView] = useState<ViewMode>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isInitialAnalysis, setIsInitialAnalysis] = useState(false);
  const [showAxiomsOverlay, setShowAxiomsOverlay] = useState(false);

  // Load conversations
  useEffect(() => {
    const saved = localStorage.getItem('sanctuary_conversations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(prev => ({ ...prev, conversations: parsed }));
      } catch (e) {
        console.error("Failed to load conversations", e);
      }
    }
  }, []);

  // Save conversations with overflow protection
  useEffect(() => {
    try {
      localStorage.setItem('sanctuary_conversations', JSON.stringify(state.conversations));
    } catch (e) {
      console.warn("LocalStorage limit reached");
    }
  }, [state.conversations]);

  useEffect(() => {
    return () => {
      if (state.pdfUrl) URL.revokeObjectURL(state.pdfUrl);
    };
  }, [state.pdfUrl]);

  const labels = useMemo(() => ({
    en: {
      newResearch: "New Research",
      dialogue: "Research Workspace",
      fullPdf: "Manuscript Viewer",
      uploadPrompt: "Upload manuscript",
      synthesizing: "Neural Synthesis in Progress...",
      ready: "Sanctuary Ready",
      processing: "Processing...",
      covenant: "The Sanctuary Covenant: Direct reading and personal comprehension are the only paths to wisdom.",
      startChat: "Enter the Sanctuary",
      axiomsTitle: "Axiomatic Wisdom Extracted",
      previousChats: "Previous Conversations",
      languageLabel: "Language",
      langName: "English"
    },
    ar: {
      newResearch: "بحث جديد",
      dialogue: "مساحة البحث",
      fullPdf: "مستعرض المخطوطات",
      uploadPrompt: "رفع المخطوطة",
      synthesizing: "جاري التوليف العصبي...",
      ready: "الملاذ جاهز",
      processing: "معالجة...",
      covenant: "عهد الملاذ: القراءة المباشرة والفهم الشخصي هما المساران الوحيدان للحكمة الحقيقية.",
      startChat: "دخول الملاذ المعرفي",
      axiomsTitle: "تم استخراج الحكمة البديهية",
      previousChats: "المحادثات السابقة",
      languageLabel: "اللغة",
      langName: "العربية"
    }
  }), []);

  const t = labels[state.language];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    if (file.size > 50 * 1024 * 1024) {
      alert(state.language === 'ar' ? "الملف كبير جداً (50MB كحد أقصى)" : "File too large (Max 50MB)");
      return;
    }

    const blobUrl = URL.createObjectURL(new Blob([file], { type: 'application/pdf' }));
    const newConvId = Date.now().toString();
    
    setState(prev => ({ 
      ...prev, isProcessing: true, status: t.processing,
      pdfName: file.name, pdfUrl: blobUrl, axioms: [],
      chatHistory: [], activeConversationId: newConvId
    }));
    setIsInitialAnalysis(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setState(prev => ({ ...prev, pdfBase64: base64 }));
      try {
        const axioms = await extractAxioms(base64, state.language);
        const newConv: Conversation = {
          id: newConvId, title: file.name, chatHistory: [],
          pdfBase64: base64, pdfUrl: blobUrl, pdfName: file.name,
          axioms: axioms, timestamp: Date.now()
        };
        setState(prev => ({ ...prev, axioms, isProcessing: false, status: t.ready, conversations: [newConv, ...prev.conversations] }));
        setIsInitialAnalysis(false);
        setShowAxiomsOverlay(true);
      } catch (error) {
        setState(prev => ({ ...prev, isProcessing: false }));
        setIsInitialAnalysis(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (text: string) => {
    if (!state.pdfBase64 || state.isProcessing) return;
    const userMsg: Message = { role: 'user', text };
    const history = [...state.chatHistory, userMsg];
    setState(prev => ({ ...prev, chatHistory: [...history, { role: 'model', text: '' }], isProcessing: true }));

    try {
      const stream = chatWithResearchStream(state.pdfBase64, history, text, state.language);
      let fullText = "";
      for await (const chunk of stream) {
        fullText += chunk;
        setState(prev => {
          const newHist = [...prev.chatHistory];
          newHist[newHist.length - 1] = { role: 'model', text: fullText };
          return { ...prev, chatHistory: newHist };
        });
      }
      setState(prev => ({ ...prev, isProcessing: false }));
    } catch (error) {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const switchConversation = (conv: Conversation) => {
    setState(prev => ({ 
      ...prev, activeConversationId: conv.id, chatHistory: conv.chatHistory, 
      pdfBase64: conv.pdfBase64, pdfUrl: conv.pdfUrl, pdfName: conv.pdfName, axioms: conv.axioms 
    }));
    setActiveView('chat');
    setSidebarOpen(false);
  };

  const isRtl = state.language === 'ar';

  return (
    <div className={`flex h-screen w-full bg-[#05070a] text-slate-200 overflow-hidden ${isRtl ? 'flex-row-reverse' : ''}`}>
      
      {/* Sidebar Toggle */}
      <button onClick={() => setSidebarOpen(true)} className={`fixed top-4 ${isRtl ? 'right-4' : 'left-4'} z-[4000] p-3 bg-white text-black rounded-2xl shadow-xl active:scale-90 transition-all`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
      </button>

      {/* Sidebar Overlay */}
      <div className={`fixed inset-0 bg-black/80 z-[2100] transition-opacity duration-500 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={`fixed top-0 bottom-0 ${isRtl ? 'right-0' : 'left-0'} z-[2200] w-[80vw] md:w-80 transition-transform duration-500 bg-[#05070a] border-x border-white/5 flex flex-col ${sidebarOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full')}`}>
        <div className="p-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-10">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Archive Repository</span>
            <button onClick={() => setSidebarOpen(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <label className="mb-8 cursor-pointer group">
            <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all shadow-lg">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg></div>
              <span className="font-black text-[10px] uppercase tracking-widest">{t.newResearch}</span>
            </div>
          </label>

          {/* View Selectors - الربط مع ManuscriptViewer */}
          <div className="space-y-2 mb-8">
            <button onClick={() => { setActiveView('chat'); setSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeView === 'chat' ? 'bg-white/10 text-white border border-white/10' : 'text-slate-400'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">{t.dialogue}</span>
            </button>
            <button onClick={() => { setActiveView('pdf'); setSidebarOpen(false); }} disabled={!state.pdfUrl} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeView === 'pdf' ? 'bg-white/10 text-white border border-white/10' : 'text-slate-400 disabled:opacity-20'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">{t.fullPdf}</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-4">{t.previousChats}</h3>
            {state.conversations.map(conv => (
              <div key={conv.id} onClick={() => switchConversation(conv)} className={`p-4 rounded-2xl border transition-all cursor-pointer ${state.activeConversationId === conv.id ? 'bg-white/10 border-white/10 text-white' : 'border-transparent hover:bg-white/5 text-slate-400'}`}>
                <span className="text-[10px] font-bold line-clamp-2">{conv.title}</span>
              </div>
            ))}
          </div>

          {/* Language Switcher - المستند إلى الملف الأصلي */}
          <div className="mt-auto pt-8 border-t border-white/5">
            <button onClick={() => setState(p => ({ ...p, language: p.language === 'en' ? 'ar' : 'en' }))} className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{t.languageLabel}</span>
              <span className="text-[10px] font-black text-white">{t.langName}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#05070a]">
        <header className="h-16 md:h-20 flex items-center justify-center border-b border-white/5 bg-[#05070a]/95 backdrop-blur-2xl">
          <h1 className="text-xl md:text-2xl font-black tracking-[0.2em] glow-text-violet uppercase italic">Knowledge AI</h1>
        </header>

        <div className="flex-1 relative flex flex-col overflow-hidden">
          {!state.pdfBase64 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
               <h2 className="text-4xl md:text-7xl font-black text-white/90 mb-6 tracking-tighter italic">The <span className="glow-text-violet">Sanctuary</span></h2>
               <label className="mt-10 group cursor-pointer w-full max-w-md">
                  <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
                  <div className="glass rounded-[40px] p-10 md:p-16 border-2 border-dashed border-white/10 hover:border-violet-500/40 transition-all flex flex-col items-center bg-white/[0.01] shadow-2xl">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 shadow-pro">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/70"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <h2 className="text-sm md:text-base font-black text-white uppercase tracking-[0.3em]">{t.uploadPrompt}</h2>
                  </div>
                </label>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeView === 'chat' ? (
                <ChatSanctuary messages={state.chatHistory} onSendMessage={handleSendMessage} isProcessing={state.isProcessing} language={state.language} />
              ) : (
                <ManuscriptViewer url={state.pdfUrl || ''} />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Loading Overlay */}
      {isInitialAnalysis && (
        <div className="fixed inset-0 z-[5000] bg-[#05070a] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
          <div className="w-16 h-16 rounded-full border-t-2 border-violet-500 animate-spin mb-10 shadow-[0_0_30px_rgba(139,92,246,0.3)]"></div>
          <h2 className="text-xl font-black glow-text-violet uppercase tracking-widest mb-4 italic">{t.synthesizing}</h2>
          <div className="glass bg-violet-600/5 p-6 rounded-2xl border border-violet-500/20 max-w-md">
            <p className="text-xs md:text-base font-bold text-violet-300 italic">{t.covenant}</p>
          </div>
        </div>
      )}

      {/* Axioms Overlay (Flashcards) */}
      {showAxiomsOverlay && (
        <div className="fixed inset-0 z-[1500] bg-[#05070a]/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 animate-in zoom-in duration-700 overflow-y-auto">
          <h2 className="text-xl md:text-3xl font-black glow-text-violet uppercase tracking-[0.4em] mb-12 text-center italic">{t.axiomsTitle}</h2>
          <div className="w-full max-w-7xl mb-16">
            <AxiomCards axioms={state.axioms} language={state.language} />
          </div>
          <button onClick={() => setShowAxiomsOverlay(false)} className="px-10 py-4 bg-white text-black rounded-full font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">{t.startChat}</button>
        </div>
      )}
    </div>
  );
};

export default App;
