import React from 'react';
import { PDFOutlineItem } from './types';
import OutlineItem from './OutlineItem';

interface OutlinePanelProps {
  showOutline: boolean;
  isFileLoaded: boolean;
  outline: PDFOutlineItem[] | null;
  setShowOutline: React.Dispatch<React.SetStateAction<boolean>>;
  navigateToDestination: (dest: string | any[]) => Promise<void>;
}

const OutlinePanel: React.FC<OutlinePanelProps> = ({
  showOutline,
  isFileLoaded,
  outline,
  setShowOutline,
  navigateToDestination
}) => {
  if (!showOutline || !isFileLoaded) return null;

  const hasOutline = outline && outline.length > 0;

  return (
    <div className="w-64 bg-stone-50 border-r border-stone-200 overflow-y-auto flex flex-col flex-shrink-0">
      <div className="px-4 py-3 border-b border-stone-200 flex justify-between items-center">
        <h2 className="font-medium text-stone-800">Table of Contents</h2>
        <button 
          onClick={() => setShowOutline(false)}
          className="text-stone-500 hover:text-stone-800 text-sm"
          aria-label="Close table of contents"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {hasOutline ? (
          <div className="space-y-1">
            {outline.map((item, index) => (
              <OutlineItem 
                key={`outline-item-${index}`}
                item={item} 
                navigateToDestination={navigateToDestination}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-stone-400 text-sm py-4">
            {outline === null ? 
              "Error loading table of contents" : 
              "No table of contents available"}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutlinePanel;
