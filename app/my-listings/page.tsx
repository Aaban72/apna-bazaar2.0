"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Listing = {
  id: string | number;
  title: string;
  price: string | number;
  category: string;
  condition?: string;
  description?: string;
  location?: string;
  image?: string;
  image_url?: string;
  createdAt?: string;
  created_at?: string;
  userId?: string;
  user_id?: string;
  source: "local" | "database";
};

const STORAGE_KEY = "apnaBazaarListings";
const FAVORITES_KEY = "apnaBazaarFavorites";

function formatPrice(price: string | number) {
  if (typeof price === "string" && price.includes("₹")) return price;
  return Number(price).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

export default function MyListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadListings(currentUserId?: string | null) {
    setLoading(true);
    setErrorMessage("");
    try {
      let activeUserId = currentUserId;
      if (activeUserId === undefined) {
        const { data } = await supabase.auth.getUser();
        activeUserId = data.user?.id ?? null;
        setUserId(activeUserId);
      }

      const localItems: Listing[] = (() => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const parsed: unknown = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(parsed)) return [];
          return parsed
            .filter((item) => item && typeof item === "object" &&
              (typeof item.id === "string" || typeof item.id === "number") &&
              typeof item.title === "string" &&
              (typeof item.price === "number" || typeof item.price === "string") &&
              typeof item.category === "string")
            .map((item) => ({ ...item, source: "local" as const }));
        } catch {
          return [];
        }
      })();

      let databaseItems: Listing[] = [];
      if (activeUserId) {
        const { data, error } = await supabase
          .from("products")
          .select("id, user_id, title, price, category, condition, description, location, image_url, created_at")
          .eq("user_id", activeUserId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        databaseItems = (data ?? []).map((item) => ({ ...item, source: "database" as const }));
      }

      setListings([
        ...databaseItems,
        ...localItems,
      ]);
    } catch (error) {
      console.error("Unable to load your listings:", error);
      setErrorMessage("Your listings could not be loaded. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function start() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!mounted) return;
        const id = data.user?.id ?? null;
        setUserId(id);
        await loadListings(id);
      } catch (error) {
        console.error("Unable to check login:", error);
        if (mounted) {
          setUserId(null);
          await loadListings(null);
        }
      }
    }
    void start();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id ?? null;
      setUserId(id);
      void loadListings(id);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // Load once and refresh when authentication changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function deleteListing(listing: Listing) {
    const isLocal = listing.source === "local";
    if (!isLocal && (!userId || (listing.user_id ?? listing.userId) !== userId)) {
      setErrorMessage("You can only delete your own published listings.");
      return;
    }

    const confirmed = window.confirm(
      isLocal
        ? `Delete "${listing.title}" from this browser? This cannot be undone.`
        : `Delete "${listing.title}" permanently? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(String(listing.id));
    setErrorMessage("");
    try {
      if (isLocal) {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        const remaining = Array.isArray(parsed)
          ? parsed.filter((item) => String(item?.id) !== String(listing.id))
          : [];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
        const favoriteRaw = localStorage.getItem(FAVORITES_KEY);
        const favorites: unknown = favoriteRaw ? JSON.parse(favoriteRaw) : [];
        if (Array.isArray(favorites)) {
          localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites.filter((id) => String(id) !== String(listing.id))));
        }
      } else {
        const { data, error } = await supabase
          .from("products")
          .delete()
          .eq("id", listing.id)
          .eq("user_id", userId!)
          .select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("No listing was deleted. Check that you own this listing.");

        const imageUrl = listing.image_url ?? listing.image;
        if (imageUrl) {
          const marker = "/storage/v1/object/public/product-images/";
          const index = imageUrl.indexOf(marker);
          if (index >= 0) {
            const path = decodeURIComponent(imageUrl.slice(index + marker.length).split("?")[0]);
            if (path.startsWith(`${userId}/`)) {
              const { error: storageError } = await supabase.storage.from("product-images").remove([path]);
              if (storageError) console.error("Listing deleted, but image cleanup failed:", storageError);
            }
          }
        }
      }
      setListings((current) => current.filter((item) => !(item.source === listing.source && String(item.id) === String(listing.id))));
    } catch (error) {
      console.error("Unable to delete listing:", error);
      setErrorMessage("Unable to delete this listing. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">A</span>
            Apna Bazaar
          </Link>
          <Link href="/sell" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">+ Post an Ad</Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Your account</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">My Listings</h1>
            <p className="mt-2 text-slate-600">Manage the products you have posted.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">{listings.length} {listings.length === 1 ? "listing" : "listings"}</span>
        </div>

        {errorMessage && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">Loading your listings...</div>
        ) : listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
            <div className="text-4xl">📦</div>
            <h2 className="mt-3 text-xl font-bold">No listings yet</h2>
            <p className="mt-2 text-slate-600">Products you post will appear here.</p>
            <Link href="/sell" className="mt-5 inline-flex rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700">Post your first ad</Link>
            {!userId && <p className="mt-4 text-sm text-slate-500">Log in to see listings saved to your Supabase account.</p>}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {listings.map((listing) => {
              const imageUrl = listing.image_url ?? listing.image;
              return (
                <article key={`${listing.source}-${listing.id}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex gap-4 p-4">
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 sm:h-32 sm:w-32">
                      {imageUrl ? <img src={imageUrl} alt={listing.title} className="h-full w-full object-cover" /> : <span className="text-4xl">📦</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{listing.source === "database" ? "Published listing" : "Saved in this browser"}</p>
                      <h2 className="mt-1 break-words text-lg font-bold">{listing.title}</h2>
                      <p className="mt-1 text-lg font-extrabold">{formatPrice(listing.price)}</p>
                      <p className="mt-1 text-sm text-slate-500">{listing.category} · {listing.condition || "Used"}</p>
                      {listing.location && <p className="mt-1 truncate text-sm text-slate-500">{listing.location}</p>}
                    </div>
                  </div>
                  {listing.description && <p className="px-4 pb-3 text-sm text-slate-600">{listing.description}</p>}
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
                    <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">View marketplace</Link>
                    <button type="button" onClick={() => void deleteListing(listing)} disabled={deletingId === String(listing.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">
                      {deletingId === String(listing.id) ? "Deleting..." : "Delete listing"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Note:</strong> Browser-saved listings are visible only in this browser. Supabase listings are loaded for the account currently signed in.
        </div>
      </section>
    </main>
  );
}
