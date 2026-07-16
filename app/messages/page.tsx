"use client";

import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  LoaderCircle,
  MessageCircle,
  Send,
  Shield,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type ChatMessage = {
  id: string;
  emergency_request_id: string;
  sender_auth_id: string;
  sender_role: "citizen" | "responder";
  message: string;
  created_at: string;
};

type ActiveRequest = {
  id: string;
  emergency_type: string | null;
  status: string | null;
  responder_id: string | null;
};

const activeStatuses = [
  "Pending",
  "Verified",
  "Dispatched",
  "Accepted",
  "Responding",
  "Arrived",
  "In Progress",
];

export default function MessagesPage() {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [userId, setUserId] = useState("");
  const [userRole, setUserRole] = useState<
    "citizen" | "responder" | null
  >(null);

  const [request, setRequest] =
    useState<ActiveRequest | null>(null);

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const loadMessages = useCallback(
    async (requestId: string) => {
      const {
        data,
        error: messagesError,
      } = await supabase
        .from("chat_messages")
        .select(
          `
            id,
            emergency_request_id,
            sender_auth_id,
            sender_role,
            message,
            created_at
          `,
        )
        .eq("emergency_request_id", requestId)
        .order("created_at", {
          ascending: true,
        });

      if (messagesError) {
        setError(messagesError.message);
        return;
      }

      setMessages(data ?? []);
    },
    [],
  );

  useEffect(() => {
    let channel:
      | ReturnType<typeof supabase.channel>
      | undefined;

    async function initializeChat() {
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);

      const {
        data: responder,
        error: responderError,
      } = await supabase
        .from("responders")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (responderError) {
        setError(responderError.message);
        setIsLoading(false);
        return;
      }

      let activeRequest: ActiveRequest | null = null;
      let role: "citizen" | "responder";

      if (responder) {
        role = "responder";

        const {
          data,
          error: requestError,
        } = await supabase
          .from("emergency_requests")
          .select(
            `
              id,
              emergency_type,
              status,
              responder_id
            `,
          )
          .eq("responder_id", responder.id)
          .in("status", activeStatuses)
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (requestError) {
          setError(requestError.message);
          setIsLoading(false);
          return;
        }

        activeRequest = data;
      } else {
        role = "citizen";

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
              "Profile not found.",
          );
          setIsLoading(false);
          return;
        }

        const {
          data,
          error: requestError,
        } = await supabase
          .from("emergency_requests")
          .select(
            `
              id,
              emergency_type,
              status,
              responder_id
            `,
          )
          .eq("profile_id", profile.id)
          .in("status", activeStatuses)
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (requestError) {
          setError(requestError.message);
          setIsLoading(false);
          return;
        }

        activeRequest = data;
      }

      setUserRole(role);
      setRequest(activeRequest);

      if (!activeRequest) {
        setIsLoading(false);
        return;
      }

      await loadMessages(activeRequest.id);

      channel = supabase
        .channel(
          `chat-${activeRequest.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_messages",
            filter: `emergency_request_id=eq.${activeRequest.id}`,
          },
          async () => {
            await loadMessages(activeRequest.id);
          },
        )
        .subscribe();

      setIsLoading(false);
    }

    initializeChat();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadMessages, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  async function handleSend(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const message = draft.trim();

    if (
      !message ||
      !request ||
      !userId ||
      !userRole
    ) {
      return;
    }

    setError("");
    setIsSending(true);

    const { error: insertError } =
      await supabase
        .from("chat_messages")
        .insert({
          emergency_request_id: request.id,
          sender_auth_id: userId,
          sender_role: userRole,
          message,
        });

    if (insertError) {
      setError(insertError.message);
      setIsSending(false);
      return;
    }

    setDraft("");
    setIsSending(false);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <LoaderCircle className="size-5 animate-spin" />
          Loading emergency chat...
        </div>
      </main>
    );
  }

  const backHref =
    userRole === "responder"
      ? "/responder/dashboard"
      : "/dashboard";

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link
            href={backHref}
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
                Emergency Chat
              </p>
            </div>
          </Link>

          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-700"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-8">
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {!request ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <ShieldAlert className="mx-auto size-12 text-slate-300" />

            <h1 className="mt-5 text-2xl font-extrabold">
              No active emergency chat
            </h1>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-500">
              A chat becomes available when there is
              an active emergency request.
            </p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 bg-gradient-to-r from-red-600 to-red-800 px-6 py-5 text-white">
              <div className="flex items-center gap-4">
                <span className="flex size-12 items-center justify-center rounded-xl bg-white/15">
                  <MessageCircle className="size-6" />
                </span>

                <div>
                  <p className="text-sm font-semibold text-red-100">
                    Active conversation
                  </p>

                  <h1 className="text-xl font-extrabold">
                    {request.emergency_type ??
                      "Emergency Request"}
                  </h1>

                  <p className="mt-1 text-xs text-red-100">
                    Status:{" "}
                    {request.status ?? "Pending"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex h-[560px] flex-col">
              <div className="flex-1 overflow-y-auto bg-slate-50 p-5 sm:p-6">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center">
                    <div>
                      <MessageCircle className="mx-auto size-12 text-slate-300" />

                      <p className="mt-4 font-bold text-slate-700">
                        No messages yet
                      </p>

                      <p className="mt-2 text-sm text-slate-500">
                        Start the conversation below.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((item) => {
                      const isOwn =
                        item.sender_auth_id ===
                        userId;

                      return (
                        <div
                          key={item.id}
                          className={`flex ${
                            isOwn
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[70%] ${
                              isOwn
                                ? "rounded-br-md bg-red-700 text-white"
                                : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                            }`}
                          >
                            <div className="mb-1 flex items-center gap-2 text-xs font-bold opacity-80">
                              <UserRound className="size-3.5" />

                              {isOwn
                                ? "You"
                                : item.sender_role ===
                                    "responder"
                                  ? "Responder"
                                  : "Citizen"}
                            </div>

                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                              {item.message}
                            </p>

                            <p
                              className={`mt-2 text-right text-[11px] ${
                                isOwn
                                  ? "text-red-100"
                                  : "text-slate-400"
                              }`}
                            >
                              {formatTime(
                                item.created_at,
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSend}
                className="border-t border-slate-200 bg-white p-4 sm:p-5"
              >
                <div className="flex items-end gap-3">
                  <textarea
                    value={draft}
                    onChange={(event) =>
                      setDraft(
                        event.target.value,
                      )
                    }
                    rows={2}
                    maxLength={1000}
                    placeholder="Type your message..."
                    disabled={isSending}
                    className="min-h-[52px] flex-1 resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:bg-slate-100"
                  />

                  <button
                    type="submit"
                    disabled={
                      isSending ||
                      !draft.trim()
                    }
                    className="inline-flex size-13 shrink-0 items-center justify-center rounded-2xl bg-red-700 text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Send message"
                  >
                    {isSending ? (
                      <LoaderCircle className="size-5 animate-spin" />
                    ) : (
                      <Send className="size-5" />
                    )}
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Use chat only for information
                  related to the active emergency.
                </p>
              </form>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function formatTime(dateValue: string) {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateValue));
}