import React, { useState, useRef, useEffect } from 'react';
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
    <div className="relative my-4 group rounded-xl overflow-hidden border border-white/10 shadow-lg">
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/80 border-b border-white/10 text-[8px] uppercase font-black tracking-widest text-white/40">
        <div className="flex items-center gap-1.5">
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
        customStyle={{
          margin: 0,
          background: '#000000',
          padding: '1rem',
          fontSize: '0.8rem',
          lineHeight: '1.5',
        }}
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

  const placeholders = {
    en: "Engage deep wisdom...",
    ar: "تواصل مع العمق الفكري..."
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-28 space-y-8 custom-scrollbar scroll-smooth"
      >
        <div className="max-w-4xl mx-auto w-full">
          {messages.map((msg, idx) => {
            const isModel = msg.role === 'model';
            const isAr = isArabicText(msg.text);
            
            return (
              <div 
                key={idx} 
                className={`flex w-full ${isModel ? 'justify-start' : 'justify-end'} animate-in fade-in duration-500 mb-6`}
              >
                <div className={`flex gap-3 md:gap-6 max-w-[98%] md:max-w-full ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex-shrink-0 flex items-center justify-center text-[7px] md:text-[9px] font-black border border-white/5 shadow-pro select-none ${
                    !isModel ? 'bg-violet-600 text-white' : 'bg-white/5 text-violet-400'
                  }`}>
                    {isModel ? 'K-AI' : 'USR'}
                  </div>

                  <div className={`flex-1 min-w-0 ${isModel ? 'border-l border-white/5 pl-3 md:pl-5' : ''}`}>
                    <div className={`prose prose-invert max-w-none opacity-100 ${isAr ? 'text-right font-bold text-base md:text-lg leading-relaxed' : 'text-left font-medium text-sm md:text-base leading-relaxed'}`} dir={isAr ? 'rtl' : 'ltr'}>
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                            ) : (
                              <code className="bg-white/5 px-1.5 py-0.5 rounded text-violet-300 font-mono text-[0.85em]" {...props}>
                                {children}
                              </code>
                            );
                          },
                          h1: ({children}) => <h1 className="text-lg md:text-xl font-black mb-3">{children}</h1>,
                          h2: ({children}) => <h2 className="text-base md:text-lg font-black mb-2">{children}</h2>,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                      {isProcessing && idx === messages.length - 1 && !msg.text && (
                        <div className="flex gap-1.5 items-center mt-2">
                          <span className="w-1 h-3 bg-violet-500 animate-pulse"></span>
                          <span className="text-[8px] font-black text-violet-500/30 uppercase tracking-widest">Processing...</span>
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

      {/* Action Zone - More Solid and Always Visible */}
      <div className="absolute bottom-0 left-0 right-0 p-3 md:p-6 bg-gradient-to-t from-[#05070a] via-[#05070a]/98 to-transparent pt-20 pointer-events-none z-20">
        <form 
          onSubmit={handleSubmit} 
          className="relative max-w-3xl mx-auto group pointer-events-auto transition-all duration-300 opacity-100"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 rounded-[22px] blur-sm opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
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
              className="w-full bg-[#0d1326] border border-white/20 rounded-[20px] py-4 px-6 focus:outline-none focus:border-violet-500 text-white placeholder-white/20 text-sm md:text-lg font-bold resize-none shadow-2xl pr-14 md:pr-16"
              disabled={isProcessing}
            />
            <button 
              type="submit" 
              disabled={isProcessing || !input.trim()}
              className="absolute right-2 top-2 md:right-3 md:top-3 p-2 md:p-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl disabled:opacity-20 transition-all shadow-lg active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
