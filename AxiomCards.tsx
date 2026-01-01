
import React from 'react';
import { Axiom } from './types';

interface AxiomCardsProps {
  axioms: Axiom[];
  variant?: 'fullscreen' | 'embedded';
}

export const AxiomCards: React.FC<AxiomCardsProps> = ({ axioms, variant = 'embedded' }) => {
  if (axioms.length === 0) return null;

  const containerClasses = variant === 'fullscreen'
    ? "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-8 w-full perspective-2000"
    : "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 md:gap-4 perspective-1000 opacity-40 hover:opacity-100 transition-all duration-700";

  const cardHeight = variant === 'fullscreen' ? "h-32 sm:h-48 md:h-64" : "h-24 md:h-36";

  return (
    <div className={containerClasses}>
      {axioms.map((item, idx) => (
        <div key={idx} className={`group ${cardHeight} relative transition-all duration-500 hover:scale-[1.05]`}>
          <div className="w-full h-full card-inner cursor-pointer shadow-pro rounded-xl md:rounded-2xl">
            {/* Front Side */}
            <div className="absolute inset-0 backface-hidden glass rounded-xl md:rounded-2xl p-3 md:p-6 flex flex-col items-center justify-center text-center border-t border-white/10 overflow-hidden bg-white/[0.02]">
              <span className="text-violet-500/40 text-[6px] md:text-[8px] font-black tracking-[0.3em] uppercase mb-1 md:mb-3">AXIOM {idx + 1}</span>
              <h3 className="text-[8px] md:text-[14px] font-black text-white leading-tight uppercase px-1 line-clamp-4">
                {item.axiom}
              </h3>
            </div>
            
            {/* Back Side */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 glass bg-violet-900/20 rounded-xl md:rounded-2xl p-3 md:p-6 flex flex-col items-center justify-center text-center border border-violet-500/20 overflow-hidden">
              <div className="w-full h-full overflow-y-auto custom-scrollbar flex items-center justify-center">
                <p className="italic text-[7px] md:text-[12px] text-white/80 leading-snug md:leading-relaxed font-bold px-1">
                  {item.definition}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
 
