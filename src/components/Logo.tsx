import { HeartHandshake } from "lucide-react";

export default function Logo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Recreación aproximada del logo usando un ícono base */}
      <div className="relative flex items-center justify-center text-[#4FD1C5]">
        <HeartHandshake className="w-full h-full text-[#2B6CB0]" />
        <div className="absolute inset-0 flex items-center justify-center opacity-80 mix-blend-screen">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3/5 h-3/5 text-[#4FD1C5] transform -translate-y-2">
                <path d="M12 2C9.5 2 8 4 8 6C8 8.2 10.5 10.5 12 12C13.5 10.5 16 8.2 16 6C16 4 14.5 2 12 2ZM6 8C4 8 2 9.5 2 12C2 14.5 4.2 16 6 16C8.2 16 10.5 13.5 12 12C10.5 10.5 8.2 8 6 8ZM18 8C15.8 8 13.5 10.5 12 12C13.5 13.5 15.8 16 18 16C19.8 16 22 14.5 22 12C22 9.5 20 8 18 8ZM12 12C10.5 13.5 8.2 16 6 16C4.2 16 2 17.5 2 20C2 22.5 4 24 6 24C8.2 24 10.5 21.8 12 20C13.5 21.8 15.8 24 18 24C20 24 22 22.5 22 20C22 17.5 19.8 16 18 16C15.8 16 13.5 13.5 12 12Z" />
            </svg>
        </div>
      </div>
    </div>
  );
}
