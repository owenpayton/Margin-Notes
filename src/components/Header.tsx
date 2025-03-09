import React, { useState } from 'react';
import { Note } from './types';
import ImportNotesButton from './ImportNotesButton';
import ExportNotesButton from './ExportNotesButton';
import AnkiExportButton from './AnkiExportButton';

interface HeaderProps {
  isFileLoaded: boolean;
  notes: Note[];
  handleOpenClick: () => void;
  handleImportNotes: (notes: Note[]) => void;
  clearAllData: () => void;
  currentPage: number;
  totalPages: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  goToPrevPage: () => void;
  goToNextPage: () => void;
  scale: number;
  showOutline: boolean;
  setShowOutline: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

const Header: React.FC<HeaderProps> = ({
  isFileLoaded,
  notes,
  handleOpenClick,
  handleImportNotes,
  clearAllData,
  currentPage,
  totalPages,
  zoomIn,
  zoomOut,
  resetZoom,
  goToPrevPage,
  goToNextPage,
  scale,
  showOutline,
  setShowOutline,
  setCurrentPage
}) => {
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [editedPage, setEditedPage] = useState('');

  const handlePageDoubleClick = () => {
    setIsEditingPage(true);
    setEditedPage(currentPage.toString());
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) { // Only allow digits
      setEditedPage(value);
    }
  };

  const handlePageInputBlur = () => {
    const newPage = parseInt(editedPage);
    if (!isNaN(newPage) && newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
    setIsEditingPage(false);
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageInputBlur();
    } else if (e.key === 'Escape') {
      setIsEditingPage(false);
    }
  };

  return (
    <div className="px-4 py-3 bg-stone-100 border-b border-stone-200 flex items-center justify-between relative z-20">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-medium text-stone-800">PDF Margin Notes</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleOpenClick}
            className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md border border-amber-300 text-sm font-medium transition-colors"
          >
            Open PDF
          </button>
          {notes.length > 0 && (
            <>
              <ExportNotesButton notes={notes} />
              <ImportNotesButton onImport={handleImportNotes} />
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
            <span 
              className="px-2 py-1 text-xs text-stone-600"
              onDoubleClick={handlePageDoubleClick}
            >
              {isEditingPage ? (
                <input
                  type="text"
                  value={editedPage}
                  onChange={handlePageInputChange}
                  onBlur={handlePageInputBlur}
                  onKeyDown={handlePageInputKeyDown}
                  className="w-12 bg-white rounded border border-stone-300 px-1 py-0.5 text-center focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              ) : (
                `${currentPage} / ${totalPages}`
              )}
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
          <AnkiExportButton notes={notes} />
        </div>
      )}
    </div>
  );
};

export default Header;
