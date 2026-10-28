import Link from "next/link";
import { Button } from "@/components/ui/button";
import { APPOINTMENT_FREE_RESCHEDULE_LIMIT } from "@/constants/appointment.constants";

interface RescheduleLimitNoticeProps {
  showBookLink?: boolean;
}

export function RescheduleLimitNotice({
  showBookLink = true,
}: RescheduleLimitNoticeProps) {
  return (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
      role="status"
    >
      <p className="font-medium">Reschedule limit reached</p>
      <p className="mt-2 text-amber-900/90">
        Each visit can be rescheduled up to {APPOINTMENT_FREE_RESCHEDULE_LIMIT}{" "}
        times. This appointment has reached that limit, so you cannot change the
        date again here.
      </p>
      <p className="mt-2 text-amber-900/90">
        If the patient missed this visit, treat it as a missed appointment and
        book a new consultation instead of rescheduling again.
      </p>
      {showBookLink ? (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="mt-3 rounded-full border-amber-300 bg-white hover:bg-amber-100"
        >
          <Link href="/appointments/create">Book new appointment</Link>
        </Button>
      ) : null}
    </div>
  );
}
