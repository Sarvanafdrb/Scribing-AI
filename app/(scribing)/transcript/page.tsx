"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TranscriptViewer } from "@/components/transcript/TranscriptViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function TranscriptPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return (
      <Card className="mx-auto mt-10 max-w-lg">
        <CardContent className="space-y-4 py-10 text-center">
          <p className="text-muted-foreground">
            Select a session to view or generate its transcript.
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

  return <TranscriptViewer sessionId={sessionId} />;
}

export default function TranscriptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <TranscriptPageContent />
    </Suspense>
  );
}
