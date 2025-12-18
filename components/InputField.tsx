import React from 'react';

interface InputFieldProps {
  label: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  type?: 'text' | 'select' | 'textarea';
  options?: string[]; // For select dropdowns
  list?: string[];    // For text input datalists
  required?: boolean;
  rows?: number;
  autoComplete?: string;
}

export const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  id, 
  value, 
  onChange, 
  placeholder, 
  type = 'text', 
  options = [],
  list = [],
  required = false,
  rows = 3,
  autoComplete = 'on'
}) => {
  const dataListId = list && list.length > 0 ? `${id}-list` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-slate-300">
        {label}
      </label>
      
      {type === 'select' ? (
        <div className="relative">
          <select
            id={id}
            value={value}
            onChange={onChange}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-slate-100 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 appearance-none"
            required={required}
            autoComplete={autoComplete}
          >
            <option value="" disabled className="text-slate-500">Select {label}</option>
            {options.map((opt) => (
              <option key={opt} value={opt} className="text-slate-100">{opt}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>
      ) : type === 'textarea' ? (
        <textarea
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
          required={required}
          autoComplete={autoComplete}
        />
      ) : (
        <>
          <input
            type="text"
            id={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            list={dataListId}
            autoComplete={autoComplete}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
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
      )}
    </div>
  );
};