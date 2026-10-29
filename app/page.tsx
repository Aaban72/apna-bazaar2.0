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
  { id: 1, title: "iPhone 12 • 128 GB", price: "₹18,500", location: "Patna, Bihar", condition: "Used", emoji: "📱", color: "#0f172a", category: "Mobiles" },
  { id: 2, title: "Study table with chair", price: "₹2,200", location: "Kankarbagh, Patna", condition: "Used", emoji: "🪑", color: "#0f172a", category: "Furniture" },
  { id: 3, title: "Hero bicycle", price: "₹3,000", location: "Danapur, Patna", condition: "Good condition", emoji: "🚲", color: "#0f172a", category: "Vehicles" },
  { id: 4, title: "Wireless headphones", price: "₹899", location: "Delhi, India", condition: "Like new", emoji: "🎧", color: "#0f172a", category: "Electronics" },
  { id: 5, title: "Gaming laptop", price: "₹32,000", location: "Bengaluru, Karnataka", condition: "Used", emoji: "💻", color: "#0f172a", category: "Electronics" },
  { id: 6, title: "Sofa set, 3 seater", price: "₹7,500", location: "Mumbai, Maharashtra", condition: "Good condition", emoji: "🛋️", color: "#0f172a", category: "Furniture" },
  { id: 7, title: "Canon camera", price: "₹12,000", location: "Kolkata, West Bengal", condition: "Used", emoji: "📷", color: "#0f172a", category: "Electronics" },
  { id: 8, title: "Refrigerator, 190 L", price: "₹6,500", location: "Ranchi, Jharkhand", condition: "Used", emoji: "🧊", color: "#0f172a", category: "Home & Kitchen" },
];

const categories = [
  { name: "Mobiles", icon: "📱" },
  { name: "Vehicles", icon: "🏍️" },
  { name: "Electronics", icon: "💻" },
  { name: "Furniture", icon: "🛋️" },
  { name: "Fashion", icon: "👕" },
  { name: "Home & Kitchen", icon: "🏠" },
  { name: "Books", icon: "📚" },
  { name: "Other", icon: "📦" },
];

const popularLocations = [
  "All Over India",
  "Patna, Bihar",
  "Delhi / NCR",
  "Mumbai, Maharashtra",
  "Bengaluru, Karnataka",
  "Kolkata, West Bengal",
  "Hyderabad, Telangana",
  "Chennai, Tamil Nadu",
  "Ranchi, Jharkhand",
  "Lucknow, Uttar Pradesh",
  "Jaipur, Rajasthan",
  "Ahmedabad, Gujarat",
];

const STORAGE_KEY = "apnaBazaarListings";
const FAVORITES_KEY = "apnaBazaarFavorites";
const LOCATION_KEY = "apnaBazaarSelectedLocation";

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
  const [wishlistOnly, setWishlistOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  
  const [selectedLocation, setSelectedLocation] = useState("All Over India");
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [customLocationInput, setCustomLocationInput] = useState("");

  const [locationFilter, setLocationFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [databaseProducts, setDatabaseProducts] = useState<Product[]>([]);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sellerPhone, setSellerPhone] = useState<string | null>(null);
  const [sellerPhoneLoading, setSellerPhoneLoading] = useState(false);
  const [sellerPhoneError, setSellerPhoneError] = useState("");
  const [storageReady, setStorageReady] = useState(false);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authError, setAuthError] = useState("");
  const [dashboardOpen, setDashboardOpen] = useState(false);

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

  useEffect(() => {
    const savedLoc = localStorage.getItem(LOCATION_KEY);
    if (savedLoc) {
      setSelectedLocation(savedLoc);
    }
  }, []);

  function handleSelectLocation(loc: string) {
    setSelectedLocation(loc);
    localStorage.setItem(LOCATION_KEY, loc);
    setIsLocationModalOpen(false);
  }

  useEffect(() => {
    let mounted = true;

    async function loadSellerPhone() {
      setSellerPhone(null);
      setSellerPhoneError("");

      if (
        !selectedProduct ||
        selectedProduct.source !== "database" ||
        !selectedProduct.userId ||
        !userId ||
        selectedProduct.userId === userId
      ) {
        setSellerPhoneLoading(false);
        return;
      }

      setSellerPhoneLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("phone")
          .eq("user_id", selectedProduct.userId)
          .maybeSingle();

        if (error) throw error;
        if (mounted) setSellerPhone(data?.phone || null);
      } catch (error) {
        console.error("Unable to load seller contact:", error);
        if (mounted) {
          setSellerPhoneError("Seller contact is temporarily unavailable.");
        }
      } finally {
        if (mounted) setSellerPhoneLoading(false);
      }
    }

    void loadSellerPhone();
    return () => {
      mounted = false;
    };
  }, [selectedProduct, userId]);

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
            location: item.location || "India",
            image: item.image_url || undefined,
            createdAt: item.created_at,
            emoji: categoryEmoji[item.category] || "📦",
            color: "#0f172a",
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
    const params = new URLSearchParams(window.location.search);
    setWishlistOnly(params.get("wishlist") === "1");

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
        location: product.location || "India",
        emoji: product.emoji || "📦",
        color: product.color || "#0f172a",
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
      const matchesWishlist = !wishlistOnly || favorites.includes(String(product.id));
      const matchesSearch =
        !query ||
        product.title.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.location.toLowerCase().includes(query) ||
        (product.description || "").toLowerCase().includes(query);

      const matchesCategory =
        activeCategory === "All" || product.category === activeCategory;
      
      const cleanSelected = selectedLocation.toLowerCase().replace(/,/g, "");
      const cleanProductLoc = product.location.toLowerCase().replace(/,/g, "");

      const matchesGlobalLocation =
        selectedLocation === "All Over India" ||
        !selectedLocation ||
        cleanProductLoc.includes(cleanSelected) ||
        cleanSelected.split(" ").some((part) => part.length > 2 && cleanProductLoc.includes(part));

      const matchesLocationInput =
        !locationFilter.trim() ||
        product.location.toLowerCase().includes(locationFilter.trim().toLowerCase());

      const numericPrice = Number(String(product.price).replace(/[^0-9.]/g, ""));
      const matchesMinPrice = minPrice === "" || numericPrice >= Number(minPrice);
      const matchesMaxPrice = maxPrice === "" || numericPrice <= Number(maxPrice);

      return matchesWishlist && matchesSearch && matchesCategory && matchesGlobalLocation && matchesLocationInput && matchesMinPrice && matchesMaxPrice;
    });
  }, [allProducts, search, activeCategory, selectedLocation, locationFilter, minPrice, maxPrice, wishlistOnly, favorites]);

  function toggleFavorite(product: Product) {
    const id = String(product.id);

    setFavorites((previous) => {
      const updated = previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id];

      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      } catch {}

      return updated;
    });
  }

  async function handleDeleteProduct(product: Product) {
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
              await supabase.storage
                .from("product-images")
                .remove([filePath]);
            }
          }
        } catch (imageCleanupError) {
          console.error("Image cleanup failed:", imageCleanupError);
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
    setWishlistOnly(false);
    setActiveCategory("All");
    setSearch("");
    setSelectedLocation("All Over India");
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
    <main className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* High-Tech Electrifying Header */}
      <header className="sticky top-0 z-30 border-b border-cyan-500/20 bg-[#070d1e]/90 backdrop-blur-xl transition-all shadow-lg shadow-cyan-950/20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:gap-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="group flex shrink-0 items-center gap-2.5 text-xl font-black tracking-tight sm:text-2xl"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-lg font-black text-white shadow-md shadow-cyan-500/30 transition-transform duration-300 group-hover:scale-105 ring-1 ring-cyan-400/40">
                A
              </span>
              <span className="font-extrabold tracking-tight text-white">
                APNA<span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">BAZAAR</span>
              </span>
            </Link>

            {/* Sharp Electrifying Location Pill */}
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="hidden items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-2 text-xs font-semibold text-cyan-200 transition hover:border-cyan-400 hover:bg-cyan-900/50 lg:flex backdrop-blur-md cursor-pointer shadow-sm"
            >
              <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="max-w-[140px] truncate">{selectedLocation}</span>
              <span className="text-[10px] text-cyan-500">▼</span>
            </button>
          </div>

          {/* Futuristic Search Field */}
          <form
            className="order-3 flex w-full max-w-xl min-w-0 sm:order-none sm:flex-1 mx-2"
            onSubmit={(event) => {
              event.preventDefault();
              document.getElementById("products")?.scrollIntoView({
                behavior: "smooth",
              });
            }}
          >
            <div className="relative flex w-full items-center rounded-xl border border-cyan-500/30 bg-slate-900/80 shadow-inner transition focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20">
              <svg className="ml-3.5 h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="search"
                name="q"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search high-tech gear, vehicles, phones..."
                className="w-full bg-transparent px-3 py-2.5 text-xs text-slate-100 placeholder-slate-400 outline-none"
              />
              <button
                type="submit"
                className="m-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/20 active:scale-95"
              >
                Search
              </button>
            </div>
          </form>

          {/* User Dashboard & Sell CTA */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 ml-auto">
            {!authReady ? (
              <div
                className="h-10 w-24 animate-pulse rounded-xl bg-slate-800/60"
                aria-label="Checking account"
              />
            ) : userEmail ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDashboardOpen((open) => !open)}
                  aria-expanded={dashboardOpen}
                  aria-haspopup="menu"
                  aria-label="Open account dashboard"
                  title={userEmail}
                  className="flex items-center gap-2.5 rounded-xl border border-cyan-500/30 bg-slate-900/80 p-1.5 pr-3 text-left transition hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700 text-xs font-black text-white shadow-sm ring-1 ring-cyan-300">
                    {getUserInitials(userEmail)}
                  </span>
                  <span className="hidden min-w-0 sm:block">
                    <span className="block text-xs font-bold leading-4 text-cyan-200 truncate max-w-[100px]">
                      Dashboard
                    </span>
                    <span className="block text-[10px] leading-3 text-slate-400 truncate max-w-[100px]">
                      {userEmail}
                    </span>
                  </span>
                  <span aria-hidden="true" className="hidden text-xs text-cyan-500 sm:inline">▾</span>
                </button>

                {dashboardOpen && (
                  <div
                    role="menu"
                    aria-label="Account dashboard"
                    className="absolute right-0 top-full z-50 mt-2.5 w-60 overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#070d1e] p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="border-b border-cyan-900/50 px-3.5 py-3">
                      <p className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider">Signed in as</p>
                      <p className="truncate text-xs font-bold text-slate-200 mt-0.5">{userEmail}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        role="menuitem"
                        onClick={() => setDashboardOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-300 transition hover:bg-cyan-950/60 hover:text-cyan-300"
                      >
                        Profile
                      </Link>
                      <Link
                        href="/my-listings"
                        role="menuitem"
                        onClick={() => setDashboardOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-300 transition hover:bg-cyan-950/60 hover:text-cyan-300"
                      >
                        My Listings
                      </Link>
                      <Link
                        href="/?wishlist=1"
                        role="menuitem"
                        onClick={() => {
                          setWishlistOnly(true);
                          setDashboardOpen(false);
                          setSearch("");
                          setActiveCategory("All");
                          setLocationFilter("");
                          setMinPrice("");
                          setMaxPrice("");
                          window.setTimeout(() => {
                            document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                          }, 100);
                        }}
                        className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-300 transition hover:bg-cyan-950/60 hover:text-cyan-300"
                      >
                        Wishlist
                      </Link>
                      <Link
                        href="/inbox"
                        role="menuitem"
                        onClick={() => setDashboardOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-300 transition hover:bg-cyan-950/60 hover:text-cyan-300"
                      >
                        Chats
                      </Link>
                    </div>
                    <div className="border-t border-cyan-900/50 pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-bold text-rose-400 transition hover:bg-rose-950/40"
                      >
                        {loggingOut ? "Logging out..." : "Logout"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-cyan-200 border border-cyan-500/30 transition hover:bg-cyan-950 hover:border-cyan-400"
              >
                Login / Register
              </Link>
            )}

            {/* Glowing High-Voltage SELL Button */}
            <Link
              href="/sell"
              className="group relative inline-flex shrink-0 items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 px-5 py-2 text-xs font-extrabold text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:shadow-cyan-400/40 hover:scale-105 active:scale-95 ring-1 ring-cyan-300/50"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-950/60 text-cyan-300 text-[10px] font-black group-hover:rotate-90 transition-transform duration-300">
                +
              </span>
              <span>SELL ITEM</span>
            </Link>
          </div>
        </div>

        {authError && (
          <p
            role="alert"
            className="mx-auto max-w-7xl px-4 pb-3 text-xs text-rose-400 sm:px-6"
          >
            {authError}
          </p>
        )}
      </header>

      {/* Futuristic Location Selection Modal */}
      {isLocationModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsLocationModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#070d1e] p-6 shadow-2xl border border-cyan-500/40 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-cyan-900/60">
              <div>
                <h3 className="text-sm font-extrabold text-cyan-100 uppercase tracking-wide">Target Location</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Filter items by city or state</p>
              </div>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1.5">
                Custom Input
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customLocationInput}
                  onChange={(e) => setCustomLocationInput(e.target.value)}
                  placeholder="e.g. Patna, Delhi, Mumbai..."
                  className="flex-1 rounded-xl border border-cyan-500/30 bg-slate-900 px-3.5 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customLocationInput.trim()) {
                      handleSelectLocation(customLocationInput.trim());
                    }
                  }}
                  className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-cyan-500 shadow-md shadow-cyan-600/30"
                >
                  Set
                </button>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Popular Regions
              </p>
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                {popularLocations.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => handleSelectLocation(loc)}
                    className={`flex items-center justify-between w-full rounded-xl px-3.5 py-2.5 text-left text-xs font-bold transition ${
                      selectedLocation === loc
                        ? "bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 shadow-inner"
                        : "hover:bg-slate-900/80 text-slate-300 border border-transparent"
                    }`}
                  >
                    <span>📍 {loc}</span>
                    {selectedLocation === loc && <span className="text-cyan-400 font-bold">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cyber Category Navigation Bar */}
      <nav className="border-b border-cyan-500/10 bg-[#070d1e]/50 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 overflow-x-auto scrollbar-none sm:px-6">
          <button
            type="button"
            onClick={() => chooseCategory("All")}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider transition ${
              activeCategory === "All"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 font-black"
                : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-cyan-500/20"
            }`}
          >
            All Categories
          </button>

          {categories.map((category) => (
            <button
              key={category.name}
              type="button"
              onClick={() => chooseCategory(category.name)}
              className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                activeCategory === category.name
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 font-black"
                  : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-cyan-500/20"
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.name === "Vehicles" ? "Cars & Bikes" : category.name}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Hero Banner with Futuristic Electrifying Gradient */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-[#071330] to-[#0a1c42] p-8 sm:p-12 border border-cyan-500/30 shadow-2xl">
          <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 -bottom-24 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid items-center gap-8 md:grid-cols-[1.5fr_0.5fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-md bg-cyan-950/80 border border-cyan-500/40 px-3 py-1 text-[10px] font-black tracking-widest uppercase text-cyan-300">
                ⚡ FAST & VERIFIED LOCAL MARKET
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight leading-tight sm:text-5xl text-white">
                BUY SMART. <br />
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
                  SELL INSTANTLY.
                </span>
              </h1>
              <p className="mt-3 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
                Connect directly with genuine sellers and buyers across India. High security, zero middleman fees.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("products")?.scrollIntoView({
                      behavior: "smooth",
                    })
                  }
                  className="rounded-xl bg-cyan-500 px-6 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-400 active:scale-95 uppercase tracking-wider"
                >
                  Explore Listings
                </button>
                <Link
                  href="/sell"
                  className="rounded-xl border border-cyan-500/40 bg-slate-900/60 px-6 py-2.5 text-xs font-bold text-cyan-300 backdrop-blur-md transition hover:bg-cyan-950/60"
                >
                  Post Your Ad
                </Link>
              </div>
            </div>

            <div
              className="hidden md:grid grid-cols-2 gap-3"
              aria-hidden="true"
            >
              {["📱", "🚲", "🛋️", "💻"].map((emoji, index) => (
                <div
                  key={emoji}
                  className={`flex h-24 items-center justify-center rounded-xl border border-cyan-500/20 bg-slate-900/60 text-4xl shadow-inner transition hover:scale-105 duration-300 ${
                    index % 2 === 1 ? "mt-4" : ""
                  }`}
                >
                  {emoji}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Grid Category Selector */}
      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <div className="mb-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-cyan-400">
            Categories
          </h2>
        </div>

        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((category) => (
            <button
              key={category.name}
              type="button"
              onClick={() => chooseCategory(category.name)}
              className={`group flex flex-col items-center gap-1.5 rounded-xl border bg-slate-900/60 p-3 text-center transition-all duration-200 hover:-translate-y-0.5 ${
                activeCategory === category.name
                  ? "border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400/50"
                  : "border-cyan-500/20 hover:border-cyan-500/50"
              }`}
            >
              <span className="text-xl transition-transform duration-200 group-hover:scale-110" aria-hidden="true">
                {category.icon}
              </span>
              <span className="text-[10px] font-bold text-slate-300 group-hover:text-cyan-300 truncate w-full">
                {category.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Main Product Showcase Section */}
      <section id="products" className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        {/* High Tech Filters Box */}
        <div className="mb-6 rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-4 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
              <span>⚡</span> Refine Search
            </h3>
            <button 
              type="button" 
              onClick={resetFilters} 
              className="text-[11px] font-bold text-cyan-400 hover:underline"
            >
              Reset Filters
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-[10px] font-bold text-slate-400 uppercase">
              Keywords
              <input 
                value={search} 
                onChange={(event) => setSearch(event.target.value)} 
                placeholder="e.g. iPhone, Sofa" 
                className="mt-1 w-full rounded-lg border border-cyan-500/20 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400" 
              />
            </label>
            <label className="block text-[10px] font-bold text-slate-400 uppercase">
              Area / Locality
              <input 
                value={locationFilter} 
                onChange={(event) => setLocationFilter(event.target.value)} 
                placeholder="e.g. Kankarbagh" 
                className="mt-1 w-full rounded-lg border border-cyan-500/20 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400" 
              />
            </label>
            <label className="block text-[10px] font-bold text-slate-400 uppercase">
              Min Price (₹)
              <input 
                type="number" 
                min="0" 
                inputMode="numeric" 
                value={minPrice} 
                onChange={(event) => setMinPrice(event.target.value)} 
                placeholder="Min ₹" 
                className="mt-1 w-full rounded-lg border border-cyan-500/20 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400" 
              />
            </label>
            <label className="block text-[10px] font-bold text-slate-400 uppercase">
              Max Price (₹)
              <input 
                type="number" 
                min="0" 
                inputMode="numeric" 
                value={maxPrice} 
                onChange={(event) => setMaxPrice(event.target.value)} 
                placeholder="Max ₹" 
                className="mt-1 w-full rounded-lg border border-cyan-500/20 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400" 
              />
            </label>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black tracking-tight text-white uppercase">
              {wishlistOnly
                ? "My Wishlist"
                : activeCategory === "All"
                  ? "Fresh Recommendations"
                  : activeCategory}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing {filteredProducts.length} listing(s)
              {selectedLocation !== "All Over India" ? ` in ${selectedLocation}` : " in All Over India"}
            </p>
          </div>

          {(search || activeCategory !== "All" || selectedLocation !== "All Over India" || locationFilter || minPrice || maxPrice) && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-cyan-500/30 bg-slate-900 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-slate-800 transition"
            >
              Clear Filters
            </button>
          )}
        </div>

        {(!storageReady || !databaseReady) && (
          <div className="py-12 text-center text-xs font-semibold text-cyan-400 animate-pulse">
            Loading latest marketplace listings...
          </div>
        )}

        {databaseError && (
          <p role="alert" className="mb-4 rounded-xl bg-rose-950/60 p-3 text-xs font-bold text-rose-300 border border-rose-500/30">
            {databaseError}
          </p>
        )}

        {deleteError && (
          <p role="alert" className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/60 p-3 text-xs font-bold text-rose-300">
            {deleteError}
          </p>
        )}

        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cyan-500/30 bg-slate-900/40 p-12 text-center">
            <p className="text-3xl">🔍</p>
            <h3 className="mt-3 text-sm font-bold text-slate-200">No products found</h3>
            <p className="mt-1 text-xs text-slate-400">
              Try adjusting your target location or search criteria.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 rounded-xl bg-cyan-600 px-5 py-2 text-xs font-bold text-white hover:bg-cyan-500 transition"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {filteredProducts.map((product) => {
              const isSavedListing = product.source === "local";
              const isOwnDatabaseListing =
                product.source === "database" && !!userId && product.userId === userId;
              const isFavorite = favorites.includes(String(product.id));

              return (
                <article
                  key={product.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-xl border border-cyan-500/20 bg-slate-900/80 transition-all duration-300 hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-950/50"
                >
                  <Link
                    href={`/product/${product.source ?? "demo"}/${encodeURIComponent(String(product.id))}`}
                    className="block w-full text-left"
                    aria-label={`View details for ${product.title}`}
                  >
                    <div
                      className="relative flex h-36 items-center justify-center sm:h-48 overflow-hidden bg-slate-950"
                    >
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image}
                          alt={product.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <span
                          className="text-5xl transition-transform duration-500 group-hover:scale-110"
                          role="img"
                          aria-label={product.title}
                        >
                          {product.emoji}
                        </span>
                      )}

                      <span className="absolute left-2.5 top-2.5 rounded-md bg-slate-950/90 border border-cyan-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-cyan-300">
                        {product.condition}
                      </span>
                    </div>

                    <div className="p-3 pb-1">
                      <p className="text-base font-black text-white">
                        {formatPrice(product.price)}
                      </p>
                      <h3 className="mt-1 break-words text-xs font-bold text-slate-200 line-clamp-1 group-hover:text-cyan-300 transition">
                        {product.title}
                      </h3>
                      <p className="mt-1 truncate text-[10px] font-medium text-slate-400">
                        📍 {product.location}
                      </p>
                    </div>
                  </Link>

                  <div className="p-3 pt-1">
                    <div className="flex items-center justify-between border-t border-slate-800 pt-2.5">
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(product)}
                        className="text-[10px] font-bold text-cyan-400 hover:underline"
                        aria-label={`Quick preview of ${product.title}`}
                      >
                        Quick preview
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
                        className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                          isFavorite
                            ? "border-rose-500/50 bg-rose-950/50 text-rose-400"
                            : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                        }`}
                      >
                        {isFavorite ? "♥" : "♡"}
                      </button>
                    </div>

                    {isSavedListing && (
                      <p className="mt-2 rounded bg-cyan-950/80 border border-cyan-500/30 py-0.5 text-[8px] font-black text-cyan-300 text-center uppercase tracking-wider">
                        Browser Saved Listing
                      </p>
                    )}

                    {(isSavedListing || isOwnDatabaseListing) && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => void handleDeleteProduct(product)}
                          disabled={deletingProductId === String(product.id)}
                          className="w-full rounded-lg border border-rose-500/30 bg-rose-950/40 py-1 text-[10px] font-bold text-rose-300 transition hover:bg-rose-900/60 disabled:opacity-50"
                        >
                          {deletingProductId === String(product.id) ? "Deleting..." : "Delete Listing"}
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Cyber Footer */}
      <footer className="mt-12 border-t border-cyan-500/20 bg-[#070d1e] py-8 text-xs text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-extrabold text-white">APNA<span className="text-cyan-400">BAZAAR</span></p>
          <p>© 2026 Apna Bazaar · Peer Marketplace Platform</p>
          <p className="text-cyan-400 font-semibold">Secure & Encrypted</p>
        </div>
      </footer>

      {/* Cyber Quick Preview Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setSelectedProduct(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-dialog-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[#070d1e] p-6 shadow-2xl border border-cyan-500/40 animate-in zoom-in-95 duration-150"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-cyan-900/60">
              <h2 id="product-dialog-title" className="text-xs font-black text-cyan-300 uppercase tracking-widest">
                Listing Preview
              </h2>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                aria-label="Close product details"
                className="rounded-lg bg-slate-800 px-2 py-0.5 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {selectedProduct.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedProduct.image}
                alt={selectedProduct.title}
                className="mt-4 h-56 w-full rounded-xl bg-slate-950 object-cover border border-cyan-500/20"
              />
            ) : (
              <div
                className="mt-4 flex h-48 items-center justify-center rounded-xl text-6xl bg-slate-950 border border-cyan-500/20"
              >
                {selectedProduct.emoji}
              </div>
            )}

            <div className="mt-4">
              <p className="text-2xl font-black text-white">
                {formatPrice(selectedProduct.price)}
              </p>
              <h3 className="mt-1 text-sm font-bold text-slate-200">{selectedProduct.title}</h3>
              <p className="mt-1 text-xs text-slate-400">
                {selectedProduct.category} · {selectedProduct.condition} · 📍 {selectedProduct.location}
              </p>
              <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300 bg-slate-950/80 p-3 rounded-xl border border-cyan-500/10">
                {selectedProduct.description ||
                  "No extra description provided by seller."}
              </p>
            </div>

            {selectedProduct.source === "database" &&
            selectedProduct.userId &&
            selectedProduct.userId !== userId ? (
              <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Link
                  href={
                    userId
                      ? `/chat/${encodeURIComponent(String(selectedProduct.id))}`
                      : `/login?next=${encodeURIComponent(`/chat/${String(selectedProduct.id)}`)}`
                  }
                  className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-4 py-2.5 text-center text-xs font-bold text-white hover:bg-cyan-500 transition shadow-md shadow-cyan-600/30"
                >
                  Chat with Seller
                </Link>

                {userId ? (
                  sellerPhone ? (
                    <a
                      href={`tel:${sellerPhone.replace(/[^+0-9]/g, "")}`}
                      className="inline-flex items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-4 py-2.5 text-center text-xs font-bold text-cyan-200 hover:bg-cyan-900/60 transition"
                    >
                      Call Seller
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-500 cursor-not-allowed"
                    >
                      {sellerPhoneLoading ? "Loading..." : "Call unavailable"}
                    </button>
                  )
                ) : (
                  <Link
                    href={`/login?next=${encodeURIComponent(`/product/database/${String(selectedProduct.id)}`)}`}
                    className="inline-flex items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-4 py-2.5 text-center text-xs font-bold text-cyan-200 hover:bg-cyan-900/60 transition"
                  >
                    Login to Call
                  </Link>
                )}
                {sellerPhoneError && (
                  <p role="status" className="text-xs text-rose-400 sm:col-span-2">
                    {sellerPhoneError}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-cyan-950/40 border border-cyan-500/20 p-2.5 text-[10px] text-cyan-300">
                {selectedProduct.source === "database" &&
                selectedProduct.userId === userId
                  ? "This is your active listing."
                  : "Chat and calling features are active for verified published database items."}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <Link
                href={`/product/${selectedProduct.source ?? "demo"}/${encodeURIComponent(String(selectedProduct.id))}`}
                className="inline-flex w-full items-center justify-center rounded-xl border border-cyan-500/30 bg-slate-900 px-4 py-2.5 text-xs font-bold text-cyan-200 hover:bg-slate-800 transition"
              >
                View Full Page Details
              </Link>

              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="w-full rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
              >
                Close Preview
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}