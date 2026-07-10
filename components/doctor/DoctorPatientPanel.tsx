"use client";

import {
  AlertTriangle,
  Calendar,
  Heart,
  Phone,
  Pill,
  Thermometer,
  User,
} from "lucide-react";
import { useSession } from "@/hooks/sessions/useSession";
import { useAiNotes } from "@/hooks/ai-notes/useAiNotes";
import {
  getPatientAge,
  getPatientFullName,
} from "@/utils/patient.utils";
import type { Patient } from "@/types/patient.types";
import { cn } from "@/lib/utils";

interface DoctorPatientPanelProps {
  sessionId: string;
}

const formatLastVisit = (dateStr?: string) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export function DoctorPatientPanel({ sessionId }: DoctorPatientPanelProps) {
  const { data: session } = useSession(sessionId);
  const { aiNotes } = useAiNotes(sessionId);

  const patient =
    session && typeof session.patientId === "object"
      ? (session.patientId as Patient)
      : null;

  const patientAge = getPatientAge(patient);
  const medications = aiNotes?.medications?.filter((m) => m.medicine) || [];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
          Patient Info
        </h3>
        <dl className="space-y-2.5 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-gray-400" />
            <dt className="text-gray-500">Name</dt>
            <dd className="ml-auto font-medium text-gray-800">
              {getPatientFullName(patient)}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            <dt className="text-gray-500">Age</dt>
            <dd className="ml-auto font-medium text-gray-800">
              {patientAge !== null ? `${patientAge} years` : "—"}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-gray-400" />
            <dt className="text-gray-500">Phone</dt>
            <dd className="ml-auto font-medium text-gray-800">
              {patient?.phoneNumber || "—"}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            <dt className="text-gray-500">Last Visit</dt>
            <dd className="ml-auto font-medium text-gray-800">
              {formatLastVisit(patient?.updatedAt)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <span className="text-sm font-medium text-red-700">Allergies</span>
        <span className="ml-auto text-xs text-red-600">Not recorded</span>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
          <Pill className="h-3.5 w-3.5" />
          Medications
        </h3>
        {medications.length > 0 ? (
          <ul className="space-y-1.5 text-sm text-gray-700">
            {medications.map((med, i) => (
              <li key={`${med.medicine}-${i}`} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                {med.medicine}
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-1.5 text-sm text-gray-500">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              No medications on file
            </li>
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
          Vitals Today
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <VitalCard
            label="Temp"
            value="—"
            icon={Thermometer}
            valueClassName="text-gray-500"
          />
          <VitalCard
            label="BP"
            value="—"
            icon={Heart}
            valueClassName="text-green-600"
          />
          <VitalCard
            label="HR"
            value="—"
            icon={Heart}
            valueClassName="text-green-600"
          />
          <VitalCard
            label="SpO2"
            value="—"
            icon={Heart}
            valueClassName="text-blue-600"
          />
        </div>
      </section>
    </div>
  );
}

function VitalCard({
  label,
  value,
  icon: Icon,
  valueClassName,
}: {
  label: string;
  value: string;
  icon: typeof Thermometer;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1 text-[10px] text-gray-400 uppercase">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={cn("text-sm font-semibold", valueClassName)}>{value}</p>
    </div>
  );
}
