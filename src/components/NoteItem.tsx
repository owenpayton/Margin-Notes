import React, { useEffect, useRef, useState } from 'react';
import { Note } from './types';

interface NoteItemProps {
  note: Note;
  isCurrentPage?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onContentChange?: (id: string, content: string) => void;
  onClick?: () => void;
  renderNoteWithCloze: (content: string) => React.ReactNode;
  isNew?: boolean;
  addClozeToNote?: (id: string, selectedText: string) => void;
}

const NoteItem: React.FC<NoteItemProps> = ({
  note,
  isCurrentPage = true,
  onEdit,
  onDelete,
  onContentChange,
  onClick,
  renderNoteWithCloze,
  isNew = false,
  addClozeToNote
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  
  // Focus the textarea when in editing mode
  useEffect(() => {
    if (note.isEditing && textareaRef.current) {
      // Use a small timeout to ensure the DOM is ready
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          
          // Place cursor at the end of text
          const length = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(length, length);
          
          // If it's a new note, scroll it into view
          if (isNew) {
            textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 50);
    }
  }, [note.isEditing, isNew]);

  // Track text selection in the textarea
  const handleTextareaSelect = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        setSelectedText(textareaRef.current.value.substring(start, end));
      } else {
        setSelectedText('');
      }
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onContentChange) {
      onContentChange(note.id, e.target.value);
    }
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(note.id);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(note.id);
    }
  };

  const handleMakeClozeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (addClozeToNote && selectedText && textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      
      // Save the current selection
      const currentSelection = {
        start,
        end,
        text: selectedText
      };
      
      // Apply the cloze
      addClozeToNote(note.id, selectedText);
      
      // Clear the selection state
      setSelectedText('');
      
      // Re-focus the textarea after a short delay
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 50);
    }
  };

  return (
    <div 
      className={`p-3 border rounded-md shadow-sm ${isCurrentPage ? note.color : 'bg-white border-stone-200'} ${note.rotation} transition-all ${isNew ? 'ring-2 ring-amber-400' : ''}`}
      style={{ overflow: 'hidden' }}
      onClick={onClick}
      id={`note-${note.id}`}
    >
      {note.isEditing ? (
        <div className="flex flex-col space-y-2">
          <textarea
            ref={textareaRef}
            value={note.content}
            onChange={handleContentChange}
            onSelect={handleTextareaSelect}
            className="w-full min-h-24 bg-transparent outline-none border-0 focus:ring-0 focus:border-0 focus:outline-none resize-none font-serif text-sm appearance-none"
            placeholder="Write your note here..."
          />
          {addClozeToNote && (
            <div className="flex justify-end">
              <button
                onClick={handleMakeClozeClick}
                disabled={!selectedText}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedText 
                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                title={selectedText ? 'Convert selected text to cloze' : 'Select text first'}
              >
                Make Cloze
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div 
            className="min-h-12 text-sm whitespace-pre-wrap mb-2 cursor-text"
            onClick={handleViewClick}
          >
            {note.content ? renderNoteWithCloze(note.content) : <span className="text-stone-400 italic">Empty note</span>}
          </div>
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Page {note.pageNumber}</span>
            {onDelete && isCurrentPage ? (
              <button 
                onClick={handleDeleteClick}
                className="text-rose-600 hover:text-rose-800"
              >
                Delete
              </button>
            ) : (
              <span>{new Date(note.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NoteItem; 