import React, { useState } from 'react';
import { PDFOutlineItem } from './types';

interface OutlineItemProps {
  item: PDFOutlineItem;
  level?: number;
  navigateToDestination: (dest: string | any[]) => Promise<void>;
}

const OutlineItem: React.FC<OutlineItemProps> = ({ 
  item, 
  level = 0, 
  navigateToDestination 
}) => {
  const [isClicked, setIsClicked] = useState(false);

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
      }
    } catch (error) {
      console.error('Error handling outline item click:', error);
    }
  };

  return (
    <div className="outline-item">
      <div 
        className={`flex items-center py-1 px-2 hover:bg-stone-100 rounded cursor-pointer text-sm 
          ${level > 0 ? 'ml-' + (level * 3) : ''} 
          ${isClicked ? 'bg-stone-200' : ''}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick(e as unknown as React.MouseEvent);
          }
        }}
      >
        <span className={`${item.bold ? 'font-bold' : ''} ${item.italic ? 'italic' : ''} truncate`}>
          {item.title}
        </span>
      </div>
      {item.items && item.items.length > 0 && (
        <div className="outline-children">
          {item.items.map((child, index) => (
            <OutlineItem 
              key={index} 
              item={child} 
              level={level + 1} 
              navigateToDestination={navigateToDestination}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default OutlineItem;
