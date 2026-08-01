"use client";

import { supabase } from "@/lib/supabase";
import {
  Bell,
  CheckCheck,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type NotificationItem = {
  id: string;
  profile_id: string;
  title: string | null;
  message: string | null;
  is_read: boolean | null;
  created_at: string;
};

export default function NotificationBell() {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const [profileId, setProfileId] =
    useState("");

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [isOpen, setIsOpen] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isUpdating, setIsUpdating] =
    useState(false);

  const [error, setError] = useState("");

  const loadNotifications = useCallback(
    async (selectedProfileId: string) => {
      const {
        data,
        error: notificationError,
      } = await supabase
        .from("notifications")
        .select(
          `
            id,
            profile_id,
            title,
            message,
            is_read,
            created_at
          `,
        )
        .eq(
          "profile_id",
          selectedProfileId,
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(20);

      if (notificationError) {
        throw notificationError;
      }

      return data ?? [];
    },
    [],
  );

  useEffect(() => {
    let isCancelled = false;

    let channel:
      | ReturnType<
          typeof supabase.channel
        >
      | undefined;

    async function initializeNotifications() {
      if (!isCancelled) {
        setError("");
        setIsLoading(true);
      }

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (isCancelled) {
          return;
        }

        if (userError || !user) {
          setIsLoading(false);
          return;
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_id", user.id)
          .maybeSingle();

        if (isCancelled) {
          return;
        }

        if (profileError || !profile) {
          setError(
            profileError?.message ??
              "Citizen profile not found.",
          );
          setIsLoading(false);
          return;
        }

        setProfileId(profile.id);

        const initialNotifications =
          await loadNotifications(profile.id);

        if (isCancelled) {
          return;
        }

        setNotifications(
          initialNotifications,
        );

        const channelName = [
          "notification-bell",
          profile.id,
          Date.now().toString(),
          Math.random()
            .toString(36)
            .slice(2),
        ].join("-");

        channel = supabase
          .channel(channelName)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `profile_id=eq.${profile.id}`,
            },
            () => {
              void refreshNotifications(
                profile.id,
              );
            },
          )
          .subscribe((status) => {
            if (
              isCancelled ||
              status !== "CHANNEL_ERROR"
            ) {
              return;
            }

            setError(
              "Unable to connect to live notification updates.",
            );
          });

        if (isCancelled && channel) {
          void supabase.removeChannel(
            channel,
          );
          channel = undefined;
          return;
        }

        setIsLoading(false);
      } catch (initializationError) {
        if (isCancelled) {
          return;
        }

        setError(
          getErrorMessage(
            initializationError,
            "Unable to load notifications.",
          ),
        );
        setIsLoading(false);
      }
    }

    async function refreshNotifications(
      selectedProfileId: string,
    ) {
      try {
        const updatedNotifications =
          await loadNotifications(
            selectedProfileId,
          );

        if (isCancelled) {
          return;
        }

        setNotifications(
          updatedNotifications,
        );
        setError("");
      } catch (refreshError) {
        if (isCancelled) {
          return;
        }

        setError(
          getErrorMessage(
            refreshError,
            "Unable to refresh notifications.",
          ),
        );
      }
    }

    void initializeNotifications();

    return () => {
      isCancelled = true;

      if (channel) {
        void supabase.removeChannel(
          channel,
        );
        channel = undefined;
      }
    };
  }, [loadNotifications]);

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.is_read,
    ).length;

  async function markNotificationRead(
    notification: NotificationItem,
  ) {
    if (notification.is_read) {
      return;
    }

    setError("");

    const { error: updateError } =
      await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("id", notification.id)
        .eq(
          "profile_id",
          notification.profile_id,
        );

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              is_read: true,
            }
          : item,
      ),
    );
  }

  async function handleMarkAllRead() {
    if (
      !profileId ||
      unreadCount === 0 ||
      isUpdating
    ) {
      return;
    }

    setError("");
    setIsUpdating(true);

    try {
      const { error: updateError } =
        await supabase
          .from("notifications")
          .update({
            is_read: true,
          })
          .eq(
            "profile_id",
            profileId,
          )
          .eq("is_read", false);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
        })),
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notifications`
            : "Notifications"
        }
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() =>
          setIsOpen((current) => !current)
        }
        className="relative rounded-xl border border-slate-200 bg-white p-3 text-slate-600 transition hover:bg-slate-100"
      >
        <Bell className="size-5" />

        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-extrabold text-white">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-[1000] mt-3 w-[min(92vw,400px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-extrabold text-slate-900">
                Notifications
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You are all caught up"}
              </p>
            </div>

            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={
                isUpdating ||
                unreadCount === 0
              }
              className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 transition hover:text-red-800 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              {isUpdating ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <CheckCheck className="size-4" />
              )}

              Mark all read
            </button>
          </div>

          {error && (
            <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="max-h-[430px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm font-semibold text-slate-500">
                <LoaderCircle className="size-5 animate-spin" />
                Loading notifications...
              </div>
            ) : notifications.length ===
              0 ? (
              <div className="px-6 py-12 text-center">
                <Bell className="mx-auto size-10 text-slate-300" />

                <p className="mt-4 font-bold text-slate-700">
                  No notifications yet
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Emergency updates will appear
                  here.
                </p>
              </div>
            ) : (
              notifications.map(
                (notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() =>
                      void markNotificationRead(
                        notification,
                      )
                    }
                    className={`block w-full border-b border-slate-100 px-5 py-4 text-left transition last:border-b-0 hover:bg-slate-50 ${
                      notification.is_read
                        ? "bg-white"
                        : "bg-red-50/70"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 size-2.5 shrink-0 rounded-full ${
                          notification.is_read
                            ? "bg-slate-300"
                            : "bg-red-600"
                        }`}
                      />

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm ${
                            notification.is_read
                              ? "font-semibold text-slate-700"
                              : "font-extrabold text-slate-900"
                          }`}
                        >
                          {notification.title ||
                            "Emergency update"}
                        </p>

                        <p className="mt-1 text-sm leading-5 text-slate-600">
                          {notification.message ||
                            "Your emergency request has been updated."}
                        </p>

                        <p className="mt-2 text-xs text-slate-400">
                          {formatNotificationTime(
                            notification.created_at,
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                ),
              )
            )}
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-3">
            <Link
              href="/notifications"
              onClick={() =>
                setIsOpen(false)
              }
              className="block rounded-xl px-4 py-2.5 text-center text-sm font-bold text-red-700 transition hover:bg-red-100"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

function formatNotificationTime(
  dateValue: string,
) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const difference =
    Date.now() - date.getTime();

  const minutes = Math.max(
    0,
    Math.floor(difference / 60000),
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} minute${
      minutes === 1 ? "" : "s"
    } ago`;
  }

  const hours = Math.floor(
    minutes / 60,
  );

  if (hours < 24) {
    return `${hours} hour${
      hours === 1 ? "" : "s"
    } ago`;
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}