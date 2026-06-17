import { useMutation, useQueryClient } from "@tanstack/react-query";
import { roleService } from "@/services/role.service";
import { roleKeys } from "@/services/role.queries";
import { CreateRoleData, UpdateRoleData } from "@/types/role.types";
import { toast } from "sonner";

export const useRoleMutations = () => {
  const queryClient = useQueryClient();

  const createRole = useMutation({
    mutationFn: (data: CreateRoleData) => roleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      toast.success("Role created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to create role");
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleData }) =>
      roleService.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(variables.id) });
      toast.success("Role updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update role");
    },
  });

  const deactivateRole = useMutation({
    mutationFn: (id: string) => roleService.deactivate(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.removeQueries({ queryKey: roleKeys.detail(id) });
      toast.success("Role deactivated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to deactivate role");
    },
  });

  return {
    createRole,
    updateRole,
    deactivateRole,
  };
};
