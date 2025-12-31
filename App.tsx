
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
      uploadPrompt: "Upload your manuscript",
      synthesizing: "Analyzing thematic structures...",
      ready: "Sanctuary Ready",
      processing: "Deep Processing...",
      dev: "Developed by Oussama SEBROU",
      openInNewTab: "View Full Screen",
      pdfError: "If the manuscript does not appear, your browser may be restricting the built-in viewer."
    },
    ar: {
      newResearch: "بحث جديد",
      dialogue: "مساحة البحث",
      fullPdf: "مستعرض المخطوطات",
      about: "عن التطبيق",
      help: "مركز الدعم",
      axiomsHeader: "الرؤى البديهية",
      activeDoc: "المخطوطة النشطة",
      uploadPrompt: "قم برفع المخطوطة",
      synthesizing: "تحليل الهياكل الموضوعية...",
      ready: "الملاذ جاهز",
      processing: "معالجة عميقة...",
      dev: "تم التطوير بواسطة أسامة سبرو",
      openInNewTab: "عرض بملء الشاشة",
      pdfError: "إذا لم تظهر المخطوطة، فقد يكون متصفحك يقيّد عارض الملفات المدمج."
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

  const toggleLanguage = () => {
    setState(prev => ({ ...prev, language: prev.language === 'en' ? 'ar' : 'en' }));
  };

  const isRtl = state.language === 'ar';

  return (
    <div className={`flex h-screen bg-[#05070a] text-slate-200 overflow-hidden ${isRtl ? 'flex-row-reverse' : ''}`}>
      <div 
        className={`fixed inset-0 bg-black/80 z-30 transition-opacity duration-500 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`
        fixed top-0 bottom-0 ${isRtl ? 'right-0' : 'left-0'} z-40
        w-80 transition-transform duration-500 ease-in-out border-r border-white/5 
        bg-[#05070a] shadow-2xl flex flex-col overflow-hidden
        ${sidebarOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full')}
      `}>
        <div className="p-6 flex flex-col h-full w-80">
          <div className="flex items-center justify-between mb-8">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Knowledge Repository</span>
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <label className="mb-6 cursor-pointer group">
            <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black shadow-pro">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              </div>
              <span className="font-bold text-sm tracking-tight uppercase tracking-wider">{t.newResearch}</span>
            </div>
          </label>

          <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
            <button 
              onClick={() => { setActiveView('chat'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeView === 'chat' ? 'bg-white/10 text-white shadow-pro' : 'hover:bg-white/5 text-slate-400'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span className="text-sm font-bold uppercase tracking-wide">{t.dialogue}</span>
            </button>
            <button 
              onClick={() => { setActiveView('pdf'); setSidebarOpen(false); }}
              disabled={!state.pdfUrl}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all disabled:opacity-20 ${activeView === 'pdf' ? 'bg-white/10 text-white shadow-pro' : 'hover:bg-white/5 text-slate-400'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span className="text-sm font-bold uppercase tracking-wide">{t.fullPdf}</span>
            </button>
          </nav>

          <div className="mt-auto pt-6 space-y-4 border-t border-white/5">
            <button onClick={() => { setActiveView('about'); setSidebarOpen(false); }} className="w-full text-left p-4 text-xs font-black text-white/40 hover:text-white transition-colors flex items-center gap-4 uppercase tracking-[0.3em]">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                {t.about}
            </button>
            <button onClick={() => { setActiveView('help'); setSidebarOpen(false); }} className="w-full text-left p-4 text-xs font-black text-white/40 hover:text-white transition-colors flex items-center gap-4 uppercase tracking-[0.3em]">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                {t.help}
            </button>
            <button onClick={toggleLanguage} className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Language</span>
              <span className="text-xs font-black text-white">{state.language.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative h-screen bg-[#05070a]">
        <header className="h-20 flex items-center justify-between px-8 z-20 shrink-0 border-b border-white/5">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all shadow-pro border border-white/5 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white group-hover:scale-110 transition-transform"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </button>
          
          <div className="flex flex-col items-center">
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter glow-text-violet uppercase italic">
              Knowledge AI
            </h1>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 shadow-pro">
                <span className={`h-2 w-2 rounded-full ${state.isProcessing ? 'bg-violet-500 animate-ping' : 'bg-white/10'}`}></span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">{state.status}</span>
             </div>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden flex flex-col h-full">
          {!state.pdfBase64 && activeView !== 'about' && activeView !== 'help' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-1000">
               <div className="mb-12 relative">
                  <div className="absolute -inset-10 bg-violet-600/[0.05] blur-3xl rounded-full" />
                  <h2 className="text-6xl md:text-8xl font-black text-white/90 mb-6 tracking-tighter italic">
                    The <span className="glow-text-violet">Sanctuary</span>
                  </h2>
                  <p className="text-xl md:text-2xl text-white/20 italic max-w-2xl mx-auto leading-relaxed font-bold tracking-tight">
                    "High-performance institutional research developed by Knowledge AI team"
                  </p>
               </div>
               
               <label className="group relative block cursor-pointer max-w-xl w-full">
                  <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
                  <div className="glass shadow-pro rounded-[40px] p-16 border-2 border-dashed border-white/5 hover:border-violet-500/30 transition-all duration-700 flex flex-col items-center justify-center group-hover:translate-y-[-8px]">
                    <div className="w-24 h-24 bg-white/5 rounded-[30px] flex items-center justify-center mb-8 border border-white/10 group-hover:rotate-6 transition-transform shadow-pro">
                      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    </div>
                    <h2 className="text-3xl font-black text-white mb-3 tracking-tight">{t.uploadPrompt}</h2>
                    <p className="text-white/10 text-[10px] font-black uppercase tracking-[0.5em]">Intellectual Synthesis Protocol</p>
                  </div>
                </label>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
              {activeView === 'chat' && (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  {state.axioms.length > 0 && (
                    <div className="shrink-0 max-h-[30vh] overflow-y-auto p-4 md:p-6 custom-scrollbar bg-white/[0.01] border-b border-white/5 shadow-inner">
                      <div className="max-w-7xl mx-auto">
                        <div className={`flex items-center gap-4 mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                           <h3 className="text-xs font-black uppercase tracking-[0.4em] text-white/30">{t.axiomsHeader}</h3>
                           <div className="flex-1 h-[1px] bg-white/5"></div>
                        </div>
                        <AxiomCards axioms={state.axioms} />
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-h-0 relative h-full">
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
                <div className="flex-1 p-2 md:p-8 flex flex-col items-center h-full">
                  <div className="w-full flex-1 glass rounded-[30px] overflow-hidden shadow-pro border border-white/10 relative">
                    <embed 
                      src={state.pdfUrl} 
                      type="application/pdf" 
                      className="w-full h-full rounded-[30px]"
                    />
                    <div className="absolute bottom-6 right-6 flex items-center gap-4 z-50">
                        <a 
                          href={state.pdfUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-6 py-3 bg-white/5 backdrop-blur-3xl hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-2xl transition-all"
                        >
                          {t.openInNewTab} ↗
                        </a>
                    </div>
                  </div>
                  <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-white/10 text-center max-w-xl">
                    {t.pdfError}
                  </p>
                </div>
              )}
              {(activeView === 'about' || activeView === 'help') && (
                <div className="flex-1 p-16 overflow-y-auto custom-scrollbar">
                   <div className="max-w-4xl mx-auto">
                      <h2 className="text-6xl font-black italic mb-12 glow-text-violet uppercase tracking-tighter">{activeView === 'about' ? t.about : t.help}</h2>
                      <div className="glass p-12 rounded-[40px] border border-white/10 space-y-8 text-white/40 leading-relaxed font-bold text-xl md:text-2xl shadow-pro">
                         <p>
                           {activeView === 'about' 
                             ? "Knowledge AI is an elite research infrastructure developed by the Knowledge AI team. It is designed to distill wisdom from complex academic repositories using deep analytical alignment."
                             : "The sanctuary facilitates brainstorming and organization. It is not a replacement for reading the primary text. Always maintain direct interaction with the manuscript."}
                         </p>
                      </div>
                   </div>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="h-10 flex items-center justify-center border-t border-white/5 z-10 shrink-0 bg-[#05070a]">
           <p className="text-[9px] text-white/5 font-black uppercase tracking-[0.8em]">
             {t.dev}
           </p>
        </footer>
      </main>
    </div>
  );
};

export default App;
