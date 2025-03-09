import React, { RefObject } from 'react';
import { PDFDocumentProxy } from './types';

interface PDFViewerProps {
  pdfDoc: PDFDocumentProxy | null;
  currentPage: number;
  canvasRef: RefObject<HTMLCanvasElement>;
  pdfContainerRef: RefObject<HTMLDivElement>;
  handlePdfClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  isFileLoaded: boolean;
  totalPages: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfDoc,
  currentPage,
  canvasRef,
  pdfContainerRef,
  handlePdfClick,
  isFileLoaded,
  totalPages
}) => {
  if (!isFileLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full space-y-4 p-8 text-center">
        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center border-2 border-amber-300">
          <span className="text-3xl text-amber-800">PDF</span>
        </div>
        <h2 className="text-xl font-medium text-stone-700">No PDF Open</h2>
        <p className="text-stone-500 max-w-md">
          Click the "Open PDF" button to upload a local PDF file and start taking margin notes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 relative">
      <div 
        ref={pdfContainerRef} 
        className="absolute inset-0 overflow-auto cursor-text bg-stone-100"
        onClick={handlePdfClick}
      >
        <div className="p-4 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 pointer-events-none bg-grain opacity-5 z-10 rounded"></div>
            <div className="relative bg-white p-2 shadow-md rounded inline-block">
              {pdfDoc ? (
                <canvas ref={canvasRef} />
              ) : (
                <div className="flex items-center justify-center" style={{ height: "500px", width: "400px" }}>
                  <div className="text-center text-stone-400">
                    <p className="text-2xl font-medium mb-2">Demo Mode</p>
                    <p className="text-lg">Page {currentPage} of {totalPages}</p>
                    <p className="mt-6 text-sm">Click anywhere to add a note</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer; 