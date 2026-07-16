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
  title: string | null;
  message: string | null;
  is_read: boolean | null;
  created_at: string;
};

export default function NotificationsPage() {
  const router = useRouter();

  const [profileId, setProfileId] = useState("");
  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(
    async (selectedProfileId: string) => {
      const { data, error: notificationError } =
        await supabase
          .from("notifications")
          .select(
            "id, title, message, is_read, created_at",
          )
          .eq("profile_id", selectedProfileId)
          .order("created_at", {
            ascending: false,
          });

      if (notificationError) {
        setError(notificationError.message);
        return;
      }

      setNotifications(data ?? []);
    },
    [],
  );

  useEffect(() => {
    let channel:
      | ReturnType<typeof supabase.channel>
      | undefined;

    async function initializePage() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("id")
          .eq("auth_id", user.id)
          .maybeSingle();

      if (profileError || !profile) {
        setError(
          profileError?.message ??
            "Profile not found.",
        );
        setIsLoading(false);
        return;
      }

      setProfileId(profile.id);
      await loadNotifications(profile.id);

      channel = supabase
        .channel(
          `citizen-notifications-${profile.id}`,
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
            await loadNotifications(profile.id);
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

  async function markAsRead(
    notificationId: string,
  ) {
    const { error: updateError } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", notificationId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId
          ? {
              ...item,
              is_read: true,
            }
          : item,
      ),
    );
  }

  async function markAllAsRead() {
    if (!profileId) {
      return;
    }

    setIsMarkingAll(true);
    setError("");

    const { error: updateError } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("profile_id", profileId)
      .eq("is_read", false);

    if (updateError) {
      setError(updateError.message);
      setIsMarkingAll(false);
      return;
    }

    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        is_read: true,
      })),
    );

    setIsMarkingAll(false);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <LoaderCircle className="size-5 animate-spin" />
          Loading notifications...
        </div>
      </main>
    );
  }

  const unreadCount = notifications.filter(
    (item) => !item.is_read,
  ).length;

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
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-700"
          >
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">
              Notifications
            </h1>

            <p className="mt-2 text-slate-500">
              {unreadCount} unread{" "}
              {unreadCount === 1
                ? "notification"
                : "notifications"}
            </p>
          </div>

          <button
            type="button"
            onClick={markAllAsRead}
            disabled={
              isMarkingAll || unreadCount === 0
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="size-5" />

            {isMarkingAll
              ? "Updating..."
              : "Mark all as read"}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <Bell className="mx-auto size-12 text-slate-300" />

            <h2 className="mt-5 text-2xl font-extrabold">
              No notifications yet
            </h2>

            <p className="mt-2 text-slate-500">
              Emergency updates will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() =>
                  markAsRead(notification.id)
                }
                className={`w-full rounded-2xl border p-5 text-left transition ${
                  notification.is_read
                    ? "border-slate-200 bg-white"
                    : "border-red-200 bg-red-50"
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

                  <div>
                    <p className="font-extrabold text-slate-900">
                      {notification.title ??
                        "Emergency update"}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {notification.message ??
                        "Your emergency request was updated."}
                    </p>

                    <p className="mt-3 text-xs font-medium text-slate-400">
                      {formatDateTime(
                        notification.created_at,
                      )}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function formatDateTime(dateValue: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateValue));
}