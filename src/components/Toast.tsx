"use client";

interface ToastProps {
  message: string;
}

export default function Toast({ message }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-gray-100 bg-white/95 px-4 py-3 text-sm font-medium text-gray-700 shadow-2xl backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <span className="text-base">🔔</span>
      {message}
    </div>
  );
}
