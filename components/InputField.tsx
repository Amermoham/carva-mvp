import React, { useState } from 'react';

interface InputFieldProps {
  label: string;
  hint?: string;
  type?: string;
  value: string;
  placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  dir?: 'rtl' | 'ltr';
}

export const InputField: React.FC<InputFieldProps> = ({ 
  label,
  hint,
  type = "text", 
  value, 
  onChange,
  placeholder,
  dir = 'rtl'
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="w-full flex flex-col gap-2">
      <div className={`flex items-baseline gap-2 ${dir === 'rtl' ? 'flex-row' : 'flex-row-reverse justify-end'}`}>
        <label className={`text-[#2f5cd6] dark:text-[#4c7bf4] font-bold text-lg ${dir === 'rtl' ? 'text-right pr-2' : 'text-left pl-2'}`}>
          {label}
        </label>
        {hint && (
          <span className="text-xs text-gray-400 font-normal">
            {hint}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          dir="auto"
          className={`w-full p-4 rounded-2xl border-2 border-[#2f5cd6]/30 dark:border-[#4c7bf4]/30 focus:border-[#2f5cd6] dark:focus:border-[#4c7bf4] outline-none transition-all duration-300 bg-white dark:bg-[#1f2937] text-lg shadow-md placeholder-gray-300 dark:placeholder-gray-600 text-[#2f5cd6] dark:text-[#4c7bf4] ${dir === 'rtl' ? 'text-right' : 'text-left'} ${isPassword ? (dir === 'rtl' ? 'pl-14' : 'pr-14') : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#2f5cd6] dark:hover:text-[#4c7bf4] transition-colors p-2 ${dir === 'rtl' ? 'left-3' : 'right-3'}`}
            tabIndex={-1}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};