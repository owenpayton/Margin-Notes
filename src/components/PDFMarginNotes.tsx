import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './Header';
import PDFViewer from './PDFViewer';
import NotesList from './NotesList';
import AllNotesSidebar from './AllNotesSidebar';
import OutlinePanel from './OutlinePanel';
import ErrorDisplay from './ErrorDisplay';
import ImportNotesButton from './ImportNotesButton';
import ExportNotesButton from './ExportNotesButton';
import { Note, PDFDocumentProxy, PDFOutlineItem, PDFPageProxy, PDFViewport, PDFRenderContext, NOTE_COLORS, NOTE_ROTATIONS } from './types';

// For PDF.js loading
const pdfjsVersion = '3.4.120';

// Define window interface for PDF.js
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
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const saved = localStorage.getItem('pdfMarginNotes_currentPage');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [totalPages, setTotalPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(() => {
    const saved = localStorage.getItem('pdfMarginNotes_scale');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('pdfMarginNotes_notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [error, setError] = useState<string | null>(null);
  const [isFileLoaded, setIsFileLoaded] = useState<boolean>(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isPdfLibReady, setIsPdfLibReady] = useState<boolean>(false);
  const [clozeCounter, setClozeCounter] = useState<number>(1);
  const [lastPdfName, setLastPdfName] = useState<string>(() => {
    return localStorage.getItem('pdfMarginNotes_lastPdfName') || '';
  });
  const [outline, setOutline] = useState<PDFOutlineItem[] | null>(null);
  const [showOutline, setShowOutline] = useState<boolean>(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const notesContainerRef = useRef<HTMLDivElement>(null);
  const isRenderingInProgress = useRef<boolean>(false);
  const pendingScaleUpdate = useRef<number | null>(null);

  // Custom styles for components
  useEffect(() => {
    // Add grain background style
    const style = document.createElement('style');
    style.textContent = `
      textarea {
        display: block !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
        -webkit-appearance: none !important;
        padding: 0 !important;
        background: transparent !important;
        width: 100% !important;
        min-height: 100px !important;
        font-family: serif !important;
        resize: none !important;
        font-size: 0.875rem !important;
        line-height: 1.5 !important;
        color: inherit !important;
      }
      
      textarea:focus {
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
        -webkit-appearance: none !important;
        ring: 0 !important;
      }
      
      textarea::placeholder {
        color: rgba(120, 113, 108, 0.5);
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
  
  // Load PDF.js library
  useEffect(() => {
    const loadPdfLib = async () => {
      try {
        // Check if PDF.js is already loaded
        if (window.pdfjsLib) {
          console.log('PDF.js library already loaded');
          setIsPdfLibReady(true);
          return;
        }

        console.log('Loading PDF.js library...');
        
        // Load PDF.js script
        const script = document.createElement('script');
        script.src = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.min.js`;
        script.async = true;
        
        script.onload = () => {
          // Set worker source after the library is loaded
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
            `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.js`;
          
          console.log('PDF.js library loaded successfully');
          setIsPdfLibReady(true);
        };
        
        script.onerror = (error) => {
          console.error('Error loading PDF.js library:', error);
          setError('Failed to load PDF viewer library. Please refresh the page and try again.');
        };
        
        document.body.appendChild(script);
      } catch (err) {
        console.error('Error in PDF.js initialization:', err);
        setError('Failed to initialize PDF viewer. Please refresh the page and try again.');
      }
    };
    
    loadPdfLib();
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

      fileReader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
          
          // Save PDF data to localStorage
          try {
            // Convert to base64 for storage
            let binary = '';
            const bytes = new Uint8Array(typedArray);
            const len = bytes.byteLength;
            
            for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            
            const base64Data = btoa(binary);
            
            // Check size before saving
            if (base64Data.length < 5000000) { // ~5MB limit
              localStorage.setItem('pdfMarginNotes_pdfData', base64Data);
              localStorage.setItem('pdfMarginNotes_lastPdfName', file.name);
              setLastPdfName(file.name);
            }
          } catch (err) {
            console.warn('Could not save PDF to localStorage:', err);
          }
          
          await loadPdf(typedArray);
        } catch (err) {
          console.error('Error loading PDF:', err);
          setError('Error loading PDF. Please try again.');
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
    fileInputRef.current?.click();
  };

  // Render the current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    
    // If rendering is already in progress, just update the state
    // and let the current rendering finish
    if (isRenderingInProgress.current) {
      return;
    }
    
    isRenderingInProgress.current = true;
    
    try {
      const page = await pdfDoc.getPage(currentPage);
      // Always use rotation 0 to prevent the document from flipping upside down
      const viewport = page.getViewport({ scale, rotation: 0 });
      
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
      
      // Check if there's a pending scale update that came in while rendering
      if (pendingScaleUpdate.current !== null && pendingScaleUpdate.current !== scale) {
        const nextScale = pendingScaleUpdate.current;
        pendingScaleUpdate.current = null;
        // Schedule the update for the next tick to avoid render loops
        setTimeout(() => {
          setScale(nextScale);
        }, 0);
      }
    } catch (err) {
      console.error('Error rendering page:', err);
      setError('Error rendering page. Please try again.');
    } finally {
      isRenderingInProgress.current = false;
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
    const newScale = Math.min((pendingScaleUpdate.current || scale) + 0.2, 3.0);
    pendingScaleUpdate.current = newScale;
    setScale(newScale);
  };

  const zoomOut = () => {
    const newScale = Math.max((pendingScaleUpdate.current || scale) - 0.2, 0.5);
    pendingScaleUpdate.current = newScale;
    setScale(newScale);
  };

  const resetZoom = () => {
    pendingScaleUpdate.current = 1.0;
    setScale(1.0);
  };

  // Handle click on PDF to add a note
  const handlePdfClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pdfContainerRef.current || !isFileLoaded) return;
    
    // First, save any currently edited note
    const editingNote = notes.find(note => note.isEditing);
    if (editingNote) {
      // If the note is empty, delete it
      if (!editingNote.content.trim()) {
        deleteNote(editingNote.id);
      } else {
        // Otherwise, save it by turning off edit mode
        setNotes(prevNotes => 
          prevNotes.map(note => 
            note.id === editingNote.id 
              ? { ...note, isEditing: false } 
              : note
          )
        );
      }
    }
    
    // Get click position relative to the container
    const rect = pdfContainerRef.current.getBoundingClientRect();
    const yPosition = (e.clientY - rect.top + pdfContainerRef.current.scrollTop) / scale;
    
    // Create a unique ID for the new note
    const noteId = `note-${Date.now()}`;
    
    // Create a new note
    const newNote: Note = {
      id: noteId,
      pageNumber: currentPage,
      yPosition,
      content: '',
      createdAt: new Date().toISOString(),
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
      rotation: NOTE_ROTATIONS[Math.floor(Math.random() * NOTE_ROTATIONS.length)],
      isEditing: true
    };
    
    console.log('Creating new note:', noteId);
    
    // Add the new note to the notes array
    setNotes(prevNotes => [...prevNotes, newNote]);
    
    // Set the active note ID
    setActiveNoteId(noteId);
    
    // Scroll to the new note in the notes container
    setTimeout(() => {
      if (notesContainerRef.current) {
        notesContainerRef.current.scrollTop = notesContainerRef.current.scrollHeight;
      }
    }, 50);
  };

  // Update note content
  const updateNoteContent = (id: string, content: string) => {
    // Log for debugging
    console.log(`Updating note ${id} with content: ${content}`);
    
    setNotes(prevNotes => {
      // Find the note to update
      const noteToUpdate = prevNotes.find(note => note.id === id);
      
      if (!noteToUpdate) {
        console.warn(`Note ${id} not found for update`);
        return prevNotes;
      }
      
      // Update the note
      return prevNotes.map(note => 
        note.id === id 
          ? { 
              ...note, 
              content, 
              updatedAt: new Date().toISOString()
            } 
          : note
      );
    });
  };

  // Delete a note
  const deleteNote = (id: string) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
  };

  // Toggle note editing state
  const toggleNoteEditing = (id: string) => {
    // First, save any other currently edited note
    const editingNote = notes.find(note => note.isEditing && note.id !== id);
    if (editingNote) {
      // If the note is empty, delete it
      if (!editingNote.content.trim()) {
        deleteNote(editingNote.id);
      } else {
        // Otherwise, save it by turning off edit mode
    setNotes(prevNotes => 
      prevNotes.map(note => 
            note.id === editingNote.id 
              ? { ...note, isEditing: false } 
              : note
          )
        );
      }
    }
    
    // Now toggle the editing state of the target note
    setNotes(prevNotes => {
      const targetNote = prevNotes.find(note => note.id === id);
      if (!targetNote) return prevNotes;
      
      return prevNotes.map(note => 
        note.id === id 
          ? { ...note, isEditing: !note.isEditing } 
          : { ...note, isEditing: false } // Ensure only one note is in editing mode
      );
    });
    
    // Set this as the active note
    setActiveNoteId(id);
  };

  // Load PDF document
  const loadPdf = async (pdfData: Uint8Array) => {
    try {
      const loadingTask = window.pdfjsLib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;
      
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setIsFileLoaded(true);
      
      // Try to load the outline/table of contents
      try {
        const outline = await pdf.getOutline();
        console.log('PDF outline loaded:', outline);
        
        // Validate outline structure
        if (outline && Array.isArray(outline)) {
          // Process outline to ensure all items have required properties
          const processOutlineItems = (items: PDFOutlineItem[]): PDFOutlineItem[] => {
            return items.map(item => {
              // Ensure title exists
              if (!item.title) {
                item.title = 'Untitled';
              }
              
              // Process nested items if they exist
              if (item.items && Array.isArray(item.items)) {
                item.items = processOutlineItems(item.items);
              }
              
              return item;
            });
          };
          
          setOutline(processOutlineItems(outline));
        } else {
          console.warn('PDF outline is not in expected format:', outline);
          setOutline(null);
        }
      } catch (err) {
        console.warn('Could not load PDF outline:', err);
        setOutline(null);
      }
      
      // Reset to page 1 when loading a new document
      setCurrentPage(1);
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError('Error loading PDF. Please try again.');
    }
  };

  // Effect to render page when current page or scale changes
  useEffect(() => {
      renderPage();
  }, [renderPage, currentPage, scale]);
  
  // Save current page and scale to localStorage
  useEffect(() => {
    if (isFileLoaded) {
    localStorage.setItem('pdfMarginNotes_currentPage', currentPage.toString());
    localStorage.setItem('pdfMarginNotes_scale', scale.toString());
    }
  }, [currentPage, scale, isFileLoaded]);
  
  // Save notes to localStorage
  useEffect(() => {
    localStorage.setItem('pdfMarginNotes_notes', JSON.stringify(notes));
  }, [notes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Navigation shortcuts
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        goToPrevPage();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        goToNextPage();
      }
      
      // Zoom shortcuts
      if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      } else if (e.key === '0') {
        resetZoom();
      }
      
      // Toggle outline with Alt+O
      if (e.key === 'o' && e.altKey) {
        setShowOutline(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // Navigate to a specific destination in the PDF
  const navigateToDestination = async (dest: string | any[]) => {
    if (!pdfDoc) {
      console.error('Cannot navigate: PDF document not loaded');
      return;
    }
    
    try {
      let pageNumber: number | undefined;
      
      console.log('Navigating to destination:', dest);
      
      // Handle different destination formats using PDF.js's proper methods
      if (typeof dest === 'string') {
        // Handle named destination
        try {
          if (pdfDoc.getDestination) {
            // Get the explicit destination array
            const explicitDest = await pdfDoc.getDestination(dest);
            if (explicitDest && Array.isArray(explicitDest) && explicitDest.length > 0) {
              // Get the reference to the page
              const ref = explicitDest[0];
              
              // Use getPageIndex to convert ref to page index (0-based)
              if (pdfDoc.getPageIndex) {
                const pageIndex = await pdfDoc.getPageIndex(ref);
                // Convert to 1-based page number
                pageNumber = pageIndex + 1;
              }
            }
          }
        } catch (err) {
          console.error('Error resolving named destination:', err);
        }
      } else if (Array.isArray(dest) && dest.length > 0) {
        // Direct array destination - first element is the page reference
        const ref = dest[0];
        
        if (ref && typeof ref === 'object') {
          try {
            // Use getPageIndex to convert ref to page index (0-based)
            if (pdfDoc.getPageIndex) {
              const pageIndex = await pdfDoc.getPageIndex(ref);
              // Convert to 1-based page number
              pageNumber = pageIndex + 1;
            }
          } catch (err) {
            console.error('Error getting page index from reference:', err);
            
            // Fallback: try to use the num property if available
            if ('num' in ref) {
              // PDF.js internal page numbers are 0-based, add 1 for display
              pageNumber = ref.num + 1;
            }
          }
        }
      }
      
      // Navigate to the page if we have a valid page number
      if (pageNumber !== undefined && pageNumber >= 1 && pageNumber <= totalPages) {
        console.log('Navigating to page:', pageNumber);
        
        // Force a re-render by setting to a different value first if we're already on this page
        if (pageNumber === currentPage) {
          // This is a workaround for when clicking on TOC items for the current page
          // Set to a temporary value and then back to force a re-render
          setCurrentPage(prev => {
            const tempPage = prev > 1 ? prev - 1 : prev + 1;
            // Store pageNumber in a local constant to ensure it's not undefined
            const targetPage = pageNumber;
            setTimeout(() => {
              if (targetPage !== undefined) {
                setCurrentPage(targetPage);
              }
            }, 50);
            return tempPage;
          });
        } else {
          setCurrentPage(pageNumber);
        }
        
        // Scroll to top of page when navigating via outline
        if (pdfContainerRef.current) {
          pdfContainerRef.current.scrollTop = 0;
        }
      } else {
        console.warn('Invalid page number or out of range:', pageNumber, 'total pages:', totalPages);
      }
    } catch (err) {
      console.error('Error navigating to destination:', err);
    }
  };
  
  // Clear all saved data
  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all saved data? This will remove all notes and settings.')) {
      localStorage.removeItem('pdfMarginNotes_currentPage');
      localStorage.removeItem('pdfMarginNotes_scale');
      localStorage.removeItem('pdfMarginNotes_notes');
      localStorage.removeItem('pdfMarginNotes_lastPdfName');
      localStorage.removeItem('pdfMarginNotes_pdfData');
      
      setNotes([]);
      setCurrentPage(1);
      setScale(1.0);
      setLastPdfName('');
      setIsFileLoaded(false);
      setPdfDoc(null);
      
      alert('All data has been cleared.');
    }
  };
  
  // Add cloze deletion to a note
  const addClozeToNote = (id: string, selectedText: string) => {
    setNotes(prevNotes => 
      prevNotes.map(note => {
        if (note.id === id) {
          const clozeText = `{{c${clozeCounter}::${selectedText}}}`;
          const newContent = note.content.replace(selectedText, clozeText);
          
          setClozeCounter(prev => prev + 1);
          
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
  };

  // Render note content with cloze formatting
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
  
  // Handle imported notes
  const handleImportNotes = (importedNotes: Note[]) => {
            setNotes(prev => [...prev, ...importedNotes]);
  };

  // Effect to focus the active note
  useEffect(() => {
    if (activeNoteId) {
      // Find the note element and focus it
      setTimeout(() => {
        const noteElement = document.getElementById(`note-${activeNoteId}`);
        if (noteElement) {
          const textarea = noteElement.querySelector('textarea');
          if (textarea) {
            textarea.focus();
          }
        }
      }, 100);
    }
  }, [activeNoteId]);

  // Load saved PDF when PDF.js is ready
  useEffect(() => {
    if (!isPdfLibReady) return;
    
    // Try to load the last PDF if available
    const savedPdfData = localStorage.getItem('pdfMarginNotes_pdfData');
    if (savedPdfData && lastPdfName) {
      try {
        console.log('Loading saved PDF:', lastPdfName);
        const binaryData = atob(savedPdfData);
        const len = binaryData.length;
        const bytes = new Uint8Array(len);
        
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        
        loadPdf(bytes);
      } catch (err) {
        console.error('Error loading saved PDF:', err);
        setError('Error loading saved PDF. Please try uploading it again.');
      }
    }
  }, [isPdfLibReady, lastPdfName]);

  return (
    <div className="flex flex-col h-screen max-h-screen bg-stone-50 font-serif relative">
      {/* Grain overlay */}
      <div className="absolute inset-0 pointer-events-none bg-grain opacity-10 z-10"></div>
      
      {/* File input for PDF upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/pdf"
              className="hidden"
            />
      
      {/* Header/Controls */}
      <Header
        isFileLoaded={isFileLoaded}
        notes={notes}
        handleOpenClick={handleOpenClick}
        handleImportNotes={handleImportNotes}
        clearAllData={clearAllData}
        currentPage={currentPage}
        totalPages={totalPages}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        resetZoom={resetZoom}
        goToPrevPage={goToPrevPage}
        goToNextPage={goToNextPage}
        scale={scale}
        showOutline={showOutline}
        setShowOutline={setShowOutline}
        setCurrentPage={setCurrentPage}
      />
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Table of Contents / Outline Panel */}
        <OutlinePanel
          showOutline={showOutline}
          isFileLoaded={isFileLoaded}
          outline={outline}
          setShowOutline={setShowOutline}
          navigateToDestination={navigateToDestination}
          pdfDoc={pdfDoc}
        />
        
        {/* PDF Container with Margin */}
        <div className="flex-1 flex bg-stone-200 relative">
          {!isFileLoaded ? (
            <div className="flex flex-col items-center justify-center h-full w-full space-y-4 p-8 text-center">
              <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center border-2 border-amber-300">
                <span className="text-3xl text-amber-800">PDF</span>
              </div>
              <h2 className="text-xl font-medium text-stone-700">No PDF Open</h2>
              <p className="text-stone-500 max-w-md">
                Click the "Open PDF" button to upload a local PDF file and start taking margin notes.
              </p>
              <ErrorDisplay error={error} />
            </div>
          ) : (
            <>
              <div className="flex flex-1">
                {/* PDF Viewer */}
                <PDFViewer
                  pdfDoc={pdfDoc}
                  currentPage={currentPage}
                  canvasRef={canvasRef}
                  pdfContainerRef={pdfContainerRef}
                  handlePdfClick={handlePdfClick}
                  isFileLoaded={isFileLoaded}
                  totalPages={totalPages}
                  notes={notes}
                  scale={scale}
                  activeNoteId={activeNoteId}
                  setActiveNoteId={setActiveNoteId}
                />
                
                {/* Current Page Notes Container */}
                <NotesList
                  notes={notes}
                  currentPage={currentPage}
                  updateNoteContent={updateNoteContent}
                  toggleNoteEditing={toggleNoteEditing}
                  deleteNote={deleteNote}
                  renderNoteWithCloze={renderNoteWithCloze}
                  notesContainerRef={notesContainerRef}
                  activeNoteId={activeNoteId}
                  addClozeToNote={addClozeToNote}
                />
              </div>
            </>
          )}
        </div>
        
        {/* All Notes Sidebar */}
        <AllNotesSidebar
          notes={notes}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          setActiveNoteId={setActiveNoteId}
          renderNoteWithCloze={renderNoteWithCloze}
          toggleNoteEditing={toggleNoteEditing}
          updateNoteContent={updateNoteContent}
          deleteNote={deleteNote}
          addClozeToNote={addClozeToNote}
        />
                          </div>
    </div>
  );
};

export default PDFMarginNotes;