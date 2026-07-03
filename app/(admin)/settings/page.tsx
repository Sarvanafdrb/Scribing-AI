import { ProfileForm } from "./components/ProfileForm";
import { ChangePasswordForm } from "./components/ChangePasswordForm";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-600">
          Manage your profile and account security.
        </p>
      </div>

      <ProfileForm />
      <ChangePasswordForm />
    </div>
  );
}
