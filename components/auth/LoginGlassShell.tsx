"use client";

interface LoginGlassShellProps {
  children: React.ReactNode;
}

export function LoginGlassShell({ children }: LoginGlassShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-10%] h-[28rem] w-[28rem] rounded-full bg-[var(--ambient-1)] blur-[100px]" />
        <div className="absolute right-[-8%] top-[8%] h-[24rem] w-[24rem] rounded-full bg-[var(--ambient-2)] blur-[90px]" />
        <div className="absolute bottom-[-12%] left-[20%] h-[26rem] w-[26rem] rounded-full bg-[var(--ambient-3)] blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(1_0_0_/_0.35),transparent_45%),radial-gradient(circle_at_80%_0%,oklch(1_0_0_/_0.2),transparent_40%)] dark:bg-[radial-gradient(circle_at_20%_20%,oklch(1_0_0_/_0.06),transparent_45%),radial-gradient(circle_at_80%_0%,oklch(0.7_0.12_185_/_0.12),transparent_40%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="glass-strong w-full max-w-[440px] rounded-3xl p-1">
          <div className="rounded-[1.35rem] p-6 sm:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
