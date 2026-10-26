export type AuditActor = {
  id: string;
  name: string;
} | null;

export type AuditMetadata = {
  createdBy?: AuditActor;
  createdAt?: string | Date | null;
  updatedBy?: AuditActor;
  updatedAt?: string | Date | null;
};
