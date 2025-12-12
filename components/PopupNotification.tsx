
import React, { useEffect, useState } from 'react';

interface PopupNotificationProps {
  title: string;
  message: string;
  isVisible: boolean;
  onClose: () => void;
  onClick?: () => void;
}

export const PopupNotification: React.FC<PopupNotificationProps> = ({ title, message, isVisible, onClose, onClick }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 300); // Wait for animation to finish before unmounting logic
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isVisible, onClose]);

  return (
    <div 
      onClick={onClick}
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] transition-all duration-500 ease-in-out cursor-pointer w-[90%] max-w-md ${show ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}
    >
      <div className="bg-white/90 dark:bg-[#1f2937]/95 backdrop-blur-md shadow-2xl rounded-2xl p-4 border border-gray-100 dark:border-gray-700 flex items-center gap-4">
        <div className="w-10 h-10 bg-[#2f5cd6] rounded-xl flex items-center justify-center text-white shrink-0 shadow-md">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
           </svg>
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-[#0a3461] dark:text-white text-sm">{title}</h4>
          <p className="text-gray-600 dark:text-gray-300 text-xs line-clamp-2">{message}</p>
        </div>
        <div className="shrink-0">
           <span className="text-xs text-gray-400">Now</span>
        </div>
      </div>
    </div>
  );
};
