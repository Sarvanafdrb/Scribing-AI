"use client";

import { DoctorTopBar } from "@/components/doctor/DoctorTopBar";

interface DoctorShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function DoctorShell({ children, title, description, actions }: DoctorShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DoctorTopBar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {title ? (
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{title}</h2>
              {description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
