import React from 'react';

interface ErrorDisplayProps {
  error: string | null;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  if (!error) return null;
  
  return (
    <p className="text-rose-600 bg-rose-50 p-3 rounded-md border border-rose-200 mt-4">
      {error}
    </p>
  );
};

export default ErrorDisplay; 