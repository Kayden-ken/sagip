"use client";

import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  HeartHandshake,
  Pencil,
  Phone,
  Plus,
  Save,
  Shield,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type EmergencyContact = {
  id: string;
  contact_name: string;
  relationship: string | null;
  phone: string;
};

type ContactForm = {
  name: string;
  relationship: string;
  phone: string;
};

const initialForm: ContactForm = {
  name: "",
  relationship: "",
  phone: "",
};

export default function EmergencyContactsPage() {
  const router = useRouter();

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [profileId, setProfileId] = useState("");
  const [form, setForm] = useState<ContactForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadContacts() {
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

      if (profileError) {
        setError(profileError.message);
        setIsLoading(false);
        return;
      }

      if (!profile) {
        setError(
          "Please complete and save your profile before adding emergency contacts.",
        );
        setIsLoading(false);
        return;
      }

      setProfileId(profile.id);

      const {
        data: contactRows,
        error: contactsError,
      } = await supabase
        .from("emergency_contacts")
        .select("id, contact_name, relationship, phone")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      if (contactsError) {
        setError(contactsError.message);
        setIsLoading(false);
        return;
      }

      setContacts(contactRows ?? []);
      setIsLoading(false);
    }

    loadContacts();
  }, [router]);

  function updateField(
    field: keyof ContactForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setError("");
  }

  function startEditing(contact: EmergencyContact) {
    setEditingId(contact.id);

    setForm({
      name: contact.contact_name,
      relationship: contact.relationship ?? "",
      phone: contact.phone,
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name = form.name.trim();
    const relationship = form.relationship.trim();
    const phone = form.phone.trim();

    if (!profileId) {
      setError(
        "Your profile could not be found. Please save your profile first.",
      );
      return;
    }

    if (!name || !phone) {
      setError("Contact name and phone number are required.");
      return;
    }

    setIsSaving(true);

    if (editingId) {
      const { data, error: updateError } = await supabase
        .from("emergency_contacts")
        .update({
          contact_name: name,
          relationship: relationship || null,
          phone,
        })
        .eq("id", editingId)
        .select("id, contact_name, relationship, phone")
        .single();

      if (updateError) {
        setError(updateError.message);
        setIsSaving(false);
        return;
      }

      setContacts((current) =>
        current.map((contact) =>
          contact.id === editingId ? data : contact,
        ),
      );

      setSuccess("Emergency contact updated successfully.");
    } else {
      const { data, error: insertError } = await supabase
        .from("emergency_contacts")
        .insert({
          profile_id: profileId,
          contact_name: name,
          relationship: relationship || null,
          phone,
        })
        .select("id, contact_name, relationship, phone")
        .single();

      if (insertError) {
        setError(insertError.message);
        setIsSaving(false);
        return;
      }

      setContacts((current) => [data, ...current]);
      setSuccess("Emergency contact added successfully.");
    }

    setForm(initialForm);
    setEditingId(null);
    setIsSaving(false);
  }

  async function handleDelete(contactId: string) {
    const confirmed = window.confirm(
      "Remove this emergency contact?",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase
      .from("emergency_contacts")
      .delete()
      .eq("id", contactId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setContacts((current) =>
      current.filter((contact) => contact.id !== contactId),
    );

    if (editingId === contactId) {
      resetForm();
    }

    setSuccess("Emergency contact removed.");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm font-semibold text-slate-500">
          Loading emergency contacts...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
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
              <p className="text-xl font-extrabold">SAGIP</p>
              <p className="text-xs text-slate-500">
                Citizen Emergency Portal
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-red-700"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="rounded-3xl bg-gradient-to-br from-red-600 to-red-800 p-7 text-white shadow-xl">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-white/15">
              <HeartHandshake className="size-8" />
            </span>

            <h1 className="mt-6 text-3xl font-extrabold">
              Emergency Contacts
            </h1>

            <p className="mt-3 leading-7 text-red-100">
              Add trusted people who may be contacted or notified
              during an active emergency.
            </p>

            <div className="mt-8 rounded-2xl bg-white/10 p-5">
              <p className="font-bold">Recommended contacts</p>

              <ul className="mt-3 space-y-2 text-sm leading-6 text-red-100">
                <li>• Parent or guardian</li>
                <li>• Spouse or family member</li>
                <li>• Trusted friend or caregiver</li>
                <li>• Personal doctor, when appropriate</li>
              </ul>
            </div>
          </aside>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold">
                    {editingId
                      ? "Edit Emergency Contact"
                      : "Add Emergency Contact"}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Provide the contact&apos;s name, relationship,
                    and phone number.
                  </p>
                </div>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-slate-200 p-3 text-slate-500 transition hover:bg-slate-100"
                    aria-label="Cancel editing"
                  >
                    <X className="size-5" />
                  </button>
                )}
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-7 space-y-5"
              >
                <ContactField
                  id="contactName"
                  label="Full name"
                  value={form.name}
                  placeholder="Enter contact name"
                  icon={UserRound}
                  required
                  onChange={(value) =>
                    updateField("name", value)
                  }
                />

                <ContactField
                  id="relationship"
                  label="Relationship"
                  value={form.relationship}
                  placeholder="Example: Mother, Brother, Friend"
                  icon={HeartHandshake}
                  onChange={(value) =>
                    updateField("relationship", value)
                  }
                />

                <ContactField
                  id="phone"
                  label="Phone number"
                  type="tel"
                  value={form.phone}
                  placeholder="09XX XXX XXXX"
                  icon={Phone}
                  required
                  onChange={(value) =>
                    updateField("phone", value)
                  }
                />

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                  >
                    {error}
                  </div>
                )}

                {success && (
                  <div
                    role="status"
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
                  >
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSaving || !profileId}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-6 py-3.5 font-extrabold text-white shadow-lg shadow-red-200 transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editingId ? (
                    <Save className="size-5" />
                  ) : (
                    <Plus className="size-5" />
                  )}

                  {isSaving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Add Contact"}
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
              <div>
                <h2 className="text-2xl font-extrabold">
                  Saved Contacts
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {contacts.length} emergency{" "}
                  {contacts.length === 1 ? "contact" : "contacts"}
                </p>
              </div>

              {contacts.length === 0 ? (
                <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <HeartHandshake className="mx-auto size-10 text-slate-300" />

                  <p className="mt-4 font-bold text-slate-700">
                    No emergency contacts yet
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Add at least one trusted person for emergency
                    notifications.
                  </p>
                </div>
              ) : (
                <div className="mt-7 space-y-4">
                  {contacts.map((contact) => (
                    <article
                      key={contact.id}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                          <UserRound className="size-6" />
                        </span>

                        <div className="min-w-0">
                          <h3 className="truncate font-extrabold">
                            {contact.contact_name}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {contact.relationship || "No relationship specified"}
                          </p>

                          <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Phone className="size-4" />
                            {contact.phone}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEditing(contact)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 sm:flex-none"
                        >
                          <Pencil className="size-4" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(contact.id)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 sm:flex-none"
                        >
                          <Trash2 className="size-4" />
                          Remove
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

type ContactFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  icon: React.ComponentType<{
    className?: string;
  }>;
  onChange: (value: string) => void;
};

function ContactField({
  id,
  label,
  value,
  placeholder,
  type = "text",
  required,
  icon: Icon,
  onChange,
}: ContactFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />

        <input
          id={id}
          name={id}
          type={type}
          value={value}
          placeholder={placeholder}
          required={required}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
        />
      </div>
    </div>
  );
}