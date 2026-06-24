// types/organization.types.ts
export interface Organization {
  id?: string;
  _id?: string;
  name: string;
  organizationCode?: string;
  email: string;
  phone?: string;
  address?: string;
  subscriptionPlan?: "free" | "basic" | "premium";
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  // Additional fields for the form
  description?: string;
  website?: string;
  industry?: string;
  size?: string;
  logo?: string | File | null;
  organizationType?: string;
  contactNumber?: string;
  speciality?: string;
  providerCount?: string;
  adminName?: string;
  adminEmail?: string;
  parentOrganizationId?: string | null;
  parentOrganization?: {
    id?: string;
    _id?: string;
    name?: string;
    organizationCode?: string;
  } | null;
}

// export interface CreateOrganizationData {
//   name: string;
//   email: string;
//   phone?: string;
//   address?: string;
//   subscriptionPlan?: "free" | "basic" | "premium";
//   // Additional form fields
//   description?: string;
//   website?: string;
//   industry?: string;
//   size?: string;
//   organizationType?: string;
//   contactNumber?: string;
//   speciality?: string;
//   providerCount?: string;
//   adminName?: string;
//   adminEmail?: string;
//   logo?: File | string | null;
// }
export interface CreateOrganizationData {
  name: string;
  organizationType:
    | "hospital"
    | "clinic"
    | "private_practice"
    | "diagnostic_center"
    | "telemedicine";

  description?: string;
  website?: string;
  contactNumber: string;
  address: string;
  speciality?: string;
  providerCount?: string;
  adminName: string;
  adminEmail: string;
  adminPassword?: string;
  logo?: File | string | null;
  parentOrganizationId?: string;
}
export interface UpdateOrganizationData extends Partial<CreateOrganizationData> {
  status?: "active" | "inactive";
}

export interface OrganizationUser {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    status?: string;
  };
}

export interface OrganizationStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalMembers: number;
  recentOrganizations: Organization[];
}
