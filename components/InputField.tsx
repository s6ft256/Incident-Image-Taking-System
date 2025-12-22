
import React, { memo } from 'react';

interface InputFieldProps {
  label: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  type?: 'text' | 'select' | 'textarea' | 'password';
  options?: string[];
  list?: string[];
  required?: boolean;
  rows?: number;
  autoComplete?: string;
  spellCheck?: boolean;
  autoCorrect?: "on" | "off";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
  touched?: boolean;
}

export const InputField: React.FC<InputFieldProps> = memo(({ 
  label, 
  id, 
  value, 
  onChange, 
  onBlur,
  placeholder, 
  type = 'text', 
  options = [],
  list = [],
  required = false,
  rows = 3,
  autoComplete = 'off',
  spellCheck = false,
  autoCorrect = "off",
  autoCapitalize = "sentences",
  error,
  touched
}) => {
  const dataListId = list && list.length > 0 ? `${id}-list` : undefined;
  const hasError = touched && !!error;

  const baseClasses = `w-full rounded-xl border px-4 py-3.5 outline-none transition-all duration-200 text-sm ${
    hasError 
      ? 'border-rose-500 ring-1 ring-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]' 
      : 'focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500'
  }`;
  
  const themeClasses = `bg-slate-900/40 text-slate-100 placeholder:text-slate-600 light-mode:bg-white light-mode:text-slate-900 ${
    !hasError ? 'border-slate-700 light-mode:border-slate-300' : ''
  }`;

  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <div className="relative">
            <select
              id={id}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              className={`${baseClasses} ${themeClasses} appearance-none pr-10`}
              required={required}
              autoComplete={autoComplete}
            >
              <option value="" disabled className="text-slate-500">Select {label}</option>
              {options.map((opt) => (
                <option key={opt} value={opt} className="text-slate-900">{opt}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
        );
      case 'textarea':
        return (
          <textarea
            id={id}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            rows={rows}
            spellCheck={spellCheck}
            autoCorrect={autoCorrect}
            autoCapitalize={autoCapitalize}
            className={`${baseClasses} ${themeClasses} resize-none min-h-[120px]`}
            required={required}
            autoComplete={autoComplete}
          />
        );
      case 'password':
        return (
          <input
            type="password"
            id={id}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            autoComplete={autoComplete}
            className={`${baseClasses} ${themeClasses}`}
            required={required}
          />
        );
      default:
        return (
          <>
            <input
              type="text"
              id={id}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              placeholder={placeholder}
              list={dataListId}
              autoComplete={autoComplete}
              spellCheck={spellCheck}
              autoCorrect={autoCorrect}
              autoCapitalize={autoCapitalize}
              className={`${baseClasses} ${themeClasses}`}
              required={required}
            />
            {dataListId && (
              <datalist id={dataListId}>
                {list.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            )}
          </>
        );
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center px-1">
        <label htmlFor={id} className={`text-[10px] font-black uppercase tracking-[0.2em] ${hasError ? 'text-rose-500' : 'text-slate-500'}`}>
          {label} {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      </div>
      {renderInput()}
      {hasError && (
        <span className="text-[9px] font-bold text-rose-500 animate-in fade-in slide-in-from-top-1 uppercase px-1 mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
});
