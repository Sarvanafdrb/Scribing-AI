import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/user.service";
import { userKeys } from "@/services/user.queries";
import { CreateUserData, UpdateUserData, User } from "@/types/user.types";
import { toast } from "sonner";

export const useUserMutations = () => {
  const queryClient = useQueryClient();

  const createUser = useMutation({
    mutationFn: (data: CreateUserData) => userService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success("User created successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to create user");
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) =>
      userService.update(id, data),
    onSuccess: (_data: User, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: userKeys.detail(variables.id),
      });
      toast.success("User updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update user");
    },
  });

  const activateUser = useMutation({
    mutationFn: (id: string) => userService.setActive(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success("User activated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to activate user");
    },
  });

  const deactivateUser = useMutation({
    mutationFn: (id: string) => userService.setActive(id, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success("User deactivated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to deactivate user");
    },
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => userService.deactivate(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.removeQueries({ queryKey: userKeys.detail(id) });
      toast.success("User deactivated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to deactivate user");
    },
  });

  return {
    createUser,
    updateUser,
    activateUser,
    deactivateUser,
    deleteUser,
  };
};
