import React, { useEffect, useRef } from 'react';
import { PDFOutlineItem } from './types';
import OutlineItem from './OutlineItem';

interface OutlinePanelProps {
  showOutline: boolean;
  isFileLoaded: boolean;
  outline: PDFOutlineItem[] | null;
  setShowOutline: React.Dispatch<React.SetStateAction<boolean>>;
  navigateToDestination: (dest: string | any[]) => Promise<void>;
  pdfDoc: any;
}

const OutlinePanel: React.FC<OutlinePanelProps> = ({
  showOutline,
  isFileLoaded,
  outline,
  setShowOutline,
  navigateToDestination,
  pdfDoc
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close panel on mobile/small screens
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current && 
        !panelRef.current.contains(event.target as Node) && 
        window.innerWidth < 768
      ) {
        setShowOutline(false);
      }
    };

    if (showOutline) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOutline, setShowOutline]);

  if (!showOutline || !isFileLoaded) return null;

  const hasOutline = outline && outline.length > 0;

  return (
    <div 
      ref={panelRef}
      className="w-72 bg-stone-50 border-r border-stone-200 overflow-hidden flex flex-col flex-shrink-0 shadow-md z-10"
    >
      <div className="px-4 py-3 border-b border-stone-200 flex justify-between items-center sticky top-0 bg-stone-50 z-10">
        <h2 className="font-medium text-stone-800">Table of Contents</h2>
        <button 
          onClick={() => setShowOutline(false)}
          className="text-stone-500 hover:text-stone-800 text-sm p-1 rounded hover:bg-stone-100"
          aria-label="Close table of contents"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 pb-20">
        {hasOutline ? (
          <div className="space-y-0.5">
            {outline.map((item, index) => (
              <OutlineItem 
                key={`outline-root-${index}`}
                item={item} 
                navigateToDestination={navigateToDestination}
                pdfDoc={pdfDoc}
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
