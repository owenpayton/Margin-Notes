import React from 'react';
import { Note } from './types';

interface ExportNotesButtonProps {
  notes: Note[];
  className?: string;
}

const ExportNotesButton: React.FC<ExportNotesButtonProps> = ({ notes, className }) => {
  const exportNotes = () => {
    try {
      const exportData = {
        notes,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileName = `pdf-notes-export-${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();
      
      alert('Notes exported successfully!');
    } catch (err) {
      console.error('Error exporting notes:', err);
      alert('Error exporting notes. Please try again.');
    }
  };

  return (
    <button
      onClick={exportNotes}
      className={className || "px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md border border-stone-300 text-sm font-medium transition-colors"}
    >
      Export Notes
    </button>
  );
};

export default ExportNotesButton; 