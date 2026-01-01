
import React, { useEffect, useRef, useState } from 'react';

interface ManuscriptViewerProps {
  base64: string | null;
}

export const ManuscriptViewer: React.FC<ManuscriptViewerProps> = ({ base64 }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);

  useEffect(() => {
    if (!base64) return;

    const loadPdf = async () => {
      setLoading(true);
      try {
        const pdfjsLib = await import('https://esm.sh/pdfjs-dist@4.10.38');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument({ data: atob(base64) });
        const pdf = await loadingTask.promise;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (error) {
        console.error("Error loading PDF with pdf.js:", error);
        setLoading(false);
      }
    };

    loadPdf();
  }, [base64]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory bg-[#0a0f1d] flex flex-row items-center gap-4 md:gap-12 px-8 md:px-[20vw] custom-scrollbar scroll-smooth"
    >
      {loading && (
        <div className="flex-shrink-0 w-full h-full flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
          <p className="text-violet-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Initializing Manuscript...</p>
        </div>
      )}
      
      {!loading && Array.from({ length: numPages }, (_, i) => (
        <PageRenderer key={i} pdfDoc={pdfDocRef.current} pageNum={i + 1} />
      ))}
    </div>
  );
};

const PageRenderer: React.FC<{ pdfDoc: any, pageNum: number }> = ({ pdfDoc, pageNum }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '0px 200px 0px 200px'
      }
    );

    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current!;
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context!,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    };

    renderPage();
  }, [isVisible, pdfDoc, pageNum]);

  return (
    <div className="relative group h-[75vh] md:h-[85vh] flex-shrink-0 snap-center shadow-[0_30px_100px_-20px_rgba(0,0,0,0.9)] border border-white/5 rounded-sm overflow-hidden bg-zinc-900 transition-all duration-700 hover:scale-[1.02] flex items-center justify-center">
      <canvas 
        ref={canvasRef} 
        className="h-full w-auto block object-contain bg-white" 
      />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl px-4 py-1.5 rounded-full text-[10px] font-black text-white/60 opacity-0 group-hover:opacity-100 transition-all duration-300 uppercase tracking-[0.2em] border border-white/10 shadow-2xl">
        {pageNum} / {pdfDoc?.numPages || '?'}
      </div>
    </div>
  );
};
 
