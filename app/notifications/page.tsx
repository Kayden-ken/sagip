"use client";

import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  LoaderCircle,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
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

export default function NotificationsPage() {
  const router = useRouter();

  const [profileId, setProfileId] =
    useState("");

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

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
        });

      if (notificationError) {
        setError(
          notificationError.message,
        );
        return;
      }

      setNotifications(data ?? []);
    },
    [],
  );

  useEffect(() => {
    let channel:
      | ReturnType<
          typeof supabase.channel
        >
      | undefined;

    async function initializePage() {
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
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

      if (profileError || !profile) {
        setError(
          profileError?.message ??
            "Citizen profile not found.",
        );
        setIsLoading(false);
        return;
      }

      setProfileId(profile.id);

      await loadNotifications(profile.id);

      channel = supabase
        .channel(
          `notifications-page-${profile.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `profile_id=eq.${profile.id}`,
          },
          async () => {
            await loadNotifications(
              profile.id,
            );
          },
        )
        .subscribe();

      setIsLoading(false);
    }

    initializePage();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadNotifications, router]);

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.is_read,
    ).length;

  async function handleNotificationClick(
    notification: NotificationItem,
  ) {
    if (notification.is_read) {
      return;
    }

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
      unreadCount === 0
    ) {
      return;
    }

    setError("");
    setIsUpdating(true);

    const { error: updateError } =
      await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("profile_id", profileId)
        .eq("is_read", false);

    if (updateError) {
      setError(updateError.message);
      setIsUpdating(false);
      return;
    }

    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        is_read: true,
      })),
    );

    setIsUpdating(false);
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-red-700 text-white">
              <Shield
                className="size-5"
                fill="currentColor"
              />
            </span>

            <div>
              <p className="text-xl font-extrabold">
                SAGIP
              </p>

              <p className="text-xs text-slate-500">
                Notifications
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-red-700"
          >
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">
              Notifications
            </h1>

            <p className="mt-2 text-slate-500">
              {unreadCount > 0
                ? `${unreadCount} unread notification${
                    unreadCount === 1
                      ? ""
                      : "s"
                  }`
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
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUpdating ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <CheckCheck className="size-4" />
            )}

            Mark all as read
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="mt-8 flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white px-6 py-16 text-sm font-semibold text-slate-500 shadow-sm">
            <LoaderCircle className="size-5 animate-spin" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <Bell className="mx-auto size-12 text-slate-300" />

            <h2 className="mt-5 text-xl font-extrabold">
              No notifications yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Emergency request updates will
              appear here.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {notifications.map(
              (notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() =>
                    handleNotificationClick(
                      notification,
                    )
                  }
                  className={`block w-full rounded-2xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    notification.is_read
                      ? "border-slate-200 bg-white"
                      : "border-red-200 bg-red-50/70"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                        notification.is_read
                          ? "bg-slate-100 text-slate-500"
                          : "bg-red-700 text-white"
                      }`}
                    >
                      <Bell className="size-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <h2
                          className={`font-extrabold ${
                            notification.is_read
                              ? "text-slate-800"
                              : "text-slate-950"
                          }`}
                        >
                          {notification.title ||
                            "Emergency update"}
                        </h2>

                        {!notification.is_read && (
                          <span className="w-fit rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-extrabold text-red-700">
                            New
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {notification.message ||
                          "Your emergency request has been updated."}
                      </p>

                      <p className="mt-3 text-xs text-slate-400">
                        {formatNotificationDate(
                          notification.created_at,
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              ),
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function formatNotificationDate(
  dateValue: string,
) {
  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(dateValue));
}