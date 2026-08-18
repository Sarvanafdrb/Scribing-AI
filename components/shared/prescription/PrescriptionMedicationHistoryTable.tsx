import type { AiNotesMedication } from "@/types/ai-notes.types";
import {
  formatSavedMedicationPrice,
  getMedicationDisplayName,
  getMedicationDoseLabel,
} from "@/utils/prescriptionPrice.utils";
import { cn } from "@/lib/utils";

interface PrescriptionMedicationHistoryTableProps {
  medications?: AiNotesMedication[];
  className?: string;
}

export function PrescriptionMedicationHistoryTable({
  medications,
  className,
}: PrescriptionMedicationHistoryTableProps) {
  if (!medications?.length) {
    return <span className="text-gray-500">—</span>;
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[280px] text-xs">
        <thead>
          <tr className="text-left text-[10px] font-medium tracking-wide text-gray-400 uppercase">
            <th className="pr-2 pb-1 font-medium">Medicine</th>
            <th className="pr-2 pb-1 font-medium">Dose</th>
            <th className="pr-2 pb-1 font-medium">Duration</th>
            <th className="pb-1 font-medium">Price</th>
          </tr>
        </thead>
        <tbody>
          {medications.map((med, index) => (
            <tr
              key={`${med.medicineId || med.medicine}-${index}`}
              className="text-gray-700"
            >
              <td className="py-0.5 pr-2 align-top">
                {getMedicationDisplayName(med)}
              </td>
              <td className="py-0.5 pr-2 align-top">
                {getMedicationDoseLabel(med) || "—"}
              </td>
              <td className="py-0.5 pr-2 align-top">
                {med.days ? `${med.days} days` : "—"}
              </td>
              <td className="py-0.5 align-top">
                {formatSavedMedicationPrice(med)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
