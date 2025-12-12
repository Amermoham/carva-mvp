
import React from 'react';
import { NAVIGATION_ITEMS } from '../constants';

interface HeaderProps {
  t: (key: string) => string;
}

export const Header: React.FC<HeaderProps> = ({ t }) => {
  return (
    <header className="w-full pt-6 pb-4 flex flex-col items-center">
      {/* Navigation Container */}
      <div className="flex items-center justify-center gap-4 sm:gap-8">
        {NAVIGATION_ITEMS.map((item, index) => (
          <React.Fragment key={item.id}>
            {/* Nav Item */}
            <div className="flex flex-col sm:flex-row items-center gap-2 group cursor-pointer">
              <span className="text-sm sm:text-base font-semibold text-[#2f5cd6] transition-colors duration-300 group-hover:text-[#193685] dark:text-[#4c7bf4] dark:group-hover:text-white">
                {t(item.labelKey)}
              </span>
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2f5cd6]/10 text-[#2f5cd6] font-bold text-lg transition-colors duration-300 group-hover:bg-[#193685] group-hover:text-white dark:bg-white/10 dark:text-[#4c7bf4]">
                {item.iconLetter}
              </div>
            </div>

            {/* Separator Line (Vertical) */}
            {index < NAVIGATION_ITEMS.length - 1 && (
              <div className="h-8 w-[2px] bg-[#2f5cd6] rounded-full opacity-50 dark:bg-[#4c7bf4]" />
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Horizontal Line below the header icons */}
      <div className="w-full max-w-4xl h-[1px] bg-[#2f5cd6] mt-4 opacity-30 dark:bg-[#4c7bf4]" />
    </header>
  );
};
