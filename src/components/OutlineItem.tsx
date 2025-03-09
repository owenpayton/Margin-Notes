import React, { useState, useEffect } from 'react';
import { PDFOutlineItem } from './types';

interface OutlineItemProps {
  item: PDFOutlineItem;
  level?: number;
  navigateToDestination: (dest: string | any[]) => Promise<void>;
  pdfDoc?: any; // PDF document for resolving destinations
}

const OutlineItem: React.FC<OutlineItemProps> = ({ 
  item, 
  level = 0, 
  navigateToDestination,
  pdfDoc
}) => {
  const [isClicked, setIsClicked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [pageNumber, setPageNumber] = useState<number | null>(null);
  const hasChildren = item.items && item.items.length > 0;

  // Extract page number from destination using PDF.js's proper methods
  useEffect(() => {
    const extractPageNumber = async () => {
      if (!item.dest || !pdfDoc) return;
      
      try {
        // For string destinations, we need to resolve them first
        if (typeof item.dest === 'string') {
          if (pdfDoc.getDestination) {
            try {
              // Get the explicit destination array
              const explicitDest = await pdfDoc.getDestination(item.dest);
              if (explicitDest && Array.isArray(explicitDest) && explicitDest.length > 0) {
                // Get the reference to the page
                const ref = explicitDest[0];
                
                // Use getPageIndex to convert ref to page index (0-based)
                if (pdfDoc.getPageIndex) {
                  const pageIndex = await pdfDoc.getPageIndex(ref);
                  // Convert to 1-based page number
                  setPageNumber(pageIndex + 1);
                }
              }
            } catch (err) {
              console.error('Error resolving named destination:', err);
            }
          }
        } 
        // For array destinations, the first element is the page reference
        else if (Array.isArray(item.dest) && item.dest.length > 0) {
          const ref = item.dest[0];
          
          if (ref && typeof ref === 'object') {
            try {
              // Use getPageIndex to convert ref to page index (0-based)
              if (pdfDoc.getPageIndex) {
                const pageIndex = await pdfDoc.getPageIndex(ref);
                // Convert to 1-based page number
                setPageNumber(pageIndex + 1);
              }
            } catch (err) {
              console.error('Error getting page index from reference:', err);
              
              // Fallback: try to use the num property if available
              if ('num' in ref) {
                // PDF.js internal page numbers are 0-based, add 1 for display
                setPageNumber(ref.num + 1);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error extracting page number:', err);
      }
    };
    
    extractPageNumber();
  }, [item.dest, pdfDoc]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Visual feedback
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 300);
    
    try {
      if (item.dest) {
        console.log('Outline item clicked:', item.title, 'with destination:', item.dest);
        await navigateToDestination(item.dest);
      } else if (item.url) {
        console.log('Opening URL:', item.url);
        window.open(item.url, item.newWindow ? '_blank' : '_self');
      } else {
        console.warn('Outline item has no destination or URL:', item.title);
        // If no destination but has children, just toggle expansion
        if (hasChildren) {
          setIsExpanded(!isExpanded);
        }
      }
    } catch (error) {
      console.error('Error handling outline item click:', error);
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Calculate indentation based on level
  const getIndentationClass = () => {
    if (level === 0) return '';
    
    // Use a more precise indentation system
    const indentSize = level * 12; // 12px per level
    return `ml-${indentSize}`;
  };

  return (
    <div className="outline-item">
      <div 
        className={`flex items-center justify-between py-1 px-2 hover:bg-stone-100 rounded cursor-pointer text-sm 
          ${getIndentationClass()} 
          ${isClicked ? 'bg-stone-200' : ''}`}
        style={{ paddingLeft: level > 0 ? `${level * 12 + 8}px` : '8px' }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick(e as unknown as React.MouseEvent);
          }
        }}
      >
        <div className="flex items-center overflow-hidden">
          {hasChildren && (
            <span 
              className="mr-1 text-stone-500 select-none flex-shrink-0 w-4"
              onClick={toggleExpand}
            >
              {isExpanded ? '▼' : '►'}
            </span>
          )}
          {!hasChildren && <span className="w-4 flex-shrink-0"></span>}
          <span className={`${item.bold ? 'font-bold' : ''} ${item.italic ? 'italic' : ''} truncate`}>
            {item.title}
          </span>
        </div>
        {pageNumber && (
          <span className="text-stone-400 text-xs ml-2 flex-shrink-0">
            {pageNumber}
          </span>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div className="outline-children">
          {item.items!.map((child, index) => (
            <OutlineItem 
              key={`${level}-${index}`}
              item={child} 
              level={level + 1} 
              navigateToDestination={navigateToDestination}
              pdfDoc={pdfDoc}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default OutlineItem;
