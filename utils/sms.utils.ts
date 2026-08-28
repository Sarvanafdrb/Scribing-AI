import type { SmsNotificationStatus } from "@/services/sms.service";

export const getSmsStatusLabel = (
  status?: SmsNotificationStatus | null,
): string => {
  switch (status) {
    case "queued":
    case "sending":
      return "Sending";
    case "sent":
      return "Sent";
    case "delivered":
      return "Delivered";
    case "failed":
      return "Failed";
    case "rejected":
      return "Rejected";
    default:
      return "Not sent";
  }
};

export const isSmsInFlight = (status?: SmsNotificationStatus | null) =>
  status === "queued" || status === "sending";
