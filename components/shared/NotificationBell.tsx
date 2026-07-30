"use client";

import { useCallback, useState, type MouseEvent } from "react";
import { Bell, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/notifications/useNotifications";
import { useNotificationMutations } from "@/hooks/notifications/useNotificationMutations";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/notification.types";

const DISMISS_ANIMATION_MS = 200;

const getNotificationId = (notification: Notification) =>
  notification.id || notification._id || "";

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

export function NotificationBell() {
  const { data, isLoading, isError } = useNotifications();
  const { markAsRead, markAllAsRead, dismissNotification } =
    useNotificationMutations();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [exitingIds, setExitingIds] = useState<Set<string>>(
    () => new Set(),
  );

  const allNotifications = data?.notifications || [];
  const notifications = allNotifications.filter((notification) => {
    const id = getNotificationId(notification);
    return !dismissedIds.has(id) || exitingIds.has(id);
  });

  const dismissedUnreadCount = allNotifications.filter((notification) => {
    const id = getNotificationId(notification);
    return dismissedIds.has(id) && !notification.isRead;
  }).length;
  const unreadCount = Math.max(
    0,
    (data?.unreadCount || 0) - dismissedUnreadCount,
  );

  const handleNotificationClick = (id: string, isRead: boolean) => {
    if (!isRead) {
      markAsRead.mutate(id);
    }
  };

  const handleDismiss = useCallback(
    (event: MouseEvent, notification: Notification) => {
      event.preventDefault();
      event.stopPropagation();

      const id = getNotificationId(notification);
      if (!id || exitingIds.has(id) || dismissedIds.has(id)) return;

      setExitingIds((prev) => new Set(prev).add(id));

      window.setTimeout(() => {
        setDismissedIds((prev) => new Set(prev).add(id));
        setExitingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        dismissNotification(id, notification.isRead);
      }, DISMISS_ANIMATION_MS);
    },
    [dismissNotification, dismissedIds, exitingIds],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            <p className="text-xs text-gray-500">
              {unreadCount > 0
                ? `${unreadCount} unread`
                : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <Separator />
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : isError ? (
            <div className="px-4 py-8 text-center text-sm text-red-500">
              Failed to load notifications.
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
              <span className="text-2xl" aria-hidden="true">
                🔔
              </span>
              <p className="text-sm font-medium text-gray-900">
                No notifications
              </p>
              <p className="text-xs text-gray-500">You're all caught up!</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const id = getNotificationId(notification);
              const isExiting = exitingIds.has(id);

              return (
                <div
                  key={id}
                  className={cn(
                    "group relative border-b border-gray-100 transition-all duration-200 ease-out",
                    isExiting &&
                      "pointer-events-none -translate-x-2 opacity-0",
                    !notification.isRead && "bg-blue-50/60",
                  )}
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleNotificationClick(id, notification.isRead)
                    }
                    className="w-full px-4 py-3 pr-10 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {notification.description}
                      </p>
                      {notification.relatedId && (
                        <p className="mt-1 truncate text-xs text-gray-400">
                          Related: {notification.relatedId}
                        </p>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-400">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                      {!notification.isRead && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                          Unread
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label="Dismiss notification"
                    onClick={(event) => handleDismiss(event, notification)}
                    className={cn(
                      "absolute top-2.5 right-2 flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-opacity hover:bg-gray-100 hover:text-gray-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                      "opacity-100 md:opacity-0 md:group-hover:opacity-100",
                    )}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
