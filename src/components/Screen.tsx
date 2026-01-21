import type { ReactNode } from "react";

type ScreenProps = {
  children: ReactNode;
  className?: string;
};

export function Screen({ children, className }: ScreenProps) {
  return (
    <main className="min-h-[100dvh] bg-black text-white">
      <div
        className={`mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-6 px-6 pb-10 pt-6 ${
          className ?? ""
        }`}
      >
        {children}
      </div>
    </main>
  );
}
