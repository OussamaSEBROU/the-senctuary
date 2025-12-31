
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
    <div className="relative my-8 group rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <div className="flex items-center justify-between px-6 py-3 bg-black/80 border-b border-white/10 text-[10px] uppercase font-black tracking-widest text-white/40">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-violet-400" />
          <span>{language || 'code'}</span>
        </div>
        <button onClick={handleCopy} className="hover:text-white transition-colors flex items-center gap-1">
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={atomDark}
        customStyle={{
          margin: 0,
          background: '#000000',
          padding: '2rem',
          fontSize: '0.95rem',
          lineHeight: '1.7',
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

export const ChatSanctuary: React.FC<ChatSanctuaryProps> = ({ messages, onSendMessage, isProcessing, language }) => {
  const [input, setInput] = useState('');
  const [showNote, setShowNote] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    if (messages.length > 0) {
      setShowNote(false);
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
    en: "Engage with the axiomatic depth...",
    ar: "تواصل مع العمق البديهي..."
  };

  const covenant = {
    en: "The Sanctuary Covenant: This engine is an intellectual facilitator, not a substitute. Direct reading and personal comprehension are the only paths to true wisdom.",
    ar: "عهد الملاذ: هذه الأداة هي ميسر فكري وليست بديلاً. القراءة المباشرة والفهم الشخصي هما المساران الوحيدان للحكمة الحقيقية."
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto px-6 pt-12 pb-20 space-y-16 custom-scrollbar scroll-smooth transition-opacity duration-700 opacity-30 hover:opacity-100"
      >
        <div className="max-w-6xl mx-auto w-full">
          {showNote && messages.length === 0 && (
            <div className="animate-in fade-in slide-in-from-top duration-700 mb-16">
              <div className="glass border-violet-500/20 bg-violet-600/5 p-10 rounded-[40px] relative group overflow-hidden shadow-pro">
                <div className="absolute top-0 right-0 p-6">
                   <button onClick={() => setShowNote(false)} className="text-white/20 hover:text-white transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                   </button>
                </div>
                <div className="flex gap-8 items-start">
                  <div className="w-14 h-14 rounded-2xl bg-violet-600/20 flex items-center justify-center shrink-0 border border-violet-500/30">
                    <ShieldCheck className="text-violet-400" size={32} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-[0.5em] text-violet-400/60 mb-4">Sanctuary Protocol</h4>
                    <p className={`text-xl font-bold leading-relaxed text-white/60 italic ${isArabicText(covenant[language]) ? 'text-right' : 'text-left'}`} dir={isArabicText(covenant[language]) ? 'rtl' : 'ltr'}>
                      {covenant[language]}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isModel = msg.role === 'model';
            const isAr = isArabicText(msg.text);
            
            return (
              <div 
                key={idx} 
                className={`flex w-full ${isModel ? 'justify-start' : 'justify-end'} animate-in fade-in duration-500 mb-12`}
              >
                <div className={`flex gap-8 max-w-full w-full ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-[10px] font-black border border-white/5 shadow-pro select-none ${
                    !isModel ? 'bg-violet-600 text-white' : 'bg-white/5 text-violet-400'
                  }`}>
                    {!isModel ? 'USR' : 'K-AI'}
                  </div>

                  <div className={`flex-1 py-1 px-2 ${isModel ? 'border-l-2 border-white/5' : ''}`}>
                    <div className={`prose prose-invert max-w-none ${isAr ? 'text-right font-bold text-2xl leading-[1.8]' : 'text-left font-medium text-xl leading-relaxed'}`} dir={isAr ? 'rtl' : 'ltr'}>
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                            ) : (
                              <code className={`${className} bg-black/40 px-3 py-1 rounded-lg text-blue-300 font-mono text-[0.9em]`} {...props}>
                                {children}
                              </code>
                            );
                          },
                          h1: ({children}) => <h1 className="text-4xl font-black mb-8 mt-12">{children}</h1>,
                          h2: ({children}) => <h2 className="text-3xl font-black mb-6 mt-10">{children}</h2>,
                          h3: ({children}) => <h3 className="text-2xl font-black mb-4 mt-8">{children}</h3>,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                      {isProcessing && idx === messages.length - 1 && !msg.text && (
                        <div className="flex gap-2 items-center mt-4">
                          <span className="w-2 h-6 bg-violet-400 animate-pulse"></span>
                          <span className="text-xs font-black text-violet-400/40 uppercase tracking-widest">Synthesizing Thought...</span>
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

      <div className="absolute bottom-0 left-0 right-0 p-1 md:p-2 bg-gradient-to-t from-[#05070a] via-[#05070a]/90 to-transparent pt-32 pointer-events-none">
        <form 
          onSubmit={handleSubmit} 
          className="relative max-w-4xl mx-auto group pointer-events-auto transition-all duration-700 opacity-20 hover:opacity-100 focus-within:opacity-100 mb-2"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/30 to-indigo-600/30 rounded-[28px] blur-md opacity-0 group-hover:opacity-30 group-focus-within:opacity-70 transition duration-700"></div>
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
              className={`w-full bg-[#0d1326]/60 backdrop-blur-3xl border border-white/10 rounded-[24px] py-4 px-8 focus:outline-none focus:border-violet-500/40 text-white placeholder-white/20 text-xl font-bold resize-none transition-all duration-300 shadow-2xl pr-20`}
              disabled={isProcessing}
            />
            <button 
              type="submit" 
              disabled={isProcessing || !input.trim()}
              className={`absolute bottom-2 right-4 p-3 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl disabled:opacity-20 transition-all shadow-pro active:scale-90`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
