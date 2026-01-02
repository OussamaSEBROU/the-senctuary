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

  // Load conversations from localStorage on mount
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

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('sanctuary_conversations', JSON.stringify(state.conversations));
    } catch (e) {
      // تم إضافة هذا التنبيه من الملف الثاني للتعامل مع تجاوز حجم الذاكرة المحلية
      console.warn("LocalStorage limit reached, some conversations might not be saved.");
    }
  }, [state.conversations]);

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
      axiomsTitle: "Axiomatic Wisdom Extracted",
      previousChats: "Previous Conversations",
      noChats: "No previous chats",
      deleteChat: "Delete"
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
      axiomsTitle: "تم استخراج الحكمة البديهية",
      previousChats: "المحادثات السابقة",
      noChats: "لا توجد محادثات سابقة",
      deleteChat: "حذف"
    }
  }), []);

  const t = labels[state.language];

  // دالة رفع الملف المحدثة بحد 50 ميجابايت وتعامل أكثر أماناً
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    // تم تعديل الحد هنا ليصبح 50 ميجابايت (50 * 1024 * 1024)
    if (file.size > 50 * 1024 * 1024) {
      alert(state.language === 'ar' ? "الملف كبير جداً. الحد الأقصى هو 50 ميجابايت." : "File is too large. Maximum size is 50MB.");
      return;
    }

    const blob = new Blob([file], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    const newConvId = Date.now().toString();
    
    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      status: t.processing,
      pdfName: file.name,
      pdfUrl: blobUrl,
      axioms: [],
      chatHistory: [],
      activeConversationId: newConvId
    }));
    setIsInitialAnalysis(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        setState(prev => ({ ...prev, pdfBase64: base64 }));
        
        try {
          const axioms = await extractAxioms(base64, state.language);
          
          const newConversation: Conversation = {
            id: newConvId,
            title: state.language === 'ar' ? "محادثة جديدة في الملاذ المعرفي" : "New Conversation in the Sanctuary",
            chatHistory: [],
            pdfBase64: base64,
            pdfUrl: blobUrl,
            pdfName: file.name,
            axioms: axioms,
            timestamp: Date.now()
          };

          setState(prev => ({ 
            ...prev, 
            axioms, 
            isProcessing: false, 
            status: t.ready,
            conversations: [newConversation, ...prev.conversations]
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
      if (state.chatHistory.length === 0 && state.activeConversationId) {
        generateConversationTitle(text, state.language).then(title => {
          setState(prev => ({
            ...prev,
            conversations: prev.conversations.map(c => 
              c.id === prev.activeConversationId ? { ...c, title } : c
            )
          }));
        });
      }

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
      
      setState(prev => {
        const updatedConversations = prev.conversations.map(c => 
          c.id === prev.activeConversationId ? { ...c, chatHistory: prev.chatHistory } : c
        );
        return { ...prev, isProcessing: false, conversations: updatedConversations };
      });
    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const switchConversation = (conv: Conversation) => {
    if (state.pdfUrl) URL.revokeObjectURL(state.pdfUrl);
    
    // تم جلب تحسين معالجة الـ Base64 للملفات الكبيرة من الملف الثاني
    let blobUrl = conv.pdfUrl;
    if (conv.pdfBase64) {
      try {
        const byteCharacters = atob(conv.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        blobUrl = URL.createObjectURL(blob);
      } catch (e) {
        console.error("Failed to recreate PDF blob", e);
      }
    }

    setState(prev => ({
      ...prev,
      activeConversationId: conv.id,
      chatHistory: conv.chatHistory,
      pdfBase64: conv.pdfBase64,
      pdfUrl: blobUrl,
      pdfName: conv.pdfName,
      axioms: conv.axioms,
      status: t.ready
    }));
    setActiveView('chat');
    setSidebarOpen(false);
  };

  const deleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setState(prev => {
      const newConversations = prev.conversations.filter(c => c.id !== id);
      const isActive = prev.activeConversationId === id;
      
      if (isActive) {
        return {
          ...prev,
          conversations: newConversations,
          activeConversationId: null,
          chatHistory: [],
          pdfBase64: null,
          pdfUrl: null,
          pdfName: null,
          axioms: []
        };
      }
      return { ...prev, conversations: newConversations };
    });
  };

  const isRtl = state.language === 'ar';

  return (
    <div className={`flex h-screen w-full bg-[#05070a] text-slate-200 overflow-hidden ${isRtl ? 'flex-row-reverse' : ''}`}>
      
      {/* Sidebar Toggle Button - FIXED AND ALWAYS TOP AT Z-4000 */}
      <button 
        onClick={() => setSidebarOpen(true)}
        className={`fixed top-4 ${isRtl ? 'right-4' : 'left-4'} z-[4000] p-3 bg-white text-black hover:scale-110 rounded-2xl transition-all shadow-[0_10px_40px_rgba(255,255,255,0.4)] flex items-center justify-center active:scale-90 active:bg-violet-500 active:text-white`}
        aria-label="Toggle Menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
      </button>

      {/* Loading Overlay */}
      {isInitialAnalysis && (
        <div className="fixed inset-0 z-[2000] bg-[#05070a] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-grid opacity-10"></div>
          <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-t-2 border-violet-500 animate-spin mb-10"></div>
          <h2 className="text-xl md:text-2xl font-black glow-text-violet uppercase tracking-widest mb-4 italic">
            {t.synthesizing}
          </h2>
          <p className="text-slate-400 max-w-md italic font-serif leading-relaxed">
            "{t.waitQuote}"
          </p>
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 ${isRtl ? 'right-0' : 'left-0'} z-[5000] w-80 bg-[#0a0c10] border-${isRtl ? 'l' : 'r'} border-white/5 transform ${sidebarOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full')} transition-transform duration-500 ease-out shadow-2xl flex flex-col`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-black uppercase tracking-widest text-xs text-white/40 italic">{t.previousChats}</h2>
          <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          <button 
            onClick={() => {
              setState(prev => ({
                ...prev,
                activeConversationId: null,
                chatHistory: [],
                pdfBase64: null,
                pdfUrl: null,
                pdfName: null,
                axioms: []
              }));
              setSidebarOpen(false);
            }}
            className="w-full p-4 rounded-xl border border-dashed border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all text-left flex items-center gap-3 group"
          >
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            </div>
            <span className="font-bold text-sm">{t.newResearch}</span>
          </button>

          {state.conversations.length === 0 ? (
            <div className="py-10 text-center text-white/20 italic text-sm">{t.noChats}</div>
          ) : (
            state.conversations.map((conv) => (
              <div 
                key={conv.id}
                onClick={() => switchConversation(conv)}
                className={`group relative w-full p-4 rounded-xl border transition-all cursor-pointer ${state.activeConversationId === conv.id ? 'bg-white/5 border-white/10' : 'border-transparent hover:bg-white/5'}`}
              >
                <div className="flex flex-col gap-1">
                  <h3 className="font-bold text-sm text-slate-200 line-clamp-1 pr-8">{conv.title}</h3>
                  <p className="text-[10px] text-white/30 font-mono uppercase tracking-tighter">
                    {conv.pdfName} • {new Date(conv.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <button 
                  onClick={(e) => deleteConversation(e, conv.id)}
                  className="absolute top-4 right-4 p-1.5 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-white/5 space-y-4">
          <div className="flex items-center justify-between gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
            <button 
              onClick={() => setState(prev => ({ ...prev, language: 'en' }))}
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${state.language === 'en' ? 'bg-white text-black shadow-xl' : 'text-white/40 hover:text-white'}`}
            >
              English
            </button>
            <button 
              onClick={() => setState(prev => ({ ...prev, language: 'ar' }))}
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${state.language === 'ar' ? 'bg-white text-black shadow-xl' : 'text-white/40 hover:text-white'}`}
            >
              العربية
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-6 md:px-10 bg-[#05070a]/80 backdrop-blur-xl z-30">
          <div className="flex items-center gap-4 md:gap-8 overflow-hidden">
            <div className="hidden md:flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-black shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-black tracking-tighter uppercase italic leading-none">The Sanctuary</h1>
                <span className="text-[8px] font-mono text-white/30 uppercase tracking-[0.3em]">Neural Knowledge Engine</span>
              </div>
            </div>

            {state.pdfName && (
              <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/5 max-w-[200px] md:max-w-md">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></div>
                <span className="text-xs font-bold truncate text-slate-300 italic">{state.pdfName}</span>
              </div>
            )}
          </div>

          <nav className="flex items-center gap-1 md:gap-2">
            <button 
              onClick={() => setActiveView('chat')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'chat' ? 'bg-white text-black' : 'text-white/40 hover:bg-white/5'}`}
            >
              {t.dialogue}
            </button>
            <button 
              onClick={() => setActiveView('pdf')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'pdf' ? 'bg-white text-black' : 'text-white/40 hover:bg-white/5'}`}
            >
              {t.fullPdf}
            </button>
          </nav>
        </header>

        {/* View Content */}
        <div className="flex-1 relative overflow-hidden">
          {!state.pdfBase64 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="absolute inset-0 bg-grid opacity-5"></div>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <label className="relative flex flex-col items-center justify-center w-64 h-64 md:w-80 md:h-80 rounded-3xl border-2 border-dashed border-white/10 bg-black/40 hover:bg-black/60 hover:border-white/20 transition-all cursor-pointer group">
                  <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-black mb-6 group-hover:scale-110 transition-transform shadow-2xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                  </div>
                  <span className="text-sm font-black uppercase tracking-widest mb-2">{t.uploadPrompt}</span>
                  {/* تم تحديث النص الإرشادي هنا ليظهر 50MB */}
                  <span className="text-[10px] text-white/30 font-mono uppercase tracking-tighter">PDF Manuscripts Only • Max 50MB</span>
                  <input type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
                </label>
              </div>
              
              <p className="mt-12 text-slate-500 max-w-sm text-xs font-serif italic leading-relaxed opacity-50">
                {t.covenant}
              </p>
            </div>
          ) : (
            <>
              {activeView === 'chat' && (
                <div className="h-full flex flex-col md:flex-row overflow-hidden">
                  <div className="flex-1 h-full relative">
                    <ChatSanctuary 
                      messages={state.chatHistory}
                      onSendMessage={handleSendMessage}
                      isProcessing={state.isProcessing}
                      language={state.language}
                    />
                  </div>
                  
                  <div className="hidden xl:block w-96 border-l border-white/5 bg-black/20 overflow-y-auto custom-scrollbar">
                    <div className="p-8">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-1 h-6 bg-violet-500 rounded-full"></div>
                        <h2 className="font-black uppercase tracking-widest text-xs italic">{t.axiomsHeader}</h2>
                      </div>
                      <AxiomCards axioms={state.axioms} language={state.language} />
                    </div>
                  </div>
                </div>
              )}

              {activeView === 'pdf' && (
                <div className="h-full flex flex-col">
                  <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{t.activeDoc}: {state.pdfName}</span>
                    <a 
                      href={state.pdfUrl || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] font-black uppercase tracking-widest text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-2"
                    >
                      {t.openInNewTab}
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                    </a>
                  </div>
                  <div className="flex-1 bg-[#0a0c10]">
                    <ManuscriptViewer url={state.pdfUrl || ''} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {showAxiomsOverlay && (
          <div className="fixed inset-0 z-[3000] bg-[#05070a]/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in zoom-in duration-500">
            <div className="max-w-4xl w-full max-h-[80vh] flex flex-col">
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl text-black mb-6 shadow-[0_0_50px_rgba(255,255,255,0.3)]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
                </div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic mb-4">{t.axiomsTitle}</h2>
                <p className="text-slate-400 font-serif italic">{state.pdfName}</p>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar px-4">
                <AxiomCards axioms={state.axioms} language={state.language} />
              </div>
              
              <div className="mt-12 text-center">
                <button 
                  onClick={() => setShowAxiomsOverlay(false)}
                  className="px-10 py-4 bg-white text-black font-black uppercase tracking-[0.2em] italic rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.2)]"
                >
                  {t.startChat}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
