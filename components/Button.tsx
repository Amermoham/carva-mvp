import React from 'react';
import { THEME_COLORS } from '../constants';

interface ButtonProps {
  children: React.ReactNode;
  variant: 'primary' | 'secondary';
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({ children, variant, onClick }) => {
  const baseStyles = "w-64 py-3 px-6 rounded-2xl text-lg font-bold transition-all duration-300 ease-in-out cursor-pointer text-center select-none shadow-lg active:scale-95";
  
  // Using inline styles for specific colors to ensure exact hex match from prompt
  // Tailwind arbitrary values are cleanest here for the hover state request.
  // Primary Hover: turns to dark blue
  // Secondary Hover: turns to dark blue bg, white text
  
  const primaryClasses = `bg-[#2f5cd6] text-white border-2 border-[#2f5cd6] hover:bg-[#193685] hover:border-[#193685]`;
  const secondaryClasses = `bg-white text-[#2f5cd6] border-2 border-[#2f5cd6] hover:bg-[#193685] hover:text-white hover:border-[#193685]`;

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variant === 'primary' ? primaryClasses : secondaryClasses}`}
    >
      {children}
    </button>
  );
};