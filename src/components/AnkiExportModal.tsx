import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Note } from './types';
import NoteItem from './NoteItem';

interface AnkiExportModalProps {
  showAnkiModal: boolean;
  setShowAnkiModal: (show: boolean) => void;
  notes: Note[];
  selectedNotesForAnki: string[];
  toggleNoteForAnki: (id: string) => void;
  exportToAnki: () => void;
  renderNoteWithCloze: (content: string) => React.ReactNode;
}

const AnkiExportModal: React.FC<AnkiExportModalProps> = ({
  showAnkiModal,
  setShowAnkiModal,
  notes,
  selectedNotesForAnki,
  toggleNoteForAnki,
  exportToAnki,
  renderNoteWithCloze
}) => {
  // Create a ref for the portal container
  const portalRef = useRef<HTMLDivElement | null>(null);
  
  // Create the portal container on mount
  useEffect(() => {
    // Check if the portal container already exists
    let container = document.getElementById('modal-portal');
    
    if (!container) {
      // Create a new container if it doesn't exist
      container = document.createElement('div');
      container.id = 'modal-portal';
      document.body.appendChild(container);
    }
    
    portalRef.current = container as HTMLDivElement;
    
    // Clean up on unmount
    return () => {
      if (container && container.parentNode === document.body && !container.childElementCount) {
        document.body.removeChild(container);
      }
    };
  }, []);
  
  if (!showAnkiModal || !portalRef.current) return null;

  // Render the modal in the portal
  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      style={{ zIndex: 9999 }}
    >
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
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <p className="text-stone-600 mb-2">
              Select notes to export to Anki. Notes with cloze deletions will be converted to Anki cloze cards.
            </p>
            <p className="text-stone-600 mb-4">
              To create a cloze deletion, select text in a note and use the cloze button or press Alt+C.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map(note => (
              <div 
                key={note.id}
                className={`border rounded-md p-2 cursor-pointer ${
                  selectedNotesForAnki.includes(note.id) 
                    ? 'bg-blue-50 border-blue-300' 
                    : 'bg-white border-stone-200'
                }`}
                onClick={() => toggleNoteForAnki(note.id)}
              >
                <div className="text-sm mb-2 whitespace-pre-wrap">
                  {renderNoteWithCloze(note.content)}
                </div>
                <div className="text-xs text-stone-500">
                  Page {note.pageNumber}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-stone-200 flex justify-between items-center">
          <div className="text-stone-600">
            {selectedNotesForAnki.length} notes selected
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowAnkiModal(false)}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md border border-stone-300 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={exportToAnki}
              disabled={selectedNotesForAnki.length === 0}
              className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md border border-blue-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export to Anki
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalRef.current
  );
};

export default AnkiExportModal; 