import React from 'react';

const LoadingSpinner = ({ size = 'medium', text = 'Loading...' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600">
      <div className="glass-card p-8 rounded-2xl text-center">
        <div className="flex justify-center mb-4">
          <div className={`${sizeClasses[size]} border-4 border-white/30 border-t-white rounded-full animate-spin`}></div>
        </div>
        <p className="text-white/80 font-medium">{text}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;