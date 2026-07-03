export type NotificationType =
  | "SESSION_CREATED"
  | "RECORDING_COMPLETED"
  | "TRANSCRIPT_GENERATED"
  | "AI_NOTES_GENERATED"
  | "USER_INVITED"
  | "ORGANIZATION_CREATED"
  | "PASSWORD_CHANGED";

export interface Notification {
  id: string;
  _id?: string;
  userId: string;
  organizationId?: string;
  title: string;
  description: string;
  type: NotificationType;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}
