import Link from "next/link";
import {
  Bolt,
  ClipboardList,
  HeartHandshake,
  MapPin,
  Menu,
  PhoneCall,
  Shield,
  UserRound,
} from "lucide-react";

/*
 * Replace these values with the official SAGIP hotline.
 *
 * HOTLINE_TEL:
 * - Use numbers only for local short codes, such as "911".
 * - For a Philippine mobile number, use the international format,
 *   such as "+639123456789".
 */
const HOTLINE_DISPLAY = "0912 345 6789";
const HOTLINE_TEL = "+639123456789";

const quickAccessItems = [
  {
    title: "Request Emergency",
    description:
      "Submit a new incident request for medical, fire, police, or rescue assistance.",
    href: "/emergency",
    icon: Bolt,
    emergency: true,
  },
  {
    title: "My Profile",
    description:
      "View and update your personal details, medical information, and contacts.",
    href: "/login",
    icon: UserRound,
  },
  {
    title: "Track Requests",
    description:
      "Check the status of your recent emergency service requests.",
    href: "/login",
    icon: ClipboardList,
  },
  {
    title: "Nearby Facilities",
    description:
      "Locate nearby hospitals, police stations, fire stations, and evacuation centers.",
    href: "/facilities",
    icon: MapPin,
  },
  {
    title: "Emergency Contacts",
    description:
      "Manage the people who should be notified during an emergency.",
    href: "/login",
    icon: HeartHandshake,
  },
  {
    title: "Safety Information",
    description:
      "Read emergency reminders, advisories, and preparedness guidelines.",
    href: "#about",
    icon: Shield,
  },
];

const statistics = [
  {
    value: "24/7",
    label: "Support",
  },
  {
    value: "<5 min",
    label: "Response Time",
  },
  {
    value: "100%",
    label: "Coverage",
  },
  {
    value: "Free",
    label: "Service",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="h-8 bg-[#553945]" />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm">
              <Shield className="size-5" fill="currentColor" />
            </span>

            <span className="text-xl font-extrabold tracking-tight">
              SAGIP
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
            <a className="transition hover:text-red-600" href="#features">
              Features
            </a>

            <a className="transition hover:text-red-600" href="#about">
              About
            </a>

            <a className="transition hover:text-red-600" href="#contact">
              Contact
            </a>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <a
              href={`tel:${HOTLINE_TEL}`}
              aria-label={`Call SAGIP emergency hotline at ${HOTLINE_DISPLAY}`}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-700 transition hover:border-red-300 hover:bg-red-100"
            >
              <PhoneCall className="size-4" />
              {HOTLINE_DISPLAY}
            </a>

            <Link
              href="/login"
              className="text-sm font-semibold text-slate-700 transition hover:text-red-600"
            >
              Sign In
            </Link>

            <Link
              href="/register"
              className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-800"
            >
              Get Started
            </Link>
          </div>

          <button
            type="button"
            aria-label="Open navigation menu"
            className="rounded-lg border border-slate-200 p-2 text-slate-700 sm:hidden"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <section className="overflow-hidden rounded-[22px] bg-white shadow-xl shadow-slate-300/50">
          <div className="relative overflow-hidden bg-gradient-to-r from-red-600 to-red-800 px-7 py-12 text-white sm:px-11 lg:px-12">
            <div className="absolute -bottom-20 left-7 size-48 rounded-full bg-white/10" />
            <div className="absolute -top-24 right-20 size-60 rounded-full bg-white/10" />

            <div className="absolute right-10 top-12 hidden size-56 items-center justify-center rounded-full bg-white/10 lg:flex">
              <HeartHandshake className="size-20" fill="currentColor" />
            </div>

            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-bold sm:text-sm">
                <span className="size-2 rounded-full bg-emerald-300" />
                24/7 Emergency Support
              </div>

              <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">
                Your Safety, Our Priority
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-red-50 sm:text-lg">
                Access emergency services instantly. Request help, track
                responders, and stay connected with your loved ones during
                critical moments.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/emergency"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-red-600 shadow-lg transition hover:-translate-y-0.5 hover:bg-red-50"
                >
                  <Bolt className="size-5" fill="currentColor" />
                  Request Emergency
                </Link>

                <a
                  href={`tel:${HOTLINE_TEL}`}
                  aria-label={`Call SAGIP emergency hotline at ${HOTLINE_DISPLAY}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-600"
                >
                  <PhoneCall className="size-5" />
                  Call {HOTLINE_DISPLAY}
                </a>

                <a
                  href="#about"
                  className="inline-flex items-center justify-center rounded-xl bg-white/20 px-6 py-3.5 font-bold text-white transition hover:bg-white/30"
                >
                  Learn More
                </a>
              </div>

              <p className="mt-4 text-sm font-medium text-red-100">
                Tap the hotline number to open your phone&apos;s call screen.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 bg-white sm:grid-cols-4 sm:divide-y-0">
            {statistics.map((statistic) => (
              <div
                key={statistic.label}
                className="px-4 py-5 text-center"
              >
                <p className="text-2xl font-extrabold text-red-500">
                  {statistic.value}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {statistic.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="py-12">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight">
              Quick Access
            </h2>

            <p className="mt-2 text-slate-500">
              Access essential services quickly
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {quickAccessItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`group relative rounded-2xl border bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg ${
                    item.emergency
                      ? "border-red-200 bg-red-50/70"
                      : "border-slate-200"
                  }`}
                >
                  {item.emergency && (
                    <span className="absolute right-5 top-5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      SOS
                    </span>
                  )}

                  <div
                    className={`flex size-13 items-center justify-center rounded-xl ${
                      item.emergency
                        ? "bg-red-600 text-white shadow-lg shadow-red-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Icon
                      className="size-6"
                      fill={item.emergency ? "currentColor" : "none"}
                    />
                  </div>

                  <h3 className="mt-5 text-lg font-extrabold transition group-hover:text-red-600">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <section
          id="about"
          className="rounded-3xl bg-slate-900 px-7 py-10 text-white sm:px-10"
        >
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-400">
                About SAGIP
              </p>

              <h2 className="mt-3 text-3xl font-extrabold">
                One connected emergency response platform
              </h2>
            </div>

            <p className="leading-7 text-slate-300">
              SAGIP connects citizens, responders, and administrators through
              emergency reporting, GPS location sharing, dispatch coordination,
              live status tracking, and secure communication.
            </p>
          </div>
        </section>

        <section
          id="contact"
          className="mt-8 rounded-3xl border border-red-200 bg-red-50 px-7 py-8 sm:px-10"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-600">
                Emergency Hotline
              </p>

              <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                Need immediate assistance?
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Tap or click the hotline number. On a mobile device, SAGIP will
                open the phone dialer with the number ready to call.
              </p>
            </div>

            <a
              href={`tel:${HOTLINE_TEL}`}
              aria-label={`Call SAGIP emergency hotline at ${HOTLINE_DISPLAY}`}
              className="inline-flex shrink-0 items-center justify-center gap-3 rounded-2xl bg-red-700 px-6 py-4 text-lg font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-red-800"
            >
              <PhoneCall className="size-6" />
              {HOTLINE_DISPLAY}
            </a>
          </div>
        </section>
      </div>

      <a
        href={`tel:${HOTLINE_TEL}`}
        aria-label={`Call SAGIP emergency hotline at ${HOTLINE_DISPLAY}`}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-3 rounded-full bg-red-700 px-5 py-4 font-extrabold text-white shadow-2xl transition hover:-translate-y-0.5 hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-200"
      >
        <PhoneCall className="size-5" />

        <span className="hidden sm:inline">
          Call Hotline
        </span>
      </a>

      <footer className="mt-8 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 SAGIP Emergency Response System</p>

          <a
            href={`tel:${HOTLINE_TEL}`}
            className="inline-flex items-center gap-2 font-bold text-red-700 transition hover:text-red-800"
          >
            <PhoneCall className="size-4" />
            Emergency Hotline: {HOTLINE_DISPLAY}
          </a>

          <p>Prototype for academic and testing purposes only.</p>
        </div>
      </footer>
    </main>
  );
}