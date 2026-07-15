import type { FieldError } from "react-hook-form";

interface FormFieldProps {
  label: string;
  error?: FieldError;
  required?: boolean;
  children: React.ReactNode;
  icon?: string;
  id?: string;
}

export function FormField({ label, error, required, children, icon, id }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {label}
        {required && <span className="text-destructive font-bold">*</span>}
      </label>
      {icon ? (
        <div className="relative flex items-center w-full">
          <span className="absolute left-3.5 text-base text-muted-foreground pointer-events-none z-10">{icon}</span>
          <div className="w-full [&>input]:pl-10 [&>select]:pl-10 [&>textarea]:pl-10">
            {children}
          </div>
        </div>
      ) : (
        <div className="w-full">
          {children}
        </div>
      )}
      {error && (
        <span className="text-xs text-destructive font-medium flex items-center gap-1 mt-0.5 animate-fade-in" role="alert">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error.message}
        </span>
      )}
    </div>
  );
}
