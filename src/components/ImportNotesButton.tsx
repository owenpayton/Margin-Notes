import React, { useRef } from 'react';
import { Note, NOTE_COLORS, NOTE_ROTATIONS } from './types';

interface ImportNotesButtonProps {
  onImport: (notes: Note[]) => void;
  className?: string;
}

const ImportNotesButton: React.FC<ImportNotesButtonProps> = ({ onImport, className }) => {
  const importRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    importRef.current?.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
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
            
            onImport(importedNotes);
            alert(`Successfully imported ${importedNotes.length} notes!`);
            
            // Reset the input
            if (importRef.current) {
              importRef.current.value = '';
            }
          } else {
            throw new Error('Invalid notes format');
          }
        } catch (err) {
          console.error('Error parsing imported notes:', err);
          alert('The selected file does not contain valid notes data.');
        }
      };
      
      reader.readAsText(file);
    } catch (err) {
      console.error('Error importing notes:', err);
      alert('Error importing notes. Please try again.');
    }
  };

  return (
    <>
      <input
        type="file"
        ref={importRef}
        onChange={handleImport}
        accept="application/json"
        className="hidden"
      />
      <button
        onClick={handleClick}
        className={className || "px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md border border-stone-300 text-sm font-medium transition-colors"}
      >
        Import Notes
      </button>
    </>
  );
};

export default ImportNotesButton; 