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
  getOutline: () => Promise<PDFOutlineItem[] | null>;
  getDestination?: (dest: string) => Promise<any[] | null>;
}

interface PDFOutlineItem {
  title: string;
  bold?: boolean;
  italic?: boolean;
  color?: number[];
  dest?: string | any[];
  url?: string;
  unsafeUrl?: string;
  newWindow?: boolean;
  count?: number;
  items?: PDFOutlineItem[];
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
  const [showAnkiModal, setShowAnkiModal] = useState<boolean>(false);
  const [selectedNotesForAnki, setSelectedNotesForAnki] = useState<string[]>([]);
  const [clozeCounter, setClozeCounter] = useState<number>(1);
  const [lastPdfName, setLastPdfName] = useState<string>(() => {
    return localStorage.getItem('pdfMarginNotes_lastPdfName') || '';
  });
  const [outline, setOutline] = useState<PDFOutlineItem[] | null>(null);
  const [showOutline, setShowOutline] = useState<boolean>(false);

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
  
  // Load PDF.js from CDN and check for saved session
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.min.js`;
    script.async = true;
    
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;
      setIsPdfLibReady(true);
      
      // Check if we have saved notes and PDF data
      const savedNotes = localStorage.getItem('pdfMarginNotes_notes');
      const savedPdfData = localStorage.getItem('pdfMarginNotes_pdfData');
      
      if (savedNotes && JSON.parse(savedNotes).length > 0) {
        const notesCount = JSON.parse(savedNotes).length;
        
        // Try to load the saved PDF if available
        if (savedPdfData) {
          try {
            const pdfDataArray = JSON.parse(savedPdfData);
            const typedArray = new Uint8Array(pdfDataArray);
            
            const loadingTask = window.pdfjsLib.getDocument({ data: typedArray });
            loadingTask.promise.then(pdf => {
              setPdfDoc(pdf);
              setTotalPages(pdf.numPages);
              setIsFileLoaded(true);
              
              // Show notification about restored session
              const notification = document.createElement('div');
              notification.className = 'fixed bottom-4 right-4 bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-md shadow-md z-50';
              notification.innerHTML = `
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium">Session Fully Restored</p>
                    <p class="text-sm">${notesCount} notes and PDF loaded from your previous session</p>
                  </div>
                  <button class="ml-4 text-green-600 hover:text-green-800" onclick="this.parentNode.parentNode.remove()">✕</button>
                </div>
              `;
              document.body.appendChild(notification);
              
              // Auto-remove after 5 seconds
              setTimeout(() => {
                if (document.body.contains(notification)) {
                  document.body.removeChild(notification);
                }
              }, 5000);
            }).catch(err => {
              console.warn('Could not load saved PDF:', err);
              
              // Show notification about partially restored session
              const notification = document.createElement('div');
              notification.className = 'fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-md shadow-md z-50';
              notification.innerHTML = `
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium">Session Partially Restored</p>
                    <p class="text-sm">${notesCount} notes loaded, but PDF needs to be reopened</p>
                  </div>
                  <button class="ml-4 text-yellow-600 hover:text-yellow-800" onclick="this.parentNode.parentNode.remove()">✕</button>
                </div>
              `;
              document.body.appendChild(notification);
              
              // Auto-remove after 5 seconds
              setTimeout(() => {
                if (document.body.contains(notification)) {
                  document.body.removeChild(notification);
                }
              }, 5000);
            });
          } catch (err) {
            console.warn('Error parsing saved PDF data:', err);
          }
        } else {
          // Show notification about partially restored session
          const notification = document.createElement('div');
          notification.className = 'fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-md shadow-md z-50';
          notification.innerHTML = `
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium">Session Partially Restored</p>
                <p class="text-sm">${notesCount} notes loaded, please reopen your PDF</p>
              </div>
              <button class="ml-4 text-yellow-600 hover:text-yellow-800" onclick="this.parentNode.parentNode.remove()">✕</button>
            </div>
          `;
          document.body.appendChild(notification);
          
          // Auto-remove after 5 seconds
          setTimeout(() => {
            if (document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          }, 5000);
        }
      }
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
        
        // Save the PDF data to localStorage (if it's not too large)
        try {
          if (typedArray.length < 10 * 1024 * 1024) { // Only save if less than 10MB
            localStorage.setItem('pdfMarginNotes_pdfData', JSON.stringify(Array.from(typedArray)));
          }
        } catch (err) {
          console.warn('Could not save PDF data to localStorage:', err);
        }
        
        try {
          // Load the PDF
          const loadingTask = window.pdfjsLib.getDocument({ data: typedArray });
          const pdf = await loadingTask.promise;
          
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          setCurrentPage(1);
          setIsFileLoaded(true);
          
          // Load the outline/table of contents
          try {
            const outline = await pdf.getOutline();
            setOutline(outline);
          } catch (err) {
            console.warn('Could not load PDF outline:', err);
            setOutline(null);
          }
          
          // Save PDF name and clear notes only if it's a different PDF
          const pdfName = file.name;
          if (pdfName !== lastPdfName) {
            setNotes([]);
            setLastPdfName(pdfName);
            localStorage.setItem('pdfMarginNotes_lastPdfName', pdfName);
          }
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
    fileInputRef.current?.click();
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
  
  // Add keyboard shortcut for toggling outline (Alt+O)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'o') {
        setShowOutline(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('pdfMarginNotes_currentPage', currentPage.toString());
  }, [currentPage]);
  
  useEffect(() => {
    localStorage.setItem('pdfMarginNotes_scale', scale.toString());
  }, [scale]);
  
  useEffect(() => {
    localStorage.setItem('pdfMarginNotes_notes', JSON.stringify(notes));
  }, [notes]);

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
  
  // Navigate to a specific destination in the PDF
  const navigateToDestination = async (dest: string | any[]) => {
    if (!pdfDoc) return;
    
    try {
      let pageNumber;
      
      if (Array.isArray(dest)) {
        // Handle array destination format
        const ref = dest[0]; // First element is usually the page reference
        
        if (ref && typeof ref === 'object' && 'num' in ref) {
          // Convert from PDF reference to page number (usually 0-indexed)
          pageNumber = ref.num + 1;
        }
      } else if (typeof dest === 'string' && pdfDoc.getDestination) {
        // Handle named destination if the method exists
        try {
          const namedDest = await pdfDoc.getDestination(dest);
          if (namedDest && namedDest.length > 0) {
            const ref = namedDest[0];
            if (ref && typeof ref === 'object' && 'num' in ref) {
              pageNumber = ref.num + 1;
            }
          }
        } catch (err) {
          console.warn('Error getting destination:', err);
        }
      }
      
      if (pageNumber && pageNumber >= 1 && pageNumber <= totalPages) {
        setCurrentPage(pageNumber);
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
  
  // Recursive component to render outline items
  const OutlineItem = ({ item, level = 0 }: { item: PDFOutlineItem; level?: number }) => {
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (item.dest) {
        navigateToDestination(item.dest);
      } else if (item.url) {
        window.open(item.url, item.newWindow ? '_blank' : '_self');
      }
    };
    
    return (
      <div className="outline-item">
        <div 
          className={`flex items-center py-1 px-2 hover:bg-stone-100 rounded cursor-pointer text-sm ${level > 0 ? 'ml-' + (level * 3) : ''}`}
          onClick={handleClick}
        >
          <span className={`${item.bold ? 'font-bold' : ''} ${item.italic ? 'italic' : ''} truncate`}>
            {item.title}
          </span>
        </div>
        
        {item.items && item.items.length > 0 && (
          <div className="outline-children">
            {item.items.map((child, index) => (
              <OutlineItem key={index} item={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
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
                <button
                  onClick={clearAllData}
                  className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-md border border-rose-300 text-sm font-medium transition-colors"
                >
                  Clear Data
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
              onClick={() => setShowOutline(!showOutline)}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md border border-stone-300 text-sm font-medium transition-colors relative group"
              title="Toggle Table of Contents (Alt+O)"
            >
              {showOutline ? 'Hide Outline' : 'Show Outline'}
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-stone-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Alt+O
              </span>
            </button>
            
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
        {/* Table of Contents / Outline Panel */}
        {showOutline && isFileLoaded && (
          <div className="w-64 bg-stone-50 border-r border-stone-200 overflow-y-auto flex flex-col flex-shrink-0">
            <div className="px-4 py-3 border-b border-stone-200 flex justify-between items-center">
              <h2 className="font-medium text-stone-800">Table of Contents</h2>
              <button 
                onClick={() => setShowOutline(false)}
                className="text-stone-500 hover:text-stone-800 text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {outline && outline.length > 0 ? (
                <div className="space-y-1">
                  {outline.map((item, index) => (
                    <OutlineItem key={index} item={item} />
                  ))}
                </div>
              ) : (
                <div className="text-center text-stone-400 text-sm py-4">
                  No table of contents available
                </div>
              )}
            </div>
          </div>
        )}
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
              {error && (
                <p className="text-rose-600 bg-rose-50 p-3 rounded-md border border-rose-200">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-1">
                {/* PDF Viewer - Now with proper flex layout */}
                <div className="flex-1 min-w-0 relative">
                  <div 
                    ref={pdfContainerRef} 
                    className="absolute inset-0 overflow-auto cursor-text bg-stone-100"
                    onClick={handlePdfClick}
                  >
                    <div className="p-4 flex justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 pointer-events-none bg-grain opacity-5 z-10 rounded"></div>
                        <div className="relative bg-white p-2 shadow-md rounded inline-block"> {/* Changed to inline-block */}
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
                
                {/* Current Page Notes Container */}
                <div 
                  ref={notesContainerRef}
                  className="w-64 bg-stone-50 border-l border-stone-200 flex flex-col h-full overflow-hidden relative flex-shrink-0 z-20"
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
        
        {/* All Notes Sidebar */}
        <div className="w-64 bg-stone-50 border-l border-stone-200 overflow-y-auto flex-shrink-0 z-20">
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
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full min-h-[500px] h-[70vh] flex flex-col overflow-hidden gap-4">
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h2 className="text-xl font-medium text-stone-800">Export Notes to Anki</h2>
              <button 
                onClick={() => setShowAnkiModal(false)}
                className="text-stone-500 hover:text-stone-800"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
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
