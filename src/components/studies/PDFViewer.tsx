import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Download, AlertCircle, RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface PDFViewerProps {
  pdfUrl: string;
  title?: string;
}

export function PDFViewer({ pdfUrl, title }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  // Load PDF document
  useEffect(() => {
    let cancelled = false;

    const loadPdf = async () => {
      setLoading(true);
      setError(null);

      try {
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/cmaps/',
          cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        
        if (!cancelled) {
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setPageNum(1);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error loading PDF:', err);
        if (!cancelled) {
          setError(err.message || 'Erro ao carregar PDF');
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  // Render current page
  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdfDoc || !canvasRef.current || rendering) return;

    setRendering(true);

    try {
      const page = await pdfDoc.getPage(pageNumber);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      // Calculate scale based on container width
      const containerWidth = containerRef.current?.clientWidth || 800;
      const viewport = page.getViewport({ scale: 1 });
      const scaleToFit = (containerWidth - 40) / viewport.width;
      const finalScale = scaleToFit * scale;
      
      const scaledViewport = page.getViewport({ scale: finalScale });

      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
      };

      await page.render(renderContext).promise;
    } catch (err: any) {
      console.error('Error rendering page:', err);
      toast.error('Erro ao renderizar página');
    } finally {
      setRendering(false);
    }
  }, [pdfDoc, scale, rendering]);

  // Render when page or scale changes
  useEffect(() => {
    if (pdfDoc && !loading) {
      renderPage(pageNum);
    }
  }, [pdfDoc, pageNum, scale, loading, renderPage]);

  // Navigation handlers
  const goToPrevPage = () => {
    if (pageNum > 1) {
      setPageNum(pageNum - 1);
    }
  };

  const goToNextPage = () => {
    if (pageNum < numPages) {
      setPageNum(pageNum + 1);
    }
  };

  // Zoom handlers
  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  // Download handler
  const downloadPdf = () => {
    window.open(pdfUrl, '_blank');
  };

  // Fallback handler
  const openInNewTab = () => {
    window.open(pdfUrl, '_blank');
    toast.info('PDF aberto em nova aba');
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-full space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  // Error state with fallback
  if (error) {
    return (
      <div className="w-full border rounded-lg bg-muted/20 p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
        <div>
          <h3 className="font-medium text-foreground">Não foi possível carregar o PDF</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
          <Button onClick={openInNewTab}>
            <Download className="w-4 h-4 mr-2" />
            Abrir em Nova Aba
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border">
        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToPrevPage} 
            disabled={pageNum <= 1 || rendering}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[100px] text-center">
            Página {pageNum} de {numPages}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToNextPage} 
            disabled={pageNum >= numPages || rendering}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={zoomOut} 
            disabled={scale <= 0.5 || rendering}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={zoomIn} 
            disabled={scale >= 3 || rendering}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        {/* Download button */}
        <Button variant="outline" size="sm" onClick={downloadPdf}>
          <Download className="w-4 h-4 mr-2" />
          Baixar PDF
        </Button>
      </div>

      {/* PDF Canvas */}
      <div 
        ref={containerRef}
        className="w-full overflow-auto border rounded-lg bg-muted/10 flex justify-center p-4"
        style={{ maxHeight: '70vh' }}
      >
        {rendering && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <canvas 
          ref={canvasRef} 
          className="shadow-lg"
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );
}
