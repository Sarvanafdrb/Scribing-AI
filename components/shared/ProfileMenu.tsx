"use client";
import { useState } from "react";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";

export function ProfileMenu() {
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowPasswordModal(true)}>
        Change Password
      </button>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </>
  );
}
