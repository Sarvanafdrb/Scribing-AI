"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppointmentForm } from "../components/AppointmentForm";
import { useAppointmentMutations } from "@/hooks/appointments/useAppointmentMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import { healthcareGlass, healthcareSolid } from "@/lib/healthcare-ui";
import { cn } from "@/lib/utils";

export default function CreateAppointmentPage() {
  const router = useRouter();
  const { createAppointment } = useAppointmentMutations();
  const { canCreateAppointment } = useAccessControl();

  if (!canCreateAppointment()) {
    return (
      <div className="glass mx-auto max-w-xl rounded-3xl p-8 text-center">
        <h1 className="text-xl font-semibold text-foreground">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to schedule appointments.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/appointments">
          <Button
            variant="ghost"
            className={cn("rounded-xl pl-0", healthcareGlass.button)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Appointments
          </Button>
        </Link>
      </div>

      <Card className={healthcareSolid.formCard}>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-950/40">
              <CalendarDays className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Book Future Appointment</CardTitle>
              <CardDescription>
                Schedule a patient visit on a future date. On the day of the
                appointment, the doctor checks in from the workspace. For an
                immediate today consultation, use New Consultation instead.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AppointmentForm
            onSubmit={async (data) => {
              await createAppointment.mutateAsync(data);
              router.push("/appointments");
            }}
            isLoading={createAppointment.isPending}
            onCancel={() => router.push("/appointments")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
