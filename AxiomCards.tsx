import React from 'react';
import { Axiom } from './types';

interface AxiomCardsProps {
  axioms: Axiom[];
}

export const AxiomCards: React.FC<AxiomCardsProps> = ({ axioms }) => {
  if (axioms.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 md:gap-4 perspective-1000 transition-all duration-700 opacity-30 hover:opacity-100 group/container">
      {axioms.map((item, idx) => (
        <div key={idx} className="group h-28 md:h-36 relative transition-all duration-500 hover:scale-[1.03]">
          <div className="w-full h-full card-inner cursor-pointer shadow-pro rounded-xl">
            {/* Front Side */}
            <div className="absolute inset-0 backface-hidden glass rounded-xl p-2.5 flex flex-col items-center justify-center text-center border-t border-white/10 overflow-hidden">
              <span className="text-violet-400/30 text-[6px] font-black tracking-[0.2em] uppercase mb-1">AXIOM {idx + 1}</span>
              <h3 className="text-[8px] md:text-[10px] font-black text-white leading-tight uppercase px-0.5 line-clamp-3">
                {item.axiom}
              </h3>
            </div>
            
            {/* Back Side */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 glass bg-violet-950/30 rounded-xl p-2.5 flex flex-col items-center justify-center text-center border border-white/10 overflow-hidden">
              <div className="w-full h-full overflow-y-auto custom-scrollbar flex items-center justify-center">
                <p className="italic text-[7px] md:text-[9px] text-white/60 leading-tight font-bold px-0.5">
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
