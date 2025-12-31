
import React from 'react';
import { Axiom } from '../types';

interface AxiomCardsProps {
  axioms: Axiom[];
}

export const AxiomCards: React.FC<AxiomCardsProps> = ({ axioms }) => {
  if (axioms.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 perspective-2000 transition-opacity duration-700 opacity-20 hover:opacity-100 group/container">
      {axioms.map((item, idx) => (
        <div key={idx} className="group h-48 relative transition-all duration-500 hover:scale-105">
          <div className="w-full h-full card-inner cursor-pointer shadow-pro rounded-2xl">
            {/* Front Side - Key Point / Title */}
            <div className="absolute inset-0 backface-hidden glass rounded-2xl p-4 flex flex-col items-center justify-center text-center border-t border-white/10 overflow-hidden">
              <span className="text-violet-400/30 text-[9px] font-black tracking-[0.3em] uppercase mb-2">AXIOM {idx + 1}</span>
              <h3 className="text-xs md:text-sm font-black text-white leading-tight uppercase px-2 line-clamp-3">
                {item.axiom}
              </h3>
              <div className="mt-4 w-8 h-[1px] bg-violet-500/20"></div>
            </div>
            
            {/* Back Side - Summary */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 glass bg-violet-950/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-white/10 overflow-hidden">
              <div className="w-full h-full overflow-y-auto custom-scrollbar flex items-center justify-center">
                <p className="italic text-[10px] md:text-xs text-white/80 leading-relaxed font-bold px-1">
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
