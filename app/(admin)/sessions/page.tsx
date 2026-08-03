"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionFilters } from "./components/SessionFilters";
import { SessionTable } from "./components/SessionTable";
import { SessionSkeleton } from "./components/SessionSkeleton";
import { useSessions } from "@/hooks/sessions/useSessions";

const PAGE_SIZE = 5;

export default function SessionsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sessionType, setSessionType] = useState("all");
  const [page, setPage] = useState(1);

  const {
    sessions,
    isLoading,
    error,
    total,
    totalPages,
    activeCount,
    statusCounts,
    refetch,
  } = useSessions({
    search,
    status: status === "all" ? undefined : status,
    sessionType: sessionType === "all" ? undefined : sessionType,
    page,
    limit: PAGE_SIZE,
  });

  useEffect(() => {
    setPage(1);
  }, [search, status, sessionType]);

  const handleClearFilters = () => {
    setSearch("");
    setStatus("all");
    setSessionType("all");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Consultations</h1>
          <p className="text-muted-foreground">
            Manage scribing consultations • {total} total
          </p>
        </div>
        <Link href="/sessions/create">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            New Consultation
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {activeCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statusCounts.recording}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {statusCounts.processing}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statusCounts.completed}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">
              {statusCounts.failed}
            </div>
          </CardContent>
        </Card>
      </div>

      <SessionFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        sessionType={sessionType}
        onSessionTypeChange={setSessionType}
        onClearFilters={handleClearFilters}
      />

      {isLoading ? (
        <SessionSkeleton count={5} />
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            Failed to load sessions.{" "}
            <Button variant="link" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <SessionTable
          sessions={sessions}
          onStatusChange={refetch}
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
