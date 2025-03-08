import React, { useState, useEffect, useRef, useCallback } from 'react';

// For PDF.js loading
const pdfjsVersion = '3.4.120';

// Note colors (warm palette)
const NOTE_COLORS = ['bg-amber-100 border-amber-300', 'bg-rose-100 border-rose-300', 'bg-orange-100 border-orange-300', 'bg-stone-100 border-stone-300', 'bg-yellow-100 border-yellow-300'];

// Slight rotations for notes
const NOTE_ROTATIONS = ['-rotate-1', 'rotate-1', '-rotate-0.5', 'rotate-0.5', 'rotate-0'];

// Define types for our application
interface Note {
  id: string;
  pageNumber: number;
  yPosition: number;
  content: string;
  createdAt: string;
  updatedAt?: string;
  color: string;
  rotation: string;
  isEditing: boolean;
  hasCloze?: boolean;
}

interface PDFDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
}

interface PDFPageProxy {
  getViewport: (options: { scale: number }) => PDFViewport;
  render: (renderContext: PDFRenderContext) => { promise: Promise<void> };
}

interface PDFViewport {
  height: number;
  width: number;
}

interface PDFRenderContext {
  canvasContext: CanvasRenderingContext2D;
  viewport: PDFViewport;
}

declare global {
  interface Window {
    pdfjsLib: {
      getDocument: (options: { data: Uint8Array }) => { promise: Promise<PDFDocumentProxy> };
      GlobalWorkerOptions: {
        workerSrc: string;
      };
    };
  }
}

const PDFMarginNotes: React.FC = () => {
  // State
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFileLoaded, setIsFileLoaded] = useState<boolean>(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isPdfLibReady, setIsPdfLibReady] = useState<boolean>(false);
  const [showAnkiModal, setShowAnkiModal] = useState<boolean>(false);
  const [selectedNotesForAnki, setSelectedNotesForAnki] = useState<string[]>([]);
  const [clozeCounter, setClozeCounter] = useState<number>(1);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importNotesRef = useRef<HTMLInputElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const notesContainerRef = useRef<HTMLDivElement>(null);

  // Custom styles for components
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      textarea {
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
        -webkit-appearance: none !important;
      }
      textarea:focus {
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
        -webkit-appearance: none !important;
      }
      .bg-grain {
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        opacity: 0.1;
      }
      .anki-cloze {
        background-color: rgba(66, 153, 225, 0.2);
        border-radius: 3px;
        padding: 0 2px;
        margin: 0 1px;
        border-bottom: 2px dashed rgba(66, 153, 225, 0.6);
        position: relative;
      }
      .anki-cloze-number {
        position: absolute;
        top: -10px;
        right: -5px;
        background-color: rgba(66, 153, 225, 0.9);
        color: white;
        border-radius: 50%;
        width: 14px;
        height: 14px;
        font-size: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Load PDF.js from CDN
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.min.js`;
    script.async = true;
    
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;
      setIsPdfLibReady(true);
    };
    
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Handle file upload
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a valid PDF file');
      return;
    }

    if (!isPdfLibReady) {
      setError('PDF.js is still loading. Please try again in a moment.');
      return;
    }

    setError(null);
    try {
      const fileReader = new FileReader();

      fileReader.onload = async (e: ProgressEvent<FileReader>) => {
        if (!e.target?.result) return;
        
        const typedArray = new Uint8Array(e.target.result as ArrayBuffer);
        try {
          // Load the PDF
          const loadingTask = window.pdfjsLib.getDocument({ data: typedArray });
          const pdf = await loadingTask.promise;
          
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          setCurrentPage(1);
          setIsFileLoaded(true);
          setNotes([]);
        } catch (err) {
          console.error('Error loading PDF:', err);
          setError('Error loading PDF. Please try another file.');
        }
      };

      fileReader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('Error reading file:', err);
      setError('Error reading file. Please try again.');
    }
  };

  // Open file dialog
  const handleOpenClick = () => {
    fileInputRef.current.click();
  };

  // Render the current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
      setError('Error rendering page. Please try again.');
    }
  }, [pdfDoc, currentPage, scale]);

  // Navigation functions
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Zoom functions
  const zoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  };

  const resetZoom = () => {
    setScale(1.0);
  };

  // Add note
  const handlePdfClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pdfDoc || !pdfContainerRef.current) return;
    
    const containerRect = pdfContainerRef.current.getBoundingClientRect();
    const relativeY = (e.clientY - containerRect.top) / scale;
    const randomColorIndex = Math.floor(Math.random() * NOTE_COLORS.length);
    const randomRotationIndex = Math.floor(Math.random() * NOTE_ROTATIONS.length);
    
    const newNote: Note = {
      id: Date.now().toString(),
      pageNumber: currentPage,
      yPosition: relativeY,
      content: '',
      createdAt: new Date().toISOString(),
      color: NOTE_COLORS[randomColorIndex],
      rotation: NOTE_ROTATIONS[randomRotationIndex],
      isEditing: true
    };
    
    setNotes(prevNotes => [...prevNotes, newNote]);
    setActiveNoteId(newNote.id);
  };

  // Update note content
  const updateNoteContent = (id: string, content: string) => {
    setNotes(prevNotes => 
      prevNotes.map(note => 
        note.id === id ? { ...note, content, updatedAt: new Date().toISOString() } : note
      )
    );
  };

  // Delete note
  const deleteNote = (id: string) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
  };

  // Toggle note editing
  const toggleNoteEditing = (id: string) => {
    setNotes(prevNotes => 
      prevNotes.map(note => 
        note.id === id ? { ...note, isEditing: !note.isEditing } : note
      )
    );
    setActiveNoteId(id);
  };

  // Open Anki Export Modal
  const openAnkiExport = () => {
    setSelectedNotesForAnki([]);
    setShowAnkiModal(true);
    setClozeCounter(1);
  };
  
  // Toggle note selection for Anki export
  const toggleNoteForAnki = (id: string) => {
    setSelectedNotesForAnki(prev => {
      if (prev.includes(id)) {
        return prev.filter(noteId => noteId !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  
  // Add cloze deletion to note content
  const addClozeToNote = (id: string, selectedText: string) => {
    if (!selectedText) return;
    
    setNotes(prevNotes => 
      prevNotes.map(note => {
        if (note.id === id) {
          const content = note.content;
          const clozeText = `{{c${clozeCounter}::${selectedText}}}`;
          const newContent = content.replace(selectedText, clozeText);
          
          return { 
            ...note, 
            content: newContent, 
            updatedAt: new Date().toISOString(),
            hasCloze: true
          };
        }
        return note;
      })
    );
    
    setClozeCounter(prev => prev + 1);
  };
  
  // Render note content with cloze highlighting
  const renderNoteWithCloze = (content: string) => {
    if (!content) return <span className="text-stone-400 italic">Empty note</span>;
    
    const clozeRegex = /\{\{c(\d+)::([^}]+)\}\}/g;
    let lastIndex = 0;
    let parts: React.ReactNode[] = [];
    let match: RegExpExecArray | null;
    
    while ((match = clozeRegex.exec(content)) !== null) {
      // Add text before cloze
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex, match.index)}</span>);
      }
      
      // Add cloze
      const clozeNum = match[1];
      const clozeContent = match[2];
      parts.push(
        <span key={`cloze-${match.index}`} className="anki-cloze">
          {clozeContent}
          <span className="anki-cloze-number">{clozeNum}</span>
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text after last cloze
    if (lastIndex < content.length) {
      parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex)}</span>);
    }
    
    return parts.length > 0 ? parts : content;
  };
  
  // Export to Anki
  const exportToAnki = () => {
    try {
      if (selectedNotesForAnki.length === 0) {
        alert('Please select at least one note to export');
        return;
      }
      
      const selectedNotes = notes.filter(note => selectedNotesForAnki.includes(note.id));
      
      // Create a properly formatted TSV file that Anki can import directly
      let tsvContent = "#separator:tab\n#html:true\n#deck:PDF Notes\n#notetype:Cloze\n\n";
      tsvContent += "Text\tExtra\tTags\n";
      
      selectedNotes.forEach(note => {
        // Create extra field with page info
        const extraField = `Page ${note.pageNumber} - PDF: ${fileInputRef.current?.files?.[0]?.name || 'Untitled PDF'}`;
        
        // Create tags (Anki uses space-separated tags)
        const tags = `pdf-notes page-${note.pageNumber}`;
        
        // Add row to TSV (escape tabs and newlines)
        const escapedContent = note.content.replace(/\t/g, ' ').replace(/\n/g, '<br>');
        const escapedExtra = extraField.replace(/\t/g, ' ').replace(/\n/g, '<br>');
        
        tsvContent += `${escapedContent}\t${escapedExtra}\t${tags}\n`;
      });
      
      // Create the file download with a direct download approach
      const blob = new Blob([tsvContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Force download
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.setAttribute('download', `anki-export-${new Date().toISOString().split('T')[0]}.txt`);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      URL.revokeObjectURL(url);
      
      setShowAnkiModal(false);
      
      // Show success message
      alert('Notes exported for Anki!\n\nImport instructions:\n1. In Anki, click File > Import\n2. Select the downloaded .txt file\n3. Make sure "Fields separated by: Tab" is selected\n4. Confirm import settings');
    } catch (err) {
      console.error('Error exporting to Anki:', err);
      setError('Error creating Anki export. Please try again.');
    }
  };

  // Filter notes for current page
  const currentPageNotes = notes.filter(note => note.pageNumber === currentPage);
  
  // Effect for rendering the PDF page
  useEffect(() => {
    if (pdfDoc) {
      renderPage();
    }
  }, [pdfDoc, currentPage, scale, renderPage]);

  // Export notes to JSON
  const exportNotes = () => {
    try {
      const exportData = {
        title: fileInputRef.current?.files?.[0]?.name || 'Untitled PDF',
        exportedAt: new Date().toISOString(),
        notes: notes.map(({ id, pageNumber, content, createdAt, updatedAt }) => ({
          id, pageNumber, content, createdAt, updatedAt
        }))
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `notes-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      alert('Notes exported successfully!');
    } catch (err) {
      console.error('Error exporting notes:', err);
      setError('Error exporting notes. Please try again.');
    }
  };
  
  // Import notes from JSON
  const importNotes = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importedData = JSON.parse(content);
          
          if (Array.isArray(importedData.notes)) {
            // Convert imported notes to our Note format
            const importedNotes: Note[] = importedData.notes.map((note: any) => ({
              ...note,
              color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
              rotation: NOTE_ROTATIONS[Math.floor(Math.random() * NOTE_ROTATIONS.length)],
              isEditing: false
            }));
            
            setNotes(prev => [...prev, ...importedNotes]);
            alert(`Successfully imported ${importedNotes.length} notes!`);
          } else {
            throw new Error('Invalid notes format');
          }
        } catch (err) {
          console.error('Error parsing imported notes:', err);
          setError('The selected file does not contain valid notes data.');
        }
      };
      
      reader.readAsText(file);
    } catch (err) {
      console.error('Error importing notes:', err);
      setError('Error importing notes. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-stone-50 font-serif relative">
      {/* Grain overlay */}
      <div className="absolute inset-0 pointer-events-none bg-grain opacity-10 z-10"></div>
      
      {/* Header/Controls */}
      <div className="px-4 py-3 bg-stone-100 border-b border-stone-200 flex items-center justify-between relative z-20">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-medium text-stone-800">PDF Margin Notes</h1>
          
          <div className="flex space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/pdf"
              className="hidden"
            />
            <button
              onClick={handleOpenClick}
              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md border border-amber-300 text-sm font-medium transition-colors"
            >
              Open PDF
            </button>
            {notes.length > 0 && (
              <>
                <button
                  onClick={exportNotes}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md border border-stone-300 text-sm font-medium transition-colors"
                >
                  Export Notes
                </button>
                <input
                  type="file"
                  ref={importNotesRef}
                  onChange={importNotes}
                  accept="application/json"
                  className="hidden"
                />
                <button
                  onClick={() => importNotesRef.current?.click()}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md border border-stone-300 text-sm font-medium transition-colors"
                >
                  Import Notes
                </button>
              </>
            )}
          </div>
        </div>
        
        {isFileLoaded && (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 bg-stone-200 rounded-md px-1">
              <button
                onClick={zoomOut}
                className="p-1 text-stone-600 hover:text-stone-900"
                aria-label="Zoom out"
              >
                -
              </button>
              <button
                onClick={resetZoom}
                className="px-2 py-1 text-xs text-stone-600 hover:text-stone-900"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                onClick={zoomIn}
                className="p-1 text-stone-600 hover:text-stone-900"
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
            
            <div className="flex items-center space-x-1 bg-stone-200 rounded-md">
              <button
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
                className="px-2 py-1 text-stone-600 hover:text-stone-900 disabled:text-stone-400"
                aria-label="Previous page"
              >
                ←
              </button>
              <span className="px-2 py-1 text-xs text-stone-600">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={currentPage >= totalPages}
                className="px-2 py-1 text-stone-600 hover:text-stone-900 disabled:text-stone-400"
                aria-label="Next page"
              >
                →
              </button>
            </div>
            
            <button
              onClick={openAnkiExport}
              className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md border border-blue-300 text-sm font-medium transition-colors"
            >
              Anki Export
            </button>
          </div>
        )}
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF Container with Margin */}
        <div className="flex-1 flex overflow-auto bg-stone-200 relative">
          {!isFileLoaded ? (
            <div className="flex flex-col items-center justify-center h-full w-full space-y-4 p-8 text-center">
              <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center border-2 border-amber-300">
                <span className="text-3xl text-amber-800">PDF</span>
              </div>
              <h2 className="text-xl font-medium text-stone-700">No PDF Open</h2>
              <p className="text-stone-500 max-w-md">
                Click the "Open PDF" button to upload a local PDF file and start taking margin notes.
              </p>
              {error && (
                <p className="text-rose-600 bg-rose-50 p-3 rounded-md border border-rose-200">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-1">
                {/* PDF Viewer */}
                <div 
                  ref={pdfContainerRef} 
                  className="flex-1 overflow-auto p-4 cursor-text relative bg-stone-100"
                  onClick={handlePdfClick}
                >
                  <div className="relative">
                    <div className="absolute inset-0 pointer-events-none bg-grain opacity-5 z-10 rounded"></div>
                    <div className="mx-auto relative bg-white p-2 shadow-md rounded">
                      {pdfDoc ? (
                        <canvas ref={canvasRef} className="mx-auto" />
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
                
                {/* Margin Notes Container */}
                <div 
                  ref={notesContainerRef}
                  className="w-64 bg-stone-50 border-l border-stone-200 flex flex-col h-full overflow-hidden relative"
                >
                  <div className="absolute inset-0 pointer-events-none bg-grain opacity-8 z-10"></div>
                  <div className="px-3 py-2 bg-stone-100 border-b border-stone-200">
                    <h3 className="text-sm font-medium text-stone-700">Notes - Page {currentPage}</h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {currentPageNotes.map(note => (
                      <div 
                        key={note.id}
                        className={`p-3 border rounded-md shadow-sm ${note.color} ${note.rotation} transition-all`}
                        style={{ overflow: 'hidden' }}
                      >
                        {note.isEditing ? (
                          <textarea
                            value={note.content}
                            onChange={(e) => updateNoteContent(note.id, e.target.value)}
                            autoFocus
                            className="w-full bg-transparent outline-none border-0 focus:ring-0 focus:border-0 focus:outline-none min-h-24 resize-none font-serif text-sm appearance-none"
                            placeholder="Write your note here..."
                            onBlur={() => toggleNoteEditing(note.id)}
                          />
                        ) : (
                          <>
                            <div 
                              className="min-h-16 text-sm whitespace-pre-wrap mb-2"
                              onClick={() => toggleNoteEditing(note.id)}
                            >
                              {renderNoteWithCloze(note.content)}
                            </div>
                            <div className="flex items-center justify-between text-xs text-stone-500">
                              <span>Page {note.pageNumber}</span>
                              <button 
                                onClick={() => deleteNote(note.id)}
                                className="text-rose-600 hover:text-rose-800"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    
                    {currentPageNotes.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-32 text-stone-400 text-sm text-center">
                        <p>No notes on this page</p>
                        <p className="mt-2">Click on the PDF to add a note</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Notes Sidebar */}
        <div className="w-64 bg-stone-50 border-l border-stone-200 overflow-y-auto hidden lg:block">
          <div className="px-4 py-3 border-b border-stone-200">
            <h2 className="font-medium text-stone-800">All Notes</h2>
          </div>
          
          <div className="p-3 space-y-3">
            {notes.length > 0 ? notes.map(note => (
              <div 
                key={note.id}
                className={`p-3 border rounded-md shadow-sm ${note.pageNumber === currentPage ? note.color : 'bg-white border-stone-200'} ${note.rotation} transition-all`}
                style={{ overflow: 'hidden' }}
                onClick={() => {
                  setCurrentPage(note.pageNumber);
                  setActiveNoteId(note.id);
                }}
              >
                <div className="min-h-12 text-sm whitespace-pre-wrap mb-2 line-clamp-3">
                  {renderNoteWithCloze(note.content)}
                </div>
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>Page {note.pageNumber}</span>
                  <span>{new Date(note.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
            )) : (
              <div className="text-center text-stone-400 text-sm py-4">
                No notes yet
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Anki Export Modal */}
      {showAnkiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-80 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h2 className="text-xl font-medium text-stone-800">Export Notes to Anki</h2>
              <button 
                onClick={() => setShowAnkiModal(false)}
                className="text-stone-500 hover:text-stone-800"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <p className="text-stone-600 mb-2">Select notes to export and create cloze deletions:</p>
                <ol className="list-decimal list-inside text-sm text-stone-500 mb-4 pl-2">
                  <li className="mb-1">Select text within a note to create a cloze deletion</li>
                  <li className="mb-1">Click on "Make Cloze" to mark the selection</li>
                  <li className="mb-1">Review your notes and select which ones to export</li>
                  <li className="mb-1">Click "Export to Anki" to generate a text file for import</li>
                </ol>
              </div>
              
              <div className="space-y-4">
                {notes.map(note => {
                  const isSelected = selectedNotesForAnki.includes(note.id);
                  
                  return (
                    <div 
                      key={note.id}
                      className={`p-4 border rounded-md ${isSelected ? 'border-blue-400 bg-blue-50' : 'border-stone-200'} transition-all`}
                    >
                      <div className="flex items-start mb-2">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleNoteForAnki(note.id)}
                          className="mr-3 mt-1"
                        />
                        <div className="flex-1">
                          <div className="text-xs text-stone-500 mb-1">
                            Page {note.pageNumber} | Created: {new Date(note.createdAt).toLocaleString()}
                          </div>
                          
                          <div 
                            className="relative min-h-16 p-2 bg-white border border-stone-200 rounded-md mb-2"
                            onClick={() => setActiveNoteId(note.id)}
                          >
                            {renderNoteWithCloze(note.content)}
                          </div>
                          
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => {
                                const selection = window.getSelection();
                                if (selection && selection.toString() && activeNoteId === note.id) {
                                  addClozeToNote(note.id, selection.toString());
                                } else {
                                  alert('Please select some text first');
                                }
                              }}
                              className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium"
                            >
                              Make Cloze
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-stone-200 flex justify-between items-center bg-stone-50">
              <div className="text-sm text-stone-600">
                Selected {selectedNotesForAnki.length} of {notes.length} notes
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setShowAnkiModal(false)}
                  className="px-3 py-1.5 bg-stone-100 text-stone-800 rounded-md border border-stone-300 text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={exportToAnki}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium"
                  disabled={selectedNotesForAnki.length === 0}
                >
                  Export to Anki
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFMarginNotes;
