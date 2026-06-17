// hooks/organizations/useOrganizationMutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationService } from "@/services/organization.service";
import { toast } from "sonner";
import { organizationKeys } from "@/services/organization.queries";
import {
  CreateOrganizationData,
  UpdateOrganizationData,
  Organization,
} from "@/types/organization.types";

export const useOrganizationMutations = () => {
  const queryClient = useQueryClient();

  const createOrganization = useMutation({
    mutationFn: (data: CreateOrganizationData) =>
      organizationService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      toast.success("Organization created successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to create organization",
      );
    },
  });

  const updateOrganization = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrganizationData }) =>
      organizationService.update(id, data),
    onSuccess: (data: Organization) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      // Only invalidate detail if we have an id
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: organizationKeys.detail(data.id),
        });
      }
      toast.success("Organization updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to update organization",
      );
    },
  });

  const activateOrganization = useMutation({
    mutationFn: (id: string) => organizationService.activate(id),
    onSuccess: (data: Organization) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: organizationKeys.detail(data.id),
        });
      }
      toast.success("Organization activated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to activate organization",
      );
    },
  });

  const deactivateOrganization = useMutation({
    mutationFn: (id: string) => organizationService.deactivate(id),
    onSuccess: (data: Organization) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: organizationKeys.detail(data.id),
        });
      }
      toast.success("Organization deactivated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to deactivate organization",
      );
    },
  });

  const deleteOrganization = useMutation({
    mutationFn: (id: string) => organizationService.delete(id),
    onSuccess: (data: any, variables: string) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      // Remove the deleted organization from cache
      queryClient.removeQueries({
        queryKey: organizationKeys.detail(variables),
      });
      toast.success("Organization deleted successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to delete organization",
      );
    },
  });

  return {
    createOrganization,
    updateOrganization,
    activateOrganization,
    deactivateOrganization,
    deleteOrganization,
  };
};
