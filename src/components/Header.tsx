import React from 'react';
import { Note } from './types';

interface HeaderProps {
  isFileLoaded: boolean;
  notes: Note[];
  handleOpenClick: () => void;
  exportNotes: () => void;
  importNotesRef: React.RefObject<HTMLInputElement>;
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
  openAnkiExport: () => void;
}

const Header: React.FC<HeaderProps> = ({
  isFileLoaded,
  notes,
  handleOpenClick,
  exportNotes,
  importNotesRef,
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
  openAnkiExport
}) => {
  return (
    <div className="px-4 py-3 bg-stone-100 border-b border-stone-200 flex items-center justify-between relative z-20">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-medium text-stone-800">PDF Margin Notes</h1>
        <div className="flex space-x-2">
          <input type="file" className="hidden" onChange={() => {}} />
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
  );
};

export default Header;
