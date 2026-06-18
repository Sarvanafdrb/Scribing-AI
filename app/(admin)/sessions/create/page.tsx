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

export default function CreateSessionPage() {
  const router = useRouter();
  const { createSession } = useSessionMutations();

  const handleSubmit = async (data: CreateSessionData | UpdateSessionData) => {
    await createSession.mutateAsync(data as CreateSessionData);
    router.push("/sessions");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/sessions">
          <Button variant="ghost" className="pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sessions
          </Button>
        </Link>
      </div>

      <Card className="border-blue-100">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Create Session</CardTitle>
              <CardDescription>
                Start a new scribing session for a user
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SessionForm
            onSubmit={handleSubmit}
            isLoading={createSession.isPending}
            submitLabel="Create Session"
          />
        </CardContent>
      </Card>
    </div>
  );
}
