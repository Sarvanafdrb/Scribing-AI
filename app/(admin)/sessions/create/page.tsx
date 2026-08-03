"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SessionForm } from "../components/SessionForm";
import { useSessionMutations } from "@/hooks/sessions/useSessionMutations";
import { CreateSessionData, UpdateSessionData } from "@/types/session.types";
import { healthcareGlass, healthcareSolid } from "@/lib/healthcare-ui";
import { cn } from "@/lib/utils";

export default function CreateSessionPage() {
  const router = useRouter();
  const { createSession } = useSessionMutations();

  const handleSubmit = async (data: CreateSessionData | UpdateSessionData) => {
    await createSession.mutateAsync(data as CreateSessionData);
    router.push("/sessions");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/sessions">
          <Button
            variant="ghost"
            className={cn("rounded-xl pl-0", healthcareGlass.button)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Consultations
          </Button>
        </Link>
      </div>

      <Card className={healthcareSolid.formCard}>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 p-3">
              <Mic className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Schedule Consultation</CardTitle>
              <CardDescription>
                Select patient, doctor, and consultation type. Consultation code
                and title are generated automatically.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SessionForm
            onSubmit={handleSubmit}
            isLoading={createSession.isPending}
            submitLabel="Create Consultation"
          />
        </CardContent>
      </Card>
    </div>
  );
}
