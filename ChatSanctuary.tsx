import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Terminal, ShieldCheck } from 'lucide-react';
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
    <div className="relative my-4 group rounded-xl overflow-hidden border border-white/10">
      <div className="flex items-center justify-between px-4 py-2 bg-black/80 border-b border-white/10 text-[9px] uppercase font-black tracking-widest text-white/40">
        <span>{language || 'code'}</span>
        <button onClick={handleCopy} className="hover:text-white transition-colors">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={atomDark}
        customStyle={{ margin: 0, background: '#000000', padding: '1rem', fontSize: '0.85rem' }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

export const ChatSanctuary: React.FC<ChatSanctuaryProps> = ({ messages, onSendMessage, isProcessing, language }) => {
  const [input, setInput] = useState('');
  const [isGhostMode, setIsGhostMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Transition to ghost mode after the first exchange
  useEffect(() => {
    if (messages.length > 1) {
      setIsGhostMode(true);
    } else {
      setIsGhostMode(false);
    }
  }, [messages.length]);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendMessage(input);
      setInput('');
    }
  };

  const placeholders = { en: "Engage deep wisdom...", ar: "تواصل مع الحكمة..." };
  const visibilityClass = isGhostMode 
    ? "opacity-10 md:opacity-20 hover:opacity-100 transition-opacity duration-1000" 
    : "opacity-100 transition-opacity duration-500";

  return (
    <div className="flex flex-col h-full w-full relative">
      <div 
        ref={scrollRef} 
        className={`flex-1 overflow-y-auto px-4 md:px-6 pt-10 pb-32 space-y-10 custom-scrollbar scroll-smooth ${visibilityClass}`}
      >
        <div className="max-w-4xl mx-auto w-full">
          {messages.length === 0 && (
            <div className="animate-in fade-in slide-in-from-bottom duration-1000">
               <div className="glass bg-violet-600/5 p-8 rounded-[30px] border border-violet-500/10 flex flex-col items-center text-center">
                 <ShieldCheck className="text-violet-500/40 mb-4" size={40} />
                 <p className="text-sm md:text-lg font-bold text-white/40 italic leading-relaxed max-w-lg">
                   {language === 'ar' ? 'عهد الملاذ: القراءة المباشرة والفهم الشخصي هما المساران الوحيدان للحكمة الحقيقية.' : 'The Sanctuary Covenant: Direct reading and personal comprehension are the only paths to wisdom.'}
                 </p>
               </div>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isModel = msg.role === 'model';
            const isAr = isArabicText(msg.text);
            
            return (
              <div 
                key={idx} 
                className={`flex w-full ${isModel ? 'justify-start' : 'justify-end'} animate-in fade-in duration-500 mb-8`}
              >
                <div className={`flex gap-3 md:gap-6 max-w-[95%] md:max-w-full ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-[8px] font-black border border-white/5 ${
                    !isModel ? 'bg-violet-600 text-white' : 'bg-white/5 text-violet-400'
                  }`}>
                    {isModel ? 'K-AI' : 'USR'}
                  </div>

                  <div className={`flex-1 min-w-0 ${isModel ? 'border-l border-white/5 pl-4 md:pl-6' : ''}`}>
                    <div className={`prose prose-invert max-w-none ${isAr ? 'text-right font-bold text-lg md:text-xl' : 'text-left font-medium text-base md:text-lg'}`} dir={isAr ? 'rtl' : 'ltr'}>
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                            ) : (
                              <code className="bg-white/5 px-2 py-0.5 rounded text-violet-300 font-mono text-[0.85em]" {...props}>
                                {children}
                              </code>
                            );
                          },
                          h1: ({children}) => <h1 className="text-2xl font-black mb-4">{children}</h1>,
                          h2: ({children}) => <h2 className="text-xl font-black mb-3">{children}</h2>,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                      {isProcessing && idx === messages.length - 1 && !msg.text && (
                        <div className="flex gap-1.5 items-center mt-3">
                          <span className="w-1.5 h-4 bg-violet-500 animate-pulse"></span>
                          <span className="text-[9px] font-black text-violet-500/40 uppercase tracking-widest">Synthesizing...</span>
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

      {/* Responsive Action Zone */}
      <div className="absolute bottom-0 left-0 right-0 p-3 md:p-6 bg-gradient-to-t from-[#05070a] via-[#05070a]/80 to-transparent pt-20 pointer-events-none">
        <form 
          onSubmit={handleSubmit} 
          className="relative max-w-4xl mx-auto group pointer-events-auto transition-all duration-700 opacity-30 focus-within:opacity-100 hover:opacity-100"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 rounded-[22px] blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
          <div className="relative">
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
              className="w-full bg-[#0d1326]/80 backdrop-blur-3xl border border-white/10 rounded-[20px] py-4 px-6 focus:outline-none focus:border-violet-500/40 text-white placeholder-white/10 text-base md:text-xl font-bold resize-none shadow-2xl pr-16"
              disabled={isProcessing}
            />
            <button 
              type="submit" 
              disabled={isProcessing || !input.trim()}
              className="absolute right-2.5 top-2.5 p-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl disabled:opacity-20 transition-all active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
