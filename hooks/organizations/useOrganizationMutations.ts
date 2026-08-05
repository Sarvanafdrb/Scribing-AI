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
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({
        queryKey: organizationKeys.detail(id),
      });
      const previous = queryClient.getQueryData<Organization>(
        organizationKeys.detail(id),
      );
      if (previous) {
        queryClient.setQueryData<Organization>(organizationKeys.detail(id), {
          ...previous,
          ...data,
          contactNumber: data.contactNumber ?? previous.contactNumber,
          phone: data.contactNumber ?? previous.phone,
          adminEmail: data.adminEmail ?? previous.adminEmail,
          email: data.adminEmail ?? previous.email,
          updatedAt: new Date().toISOString(),
        });
      }
      return { previous, id };
    },
    onError: (error: any, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          organizationKeys.detail(context.id),
          context.previous,
        );
      }
      toast.error(
        error?.response?.data?.message || "Failed to update organization",
      );
    },
    onSuccess: (_data, variables) => {
      toast.success("Organization updated successfully");
      queryClient.invalidateQueries({
        queryKey: organizationKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
    },
  });

  const activateOrganization = useMutation({
    mutationFn: (id: string) => organizationService.activate(id),
    onSuccess: (_data: Organization, id: string) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: organizationKeys.detail(id),
      });
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
    onSuccess: (_data: Organization, id: string) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: organizationKeys.detail(id),
      });
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
