import React, { useState } from 'react';
import { Note } from './types';
import AnkiExportModal from './AnkiExportModal';

interface AnkiExportButtonProps {
  notes: Note[];
  className?: string;
}

const AnkiExportButton: React.FC<AnkiExportButtonProps> = ({ notes, className }) => {
  const [showAnkiModal, setShowAnkiModal] = useState(false);
  const [selectedNotesForAnki, setSelectedNotesForAnki] = useState<string[]>([]);
  
  const openAnkiExport = () => {
    setShowAnkiModal(true);
    setSelectedNotesForAnki([]);
  };
  
  const toggleNoteForAnki = (id: string) => {
    setSelectedNotesForAnki(prev => 
      prev.includes(id) 
        ? prev.filter(noteId => noteId !== id)
        : [...prev, id]
    );
  };
  
  const exportToAnki = () => {
    try {
      const selectedNotes = notes.filter(note => selectedNotesForAnki.includes(note.id));
      
      if (selectedNotes.length === 0) {
        alert('Please select at least one note to export.');
        return;
      }
      
      const ankiNotes = selectedNotes.map(note => {
        // For notes with cloze deletions
        if (note.content.includes('{{c')) {
          return {
            noteType: 'Cloze',
            fields: {
              Text: note.content,
              'Back Extra': `Source: Page ${note.pageNumber}`
            },
            tags: ['pdf-margin-notes']
          };
        }
        
        // For regular notes
        return {
          noteType: 'Basic',
          fields: {
            Front: `Page ${note.pageNumber} Note`,
            Back: note.content
          },
          tags: ['pdf-margin-notes']
        };
      });
      
      const ankiExport = {
        notes: ankiNotes
      };
      
      // Create and download the file
      const dataStr = JSON.stringify(ankiExport, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileName = `anki-export-${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();
      
      setShowAnkiModal(false);
      alert(`Successfully exported ${selectedNotes.length} notes for Anki!`);
    } catch (err) {
      console.error('Error exporting to Anki:', err);
      alert('Error exporting to Anki. Please try again.');
    }
  };
  
  // Function to render note content with cloze formatting
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

  return (
    <>
      <button
        onClick={openAnkiExport}
        className={className || "px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md border border-blue-300 text-sm font-medium transition-colors"}
      >
        Anki Export
      </button>
      
      <AnkiExportModal
        showAnkiModal={showAnkiModal}
        setShowAnkiModal={setShowAnkiModal}
        notes={notes}
        selectedNotesForAnki={selectedNotesForAnki}
        toggleNoteForAnki={toggleNoteForAnki}
        exportToAnki={exportToAnki}
        renderNoteWithCloze={renderNoteWithCloze}
      />
    </>
  );
};

export default AnkiExportButton; 