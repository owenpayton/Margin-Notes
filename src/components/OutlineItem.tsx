import React from 'react';
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
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (item.dest) {
      navigateToDestination(item.dest);
    } else if (item.url) {
      window.open(item.url, item.newWindow ? '_blank' : '_self');
    }
  };

  return (
    <div className="outline-item">
      <div 
        className={`flex items-center py-1 px-2 hover:bg-stone-100 rounded cursor-pointer text-sm ${level > 0 ? 'ml-' + (level * 3) : ''}`}
        onClick={handleClick}
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
