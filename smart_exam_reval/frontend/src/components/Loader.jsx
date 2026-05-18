import React from 'react';

const Loader = ({ size = 'medium', text, fullScreen = false }) => {
  // 1. Map sizes to CSS classes
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4'
  };

  // 2. Define the base loader spinner element
  // Ensure the border color matches the project's standard theme color (e.g., blue)
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className={`animate-spin rounded-full border-t-transparent border-blue-600 ${sizeClasses[size] || sizeClasses.medium}`}></div>
      {text && <p className="text-gray-600 text-sm font-medium">{text}</p>}
    </div>
  );

  // 3. Conditional fullScreen wrapper
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-80">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default Loader;