"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, LoaderCircle, ShieldCheck } from "lucide-react";

import { supabase } from "@/lib/supabase";
import IncidentDetails from "@/components/incident-details";
import {
  getIncidentDetails,
  type IncidentDetailsData,
} from "@/lib/incident-details";

type AdminProfile = {
  full_name: string | null;
  role: string | null;
};

export default function AdminIncidentPage() {
  const router = useRouter();
  const params = useParams();

  const incidentId = Array.isArray(params.id)
    ? params.id[0]
    : (params.id as string);

  const [incident, setIncident] =
    useState<IncidentDetailsData | null>(null);

  const [admin, setAdmin] =
    useState<AdminProfile | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const loadIncident = useCallback(async () => {
    if (!incidentId) return;

    try {
      setError("");

      const data = await getIncidentDetails(incidentId);

      if (!data) {
        setError("Incident not found.");
        setIncident(null);
        return;
      }

      setIncident(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load incident.",
      );
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    let realtimeChannel:
      | ReturnType<typeof supabase.channel>
      | undefined;

    async function initialize() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: adminData } = await supabase
        .from("admins")
        .select("full_name, role")
        .eq("auth_id", user.id)
        .eq("status", "Active")
        .maybeSingle();

      if (!adminData) {
        router.replace("/dashboard");
        return;
      }

      setAdmin(adminData);

      await loadIncident();

      realtimeChannel = supabase
        .channel(`incident-${incidentId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "emergency_requests",
            filter: `id=eq.${incidentId}`,
          },
          async () => {
            await loadIncident();
          },
        )
        .subscribe();
    }

    initialize();

    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [incidentId, loadIncident, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-2 text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading incident...
        </div>
      </main>
    );
  }

  if (error || !incident) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-xl rounded-3xl bg-white p-10 text-center shadow">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-600" />

          <h1 className="text-2xl font-bold">
            Incident Not Found
          </h1>

          <p className="mt-3 text-slate-500">
            {error}
          </p>

          <button
            onClick={() =>
              router.push("/admin/dashboard")
            }
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
          >
            <ShieldCheck className="h-4 w-4" />
            Return to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-7xl">
        <IncidentDetails
          incident={incident}
          administratorName={
            admin?.full_name ?? "Administrator"
          }
        />
      </div>
    </main>
  );
}