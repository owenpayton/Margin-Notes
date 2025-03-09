import React, { RefObject } from 'react';
import { PDFDocumentProxy, Note } from './types';

interface PDFViewerProps {
  pdfDoc: PDFDocumentProxy | null;
  currentPage: number;
  canvasRef: RefObject<HTMLCanvasElement>;
  pdfContainerRef: RefObject<HTMLDivElement>;
  handlePdfClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  isFileLoaded: boolean;
  totalPages: number;
  notes: Note[];
  scale: number;
  activeNoteId: string | null;
  setActiveNoteId?: (id: string | null) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfDoc,
  currentPage,
  canvasRef,
  pdfContainerRef,
  handlePdfClick,
  isFileLoaded,
  totalPages,
  notes,
  scale,
  activeNoteId,
  setActiveNoteId
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

  // Filter notes for the current page
  const currentPageNotes = notes.filter(note => note.pageNumber === currentPage);

  // Handle clicking on a note indicator
  const handleIndicatorClick = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation(); // Prevent triggering handlePdfClick
    if (setActiveNoteId) {
      setActiveNoteId(noteId);
      
      // Scroll the corresponding note into view if possible
      setTimeout(() => {
        const noteElement = document.getElementById(`note-${noteId}`);
        if (noteElement) {
          noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  };

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
                <>
                  <canvas ref={canvasRef} />
                  
                  {/* Note Indicators */}
                  {currentPageNotes.map((note) => {
                    // Extract color class from note.color (e.g., "bg-amber-100 border-amber-300" -> "amber")
                    const colorMatch = note.color.match(/bg-(\w+)-\d+/);
                    const colorName = colorMatch ? colorMatch[1] : 'amber';
                    
                    // Determine if this note is active (recently created)
                    const isActive = note.id === activeNoteId;
                    
                    // Determine if the note is empty
                    const isEmpty = !note.content.trim();
                    
                    return (
                      <div
                        key={note.id}
                        className={`absolute pointer-events-auto select-none 
                                   transition-all duration-300 z-20
                                   ${isActive ? 'animate-bounce-subtle' : ''}
                                   ${isEmpty ? 'opacity-70 hover:opacity-100' : 'opacity-100'}`}
                        style={{
                          left: '-16px',
                          top: `${note.yPosition * scale}px`,
                          transform: 'translateY(-50%)'
                        }}
                        onClick={(e) => handleIndicatorClick(e, note.id)}
                      >
                        {/* Speech bubble indicator */}
                        <div className={`relative flex items-center group`}>
                          <div 
                            className={`
                              h-7 w-7 rounded-full flex items-center justify-center
                              border shadow-sm cursor-pointer
                              text-${colorName}-800 bg-${colorName}-100 border-${colorName}-300
                              ${isActive ? `ring-2 ring-${colorName}-400 scale-110` : ''}
                              ${isEmpty ? 'animate-pulse-slow' : ''}
                              transition-all duration-300 ease-in-out
                              hover:scale-110 hover:shadow-md
                              backdrop-blur-sm backdrop-saturate-150
                            `}
                            title="Click to open this note"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                            </svg>

                            {/* Small dot for unread/empty notes */}
                            {isEmpty && (
                              <div className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-${colorName}-500 border border-${colorName}-300`}></div>
                            )}
                          </div>
                          {/* Connecting line */}
                          <div className={`h-px w-3 bg-${colorName}-300 transition-all duration-300 group-hover:w-5`}></div>
                          
                          {/* Preview tooltip on hover */}
                          <div className={`absolute left-10 -top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30 transform scale-0 group-hover:scale-100`}>
                            <div className={`bg-${colorName}-50 border border-${colorName}-200 rounded-md shadow-sm p-2 max-w-[200px] text-xs text-${colorName}-900 backdrop-blur-sm transition-transform duration-200 origin-left`}>
                              {isEmpty 
                                ? <span className="italic text-stone-400">Empty note - click to edit</span>
                                : note.content.length > 60 
                                  ? note.content.substring(0, 60) + '...' 
                                  : note.content}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
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