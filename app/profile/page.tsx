"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
  "Mobiles",
  "Vehicles",
  "Electronics",
  "Furniture",
  "Fashion",
  "Home & Kitchen",
  "Books",
  "Other",
];

type ProfileForm = {
  display_name: string;
  phone: string;
  state: string;
  city: string;
  area: string;
  account_type: string;
  preferred_categories: string[];
};

const initialForm: ProfileForm = {
  display_name: "",
  phone: "",
  state: "Bihar",
  city: "Patna",
  area: "",
  account_type: "Both",
  preferred_categories: ["Mobiles", "Electronics"],
};

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const { data: userData, error: userError } =
          await supabase.auth.getUser();

        if (userError || !userData.user) {
          router.replace("/login?next=%2Fprofile");
          return;
        }

        const user = userData.user;
        if (!active) return;

        setUserId(user.id);
        setEmail(user.email ?? "");

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(
            "display_name, phone, state, city, area, account_type, preferred_categories"
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!active) return;

        if (profile) {
          setForm({
            display_name: profile.display_name ?? "",
            phone: profile.phone ?? "",
            state: profile.state ?? "Bihar",
            city: profile.city ?? "Patna",
            area: profile.area ?? "",
            account_type: profile.account_type ?? "Both",
            preferred_categories: Array.isArray(profile.preferred_categories)
              ? profile.preferred_categories
              : ["Mobiles", "Electronics"],
          });
        }
      } catch (err) {
        console.error("Unable to load profile:", err);
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your profile. Please refresh the page."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [router]);

  function updateField<K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setSuccess("");
  }

  function toggleCategory(category: string, checked: boolean) {
    const updated = checked
      ? [...new Set([...form.preferred_categories, category])]
      : form.preferred_categories.filter((item) => item !== category);

    updateField("preferred_categories", updated);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!userId) {
      setError("Please log in again to save your profile.");
      return;
    }

    const name = form.display_name.trim();
    const phone = form.phone.trim();

    if (name.length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }

    if (!/^[+0-9()\-\s]{7,20}$/.test(phone)) {
      setError("Please enter a valid phone number (7–20 characters).");
      return;
    }

    if (!form.state.trim() || !form.city.trim()) {
      setError("Please enter your state and city.");
      return;
    }

    setSaving(true);

    try {
      const saveRequest = supabase.from("profiles").upsert(
        {
          user_id: userId,
          display_name: name,
          phone,
          state: form.state.trim(),
          city: form.city.trim(),
          area: form.area.trim() || null,
          account_type: form.account_type,
          preferred_categories: form.preferred_categories,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      // Avoid leaving the Save button spinning forever if the network request hangs.
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("The save request timed out. Check your internet connection and Supabase project status, then try again.")), 15000);
      });
      const { error: saveError } = await Promise.race([saveRequest, timeout]);

      if (saveError) throw saveError;

      setSuccess("Profile saved successfully! Redirecting you to the homepage...");
      router.refresh();

      // Let the user see the success message before returning to the homepage.
      window.setTimeout(() => {
        router.push("/");
      }, 1800);
    } catch (err) {
      console.error("Unable to save profile:", err);
      setError(
        err instanceof Error
          ? `Profile could not be saved: ${err.message}`
          : "Profile could not be saved. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617] px-4 font-sans">
        <p className="text-xs font-bold text-cyan-400 animate-pulse">Loading your profile...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-8 text-slate-100 font-sans sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
        >
          ← Apna Bazaar
        </Link>

        <section className="mt-6 rounded-2xl border border-cyan-500/30 bg-[#070d1e] p-5 shadow-2xl sm:p-8 backdrop-blur-xl">
          <div className="mb-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
              Your Account
            </p>
            <h1 className="mt-2 text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
              Complete Your Profile
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Add your details so buyers and sellers can connect with you securely.
              You can update these details anytime.
            </p>
            {email && (
              <p className="mt-3 break-all rounded-xl border border-cyan-500/20 bg-slate-900 px-4 py-3 text-xs text-slate-300 shadow-inner">
                <span className="font-bold text-cyan-400">Signed in as:</span>{" "}
                {email}
              </p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="mb-5 rounded-xl border border-rose-500/30 bg-rose-950/60 p-3 text-xs font-bold text-rose-300"
            >
              {error}
            </p>
          )}

          {success && (
            <p
              role="status"
              className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-950/60 p-3 text-xs font-bold text-emerald-300"
            >
              {success}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400">Personal Details</h2>
              <p className="mt-1 text-xs text-slate-400">
                Fields marked * are required.
              </p>
            </div>

            <div>
              <label htmlFor="display_name" className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-300">
                Full Name *
              </label>
              <input
                id="display_name"
                autoComplete="name"
                value={form.display_name}
                onChange={(event) => updateField("display_name", event.target.value)}
                placeholder="Enter your full name"
                minLength={2}
                maxLength={100}
                required
                className="w-full rounded-xl border border-cyan-500/30 bg-slate-900 px-4 py-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-300">
                Phone Number *
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder="+91 98765 43210"
                maxLength={20}
                required
                className="w-full rounded-xl border border-cyan-500/30 bg-slate-900 px-4 py-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
              <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
                Your phone number is saved securely for communication purposes.
              </p>
            </div>

            <div className="border-t border-cyan-900/60 pt-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400">Preferred Location</h2>
              <p className="mt-1 text-xs text-slate-400">
                Your city and locality help match you with nearby listings. Do not enter exact street addresses.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="state" className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-300">
                  State *
                </label>
                <input
                  id="state"
                  autoComplete="address-level1"
                  value={form.state}
                  onChange={(event) => updateField("state", event.target.value)}
                  placeholder="e.g. Bihar"
                  maxLength={100}
                  required
                  className="w-full rounded-xl border border-cyan-500/30 bg-slate-900 px-4 py-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div>
                <label htmlFor="city" className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-300">
                  City *
                </label>
                <input
                  id="city"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  placeholder="e.g. Patna"
                  maxLength={100}
                  required
                  className="w-full rounded-xl border border-cyan-500/30 bg-slate-900 px-4 py-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="area" className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-300">
                Area / Locality (Optional)
              </label>
              <input
                id="area"
                autoComplete="address-line2"
                value={form.area}
                onChange={(event) => updateField("area", event.target.value)}
                placeholder="e.g. Kankarbagh"
                maxLength={120}
                className="w-full rounded-xl border border-cyan-500/30 bg-slate-900 px-4 py-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="border-t border-cyan-900/60 pt-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400">Marketplace Preferences</h2>
              <p className="mt-1 text-xs text-slate-400">
                These preferences customize your marketplace experience.
              </p>
            </div>

            <fieldset>
              <legend className="mb-2.5 text-xs font-bold text-slate-200">
                How will you use Apna Bazaar?
              </legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { value: "Buyer", label: "Buy Products" },
                  { value: "Seller", label: "Sell Products" },
                  { value: "Both", label: "Both Buy & Sell" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center rounded-xl border p-3.5 text-xs font-bold transition ${
                      form.account_type === option.value
                        ? "border-cyan-400 bg-cyan-950/60 text-cyan-200 shadow-sm shadow-cyan-500/20"
                        : "border-cyan-500/20 bg-slate-900 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="account_type"
                      value={option.value}
                      checked={form.account_type === option.value}
                      onChange={() => updateField("account_type", option.value)}
                      className="mr-2.5 accent-cyan-400"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1 text-xs font-bold text-slate-200">
                Preferred Categories (Optional)
              </legend>
              <p className="mb-3 text-[11px] text-slate-400">
                Select categories you are most interested in.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CATEGORIES.map((category) => {
                  const checked = form.preferred_categories.includes(category);
                  return (
                    <label
                      key={category}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-xs font-semibold transition ${
                        checked
                          ? "border-cyan-400 bg-cyan-950/60 text-cyan-200 shadow-sm"
                          : "border-cyan-500/20 bg-slate-900 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          toggleCategory(category, event.target.checked)
                        }
                        className="h-4 w-4 rounded accent-cyan-400"
                      />
                      <span className="truncate">{category}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="border-t border-cyan-900/60 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 uppercase tracking-wider"
              >
                {saving ? "Saving Profile..." : "Save Profile"}
              </button>
              <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-500">
                Your profile is securely linked to your Apna Bazaar account. You can update these settings anytime.
              </p>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}