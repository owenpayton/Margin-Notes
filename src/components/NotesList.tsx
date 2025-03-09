import React, { RefObject, useEffect, useState, useRef } from 'react';
import { Note } from './types';
import NoteItem from './NoteItem';

interface NotesListProps {
  notes: Note[];
  currentPage: number;
  updateNoteContent: (id: string, content: string) => void;
  toggleNoteEditing: (id: string) => void;
  deleteNote: (id: string) => void;
  renderNoteWithCloze: (content: string) => React.ReactNode;
  notesContainerRef?: RefObject<HTMLDivElement>;
  activeNoteId: string | null;
  addClozeToNote?: (id: string, selectedText: string) => void;
}

const NotesList: React.FC<NotesListProps> = ({
  notes,
  currentPage,
  updateNoteContent,
  toggleNoteEditing,
  deleteNote,
  renderNoteWithCloze,
  notesContainerRef,
  activeNoteId,
  addClozeToNote
}) => {
  // Track newly created notes
  const [newNoteId, setNewNoteId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Filter notes for the current page
  const currentPageNotes = notes.filter(note => note.pageNumber === currentPage);
  
  // When activeNoteId changes, set it as the new note
  useEffect(() => {
    if (activeNoteId) {
      setNewNoteId(activeNoteId);
      
      // Clear the new note status after 3 seconds
      const timer = setTimeout(() => {
        setNewNoteId(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [activeNoteId]);
  
  // Handle clicks within the notes panel
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Find any note that's currently being edited
    const editingNote = notes.find(note => note.isEditing);
    if (!editingNote) return;
    
    // Check if the click was directly on the container (not on a note)
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('notes-container-inner')) {
      // If the note is empty, delete it
      if (!editingNote.content.trim()) {
        deleteNote(editingNote.id);
      } else {
        // Otherwise, save it by toggling edit mode off
        toggleNoteEditing(editingNote.id);
      }
    }
  };
  
  // Add a global click handler to save notes when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Find any note that's currently being edited
      const editingNote = notes.find(note => note.isEditing);
      if (!editingNote) return;
      
      // Check if the click was inside the notes container
      if (notesContainerRef?.current && !notesContainerRef.current.contains(e.target as Node)) {
        // If the note is empty, delete it
        if (!editingNote.content.trim()) {
          deleteNote(editingNote.id);
        } else {
          // Otherwise, save it by toggling edit mode off
          toggleNoteEditing(editingNote.id);
        }
      }
    };
    
    // Add the event listener
    document.addEventListener('mousedown', handleDocumentClick);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [notes, deleteNote, toggleNoteEditing, notesContainerRef]);

  return (
    <div 
      ref={notesContainerRef}
      className="w-64 bg-stone-50 border-l border-stone-200 flex flex-col h-full overflow-hidden relative flex-shrink-0 z-20"
    >
      <div className="absolute inset-0 pointer-events-none bg-grain opacity-8 z-10"></div>
      <div className="px-3 py-2 bg-stone-100 border-b border-stone-200">
        <h3 className="text-sm font-medium text-stone-700">Notes - Page {currentPage}</h3>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 notes-container-inner"
        onClick={handleContainerClick}
      >
        {currentPageNotes.map(note => (
          <NoteItem
            key={note.id}
            note={note}
            onEdit={toggleNoteEditing}
            onDelete={deleteNote}
            onContentChange={updateNoteContent}
            renderNoteWithCloze={renderNoteWithCloze}
            isNew={note.id === newNoteId}
            addClozeToNote={addClozeToNote}
          />
        ))}
        
        {currentPageNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-stone-400 text-sm text-center">
            <p>No notes on this page</p>
            <p className="mt-2">Click on the PDF to add a note</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesList; 