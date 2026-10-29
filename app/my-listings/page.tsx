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
    <main className="min-h-screen bg-[#020617] text-slate-100 font-sans">
      <header className="border-b border-cyan-500/20 bg-[#070d1e]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-2.5 text-xl font-black tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30">A</span>
            APNA<span className="text-cyan-400">BAZAAR</span>
          </Link>
          <Link href="/sell" className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition uppercase tracking-wider">+ Post Ad</Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Your Account</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl text-white uppercase">My Listings</h1>
            <p className="mt-1 text-xs text-slate-400">Manage the products you have posted on Apna Bazaar.</p>
          </div>
          <span className="rounded-full border border-cyan-500/30 bg-slate-900 px-3.5 py-1 text-xs font-bold text-cyan-300 shadow-sm">{listings.length} {listings.length === 1 ? "listing" : "listings"}</span>
        </div>

        {errorMessage && <p role="alert" className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/60 p-3 text-xs font-bold text-rose-300">{errorMessage}</p>}

        {loading ? (
          <div className="rounded-2xl border border-cyan-500/20 bg-[#070d1e] p-12 text-center text-xs font-bold text-cyan-400 animate-pulse">Loading your listings...</div>
        ) : listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cyan-500/30 bg-slate-900/40 px-5 py-14 text-center">
            <div className="text-4xl">📦</div>
            <h2 className="mt-3 text-sm font-bold text-slate-200">No listings yet</h2>
            <p className="mt-1 text-xs text-slate-400">Products you post will appear here securely.</p>
            <Link href="/sell" className="mt-5 inline-flex rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-cyan-500 transition shadow-md shadow-cyan-600/30">Post your first ad</Link>
            {!userId && <p className="mt-4 text-[11px] text-slate-500">Log in to sync and view listings saved to your Supabase account.</p>}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {listings.map((listing) => {
              const imageUrl = listing.image_url ?? listing.image;
              return (
                <article key={`${listing.source}-${listing.id}`} className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#070d1e] shadow-lg shadow-cyan-950/20">
                  <div className="flex gap-4 p-4">
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-cyan-500/20 bg-slate-950 sm:h-32 sm:w-32">
                      {imageUrl ? <img src={imageUrl} alt={listing.title} className="h-full w-full object-cover" /> : <span className="text-3xl">📦</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-cyan-400">{listing.source === "database" ? "Published Listing" : "Saved in Browser"}</p>
                      <h2 className="mt-1 break-words text-sm font-bold text-white">{listing.title}</h2>
                      <p className="mt-1 text-base font-black text-white">{formatPrice(listing.price)}</p>
                      <p className="mt-1 text-xs text-slate-400">{listing.category} · {listing.condition || "Used"}</p>
                      {listing.location && <p className="mt-1 truncate text-xs text-slate-500">📍 {listing.location}</p>}
                    </div>
                  </div>
                  {listing.description && <p className="px-4 pb-3 text-xs text-slate-300 line-clamp-2">{listing.description}</p>}
                  <div className="flex items-center justify-between gap-3 border-t border-cyan-900/60 bg-slate-950/40 px-4 py-3">
                    <Link href="/" className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition">View Marketplace</Link>
                    <button type="button" onClick={() => void deleteListing(listing)} disabled={deletingId === String(listing.id)} className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-1.5 text-xs font-bold text-rose-300 transition hover:bg-rose-900/60 disabled:cursor-not-allowed disabled:opacity-50">
                      {deletingId === String(listing.id) ? "Deleting..." : "Delete Listing"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-4 text-xs text-slate-400 backdrop-blur-md">
          <strong className="text-cyan-300">Note:</strong> Browser-saved listings are stored locally on this device, whereas Supabase listings sync securely with your active account profile.
        </div>
      </section>
    </main>
  );
}