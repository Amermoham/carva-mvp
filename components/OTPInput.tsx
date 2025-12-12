
import React, { useRef, useEffect } from 'react';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  isError?: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({ 
  length = 6, 
  value, 
  onChange,
  isError = false
}) => {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Reset inputs if value is cleared externally
    if (value === '') {
        inputs.current[0]?.focus();
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const char = e.target.value;
    if (isNaN(Number(char))) return;

    // Construct new OTP string
    const newValue = value.split('');
    newValue[idx] = char.substring(char.length - 1);
    const finalValue = newValue.join('');
    
    onChange(finalValue);

    // Move focus to next input if typing a character
    if (char.length > 0 && idx < length - 1) {
      inputs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      // Move back if backspacing an empty field
      inputs.current[idx - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2 sm:gap-4 justify-center" style={{ direction: 'ltr' }}>
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => { inputs.current[idx] = el; }}
          type="text"
          maxLength={1}
          value={value[idx] || ''}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          className={`w-10 h-14 sm:w-14 sm:h-20 text-2xl font-bold text-center rounded-2xl border-2 outline-none transition-all duration-500
            ${isError 
              ? 'border-red-500 text-red-500 bg-red-50 dark:bg-red-900/20' 
              : 'border-[#2f5cd6] dark:border-[#4c7bf4] text-[#2f5cd6] dark:text-[#4c7bf4] bg-white dark:bg-[#1f2937] focus:bg-[#2f5cd6]/5 dark:focus:bg-[#4c7bf4]/10'
            }
          `}
        />
      ))}
    </div>
  );
};
