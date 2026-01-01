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
  const [isInitialAnalysis, setIsInitialAnalysis] = useState(false);
  const [showAxiomsOverlay, setShowAxiomsOverlay] = useState(false);

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
      synthesizing: "Neural Synthesis in Progress...",
      ready: "Sanctuary Ready",
      processing: "Processing...",
      openInNewTab: "View Full Screen",
      waitQuote: "Decoding the axiomatic structures of the manuscript...",
      covenant: "The Sanctuary Covenant: Direct reading and personal comprehension are the only paths to wisdom.",
      startChat: "Enter the Sanctuary",
      axiomsTitle: "Axiomatic Wisdom Extracted"
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
      synthesizing: "جاري التوليف العصبي...",
      ready: "الملاذ جاهز",
      processing: "معالجة...",
      openInNewTab: "فتح المخطوطة في نافذة جديدة",
      waitQuote: "فك شيفرة الهياكل البديهية للمخطوطة...",
      covenant: "عهد الملاذ: القراءة المباشرة والفهم الشخصي هما المساران الوحيدان للحكمة الحقيقية.",
      startChat: "دخول الملاذ المعرفي",
      axiomsTitle: "تم استخراج الحكمة البديهية"
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
    setIsInitialAnalysis(true);

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
    <div className={`flex h-screen w-full bg-[#05070a] text-slate-200 overflow-hidden ${isRtl ? 'flex-row-reverse' : ''}`}>
      
      {/* Sidebar Toggle Button - FIXED AND ALWAYS TOP */}
      <button 
        onClick={() => setSidebarOpen(true)}
        className={`fixed top-3 ${isRtl ? 'right-4' : 'left-4'} z-[2500] p-2.5 bg-white text-black hover:scale-110 rounded-xl transition-all shadow-[0_10px_40px_rgba(255,255,255,0.3)] flex items-center justify-center active:scale-95`}
        aria-label="Toggle Menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
      </button>

      {/* Loading Overlay */}
      {isInitialAnalysis && (
        <div className="fixed inset-0 z-[2000] bg-[#05070a] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-grid opacity-10"></div>
          <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-t-2 border-violet-500 animate-spin mb-10"></div>
          <h2 className="text-xl md:text-2xl font-black glow-text-violet uppercase tracking-widest mb-4 italic">
            {t.synthesizing}
          </h2>
          <div className="max-w-md mx-auto space-y-6">
            <div className="glass bg-violet-600/5 p-6 rounded-2xl border border-violet-500/20">
               <p className="text-xs md:text-base font-bold text-violet-300 italic">
                {t.covenant}
               </p>
            </div>
          </div>
        </div>
      )}

      {/* Axioms Flashcards Overlay */}
      {showAxiomsOverlay && state.axioms.length > 0 && (
        <div className="fixed inset-0 z-[1500] bg-[#05070a]/95 backdrop-blur-3xl flex flex-col items-center justify-center p-4 md:p-12 overflow-y-auto custom-scrollbar animate-in zoom-in duration-700">
          <div className="max-w-7xl w-full flex flex-col items-center">
            <h2 className="text-xl md:text-3xl font-black glow-text-violet uppercase tracking-[0.4em] mb-12 text-center italic">
              {t.axiomsTitle}
            </h2>
            
            <div className="w-full mb-16">
              <AxiomCards axioms={state.axioms} variant="fullscreen" />
            </div>

            <button 
              onClick={() => setShowAxiomsOverlay(false)}
              className="px-10 py-4 bg-white text-black rounded-full font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]"
            >
              {t.startChat}
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-black/80 z-[2100] transition-opacity duration-500 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`
        fixed top-0 bottom-0 ${isRtl ? 'right-0' : 'left-0'} z-[2200]
        w-[80vw] md:w-72 transition-transform duration-500 ease-in-out border-r border-white/5 
        bg-[#05070a] shadow-2xl flex flex-col overflow-hidden
        ${sidebarOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full')}
      `}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Knowledge Sanctuary</span>
            <button onClick={() => setSidebarOpen(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <label className="mb-6 cursor-pointer group">
            <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
            <div className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all">
              <div className="w-7 h-7 rounded bg-white flex items-center justify-center text-black shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              </div>
              <span className="font-black text-[9px] uppercase tracking-widest">{t.newResearch}</span>
            </div>
          </label>

          <nav className="flex-1 space-y-1">
            <button 
              onClick={() => { setActiveView('chat'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeView === 'chat' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-slate-400'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">{t.dialogue}</span>
            </button>
            <button 
              onClick={() => { setActiveView('pdf'); setSidebarOpen(false); }}
              disabled={!state.pdfUrl}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all disabled:opacity-20 ${activeView === 'pdf' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-slate-400'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">{t.fullPdf}</span>
            </button>
          </nav>

          <div className="mt-auto pt-6 border-t border-white/5">
            <button onClick={() => setState(p => ({ ...p, language: p.language === 'en' ? 'ar' : 'en' }))} className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Language</span>
              <span className="text-[9px] font-black text-white">{state.language.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#05070a]">
        {/* Header */}
        <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 z-[100] shrink-0 border-b border-white/5 bg-[#05070a]/95 backdrop-blur-xl">
          <div className="w-10 md:w-11"></div> {/* Spacer for fixed sidebar button */}
          
          <div className="flex flex-col items-center flex-1">
            <h1 className="text-lg md:text-xl font-black tracking-widest glow-text-violet uppercase italic">
              Knowledge AI
            </h1>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
            <span className={`h-1 w-1 rounded-full ${state.isProcessing ? 'bg-violet-500 animate-pulse' : 'bg-white/10'}`}></span>
            <span className="text-[8px] font-black uppercase tracking-widest text-white/40">{state.status}</span>
          </div>
        </header>

        {/* Content Viewport */}
        <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
          {!state.pdfBase64 && activeView === 'chat' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
               <h2 className="text-3xl md:text-6xl font-black text-white/90 mb-4 tracking-tighter italic">
                 The <span className="glow-text-violet">Sanctuary</span>
               </h2>
               <label className="mt-8 group cursor-pointer w-full max-w-sm">
                  <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
                  <div className="glass rounded-3xl p-8 md:p-12 border-2 border-dashed border-white/5 hover:border-violet-500/30 transition-all flex flex-col items-center bg-white/[0.01]">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <h2 className="text-xs md:text-sm font-black text-white uppercase tracking-widest">{t.uploadPrompt}</h2>
                  </div>
                </label>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {activeView === 'chat' && (
                <ChatSanctuary 
                  messages={state.chatHistory} 
                  onSendMessage={handleSendMessage} 
                  isProcessing={state.isProcessing}
                  language={state.language}
                />
              )}
              {activeView === 'pdf' && state.pdfUrl && (
                <div className="flex-1 p-2 md:p-6 flex flex-col items-center h-full min-h-0 overflow-hidden">
                  <div className="w-full h-full glass rounded-xl overflow-hidden border border-white/5 relative shadow-pro bg-white/[0.01]">
                    <iframe src={state.pdfUrl} title="PDF Manuscript" className="w-full h-full border-none" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
