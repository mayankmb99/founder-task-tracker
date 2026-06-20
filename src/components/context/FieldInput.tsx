"use client";

interface FieldInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}

export function FieldInput({
  label,
  value,
  onChange,
  multiline,
  placeholder,
}: FieldInputProps) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
      )}
    </div>
  );
}

interface ListFieldInputProps {
  label: string;
  helperText?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

// Stores an array of strings as one item per line in a textarea —
// simplest editable representation for a JSON array field.
export function ListFieldInput({
  label,
  helperText,
  values,
  onChange,
  placeholder,
}: ListFieldInputProps) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </label>
      {helperText && (
        <p className="mb-1 text-[11px] text-gray-400">{helperText}</p>
      )}
      <textarea
        value={values.join("\n")}
        onChange={(e) =>
          onChange(
            e.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
          )
        }
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}
