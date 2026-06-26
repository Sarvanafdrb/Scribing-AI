"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RecordingStudio } from "@/components/recording/RecordingStudio";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function RecordingPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return (
      <Card className="mx-auto mt-10 max-w-lg">
        <CardContent className="space-y-4 py-10 text-center">
          <p className="text-muted-foreground">
            Select a session to start recording.
          </p>
          <Link href="/sessions">
            <Button className="bg-blue-600 hover:bg-blue-700">
              Go to Sessions
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <RecordingStudio sessionId={sessionId} />;
}

export default function RecordingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <RecordingPageContent />
    </Suspense>
  );
}
