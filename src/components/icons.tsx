export function SourceIcon({ source, className }: { source: string; className?: string }) {
  switch (source) {
    case "Gmail":
      return (
        <span className={`inline-flex items-center justify-center rounded-md bg-red-100 text-red-600 ${className}`}>
          ✉️
        </span>
      );
    case "WhatsApp":
      return (
        <span className={`inline-flex items-center justify-center rounded-md bg-green-100 text-green-600 ${className}`}>
          💬
        </span>
      );
    case "Calendar":
      return (
        <span className={`inline-flex items-center justify-center rounded-md bg-blue-100 text-blue-600 ${className}`}>
          📅
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center justify-center rounded-md bg-gray-100 text-gray-600 ${className}`}>
          📝
        </span>
      );
  }
}
