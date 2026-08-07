"use client";

import { useState } from "react";
import { toast } from "sonner";
import { OrganizationInlineField } from "@/app/(admin)/organizations/components/OrganizationInlineField";
import { LinkCell } from "@/components/shared/LinkCell";
import { Badge } from "@/components/ui/badge";
import { SessionStatusBadge } from "@/app/(admin)/sessions/components/SessionStatusBadge";
import type { Patient } from "@/types/patient.types";
import type {
  Session,
  SessionOrganization,
  SessionStatus,
  SessionType,
  SessionUser,
  UpdateSessionData,
} from "@/types/session.types";
import {
  getPatientAge,
  getPatientFullName,
} from "@/utils/patient.utils";

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
};

const formatDuration = (seconds?: number) => {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
};

const formatSessionType = (type?: string) =>
  (type || "—")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const formatGender = (gender?: string) => {
  if (!gender) return "—";
  return gender.charAt(0).toUpperCase() + gender.slice(1);
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="glass rounded-2xl border border-border/60 p-4 sm:p-6">
    <h3 className="mb-3 text-base font-semibold text-foreground">{title}</h3>
    {children}
  </section>
);

const SESSION_TYPE_OPTIONS: { value: SessionType; label: string }[] = [
  { value: "consultation", label: "Consultation" },
  { value: "follow_up", label: "Follow Up" },
  { value: "diagnostic", label: "Diagnostic" },
  { value: "other", label: "Other" },
];

const SESSION_STATUS_OPTIONS: { value: SessionStatus; label: string }[] = [
  { value: "created", label: "Created" },
  { value: "recording", label: "Recording" },
  { value: "paused", label: "Paused" },
  { value: "interrupted", label: "Interrupted" },
  { value: "resumed", label: "Resumed" },
  { value: "uploading", label: "Uploading" },
  { value: "processing", label: "Processing" },
  { value: "transcript_ready", label: "Transcript Ready" },
  { value: "ai_notes_generated", label: "AI Notes Generated" },
  { value: "ready_for_review", label: "Ready For Review" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

interface SessionDetailsTabProps {
  session: Session;
  sessionId: string;
  canEdit: boolean;
  onUpdateField: (data: UpdateSessionData) => Promise<void>;
}

export function SessionDetailsTab({
  session,
  sessionId,
  canEdit,
  onUpdateField,
}: SessionDetailsTabProps) {
  const [savingField, setSavingField] = useState<string | null>(null);

  const org =
    typeof session.organizationId === "object"
      ? (session.organizationId as SessionOrganization)
      : null;
  const orgId =
    org?.id ||
    org?._id ||
    (typeof session.organizationId === "string" ? session.organizationId : "");

  const doctor =
    typeof session.userId === "object"
      ? (session.userId as SessionUser)
      : null;
  const doctorId =
    doctor?.id ||
    doctor?._id ||
    (typeof session.userId === "string" ? session.userId : "");

  const patient =
    typeof session.patientId === "object"
      ? (session.patientId as Patient)
      : null;
  const patientId =
    patient?.id ||
    patient?._id ||
    (typeof session.patientId === "string" ? session.patientId : "");

  const patientAge = getPatientAge(patient);
  const isActive = session.isActive !== false;

  const saveField = async (fieldKey: string, payload: UpdateSessionData) => {
    if (!canEdit) {
      toast.info("You don't have permission to edit this consultation.");
      return;
    }
    setSavingField(fieldKey);
    try {
      await onUpdateField(payload);
    } finally {
      setSavingField(null);
    }
  };

  return (
    <div className="space-y-4">
      <Section title="Consultation Information">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div className="space-y-0">
            <OrganizationInlineField
              label="Consultation Code"
              value={session.sessionCode || sessionId}
              editable={false}
              displayValue={
                <span className="font-mono text-xs">
                  {session.sessionCode || sessionId}
                </span>
              }
            />
            <OrganizationInlineField
              label="Title"
              value={session.title || ""}
              editable={canEdit}
              type="text"
              isSaving={savingField === "title"}
              onSave={async (value) => {
                if (!value.trim()) {
                  toast.error("Title is required.");
                  return;
                }
                await saveField("title", { title: value.trim() });
              }}
            />
            <OrganizationInlineField
              label="Session Type"
              value={session.sessionType || "consultation"}
              editable={canEdit}
              type="select"
              options={SESSION_TYPE_OPTIONS}
              isSaving={savingField === "sessionType"}
              onSave={async (value) => {
                await saveField("sessionType", {
                  sessionType: value as SessionType,
                });
              }}
              displayValue={
                <Badge variant="outline" className="rounded-full">
                  {formatSessionType(session.sessionType)}
                </Badge>
              }
            />
            <OrganizationInlineField
              label="Description"
              value={session.description || ""}
              editable={canEdit}
              type="textarea"
              isSaving={savingField === "description"}
              onSave={async (value) => {
                await saveField("description", {
                  description: value.trim() || undefined,
                });
              }}
              displayValue={session.description || "—"}
            />
          </div>

          <div className="space-y-0">
            <OrganizationInlineField
              label="Status"
              value={session.status}
              editable={canEdit}
              type="select"
              options={SESSION_STATUS_OPTIONS}
              isSaving={savingField === "status"}
              onSave={async (value) => {
                await saveField("status", {
                  status: value as SessionStatus,
                });
              }}
              displayValue={<SessionStatusBadge status={session.status} />}
            />
            <OrganizationInlineField
              label="Visit Type"
              value={session.visitType || ""}
              editable={false}
              displayValue={
                session.visitType
                  ? formatSessionType(session.visitType)
                  : "—"
              }
            />
            <OrganizationInlineField
              label="Active"
              value={isActive ? "active" : "inactive"}
              editable={canEdit}
              type="select"
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              isSaving={savingField === "isActive"}
              onSave={async (value) => {
                await saveField("isActive", { isActive: value === "active" });
              }}
              displayValue={
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className={isActive ? "bg-primary" : undefined}
                >
                  {isActive ? "Active" : "Inactive"}
                </Badge>
              }
            />
            <OrganizationInlineField
              label="Duration"
              value={formatDuration(session.duration || session.totalDuration)}
              editable={false}
            />
          </div>
        </div>
      </Section>

      <Section title="Patient">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div className="space-y-0">
            <OrganizationInlineField
              label="Patient Name"
              value={patient ? getPatientFullName(patient) : ""}
              editable={false}
              displayValue={
                patientId ? (
                  <LinkCell href={`/patients/${patientId}`}>
                    {patient ? getPatientFullName(patient) : patientId}
                  </LinkCell>
                ) : (
                  "—"
                )
              }
            />
            <OrganizationInlineField
              label="Patient Code"
              value={patient?.patientCode || ""}
              editable={false}
              displayValue={
                patientId && patient?.patientCode ? (
                  <LinkCell href={`/patients/${patientId}`} mono>
                    {patient.patientCode}
                  </LinkCell>
                ) : (
                  "—"
                )
              }
            />
          </div>
          <div className="space-y-0">
            <OrganizationInlineField
              label="Age / Gender"
              value=""
              editable={false}
              displayValue={
                <>
                  {patientAge !== null ? `${patientAge} years` : "—"}
                  {" · "}
                  {formatGender(patient?.gender)}
                </>
              }
            />
            <OrganizationInlineField
              label="Phone"
              value={patient?.phoneNumber || ""}
              editable={false}
              displayValue={patient?.phoneNumber || "—"}
            />
          </div>
        </div>
      </Section>

      <Section title="Doctor & Organization">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div className="space-y-0">
            <OrganizationInlineField
              label="Doctor"
              value={
                doctor
                  ? `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim()
                  : ""
              }
              editable={false}
              displayValue={
                doctorId ? (
                  <LinkCell href={`/users/${doctorId}`}>
                    {doctor
                      ? `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim() ||
                        doctor.email ||
                        doctorId
                      : doctorId}
                  </LinkCell>
                ) : (
                  "—"
                )
              }
            />
            <OrganizationInlineField
              label="Doctor Email"
              value={doctor?.email || ""}
              editable={false}
              displayValue={
                doctor?.email ? (
                  <a
                    href={`mailto:${doctor.email}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {doctor.email}
                  </a>
                ) : (
                  "—"
                )
              }
            />
          </div>
          <div className="space-y-0">
            <OrganizationInlineField
              label="Organization"
              value={org?.name || ""}
              editable={false}
              displayValue={
                orgId ? (
                  <LinkCell href={`/organizations/${orgId}`}>
                    {org?.name || orgId}
                  </LinkCell>
                ) : (
                  "—"
                )
              }
            />
            <OrganizationInlineField
              label="Organization Code"
              value={org?.organizationCode || ""}
              editable={false}
              displayValue={
                <span className="font-mono text-xs">
                  {org?.organizationCode || "—"}
                </span>
              }
            />
          </div>
        </div>
      </Section>

      <Section title="Timing & Record">
        <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div className="space-y-0">
            <OrganizationInlineField
              label="Started"
              value={formatDateTime(session.startedAt)}
              editable={false}
            />
            <OrganizationInlineField
              label="Completed"
              value={formatDateTime(session.completedAt)}
              editable={false}
            />
          </div>
          <div className="space-y-0">
            <OrganizationInlineField
              label="Created"
              value={formatDateTime(session.createdAt)}
              editable={false}
            />
            <OrganizationInlineField
              label="Last Updated"
              value={formatDateTime(session.updatedAt)}
              editable={false}
            />
          </div>
        </div>
      </Section>

      {(session.ward ||
        session.bed ||
        session.admittedDate ||
        session.disposition) && (
        <Section title="Admission / Encounter">
          <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
            <div className="space-y-0">
              <OrganizationInlineField
                label="Admitted Date"
                value={formatDateTime(session.admittedDate)}
                editable={false}
              />
              <OrganizationInlineField
                label="Ward / Bed"
                value=""
                editable={false}
                displayValue={
                  <>
                    {session.ward || "—"}
                    {" / "}
                    {session.bed || "—"}
                  </>
                }
              />
            </div>
            <div className="space-y-0">
              <OrganizationInlineField
                label="Disposition"
                value={session.disposition || ""}
                editable={false}
                displayValue={
                  session.disposition
                    ? formatSessionType(String(session.disposition))
                    : "—"
                }
              />
              <OrganizationInlineField
                label="Admission Day"
                value={
                  session.admissionDay != null
                    ? String(session.admissionDay)
                    : ""
                }
                editable={false}
                displayValue={
                  session.admissionDay != null
                    ? `Day ${session.admissionDay}`
                    : "—"
                }
              />
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
