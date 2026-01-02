
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
    <div className="relative my-4 group rounded-xl overflow-hidden border border-white/5 shadow-2xl">
      <div className="flex items-center justify-between px-3 py-1 bg-black/80 border-b border-white/5 text-[8px] uppercase font-black tracking-widest text-white/30">
        <div className="flex items-center gap-2">
          <Terminal size={10} className="text-violet-400" />
          <span>{language || 'code'}</span>
        </div>
        <button onClick={handleCopy} className="hover:text-white transition-colors flex items-center gap-1">
          {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={atomDark}
        customStyle={{ margin: 0, background: '#000000', padding: '1rem', fontSize: '0.8rem', lineHeight: '1.5' }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

export const ChatSanctuary: React.FC<ChatSanctuaryProps> = ({ messages, onSendMessage, isProcessing, language }) => {
  const [input, setInput] = useState('');
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

  const placeholders = {
    en: "Engage with the manuscript...",
    ar: "تفاعل مع المخطوطة..."
  };

  const FixedInputBar = (
    <div className="fixed bottom-0 left-0 right-0 z-[500] pointer-events-none">
      <div className="w-full bg-gradient-to-t from-[#05070a] via-[#05070a]/98 to-transparent pt-8 pb-4 md:pb-6 px-4 pointer-events-auto">
        <div className="max-w-7xl mx-auto w-full px-4">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-600/10 via-white/5 to-violet-600/10 rounded-[22px] blur-sm opacity-30 group-focus-within:opacity-100 transition-all duration-700"></div>
            <div className="relative bg-[#171717] rounded-[22px] p-1 flex items-center shadow-[0_10px_50px_rgba(0,0,0,0.9)] border border-white/[0.04] group-focus-within:border-white/10 transition-all duration-300">
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
                className="flex-1 bg-transparent border-none py-2 px-4 focus:outline-none text-white placeholder-zinc-700 text-[16px] font-medium resize-none min-h-[44px] max-h-[150px] custom-scrollbar"
                disabled={isProcessing}
              />
              <button 
                type="submit" 
                disabled={isProcessing || !input.trim()}
                className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center disabled:opacity-10 transition-all hover:scale-105 active:scale-95 shadow-xl shrink-0 mr-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </form>
          <div className="mt-2 text-center opacity-10">
            <p className="text-[7px] font-black text-white uppercase tracking-[0.4em]">
              Knowledge AI Sanctuary | Developed by Oussama SEBROU
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-screen relative flex flex-col bg-[#05070a] overflow-hidden">
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto px-4 md:px-12 pt-20 pb-48 custom-scrollbar scroll-smooth"
      >
        <div className="max-w-7xl mx-auto w-full flex flex-col space-y-12">
          {messages.length === 0 && (
            <div className="min-h-[50vh] flex flex-col items-center justify-center animate-in fade-in duration-1000">
               <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-white opacity-20"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
               </div>
               <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/10 italic">Sanctuary Online</h2>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isModel = msg.role === 'model';
            const isAr = isArabicText(msg.text);
            
            return (
              <div key={idx} className={`flex w-full ${isModel ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2 duration-300`}>
                <div className={`flex gap-4 md:gap-8 max-w-full w-full ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-[10px] font-black border border-white/5 shadow-lg select-none ${
                    !isModel ? 'bg-zinc-800 text-white' : 'bg-white/5 text-violet-400 border-violet-500/10'
                  }`}>
                    {isModel ? 'AI' : 'ME'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className={`prose prose-invert max-w-none text-[16px] md:text-[18px] break-words ${
                        isModel ? 'text-white leading-relaxed' : 'text-slate-200 font-medium leading-relaxed'
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
                              <code className="bg-white/5 px-1.5 py-0.5 rounded text-violet-400 font-mono text-[0.9em]" {...props}>
                                {children}
                              </code>
                            );
                          },
                          h1: ({children}) => <h1 className="text-2xl font-black mb-6 text-white border-b border-white/5 pb-2 uppercase tracking-wide">{children}</h1>,
                          h2: ({children}) => <h2 className="text-xl font-bold mb-4 text-white/90">{children}</h2>,
                          p: ({children}) => <p className="mb-6 last:mb-0">{children}</p>,
                          ul: ({children}) => <ul className="list-disc pl-6 mb-6 space-y-3">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal pl-6 mb-6 space-y-3">{children}</ol>,
                          strong: ({children}) => <strong className="text-violet-400 font-black glow-text-violet">{children}</strong>
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                      {isProcessing && idx === messages.length - 1 && !msg.text && (
                        <div className="flex gap-2 items-center mt-3">
                          <span className="w-1 h-4 bg-violet-500 animate-pulse rounded-full"></span>
                          <span className="text-[9px] font-black text-violet-500/30 uppercase tracking-widest">Synthesizing...</span>
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
