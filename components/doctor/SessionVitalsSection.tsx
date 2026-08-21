"use client";

import { Heart, Scale, Thermometer } from "lucide-react";
import type { SessionVitals } from "@/types/session.types";
import { cn } from "@/lib/utils";

interface SessionVitalsSectionProps {
  vitals?: SessionVitals;
  title?: string;
  className?: string;
}

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

export function SessionVitalsSection({
  vitals,
  title = "Recent vitals",
  className,
}: SessionVitalsSectionProps) {
  const temperatureValue = formatTemperature(vitals?.temperature);
  const bloodPressureValue = formatBloodPressure(vitals);
  const heartRateValue = formatHeartRate(vitals?.heartRate);
  const spo2Value = formatSpo2(vitals?.spo2);
  const weightValue = formatWeight(vitals?.weight);

  return (
    <section className={cn("glass rounded-3xl p-5", className)}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>

      <div className="grid grid-cols-2 gap-3">
        <VitalCard
          label="Temp"
          value={temperatureValue}
          icon={Thermometer}
          muted={temperatureValue === "—"}
        />
        <VitalCard
          label="BP"
          value={bloodPressureValue}
          icon={Heart}
          muted={bloodPressureValue === "—"}
        />
        <VitalCard
          label="HR"
          value={heartRateValue}
          icon={Heart}
          muted={heartRateValue === "—"}
        />
        <VitalCard
          label="SpO₂"
          value={spo2Value}
          icon={Heart}
          muted={spo2Value === "—"}
        />
        <VitalCard
          label="Weight"
          value={weightValue}
          icon={Scale}
          muted={weightValue === "—"}
          className="col-span-2"
        />
      </div>
    </section>
  );
}

function VitalCard({
  label,
  value,
  icon: Icon,
  muted,
  className,
}: {
  label: string;
  value: string;
  icon: typeof Thermometer;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-background/50 px-3 py-2.5",
        className,
      )}
    >
      <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p
        className={cn(
          "text-sm font-semibold",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
