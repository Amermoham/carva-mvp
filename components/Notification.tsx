
import React, { useEffect } from 'react';

interface NotificationProps {
  message: string;
  type?: 'error' | 'success';
  isVisible: boolean;
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, type = 'error', isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className="fixed top-10 left-1/2 transform -translate-x-1/2 z-[100] transition-all duration-300 opacity-100 translate-y-0 animate-fadeIn w-[90%] max-w-md">
      <div className={`${bgColor} text-white pl-6 pr-4 py-4 rounded-2xl shadow-2xl font-bold text-sm sm:text-base flex items-center justify-between gap-4 backdrop-blur-sm bg-opacity-95 border border-white/10`}>
        <div className="flex items-center gap-3">
            {type === 'success' ? (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                 </svg>
            ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
            )}
            <span>{message}</span>
        </div>
        
        {/* Manual Close Button */}
        <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0 cursor-pointer"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </div>
    </div>
  );
};
