"use client";

import {
  AlertTriangle,
  Calendar,
  Droplets,
  Heart,
  Phone,
  Pill,
  Scale,
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
import type { LastVisit, SessionVitals } from "@/types/session.types";
import {
  formatAdmissionDate,
  getAdmissionDay,
  getAttendingDoctorName,
  getBed,
  getEncounterType,
  getWard,
} from "@/utils/encounter.utils";
import { cn } from "@/lib/utils";

interface DoctorPatientPanelProps {
  sessionId: string;
}

const formatSessionTypeLabel = (type?: string) => {
  if (!type) return "";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatLastVisit = (lastVisit?: LastVisit | null) => {
  if (!lastVisit?.date) return "First Visit";

  const dateLabel = new Date(lastVisit.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const typeLabel = formatSessionTypeLabel(lastVisit.sessionType);
  return typeLabel ? `${dateLabel} • ${typeLabel}` : dateLabel;
};

const formatTemperature = (temperature?: number) =>
  temperature === undefined || temperature === null ? "—" : `${temperature}°F`;

const formatBloodPressure = (vitals?: SessionVitals) => {
  const systolic = vitals?.bloodPressure?.systolic;
  const diastolic = vitals?.bloodPressure?.diastolic;
  if (systolic === undefined || diastolic === undefined) return "—";
  return `${systolic}/${diastolic} mmHg`;
};

const formatHeartRate = (heartRate?: number) =>
  heartRate === undefined || heartRate === null ? "—" : `${heartRate} bpm`;

const formatSpo2 = (spo2?: number) =>
  spo2 === undefined || spo2 === null ? "—" : `${spo2}%`;

const formatWeight = (weight?: number) =>
  weight === undefined || weight === null ? "—" : `${weight} kg`;

export function DoctorPatientPanel({ sessionId }: DoctorPatientPanelProps) {
  const { data: session } = useSession(sessionId);
  const { aiNotes } = useAiNotes(sessionId);

  const patient =
    session && typeof session.patientId === "object"
      ? (session.patientId as Patient)
      : null;

  const patientAge = getPatientAge(patient);
  const medications = aiNotes?.medications?.filter((m) => m.medicine) || [];
  const allergies =
    patient?.allergies?.map((allergy) => allergy.trim()).filter(Boolean) || [];
  const vitals = session?.vitals;
  const temperatureValue = formatTemperature(vitals?.temperature);
  const bloodPressureValue = formatBloodPressure(vitals);
  const heartRateValue = formatHeartRate(vitals?.heartRate);
  const spo2Value = formatSpo2(vitals?.spo2);
  const weightValue = formatWeight(vitals?.weight);
  const isIp = getEncounterType(session) === "IP";
  const admissionDate =
    session?.encounter?.admission?.admittedAt || session?.admittedDate;

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
            <Droplets className="h-3.5 w-3.5 text-gray-400" />
            <dt className="text-gray-500">Blood Group</dt>
            <dd className="ml-auto font-medium text-gray-800">
              {patient?.bloodGroup || "—"}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            <dt className="text-gray-500">Last Visit</dt>
            <dd className="ml-auto font-medium text-gray-800">
              {formatLastVisit(session?.lastVisit)}
            </dd>
          </div>

          {isIp && (
            <>
              <div className="my-1 border-t border-gray-100 pt-2" />
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-sky-500" />
                <dt className="text-gray-500">Admission Date</dt>
                <dd className="ml-auto font-medium text-gray-800">
                  {formatAdmissionDate(admissionDate)}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-sky-500" />
                <dt className="text-gray-500">Admission Day</dt>
                <dd className="ml-auto font-medium text-gray-800">
                  Day {getAdmissionDay(session)}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-sky-500" />
                <dt className="text-gray-500">Ward</dt>
                <dd className="ml-auto font-medium text-gray-800">
                  {getWard(session) || "—"}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-sky-500" />
                <dt className="text-gray-500">Bed</dt>
                <dd className="ml-auto font-medium text-gray-800">
                  {getBed(session) || "—"}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-sky-500" />
                <dt className="text-gray-500">Attending Doctor</dt>
                <dd className="ml-auto font-medium text-gray-800">
                  {getAttendingDoctorName(session) || "—"}
                </dd>
              </div>
            </>
          )}
        </dl>
      </section>

      <section className="rounded-xl border border-red-100 bg-red-50 px-3 py-3">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-sm font-medium text-red-700">Allergies</span>
        </div>
        {allergies.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {allergies.map((allergy) => (
              <span
                key={allergy}
                className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
              >
                {allergy}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-red-600">No allergies recorded.</p>
        )}
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
            value={temperatureValue}
            icon={Thermometer}
            valueClassName={
              temperatureValue === "—" ? "text-gray-500" : "text-gray-800"
            }
          />
          <VitalCard
            label="BP"
            value={bloodPressureValue}
            icon={Heart}
            valueClassName={
              bloodPressureValue === "—" ? "text-gray-500" : "text-green-600"
            }
          />
          <VitalCard
            label="HR"
            value={heartRateValue}
            icon={Heart}
            valueClassName={
              heartRateValue === "—" ? "text-gray-500" : "text-green-600"
            }
          />
          <VitalCard
            label="SpO2"
            value={spo2Value}
            icon={Heart}
            valueClassName={
              spo2Value === "—" ? "text-gray-500" : "text-blue-600"
            }
          />
          <VitalCard
            label="Weight"
            value={weightValue}
            icon={Scale}
            valueClassName={
              weightValue === "—" ? "text-gray-500" : "text-gray-800"
            }
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
