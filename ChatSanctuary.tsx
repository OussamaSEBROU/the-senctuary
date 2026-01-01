
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Terminal } from 'lucide-react';
import { Message } from './types';

interface ChatSanctuaryProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isProcessing: boolean;
  language: 'en' | 'ar';
}

const isArabicText = (text: string): boolean => {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
  return arabicPattern.test(text);
};

const CodeBlock = ({ language, value }: { language: string; value: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 group rounded-xl overflow-hidden border border-slate-200 shadow-md">
      <div className="flex items-center justify-between px-3 py-1 bg-slate-50 border-b border-slate-200 text-[8px] uppercase font-black tracking-widest text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal size={10} className="text-slate-500" />
          <span>{language || 'code'}</span>
        </div>
        <button onClick={handleCopy} className="hover:text-slate-900 transition-colors flex items-center gap-1">
          {copied ? <Check size={10} className="text-green-600" /> : <Copy size={10} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={prism}
        customStyle={{ margin: 0, background: '#ffffff', padding: '1rem', fontSize: '0.8rem', lineHeight: '1.5' }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

export const ChatSanctuary: React.FC<ChatSanctuaryProps> = ({ messages, onSendMessage, isProcessing, language }) => {
  const [input, setInput] = useState('');
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendMessage(input);
      setInput('');
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgIdx(idx);
    setTimeout(() => setCopiedMsgIdx(null), 2000);
  };

  const placeholders = {
    en: "Engage with the manuscript...",
    ar: "تفاعل مع المخطوطة..."
  };

  const FixedInputBar = (
    <div className="fixed bottom-0 left-0 right-0 z-[500] pointer-events-none">
      <div className="w-full bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/98 to-transparent pt-8 pb-4 md:pb-6 px-4 pointer-events-auto">
        <div className="max-w-5xl mx-auto w-full px-4">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute -inset-[1px] bg-slate-300 rounded-[22px] blur-sm opacity-20 group-focus-within:opacity-50 transition-all duration-700"></div>
            <div className="relative bg-white rounded-[22px] p-1 flex items-center shadow-2xl border border-slate-200 group-focus-within:border-slate-400 transition-all duration-300">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                dir={isArabicText(input) ? 'rtl' : 'ltr'}
                placeholder={placeholders[language]}
                className="flex-1 bg-transparent border-none py-2 px-4 focus:outline-none text-slate-800 placeholder-slate-300 text-[16px] font-medium resize-none min-h-[44px] max-h-[150px] custom-scrollbar"
                disabled={isProcessing}
              />
              <button 
                type="submit" 
                disabled={isProcessing || !input.trim()}
                className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center disabled:opacity-20 transition-all hover:scale-105 active:scale-95 shadow-md shrink-0 mr-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </form>
          <div className="mt-2 text-center opacity-30">
            <p className="text-[7px] font-black text-slate-900 uppercase tracking-[0.4em]">
              Knowledge AI | Oussama SEBROU
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-screen relative flex flex-col overflow-hidden">
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto px-4 md:px-12 pt-16 pb-48 custom-scrollbar scroll-smooth"
      >
        <div className="max-w-5xl mx-auto w-full flex flex-col space-y-12">
          {messages.length === 0 && (
            <div className="min-h-[40vh] flex flex-col items-center justify-center animate-in fade-in duration-1000">
               <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-6 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
               </div>
               <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 italic">Sanctuary Online</h2>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isModel = msg.role === 'model';
            const isAr = isArabicText(msg.text);
            
            return (
              <div key={idx} className={`flex w-full ${isModel ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2 duration-300`}>
                <div className={`flex gap-4 md:gap-8 max-w-full w-full ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-[10px] font-black border border-slate-200 shadow-sm select-none ${
                    !isModel ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'
                  }`}>
                    {isModel ? 'AI' : 'YOU'}
                  </div>

                  <div className="flex-1 min-w-0 relative group/msg">
                    <div className={`prose max-w-none text-[16px] md:text-[17px] break-words ${
                        isModel ? 'text-slate-800 leading-relaxed' : 'text-slate-700 font-medium leading-relaxed'
                      } ${isAr ? 'text-right' : 'text-left'}`} dir={isAr ? 'rtl' : 'ltr'}>
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                            ) : (
                              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-900 font-medium" {...props}>
                                {children}
                              </code>
                            );
                          },
                          h1: ({children}) => <h1 className="text-2xl font-black mb-6 text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wide">{children}</h1>,
                          h2: ({children}) => <h2 className="text-xl font-bold mb-4 text-slate-800">{children}</h2>,
                          p: ({children}) => <p className="mb-6 last:mb-0 leading-loose">{children}</p>,
                          ul: ({children}) => <ul className="list-disc pl-6 mb-6 space-y-3">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal pl-6 mb-6 space-y-3">{children}</ol>,
                          strong: ({children}) => <strong className="text-slate-900 font-black decoration-slate-200 underline-offset-4 underline decoration-2">{children}</strong>
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                      
                      {isModel && msg.text && (
                        <button 
                          onClick={() => copyToClipboard(msg.text, idx)}
                          className="mt-6 flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-all opacity-0 group-hover/msg:opacity-100"
                        >
                          {copiedMsgIdx === idx ? <Check size={10} className="text-green-600" /> : <Copy size={10} />}
                          <span>{copiedMsgIdx === idx ? 'Wisdom Captured' : 'Copy Passage'}</span>
                        </button>
                      )}

                      {isProcessing && idx === messages.length - 1 && !msg.text && (
                        <div className="flex gap-2 items-center mt-3">
                          <span className="w-1 h-3 bg-slate-400 animate-pulse rounded-full"></span>
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Thought flowing...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} className="h-4" />
        </div>
      </div>

      {createPortal(FixedInputBar, document.body)}
    </div>
  );
};
