import React from 'react';
import { Note } from './types';
import NoteItem from './NoteItem';

interface AllNotesSidebarProps {
  notes: Note[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  setActiveNoteId: (id: string | null) => void;
  renderNoteWithCloze: (content: string) => React.ReactNode;
  toggleNoteEditing: (id: string) => void;
  updateNoteContent: (id: string, content: string) => void;
  deleteNote: (id: string) => void;
  addClozeToNote?: (id: string, selectedText: string) => void;
}

const AllNotesSidebar: React.FC<AllNotesSidebarProps> = ({
  notes,
  currentPage,
  setCurrentPage,
  setActiveNoteId,
  renderNoteWithCloze,
  toggleNoteEditing,
  updateNoteContent,
  deleteNote,
  addClozeToNote
}) => {
  // Handle clicking on a note in the sidebar
  const handleNoteClick = (note: Note) => {
    // First, navigate to the note's page if needed
    if (note.pageNumber !== currentPage) {
      setCurrentPage(note.pageNumber);
    }
    
    // Set this as the active note
    setActiveNoteId(note.id);
    
    // Put the note in edit mode
    toggleNoteEditing(note.id);
  };

  return (
    <div className="w-64 bg-stone-50 border-l border-stone-200 overflow-y-auto flex-shrink-0 z-20">
      <div className="px-4 py-3 border-b border-stone-200">
        <h2 className="font-medium text-stone-800">All Notes</h2>
      </div>
      
      <div className="p-3 space-y-3">
        {notes.length > 0 ? notes.map(note => (
          <NoteItem
            key={note.id}
            note={note}
            isCurrentPage={note.pageNumber === currentPage}
            onClick={() => handleNoteClick(note)}
            onEdit={toggleNoteEditing}
            onDelete={deleteNote}
            onContentChange={updateNoteContent}
            renderNoteWithCloze={renderNoteWithCloze}
            addClozeToNote={addClozeToNote}
          />
        )) : (
          <div className="text-center text-stone-400 text-sm py-4">
            No notes yet
          </div>
        )}
      </div>
    </div>
  );
};

export default AllNotesSidebar; 