"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatConfidence,
  formatLanguage,
  TranscriptData,
} from "@/types/transcript.types";
import { Globe2, Languages, Sparkles } from "lucide-react";

interface TranscriptMetadataPanelProps {
  transcript: TranscriptData;
}

export function TranscriptMetadataPanel({
  transcript,
}: TranscriptMetadataPanelProps) {
  const { metadata } = transcript;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Languages className="h-4 w-4 text-blue-600" />
          Language Metadata
        </CardTitle>
        <CardDescription>
          Detected languages, confidence, and translation info
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Primary Language</span>
          <Badge variant="outline">
            {formatLanguage(metadata.primaryLanguage || "en")}
          </Badge>
        </div>

        <div className="space-y-2">
          <span className="text-muted-foreground">Detected Languages</span>
          <div className="flex flex-wrap gap-2">
            {metadata.detectedLanguages.length > 0 ? (
              metadata.detectedLanguages.map((language) => (
                <Badge key={language} className="bg-blue-50 text-blue-700">
                  <Globe2 className="mr-1 h-3 w-3" />
                  {formatLanguage(language)}
                </Badge>
              ))
            ) : (
              <span>—</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Mixed Language</span>
          <Badge variant={metadata.isMixedLanguage ? "default" : "outline"}>
            {metadata.isMixedLanguage ? "Yes" : "No"}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Average Confidence</span>
          <Badge variant="outline">
            {formatConfidence(metadata.averageConfidence)}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Model</span>
          <span className="font-medium">{metadata.model}</span>
        </div>

        {metadata.translationLanguage && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Translation</span>
            <Badge className="bg-violet-100 text-violet-800">
              <Sparkles className="mr-1 h-3 w-3" />
              {formatLanguage(metadata.translationLanguage)}
            </Badge>
          </div>
        )}

        {metadata.processedAt && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Processed</span>
            <span>{new Date(metadata.processedAt).toLocaleString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
