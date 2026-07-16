"use client";

import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  HeartPulse,
  Save,
  Shield,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ProfileForm = {
  firstName: string;
  lastName: string;
  phone: string;
  birthDate: string;
  gender: string;
  address: string;
  bloodType: string;
  allergies: string;
  medicalConditions: string;
};

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  address: string | null;
  blood_type: string | null;
  allergies: string | null;
  medical_conditions: string | null;
};

const initialProfile: ProfileForm = {
  firstName: "",
  lastName: "",
  phone: "",
  birthDate: "",
  gender: "",
  address: "",
  bloodType: "",
  allergies: "",
  medicalConditions: "",
};

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<ProfileForm>(initialProfile);

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email ?? "");

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          `
            first_name,
            last_name,
            phone,
            birth_date,
            gender,
            address,
            blood_type,
            allergies,
            medical_conditions
          `,
        )
        .eq("auth_id", user.id)
        .maybeSingle<ProfileRow>();

      if (profileError) {
        setError(profileError.message);
        setIsLoading(false);
        return;
      }

      if (profileData) {
        setProfile({
          firstName: profileData.first_name ?? "",
          lastName: profileData.last_name ?? "",
          phone: profileData.phone ?? "",
          birthDate: profileData.birth_date ?? "",
          gender: profileData.gender ?? "",
          address: profileData.address ?? "",
          bloodType: profileData.blood_type ?? "",
          allergies: profileData.allergies ?? "",
          medicalConditions:
            profileData.medical_conditions ?? "",
        });
      } else {
        setProfile({
          firstName: String(
            user.user_metadata.first_name ?? "",
          ),
          lastName: String(
            user.user_metadata.last_name ?? "",
          ),
          phone: String(
            user.user_metadata.phone ?? "",
          ),
          birthDate: "",
          gender: "",
          address: "",
          bloodType: "",
          allergies: "",
          medicalConditions: "",
        });
      }

      setIsLoading(false);
    }

    loadProfile();
  }, [router]);

  function updateField(
    field: keyof ProfileForm,
    value: string,
  ) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setIsSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(
        "Your session has expired. Please sign in again.",
      );
      setIsSaving(false);
      router.replace("/login");
      return;
    }

    const firstName = profile.firstName.trim();
    const lastName = profile.lastName.trim();
    const phone = profile.phone.trim();
    const address = profile.address.trim();
    const allergies = profile.allergies.trim();
    const medicalConditions =
      profile.medicalConditions.trim();

    if (!firstName || !lastName) {
      setError(
        "First name and last name are required.",
      );
      setIsSaving(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          auth_id: user.id,
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          birth_date: profile.birthDate || null,
          gender: profile.gender || null,
          address: address || null,
          blood_type: profile.bloodType || null,
          allergies: allergies || null,
          medical_conditions:
            medicalConditions || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "auth_id",
        },
      );

    if (profileError) {
      setError(profileError.message);
      setIsSaving(false);
      return;
    }

    const { error: metadataError } =
      await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          phone,
        },
      });

    if (metadataError) {
      setError(
        `Profile was saved, but account metadata could not be updated: ${metadataError.message}`,
      );
      setIsSaving(false);
      return;
    }

    setSuccess("Profile updated successfully.");
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm font-semibold text-slate-500">
          Loading profile...
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
              <p className="text-xl font-extrabold">
                SAGIP
              </p>

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
        <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          <aside className="rounded-3xl bg-gradient-to-br from-red-600 to-red-800 p-7 text-white shadow-xl">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-white/15">
              <UserRound className="size-8" />
            </span>

            <h1 className="mt-6 text-3xl font-extrabold">
              My Profile
            </h1>

            <p className="mt-3 leading-7 text-red-100">
              Keep your personal and medical information
              accurate so responders can assist you more
              effectively during an emergency.
            </p>

            <div className="mt-8 rounded-2xl bg-white/10 p-5">
              <div className="flex items-start gap-3">
                <HeartPulse className="mt-1 size-5 shrink-0" />

                <div>
                  <p className="font-bold">
                    Emergency information
                  </p>

                  <p className="mt-2 text-sm leading-6 text-red-100">
                    Blood type, allergies, and medical
                    conditions may be shown to authorized
                    responders during an active emergency.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
            <div>
              <h2 className="text-2xl font-extrabold">
                Personal Information
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Update your contact and emergency-related
                details.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-6"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <ProfileField
                  label="First name"
                  id="firstName"
                  value={profile.firstName}
                  onChange={(value) =>
                    updateField("firstName", value)
                  }
                  required
                />

                <ProfileField
                  label="Last name"
                  id="lastName"
                  value={profile.lastName}
                  onChange={(value) =>
                    updateField("lastName", value)
                  }
                  required
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <ProfileField
                  label="Email address"
                  id="email"
                  type="email"
                  value={email}
                  disabled
                />

                <ProfileField
                  label="Phone number"
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(value) =>
                    updateField("phone", value)
                  }
                  placeholder="09XX XXX XXXX"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <ProfileField
                  label="Birth date"
                  id="birthDate"
                  type="date"
                  value={profile.birthDate}
                  onChange={(value) =>
                    updateField("birthDate", value)
                  }
                />

                <SelectField
                  label="Gender"
                  id="gender"
                  value={profile.gender}
                  onChange={(value) =>
                    updateField("gender", value)
                  }
                  options={[
                    ["", "Select gender"],
                    ["male", "Male"],
                    ["female", "Female"],
                    [
                      "prefer-not-to-say",
                      "Prefer not to say",
                    ],
                  ]}
                />
              </div>

              <ProfileField
                label="Home address"
                id="address"
                value={profile.address}
                onChange={(value) =>
                  updateField("address", value)
                }
                placeholder="Enter your complete address"
              />

              <div className="border-t border-slate-200 pt-7">
                <h3 className="text-xl font-extrabold">
                  Medical Information
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  This information can help emergency
                  responders make safer decisions.
                </p>
              </div>

              <SelectField
                label="Blood type"
                id="bloodType"
                value={profile.bloodType}
                onChange={(value) =>
                  updateField("bloodType", value)
                }
                options={[
                  ["", "Select blood type"],
                  ["A+", "A+"],
                  ["A-", "A-"],
                  ["B+", "B+"],
                  ["B-", "B-"],
                  ["AB+", "AB+"],
                  ["AB-", "AB-"],
                  ["O+", "O+"],
                  ["O-", "O-"],
                  ["unknown", "Unknown"],
                ]}
              />

              <TextAreaField
                label="Allergies"
                id="allergies"
                value={profile.allergies}
                onChange={(value) =>
                  updateField("allergies", value)
                }
                placeholder="List known allergies, or enter None"
              />

              <TextAreaField
                label="Medical conditions"
                id="medicalConditions"
                value={profile.medicalConditions}
                onChange={(value) =>
                  updateField(
                    "medicalConditions",
                    value,
                  )
                }
                placeholder="List existing medical conditions, or enter None"
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

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-6 py-3.5 font-extrabold text-white shadow-lg shadow-red-200 transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="size-5" />

                  {isSaving
                    ? "Saving..."
                    : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

type ProfileFieldProps = {
  label: string;
  id: string;
  value: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onChange?: (value: string) => void;
};

function ProfileField({
  label,
  id,
  value,
  type = "text",
  placeholder,
  required,
  disabled,
  onChange,
}: ProfileFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
      </label>

      <input
        id={id}
        name={id}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        onChange={(event) =>
          onChange?.(event.target.value)
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      />
    </div>
  );
}

type SelectFieldProps = {
  label: string;
  id: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
};

function SelectField({
  label,
  id,
  value,
  options,
  onChange,
}: SelectFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
      </label>

      <select
        id={id}
        name={id}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
      >
        {options.map(
          ([optionValue, optionLabel]) => (
            <option
              key={optionValue}
              value={optionValue}
            >
              {optionLabel}
            </option>
          ),
        )}
      </select>
    </div>
  );
}

type TextAreaFieldProps = {
  label: string;
  id: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

function TextAreaField({
  label,
  id,
  value,
  placeholder,
  onChange,
}: TextAreaFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
      </label>

      <textarea
        id={id}
        name={id}
        value={value}
        placeholder={placeholder}
        rows={4}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
      />
    </div>
  );
}