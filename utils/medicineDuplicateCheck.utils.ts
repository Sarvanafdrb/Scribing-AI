import type { CreateMedicineData } from "@/types/medicine.types";
import { medicineService } from "@/services/medicine.service";
import {
  MEDICINE_DUPLICATE_USER_MESSAGE,
  buildMedicineDuplicateIdentity,
  medicineDuplicateIdentitiesMatch,
  medicineDuplicateIdentityFromRecord,
} from "@/utils/medicineIdentity.utils";

export async function findMedicineFormularyDuplicateMessage(
  organizationId: string,
  payload: CreateMedicineData,
  excludeId?: string,
): Promise<string | null> {
  const search = (payload.genericName || payload.name || "").trim();
  if (!search) return null;

  const { medicines } = await medicineService.getAll({
    organizationId,
    search,
    limit: 100,
    page: 1,
  });

  const target = buildMedicineDuplicateIdentity({
    name: payload.name,
    genericName: payload.genericName,
    form: payload.form,
    strength: payload.strength,
    route: payload.route,
  });

  const hasDuplicate = medicines.some((medicine) => {
    if (excludeId && medicine.id === excludeId) return false;
    return medicineDuplicateIdentitiesMatch(
      target,
      medicineDuplicateIdentityFromRecord(medicine),
    );
  });

  return hasDuplicate ? MEDICINE_DUPLICATE_USER_MESSAGE : null;
}
