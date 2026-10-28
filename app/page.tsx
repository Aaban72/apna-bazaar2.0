
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string | number;
  title: string;
  price: string | number;
  location: string;
  condition: string;
  emoji: string;
  color: string;
  category: string;
  description?: string;
  image?: string;
  createdAt?: string;
  userId?: string;
  source?: "database" | "local" | "demo";
};

const demoProducts: Product[] = [
  { id: 1, title: "iPhone 12 • 128 GB", price: "₹18,500", location: "Patna, Bihar", condition: "Used", emoji: "📱", color: "#e9eef9", category: "Mobiles" },
  { id: 2, title: "Study table with chair", price: "₹2,200", location: "Kankarbagh, Patna", condition: "Used", emoji: "🪑", color: "#f5e8d8", category: "Furniture" },
  { id: 3, title: "Hero bicycle", price: "₹3,000", location: "Danapur, Patna", condition: "Good condition", emoji: "🚲", color: "#e1f1e7", category: "Vehicles" },
  { id: 4, title: "Wireless headphones", price: "₹899", location: "Patna, Bihar", condition: "Like new", emoji: "🎧", color: "#eee5fa", category: "Electronics" },
  { id: 5, title: "Gaming laptop", price: "₹32,000", location: "Boring Road, Patna", condition: "Used", emoji: "💻", color: "#e4edf2", category: "Electronics" },
  { id: 6, title: "Sofa set, 3 seater", price: "₹7,500", location: "Phulwari Sharif, Patna", condition: "Good condition", emoji: "🛋️", color: "#f7e7e4", category: "Furniture" },
  { id: 7, title: "Canon camera", price: "₹12,000", location: "Patna, Bihar", condition: "Used", emoji: "📷", color: "#f2edda", category: "Electronics" },
  { id: 8, title: "Refrigerator, 190 L", price: "₹6,500", location: "Rajendra Nagar, Patna", condition: "Used", emoji: "🧊", color: "#e2eff9", category: "Home & Kitchen" },
];

const categories = [
  { name: "Mobiles", emoji: "📱" },
  { name: "Vehicles", emoji: "🏍️" },
  { name: "Electronics", emoji: "💻" },
  { name: "Furniture", emoji: "🛋️" },
  { name: "Fashion", emoji: "👕" },
  { name: "Home & Kitchen", emoji: "🏠" },
  { name: "Books", emoji: "📚" },
  { name: "Other", emoji: "📦" },
];

const STORAGE_KEY = "apnaBazaarListings";
const FAVORITES_KEY = "apnaBazaarFavorites";

function formatPrice(price: string | number) {
  if (typeof price === "string" && price.includes("₹")) {
    return price;
  }

  return Number(price).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function getUserInitials(email: string) {
  const username = email.split("@")[0];
  const parts = username
    .replace(/[._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return username.slice(0, 2).toUpperCase() || "U";
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [locationFilter, setLocationFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [databaseProducts, setDatabaseProducts] = useState<Product[]>([]);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [storageReady, setStorageReady] = useState(false);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!mounted) return;

        setUserEmail(error ? null : data.user?.email ?? null);
        setUserId(error ? null : data.user?.id ?? null);
      } catch {
        if (mounted) {
          setUserEmail(null);
          setUserId(null);
        }
      } finally {
        if (mounted) setAuthReady(true);
      }
    }

    void checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setUserEmail(session?.user?.email ?? null);
      setUserId(session?.user?.id ?? null);
      setAuthReady(true);
      setAuthError("");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setAuthError("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setUserEmail(null);
      setUserId(null);
      window.location.assign("/");
    } catch {
      setAuthError("Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadDatabaseProducts() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select(
            "id, user_id, title, price, category, condition, description, location, image_url, created_at"
          )
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!mounted) return;

        const mappedProducts: Product[] = (data ?? []).map((item) => {
          const categoryEmoji: Record<string, string> = {
            Mobiles: "📱",
            Vehicles: "🏍️",
            Electronics: "💻",
            Furniture: "🛋️",
            Fashion: "👕",
            "Home & Kitchen": "🏠",
            Books: "📚",
            Other: "📦",
          };

          return {
            id: item.id,
            userId: item.user_id,
            title: item.title,
            price: item.price,
            category: item.category,
            condition: item.condition || "Used",
            description: item.description || "",
            location: item.location || "Patna, Bihar",
            image: item.image_url || undefined,
            createdAt: item.created_at,
            emoji: categoryEmoji[item.category] || "📦",
            color: "#e1f1e7",
            source: "database",
          };
        });

        setDatabaseProducts(mappedProducts);
        setDatabaseError("");
      } catch (err) {
        console.error("Unable to load products from Supabase:", err);
        if (mounted) {
          setDatabaseError(
            "Database listings could not be loaded. Please refresh the page."
          );
        }
      } finally {
        if (mounted) setDatabaseReady(true);
      }
    }

    void loadDatabaseProducts();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed: unknown = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          const validProducts = parsed.filter(
            (item): item is Product =>
              item !== null &&
              typeof item === "object" &&
              (typeof item.id === "string" ||
                typeof item.id === "number") &&
              typeof item.title === "string" &&
              (typeof item.price === "number" ||
                typeof item.price === "string") &&
              typeof item.category === "string" &&
              typeof item.condition === "string"
          );

          setSavedProducts(
            validProducts.map((product) => ({
              ...product,
              source: "local" as const,
            }))
          );
        }
      }

      const storedFavorites = localStorage.getItem(FAVORITES_KEY);

      if (storedFavorites) {
        const parsedFavorites: unknown = JSON.parse(storedFavorites);

        if (
          Array.isArray(parsedFavorites) &&
          parsedFavorites.every((item) => typeof item === "string")
        ) {
          setFavorites(parsedFavorites);
        }
      }
    } catch {
      console.error("Saved Apna Bazaar data could not be read.");
    } finally {
      setStorageReady(true);
    }
  }, []);

  const allProducts = useMemo(
    () => [
      ...databaseProducts,
      ...savedProducts.map((product) => ({
        ...product,
        location: product.location || "Patna, Bihar",
        emoji: product.emoji || "📦",
        color: product.color || "#e1f1e7",
        source: "local" as const,
      })),
      ...demoProducts.map((product) => ({
        ...product,
        source: "demo" as const,
      })),
    ],
    [databaseProducts, savedProducts]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allProducts.filter((product) => {
      const matchesSearch =
        !query ||
        product.title.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.location.toLowerCase().includes(query) ||
        (product.description || "").toLowerCase().includes(query);

      const matchesCategory =
        activeCategory === "All" || product.category === activeCategory;
      const matchesLocation =
        !locationFilter.trim() ||
        product.location.toLowerCase().includes(locationFilter.trim().toLowerCase());
      const numericPrice = Number(String(product.price).replace(/[^0-9.]/g, ""));
      const matchesMinPrice = minPrice === "" || numericPrice >= Number(minPrice);
      const matchesMaxPrice = maxPrice === "" || numericPrice <= Number(maxPrice);

      return matchesSearch && matchesCategory && matchesLocation && matchesMinPrice && matchesMaxPrice;
    });
  }, [allProducts, search, activeCategory, locationFilter, minPrice, maxPrice]);

  function toggleFavorite(product: Product) {
    const id = String(product.id);

    setFavorites((previous) => {
      const updated = previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id];

      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      } catch {
        // Favorites remain available for the current session.
      }

      return updated;
    });
  }

  async function handleDeleteProduct(product: Product) {
    // Listings saved in this browser are deleted from localStorage.
    if (product.source === "local") {
      const confirmed = window.confirm(
        `Delete "${product.title}" from this browser? This action cannot be undone.`
      );
      if (!confirmed) return;

      setDeletingProductId(String(product.id));
      setDeleteError("");
      try {
        setSavedProducts((current) => {
          const updated = current.filter(
            (item) => String(item.id) !== String(product.id)
          );
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
        setFavorites((current) => {
          const updated = current.filter((id) => id !== String(product.id));
          localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
          return updated;
        });
        if (selectedProduct && String(selectedProduct.id) === String(product.id)) {
          setSelectedProduct(null);
        }
      } catch (err) {
        console.error("Unable to delete local listing:", err);
        setDeleteError("Unable to delete this browser listing. Please try again.");
      } finally {
        setDeletingProductId(null);
      }
      return;
    }

    if (product.source !== "database" || !userId || product.userId !== userId) {
      setDeleteError("You can only delete your own published listings.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${product.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingProductId(String(product.id));
    setDeleteError("");

    try {
      // The user_id filter and Supabase RLS both protect this operation.
      const { data, error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id)
        .eq("user_id", userId)
        .select("id");

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Listing was not deleted. Check your login and permissions.");
      }

      setDatabaseProducts((current) =>
        current.filter((item) => String(item.id) !== String(product.id))
      );

      // Remove the uploaded image from this user's folder, if there is one.
      if (product.image) {
        try {
          const imageUrl = new URL(product.image);
          const marker = "/storage/v1/object/public/product-images/";
          const markerIndex = imageUrl.pathname.indexOf(marker);

          if (markerIndex !== -1) {
            const filePath = decodeURIComponent(
              imageUrl.pathname.slice(markerIndex + marker.length)
            );

            if (filePath.startsWith(`${userId}/`)) {
              const { error: imageDeleteError } = await supabase.storage
                .from("product-images")
                .remove([filePath]);

              if (imageDeleteError) {
                console.error("Listing deleted, but image cleanup failed:", imageDeleteError);
              }
            }
          }
        } catch (imageCleanupError) {
          console.error("Listing deleted, but image cleanup failed:", imageCleanupError);
        }
      }
    } catch (err) {
      console.error("Unable to delete listing:", err);
      setDeleteError(
        err instanceof Error
          ? err.message
          : "Unable to delete this listing. Please try again."
      );
    } finally {
      setDeletingProductId(null);
    }
  }

  function resetFilters() {
    setSearch("");
    setActiveCategory("All");
    setLocationFilter("");
    setMinPrice("");
    setMaxPrice("");
  }

  function chooseCategory(category: string) {
    setActiveCategory(category);
    document.getElementById("products")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-xl font-black tracking-tight sm:text-2xl"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-lg text-white shadow-sm">
              A
            </span>
            <span>
              Apna<span className="text-emerald-600">Bazaar</span>
            </span>
          </Link>

          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 lg:flex">
            <span aria-hidden="true">📍</span>
            <span className="whitespace-nowrap text-sm font-medium text-slate-700">
              Patna, Bihar
            </span>
          </div>

          <form
            className="order-3 flex w-full min-w-0 sm:order-none sm:flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              document.getElementById("products")?.scrollIntoView({
                behavior: "smooth",
              });
            }}
          >
            <label htmlFor="search" className="sr-only">
              Search products
            </label>
            <input
              id="search"
              name="q"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search mobiles, furniture, bikes..."
              className="min-w-0 flex-1 rounded-l-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 sm:px-4"
            />
            <button
              type="submit"
              className="rounded-r-xl bg-emerald-600 px-4 font-semibold text-white transition hover:bg-emerald-700 sm:px-5"
            >
              Search
            </button>
          </form>

          {!authReady ? (
            <div
              className="h-10 w-24 animate-pulse rounded-xl bg-slate-100"
              aria-label="Checking account"
            />
          ) : userEmail ? (
            <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-sm font-extrabold tracking-wide text-white shadow-md ring-2 ring-emerald-100 sm:h-11 sm:w-11"
                title={userEmail}
                aria-label={`Account initials ${getUserInitials(userEmail)}`}
              >
                {getUserInitials(userEmail)}
              </div>

              <div className="hidden min-w-0 sm:block">
                <p className="text-sm font-bold leading-5 text-slate-800">
                  My Account
                </p>
                <p className="text-xs leading-4 text-slate-500">
                  Welcome back
                </p>
              </div>

              <Link
                href="/my-listings"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:px-4"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 6h13M8 12h13M8 18h13" />
                  <path d="M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
                <span>My Listings</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                  <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
                </svg>
                <span>{loggingOut ? "Logging out..." : "Logout"}</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-auto inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:px-5"
            >
              Login / Sign up
            </Link>
          )}

          <Link
            href="/sell"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border-2 border-slate-900 bg-amber-300 px-4 py-2.5 text-sm font-extrabold text-slate-900 shadow-[0_3px_0_#0f172a] transition hover:-translate-y-0.5 hover:bg-amber-200 hover:shadow-[0_4px_0_#0f172a] active:translate-y-0.5 active:shadow-none sm:px-5"
          >
            <span aria-hidden="true">＋</span>
            SELL
          </Link>
        </div>

        {authError && (
          <p
            role="alert"
            className="mx-auto max-w-7xl px-4 pb-3 text-sm text-red-600 sm:px-6"
          >
            {authError}
          </p>
        )}
      </header>

      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 text-sm sm:px-6">
          <button
            type="button"
            onClick={() => chooseCategory("All")}
            className={`rounded-lg px-3 py-2 font-bold transition ${
              activeCategory === "All"
                ? "bg-emerald-50 text-emerald-800"
                : "hover:bg-slate-100"
            }`}
          >
            ☰ All categories
          </button>

          {categories.map((category) => (
            <button
              key={category.name}
              type="button"
              onClick={() => chooseCategory(category.name)}
              className={`rounded-lg px-3 py-2 transition ${
                activeCategory === category.name
                  ? "bg-emerald-50 font-bold text-emerald-800"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {category.name === "Vehicles" ? "Cars & Bikes" : category.name}
            </button>
          ))}
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-600 px-6 py-9 text-white sm:px-10 sm:py-12">
          <div className="grid items-center gap-8 md:grid-cols-[1.4fr_0.6fr]">
            <div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
                Buy local. Sell easily.
              </span>
              <h1 className="mt-5 max-w-2xl text-3xl font-black leading-tight sm:text-5xl">
                Find what you need.
                <br />
                Sell what you don&apos;t.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-50 sm:text-base">
                Buy and sell new and pre-owned products from people near you.
                Simple, local, and convenient.
              </p>
              <button
                type="button"
                onClick={() =>
                  document.getElementById("products")?.scrollIntoView({
                    behavior: "smooth",
                  })
                }
                className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 font-bold text-emerald-900 transition hover:bg-emerald-50"
              >
                Explore products →
              </button>
            </div>

            <div
              className="hidden md:grid md:grid-cols-2 md:gap-3"
              aria-hidden="true"
            >
              {["📱", "🚲", "🛋️", "💻"].map((emoji, index) => (
                <div
                  key={emoji}
                  className={`flex h-32 items-center justify-center rounded-2xl bg-white/10 text-6xl ${
                    index % 2 === 1 ? "mt-7" : ""
                  }`}
                >
                  {emoji}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-5 sm:px-6">
        <div className="mb-4">
          <h2 className="text-xl font-extrabold sm:text-2xl">
            Browse categories
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose a category to get started.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((category) => (
            <button
              key={category.name}
              type="button"
              onClick={() => chooseCategory(category.name)}
              className={`flex flex-col items-center gap-2 rounded-2xl border bg-white p-4 text-center transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-sm ${
                activeCategory === category.name
                  ? "border-emerald-500 ring-2 ring-emerald-100"
                  : "border-slate-200"
              }`}
            >
              <span className="text-3xl" aria-hidden="true">
                {category.emoji}
              </span>
              <span className="text-xs font-semibold sm:text-sm">
                {category.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section id="products" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900">Find your product</h3>
            <button type="button" onClick={resetFilters} className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">Reset</button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm font-medium text-slate-700">
              Search title or keyword
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="e.g. iPhone, sofa" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Location
              <input value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} placeholder="e.g. Patna, Danapur" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Minimum price (₹)
              <input type="number" min="0" inputMode="numeric" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="No minimum" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Maximum price (₹)
              <input type="number" min="0" inputMode="numeric" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="No maximum" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
            </label>
          </div>
          {minPrice !== "" && maxPrice !== "" && Number(minPrice) > Number(maxPrice) && (
            <p role="alert" className="mt-3 text-sm text-red-600">Minimum price must be less than or equal to maximum price.</p>
          )}
        </div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold sm:text-2xl">
              {activeCategory === "All"
                ? "Fresh recommendations"
                : activeCategory}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredProducts.length} listing(s) found
              {search.trim() ? ` for "${search.trim()}"` : ""}
            </p>
          </div>

          {(search || activeCategory !== "All" || locationFilter || minPrice || maxPrice) && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Clear filters
            </button>
          )}
        </div>

        {(!storageReady || !databaseReady) && (
          <p className="mb-4 text-sm text-slate-500">
            Loading listings...
          </p>
        )}

        {databaseError && (
          <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {databaseError}
          </p>
        )}

        {deleteError && (
          <p role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {deleteError}
          </p>
        )}

        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-4xl">🔎</p>
            <h3 className="mt-3 text-lg font-bold">No products found</h3>
            <p className="mt-2 text-sm text-slate-500">
              Try a different search term or category.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800"
            >
              Show all products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {filteredProducts.map((product) => {
              const isSavedListing = product.source === "local";
              const isOwnDatabaseListing =
                product.source === "database" && !!userId && product.userId === userId;
              const isFavorite = favorites.includes(String(product.id));

              return (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    className="block w-full text-left"
                    aria-label={`View details for ${product.title}`}
                  >
                    <div
                      className="relative flex h-36 items-center justify-center sm:h-48"
                      style={{ backgroundColor: product.color }}
                    >
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image}
                          alt={product.title}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span
                          className="text-6xl sm:text-7xl"
                          role="img"
                          aria-label={product.title}
                        >
                          {product.emoji}
                        </span>
                      )}

                      <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                        {product.condition}
                      </span>
                    </div>

                    <div className="p-3 pb-1 sm:p-4 sm:pb-1">
                      <p className="text-lg font-extrabold sm:text-xl">
                        {formatPrice(product.price)}
                      </p>
                      <h3 className="mt-1 break-words text-sm font-semibold">
                        {product.title}
                      </h3>
                      <p className="mt-2 truncate text-xs text-slate-500">
                        📍 {product.location}
                      </p>
                      <p className="mt-2 text-xs text-emerald-700">
                        {product.category}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center justify-between gap-2 p-3 pt-2 sm:px-4 sm:pb-4">
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className="text-xs font-bold text-emerald-700 hover:underline"
                    >
                      View details
                    </button>
                    <button
                      type="button"
                      aria-label={
                        isFavorite
                          ? "Remove from favourites"
                          : "Add to favourites"
                      }
                      aria-pressed={isFavorite}
                      onClick={() => toggleFavorite(product)}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-xl ${
                        isFavorite
                          ? "border-rose-200 bg-rose-50 text-rose-600"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {isFavorite ? "♥" : "♡"}
                    </button>
                  </div>

                  {isSavedListing && (
                    <p className="border-t border-emerald-100 bg-emerald-50 px-3 py-2 text-[10px] font-semibold text-emerald-800 sm:px-4">
                      YOUR SAVED LISTING
                    </p>
                  )}

                  {(isSavedListing || isOwnDatabaseListing) && (
                    <div className="border-t border-slate-100 p-3 sm:px-4">
                      <button
                        type="button"
                        onClick={() => void handleDeleteProduct(product)}
                        disabled={deletingProductId === String(product.id)}
                        className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingProductId === String(product.id)
                          ? "Deleting..."
                          : "Delete listing"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-extrabold">Have something to sell?</h2>
            <p className="mt-1 text-sm text-slate-600">
              List your product on Apna Bazaar.
            </p>
          </div>

          <Link
            href="/sell"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800"
          >
            + Sell your item
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-bold text-slate-700">ApnaBazaar</p>
          <p>Buy smart. Sell easy. © 2026 Apna Bazaar</p>
          <p>Community listings · Some sample listings shown</p>
        </div>
      </footer>

      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-dialog-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="product-dialog-title" className="text-xl font-extrabold">
                Product details
              </h2>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                aria-label="Close product details"
                className="rounded-lg px-3 py-1 text-xl hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            {selectedProduct.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedProduct.image}
                alt={selectedProduct.title}
                className="mt-4 h-56 w-full rounded-xl bg-slate-50 object-contain"
              />
            ) : (
              <div
                className="mt-4 flex h-48 items-center justify-center rounded-xl text-7xl"
                style={{ backgroundColor: selectedProduct.color }}
              >
                {selectedProduct.emoji}
              </div>
            )}

            <p className="mt-4 text-2xl font-black">
              {formatPrice(selectedProduct.price)}
            </p>
            <h3 className="mt-2 text-lg font-bold">{selectedProduct.title}</h3>
            <p className="mt-2 text-sm text-slate-500">
              {selectedProduct.category} · {selectedProduct.condition}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              📍 {selectedProduct.location}
            </p>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6">
              {selectedProduct.description ||
                "Additional details are not available for this demo product."}
            </p>

            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="mt-5 w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800"
            >
              Close details
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
