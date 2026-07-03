import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { normalizeAuthUser } from "@/types/auth.types";
import { toast } from "sonner";

export const useProfileMutations = () => {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  const updateProfile = useMutation({
    mutationFn: (data: {
      firstName: string;
      lastName: string;
      phone?: string;
    }) => authService.updateProfile(data),
    onSuccess: (response: any) => {
      const userData = response?.data?.user || response?.data || response?.user || response;
      const user = normalizeAuthUser(userData);
      setUser(user);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Profile updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update profile");
    },
  });

  const uploadProfilePicture = useMutation({
    mutationFn: (file: File) => authService.uploadProfilePicture(file),
    onSuccess: (response: any) => {
      const userData = response?.data?.user || response?.data || response?.user || response;
      const user = normalizeAuthUser(userData);
      setUser(user);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Profile picture updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to upload profile picture",
      );
    },
  });

  const changePassword = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authService.changePassword(data),
    onSuccess: () => {
      toast.success("Password changed successfully. Please log in again.");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to change password");
    },
  });

  return { updateProfile, uploadProfilePicture, changePassword };
};
