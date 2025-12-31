import React, { useState, useMemo, useEffect } from 'react';
import { Axiom, Message, ResearchState } from './types';
import { extractAxioms, chatWithResearchStream } from './gemini';
import { AxiomCards } from './AxiomCards';
import { ChatSanctuary } from './ChatSanctuary';

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
    language: 'en'
  });

  const [activeView, setActiveView] = useState<ViewMode>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (state.pdfUrl) {
        URL.revokeObjectURL(state.pdfUrl);
      }
    };
  }, [state.pdfUrl]);

  const labels = useMemo(() => ({
    en: {
      newResearch: "New Research",
      dialogue: "Research Workspace",
      fullPdf: "Manuscript Viewer",
      about: "About Knowledge AI",
      help: "Support Center",
      axiomsHeader: "Axiomatic Insights",
      activeDoc: "Active Manuscript",
      uploadPrompt: "Upload manuscript",
      synthesizing: "Analyzing thematic structures...",
      ready: "Sanctuary Ready",
      processing: "Processing...",
      openInNewTab: "View Full Screen"
    },
    ar: {
      newResearch: "بحث جديد",
      dialogue: "مساحة البحث",
      fullPdf: "مستعرض المخطوطات",
      about: "عن التطبيق",
      help: "مركز الدعم",
      axiomsHeader: "الرؤى البديهية",
      activeDoc: "المخطوطة النشطة",
      uploadPrompt: "رفع المخطوطة",
      synthesizing: "تحليل الهياكل الموضوعية...",
      ready: "الملاذ جاهز",
      processing: "معالجة...",
      openInNewTab: "فتح المخطوطة في نافذة جديدة"
    }
  }), []);

  const t = labels[state.language];

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

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        setState(prev => ({ ...prev, pdfBase64: base64 }));
        
        try {
          const axioms = await extractAxioms(base64, state.language);
          setState(prev => ({ 
            ...prev, 
            axioms, 
            isProcessing: false, 
            status: t.ready 
          }));
          setActiveView('chat');
        } catch (error) {
          console.error(error);
          setState(prev => ({ ...prev, isProcessing: false, status: 'Error' }));
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, isProcessing: false, status: 'Failed' }));
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!state.pdfBase64) return;

    const userMsg: Message = { role: 'user', text };
    const initialHistory = [...state.chatHistory, userMsg];
    
    setState(prev => ({ 
      ...prev, 
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
      
      setState(prev => ({ ...prev, isProcessing: false }));
    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const isRtl = state.language === 'ar';

  return (
    <div className={`flex h-screen bg-[#05070a] text-slate-200 overflow-hidden ${isRtl ? 'flex-row-reverse' : ''}`}>
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-black/80 z-40 transition-opacity duration-500 lg:hidden ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Responsive Sidebar */}
      <aside className={`
        fixed lg:static top-0 bottom-0 ${isRtl ? 'right-0' : 'left-0'} z-50
        w-[80vw] md:w-80 transition-transform duration-500 ease-in-out border-r border-white/5 
        bg-[#05070a] shadow-2xl flex flex-col overflow-hidden
        ${sidebarOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full lg:translate-x-0')}
      `}>
        <div className="p-4 md:p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Knowledge Repository</span>
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <label className="mb-6 cursor-pointer group">
            <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all shadow-pro">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black shadow-pro shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              </div>
              <span className="font-bold text-xs uppercase tracking-wider truncate">{t.newResearch}</span>
            </div>
          </label>

          <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
            <button 
              onClick={() => { setActiveView('chat'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${activeView === 'chat' ? 'bg-white/10 text-white shadow-pro' : 'hover:bg-white/5 text-slate-400'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span className="text-xs font-bold uppercase tracking-wide">{t.dialogue}</span>
            </button>
            <button 
              onClick={() => { setActiveView('pdf'); setSidebarOpen(false); }}
              disabled={!state.pdfUrl}
              className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all disabled:opacity-20 ${activeView === 'pdf' ? 'bg-white/10 text-white shadow-pro' : 'hover:bg-white/5 text-slate-400'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span className="text-xs font-bold uppercase tracking-wide">{t.fullPdf}</span>
            </button>
          </nav>

          <div className="mt-auto pt-6 space-y-2 border-t border-white/5">
            <button onClick={() => { setActiveView('about'); setSidebarOpen(false); }} className="w-full text-left p-3 text-[9px] font-black text-white/30 hover:text-white transition-colors flex items-center gap-4 uppercase tracking-[0.3em]">
                {t.about}
            </button>
            <button onClick={() => { setActiveView('help'); setSidebarOpen(false); }} className="w-full text-left p-3 text-[9px] font-black text-white/30 hover:text-white transition-colors flex items-center gap-4 uppercase tracking-[0.3em]">
                {t.help}
            </button>
            <button onClick={() => setState(p => ({ ...p, language: p.language === 'en' ? 'ar' : 'en' }))} className="w-full flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
              <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Language</span>
              <span className="text-[10px] font-black text-white">{state.language.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative min-w-0 bg-[#05070a]">
        <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 z-30 shrink-0 border-b border-white/5 bg-[#05070a]/80 backdrop-blur-xl">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 md:p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 lg:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </button>
          
          <div className="flex flex-col items-center flex-1 lg:flex-none">
            <h1 className="text-xl md:text-2xl font-black tracking-tighter glow-text-violet uppercase italic">
              Knowledge AI
            </h1>
            <p className="hidden sm:block text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-white/20 italic mt-0.5">
              this is an extension of the 5minute paper project
            </p>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                <span className={`h-1.5 w-1.5 rounded-full ${state.isProcessing ? 'bg-violet-500 animate-pulse' : 'bg-white/10'}`}></span>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">{state.status}</span>
             </div>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
          {!state.pdfBase64 && activeView === 'chat' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
               <div className="mb-10 relative">
                  <h2 className="text-4xl md:text-7xl font-black text-white/90 mb-4 tracking-tighter italic">
                    The <span className="glow-text-violet">Sanctuary</span>
                  </h2>
                  <p className="text-sm md:text-xl text-white/20 italic max-w-md mx-auto leading-relaxed font-bold">
                    "High-performance institutional research"
                  </p>
               </div>
               
               <label className="group relative block cursor-pointer w-full max-w-md">
                  <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
                  <div className="glass rounded-[30px] p-8 md:p-12 border-2 border-dashed border-white/5 hover:border-violet-500/30 transition-all duration-700 flex flex-col items-center justify-center">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-pro">
                      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    </div>
                    <h2 className="text-xl font-black text-white mb-2">{t.uploadPrompt}</h2>
                    <p className="text-white/10 text-[8px] font-black uppercase tracking-[0.4em]">Synthesis Protocol</p>
                  </div>
                </label>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {activeView === 'chat' && (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {state.axioms.length > 0 && (
                    <div className="shrink-0 max-h-[30vh] overflow-y-auto p-3 md:p-6 custom-scrollbar bg-white/[0.01] border-b border-white/5">
                      <div className="max-w-7xl mx-auto">
                        <div className={`flex items-center gap-4 mb-3 md:mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                           <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">{t.axiomsHeader}</h3>
                           <div className="flex-1 h-[1px] bg-white/5"></div>
                        </div>
                        <AxiomCards axioms={state.axioms} />
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-h-0 relative">
                    <ChatSanctuary 
                      messages={state.chatHistory} 
                      onSendMessage={handleSendMessage} 
                      isProcessing={state.isProcessing}
                      language={state.language}
                    />
                  </div>
                </div>
              )}
              {activeView === 'pdf' && state.pdfUrl && (
                <div className="flex-1 p-4 md:p-6 flex flex-col items-center h-full min-h-0">
                  <div className="w-full flex-1 glass rounded-2xl overflow-hidden border border-white/10 relative shadow-pro bg-black/40">
                    <iframe 
                      src={state.pdfUrl} 
                      title="PDF Manuscript"
                      className="w-full h-full border-none"
                    />
                  </div>
                  <a 
                    href={state.pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="mt-4 lg:hidden px-6 py-3 bg-violet-600/20 border border-violet-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                    {t.openInNewTab}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="h-8 flex items-center justify-center border-t border-white/5 bg-[#05070a] px-4 shrink-0">
           <p className="text-[8px] text-white/20 font-black uppercase tracking-[0.5em] truncate">
             Developed by Oussama SEBROU
           </p>
        </footer>
      </main>
    </div>
  );
};

export default App;
