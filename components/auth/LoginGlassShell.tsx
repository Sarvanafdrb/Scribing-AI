"use client";

interface LoginGlassShellProps {
  children: React.ReactNode;
}

export function LoginGlassShell({ children }: LoginGlassShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#e8eef8]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-10%] h-[28rem] w-[28rem] rounded-full bg-[#5b8def]/35 blur-[100px]" />
        <div className="absolute right-[-8%] top-[8%] h-[24rem] w-[24rem] rounded-full bg-[#7eb8ff]/30 blur-[90px]" />
        <div className="absolute bottom-[-12%] left-[20%] h-[26rem] w-[26rem] rounded-full bg-[#3d6fd4]/25 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.55),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.35),transparent_40%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px]">{children}</div>
      </div>
    </div>
  );
}
