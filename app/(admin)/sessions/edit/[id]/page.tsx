"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SessionForm } from "../../components/SessionForm";
import { useSessionMutations } from "@/hooks/sessions/useSessionMutations";
import { useSession } from "@/hooks/sessions/useSession";
import { CreateSessionData, UpdateSessionData } from "@/types/session.types";

export default function EditSessionPage() {
  const { id } = useParams();
  const router = useRouter();
  const sessionId = id as string;
  const { data: session, isLoading } = useSession(sessionId);
  const { updateSession } = useSessionMutations();

  const handleSubmit = async (data: CreateSessionData | UpdateSessionData) => {
    await updateSession.mutateAsync({
      id: sessionId,
      data: data as UpdateSessionData,
    });
    router.push(`/sessions/${sessionId}`);
  };

  if (isLoading) {
    return <div className="animate-pulse p-6">Loading session...</div>;
  }

  if (!session) {
    return <div className="p-6">Session not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/sessions/${sessionId}`}>
          <Button variant="ghost" className="pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Session Details
          </Button>
        </Link>
      </div>

      <Card className="border-blue-100">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Edit className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Edit Session</CardTitle>
              <CardDescription>Update {session.title}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SessionForm
            key={session.id || session._id}
            initialData={session}
            onSubmit={handleSubmit}
            isLoading={updateSession.isPending}
            submitLabel="Update Session"
            onCancel={() => router.push(`/sessions/${sessionId}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
