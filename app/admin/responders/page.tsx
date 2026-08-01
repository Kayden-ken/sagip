"use client";

import Link from "next/link";
import {
  ArrowLeft,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

type Responder = {
  id: string;
  full_name: string | null;
  agency: string | null;
  phone: string | null;
  status: string | null;
  availability: string | null;
  created_at: string;
};

export default function AdminRespondersPage() {
  const [responders, setResponders] =
    useState<Responder[]>([]);

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [agency, setAgency] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [isCreating, setIsCreating] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  async function loadResponders() {
    try {
      const response =
        await fetch(
          "/api/admin/responders",
          {
            cache: "no-store",
          },
        );


      const data =
        await response.json();


      if (!response.ok) {
        throw new Error(
          data.error ||
          "Unable to load responders.",
        );
      }


      setResponders(
        data.responders ?? [],
      );


    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load responders.",
      );

    }
  }


  useEffect(() => {
    async function initialize() {
      setIsLoading(true);

      await loadResponders();

      setIsLoading(false);
    }

    initialize();
  }, []);



  async function handleRefresh() {
    setIsRefreshing(true);
    setError("");

    await loadResponders();

    setIsRefreshing(false);
  }



  async function handleCreateResponder(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    setIsCreating(true);


    try {

      const response =
        await fetch(
          "/api/admin/responders/create",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              email,
              password,
              full_name:
                fullName,
              agency,
              phone,
            }),
          },
        );


      const data =
        await response.json();


      if (!response.ok) {
        throw new Error(
          data.error ||
          "Unable to create responder.",
        );
      }


      setMessage(
        "Responder created successfully.",
      );


      setFullName("");
      setEmail("");
      setPassword("");
      setAgency("");
      setPhone("");


      await loadResponders();


    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create responder.",
      );

    } finally {

      setIsCreating(false);

    }
  }



  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">


          <div className="flex items-center gap-3">

            <span className="flex size-11 items-center justify-center rounded-xl bg-red-700 text-white">
              <ShieldCheck className="size-6" />
            </span>


            <div>

              <h1 className="text-xl font-extrabold">
                Manage Responders
              </h1>

              <p className="text-sm text-slate-500">
                Create and manage SAGIP responders
              </p>

            </div>

          </div>



          <div className="flex items-center gap-3">

            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
            >
              <ArrowLeft className="size-4" />

              Back
            </Link>


            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >

              <RefreshCw
                className={`size-4 ${
                  isRefreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh

            </button>

          </div>


        </div>
      </header>




      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[420px_1fr]">


        {/* ADD RESPONDER */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">


          <div className="flex items-center gap-3">

            <span className="flex size-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <Plus className="size-5" />
            </span>


            <h2 className="text-xl font-extrabold">
              Add Responder
            </h2>

          </div>



          <form
            onSubmit={handleCreateResponder}
            className="mt-6 space-y-4"
          >

            <input
              required
              value={fullName}
              onChange={(e)=>
                setFullName(
                  e.target.value,
                )
              }
              placeholder="Full Name"
              className="w-full rounded-xl border px-4 py-3"
            />


            <input
              required
              type="email"
              value={email}
              onChange={(e)=>
                setEmail(
                  e.target.value,
                )
              }
              placeholder="Email"
              className="w-full rounded-xl border px-4 py-3"
            />


            <input
              required
              type="password"
              value={password}
              onChange={(e)=>
                setPassword(
                  e.target.value,
                )
              }
              placeholder="Temporary Password"
              className="w-full rounded-xl border px-4 py-3"
            />


            <input
              value={agency}
              onChange={(e)=>
                setAgency(
                  e.target.value,
                )
              }
              placeholder="Agency"
              className="w-full rounded-xl border px-4 py-3"
            />


            <input
              value={phone}
              onChange={(e)=>
                setPhone(
                  e.target.value,
                )
              }
              placeholder="Phone Number"
              className="w-full rounded-xl border px-4 py-3"
            />



            <button
              disabled={isCreating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 font-bold text-white transition hover:bg-red-800 disabled:opacity-50"
            >

              {isCreating ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}

              {isCreating
                ? "Creating..."
                : "Create Responder"}

            </button>

          </form>



          {message && (
            <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
              {message}
            </p>
          )}



          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
              {error}
            </p>
          )}

        </section>





        {/* RESPONDER LIST */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="text-xl font-extrabold">
            Current Responders
          </h2>


          {isLoading ? (

            <div className="flex items-center gap-2 py-10 text-slate-500">
              <LoaderCircle className="animate-spin" />
              Loading responders...
            </div>


          ) : responders.length === 0 ? (

            <div className="py-10 text-center text-slate-500">
              No responders added yet.
            </div>


          ) : (

            <div className="mt-6 space-y-4">

              {responders.map(
                (responder)=>(
                  
                  <article
                    key={responder.id}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >

                    <span className="flex size-11 items-center justify-center rounded-xl bg-red-100 text-red-700">
                      <UserRound className="size-5" />
                    </span>


                    <div className="flex-1">

                      <p className="font-extrabold">
                        {responder.full_name ||
                          "Unnamed Responder"}
                      </p>


                      <p className="text-sm text-slate-500">
                        {responder.agency ||
                          "No agency"}
                      </p>


                      <p className="text-xs text-slate-400">
                        {responder.phone ||
                          "No phone"}
                      </p>

                    </div>


                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      {responder.availability ||
                        "Unknown"}
                    </span>


                  </article>

                ),
              )}

            </div>

          )}

        </section>


      </section>

    </main>
  );
}