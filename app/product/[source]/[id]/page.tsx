"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string | number;
  userId?: string;
  title: string;
  price: string | number;
  category: string;
  condition: string;
  description: string;
  location: string;
  image?: string;
  emoji: string;
  createdAt?: string;
  source: "database" | "local" | "demo";
};

type ProductDetailsPageProps = {
  params: Promise<{
    source: string;
    id: string;
  }>;
};

const demoProducts: Product[] = [
  {
    id: 1,
    title: "iPhone 12 • 128 GB",
    price: "₹18,500",
    location: "Patna, Bihar",
    condition: "Used",
    emoji: "📱",
    category: "Mobiles",
    description:
      "Pre-owned iPhone 12 with 128 GB storage. Please confirm the condition and included accessories with the seller.",
    source: "demo",
  },
  {
    id: 2,
    title: "Study table with chair",
    price: "₹2,200",
    location: "Kankarbagh, Patna",
    condition: "Used",
    emoji: "🪑",
    category: "Furniture",
    description:
      "A used study table with chair. Contact the seller to confirm measurements and condition.",
    source: "demo",
  },
  {
    id: 3,
    title: "Hero bicycle",
    price: "₹3,000",
    location: "Danapur, Patna",
    condition: "Good condition",
    emoji: "🚲",
    category: "Vehicles",
    description:
      "A pre-owned bicycle. Please inspect it in person before purchase.",
    source: "demo",
  },
  {
    id: 4,
    title: "Wireless headphones",
    price: "₹899",
    location: "Patna, Bihar",
    condition: "Like new",
    emoji: "🎧",
    category: "Electronics",
    description:
      "Wireless headphones in like-new condition. Please confirm battery life and included accessories.",
    source: "demo",
  },
  {
    id: 5,
    title: "Gaming laptop",
    price: "₹32,000",
    location: "Boring Road, Patna",
    condition: "Used",
    emoji: "💻",
    category: "Electronics",
    description:
      "A used gaming laptop. Ask the seller for full specifications and battery health.",
    source: "demo",
  },
  {
    id: 6,
    title: "Sofa set, 3 seater",
    price: "₹7,500",
    location: "Phulwari Sharif, Patna",
    condition: "Good condition",
    emoji: "🛋️",
    category: "Furniture",
    description:
      "A three-seater sofa set. Please check dimensions and condition with the seller.",
    source: "demo",
  },
  {
    id: 7,
    title: "Canon camera",
    price: "₹12,000",
    location: "Patna, Bihar",
    condition: "Used",
    emoji: "📷",
    category: "Electronics",
    description:
      "A pre-owned Canon camera. Ask the seller about the model, shutter count, and included accessories.",
    source: "demo",
  },
  {
    id: 8,
    title: "Refrigerator, 190 L",
    price: "₹6,500",
    location: "Rajendra Nagar, Patna",
    condition: "Used",
    emoji: "🧊",
    category: "Home & Kitchen",
    description:
      "A used 190 L refrigerator. Please confirm working condition and delivery arrangements.",
    source: "demo",
  },
];

const STORAGE_KEY = "apnaBazaarListings";

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

function formatDate(date?: string) {
  if (!date) return "Date not available";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Date not available";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProductDetailsPage({
  params,
}: ProductDetailsPageProps) {
  const router = useRouter();

  const [source, setSource] = useState("");
  const [id, setId] = useState("");
  const [paramsLoading, setParamsLoading] = useState(true);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [sellerPhone, setSellerPhone] = useState<string | null>(null);
  const [sellerPhoneLoading, setSellerPhoneLoading] = useState(false);
  const [sellerPhoneError, setSellerPhoneError] = useState("");

  useEffect(() => {
    let active = true;

    async function readParams() {
      try {
        const resolvedParams = await params;

        if (active) {
          setSource(resolvedParams.source);
          setId(decodeURIComponent(resolvedParams.id));
        }
      } catch (err) {
        console.error("Unable to read product URL:", err);

        if (active) {
          setError("Unable to read this product link. Please try again.");
          setLoading(false);
        }
      } finally {
        if (active) {
          setParamsLoading(false);
        }
      }
    }

    void readParams();

    return () => {
      active = false;
    };
  }, [params]);

  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      try {
        const { data, error: authError } = await supabase.auth.getUser();

        if (active) {
          setUserId(authError ? null : data.user?.id ?? null);
        }
      } catch {
        if (active) setUserId(null);
      }
    }

    void loadCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setUserId(session?.user?.id ?? null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (paramsLoading || !source || !id) return;

    let active = true;

    async function loadProduct() {
      setLoading(true);
      setError("");

      try {
        if (source === "database") {
          const { data, error: queryError } = await supabase
            .from("products")
            .select(
              "id, user_id, title, price, category, condition, description, location, image_url, created_at"
            )
            .eq("id", id)
            .maybeSingle();

          if (queryError) throw queryError;

          if (!data) {
            if (active) setProduct(null);
            return;
          }

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

          if (active) {
            setProduct({
              id: data.id,
              userId: data.user_id,
              title: data.title,
              price: data.price,
              category: data.category,
              condition: data.condition || "Used",
              description:
                data.description || "No description provided by the seller.",
              location: data.location || "Location not provided",
              image: data.image_url || undefined,
              createdAt: data.created_at,
              emoji: categoryEmoji[data.category] || "📦",
              source: "database",
            });
          }

          return;
        }

        if (source === "local") {
          const raw = localStorage.getItem(STORAGE_KEY);
          const parsed: unknown = raw ? JSON.parse(raw) : [];

          const found = Array.isArray(parsed)
            ? parsed.find((item) => item && String(item.id) === id)
            : undefined;

          if (active) {
            if (found) {
              setProduct({
                ...found,
                id: found.id,
                title: found.title,
                price: found.price,
                category: found.category,
                condition: found.condition || "Used",
                description:
                  found.description || "No description provided by the seller.",
                location: found.location || "Patna, Bihar",
                image: found.image || undefined,
                emoji: found.emoji || "📦",
                source: "local",
              });
            } else {
              setProduct(null);
            }
          }

          return;
        }

        if (source === "demo") {
          const found = demoProducts.find((item) => String(item.id) === id);

          if (active) setProduct(found || null);
          return;
        }

        if (active) setProduct(null);
      } catch (loadError) {
        console.error("Unable to load product details:", loadError);

        if (active) {
          setError(
            "We could not load this listing. Please refresh and try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProduct();

    return () => {
      active = false;
    };
  }, [source, id, paramsLoading]);

  useEffect(() => {
    let active = true;

    async function loadSellerContact() {
      setSellerPhone(null);
      setSellerPhoneError("");

      if (
        !product ||
        product.source !== "database" ||
        !product.userId ||
        !userId ||
        product.userId === userId
      ) {
        setSellerPhoneLoading(false);
        return;
      }

      setSellerPhoneLoading(true);

      try {
        const { data, error: queryError } = await supabase
          .from("profiles")
          .select("phone")
          .eq("user_id", product.userId)
          .maybeSingle();

        if (queryError) throw queryError;

        if (active) {
          setSellerPhone(data?.phone || null);
        }
      } catch (contactError) {
        console.error("Unable to load seller contact:", contactError);

        if (active) {
          setSellerPhoneError(
            "Seller contact is unavailable right now."
          );
        }
      } finally {
        if (active) setSellerPhoneLoading(false);
      }
    }

    void loadSellerContact();

    return () => {
      active = false;
    };
  }, [product, userId]);

  if (loading || paramsLoading) {
    return (
      <main className="min-h-screen bg-[#020617] px-4 py-10 text-slate-100 font-sans">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-5 w-32 rounded bg-slate-800" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="h-80 rounded-2xl bg-slate-800 sm:h-[480px]" />
            <div className="h-80 rounded-2xl bg-slate-800" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-[#020617] px-4 py-12 text-slate-100 font-sans flex items-center justify-center">
        <div className="mx-auto max-w-xl rounded-2xl border border-cyan-500/30 bg-[#070d1e] p-8 text-center shadow-2xl backdrop-blur-md">
          <p className="text-5xl" aria-hidden="true">
            🔎
          </p>

          <h1 className="mt-4 text-xl font-black uppercase text-white">Listing not found</h1>

          <p className="mt-2 text-xs text-slate-400">
            {error ||
              "This product may have been removed or is no longer available."}
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition uppercase tracking-wider"
          >
            Back to Apna Bazaar
          </Link>
        </div>
      </main>
    );
  }

  const isPublishedListing =
    product.source === "database" &&
    !!product.userId &&
    product.userId !== userId;

  const chatHref = userId
    ? `/chat/${encodeURIComponent(String(product.id))}`
    : `/login?next=${encodeURIComponent(
        `/chat/${String(product.id)}`
      )}`;

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100 font-sans">
      <header className="border-b border-cyan-500/20 bg-[#070d1e]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-xl font-black tracking-tight"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30">
              A
            </span>

            <span>
              APNA<span className="text-cyan-400">BAZAAR</span>
            </span>
          </Link>

          <Link
            href="/sell"
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition uppercase tracking-wider"
          >
            + SELL ITEM
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-cyan-400 hover:underline"
        >
          <span aria-hidden="true">←</span> Back
        </button>

        <nav aria-label="Breadcrumb" className="mb-5 text-xs text-slate-400">
          <Link href="/" className="hover:text-cyan-300">
            Home
          </Link>

          <span className="mx-2">/</span>
          <span>{product.category}</span>
          <span className="mx-2">/</span>
          <span className="text-slate-200">{product.title}</span>
        </nav>

        <div className="grid items-start gap-5 lg:grid-cols-[1.45fr_1fr] lg:gap-7">
          <section className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#070d1e] shadow-xl">
            <div className="flex min-h-72 items-center justify-center bg-slate-950 p-4 sm:min-h-[480px]">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image}
                  alt={product.title}
                  className="max-h-[480px] w-full object-cover"
                />
              ) : (
                <span
                  className="text-8xl sm:text-9xl"
                  role="img"
                  aria-label={product.title}
                >
                  {product.emoji}
                </span>
              )}
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-2xl border border-cyan-500/20 bg-[#070d1e] p-5 shadow-xl sm:p-6 backdrop-blur-md">
              <p className="text-3xl font-black tracking-tight sm:text-4xl text-white">
                {formatPrice(product.price)}
              </p>

              <h1 className="mt-3 break-words text-lg font-bold sm:text-xl text-slate-100">
                {product.title}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-lg border border-cyan-500/30 bg-cyan-950/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  {product.category}
                </span>

                <span className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  {product.condition}
                </span>
              </div>

              <p className="mt-5 text-xs text-slate-400">
                📍 {product.location}
              </p>

              <p className="mt-1 text-[11px] text-slate-500">
                Posted: {formatDate(product.createdAt)}
              </p>
            </section>

            <section className="rounded-2xl border border-cyan-500/20 bg-[#070d1e] p-5 shadow-xl sm:p-6 backdrop-blur-md">
              <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400">Description</h2>

              <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300">
                {product.description ||
                  "No description provided by the seller."}
              </p>
            </section>

            <section className="rounded-2xl border border-cyan-500/20 bg-[#070d1e] p-5 shadow-xl sm:p-6 backdrop-blur-md">
              <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400">Seller Information</h2>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-950 border border-cyan-500/30 text-sm font-black text-cyan-300 shadow-sm">
                  A
                </div>

                <div>
                  <p className="text-xs font-bold text-white">Apna Bazaar Seller</p>
                  <p className="text-[10px] text-slate-400">
                    {product.source === "database"
                      ? "Published Listing"
                      : "Sample Listing"}
                  </p>
                </div>
              </div>

              {isPublishedListing ? (
                <>
                  <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                    <Link
                      href={chatHref}
                      className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-center text-xs font-bold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition"
                    >
                      💬 Chat with Seller
                    </Link>

                    {userId ? (
                      sellerPhone ? (
                        <a
                          href={`tel:${sellerPhone.replace(/[^+0-9]/g, "")}`}
                          className="inline-flex items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-4 py-3 text-center text-xs font-bold text-cyan-200 hover:bg-cyan-900/60 transition"
                        >
                          📞 Call Seller
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs font-bold text-slate-500 cursor-not-allowed"
                        >
                          {sellerPhoneLoading
                            ? "Loading contact..."
                            : "Call unavailable"}
                        </button>
                      )
                    ) : (
                      <Link
                        href={`/login?next=${encodeURIComponent(
                          `/product/database/${String(product.id)}`
                        )}`}
                        className="inline-flex items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-4 py-3 text-center text-xs font-bold text-cyan-200 hover:bg-cyan-900/60 transition"
                      >
                        Login to Call
                      </Link>
                    )}
                  </div>

                  {sellerPhoneError && (
                    <p role="status" className="mt-3 text-xs font-bold text-rose-400">
                      {sellerPhoneError}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-950/40 p-3 text-[11px] leading-relaxed text-cyan-300">
                  {product.source === "database" &&
                  product.userId === userId
                    ? "This is your own active listing."
                    : "This is a sample or browser-saved listing. Direct contact is enabled for verified database listings."}
                </p>
              )}

              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-950/30 p-3 text-[11px] leading-relaxed text-amber-300">
                <strong>Safety Tip:</strong> Inspect items physically before making any payments. Never share sensitive OTPs or send advance money.
              </div>
            </section>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-cyan-500/20 bg-[#070d1e] p-5 sm:flex-row sm:items-center sm:justify-between shadow-xl">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">Interested in this item?</h2>

            <p className="mt-0.5 text-xs text-slate-400">
              Reach out to the seller or explore more listings on the platform.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex justify-center rounded-xl border border-cyan-500/30 bg-slate-900 px-5 py-2.5 text-xs font-bold text-cyan-200 hover:bg-slate-800 transition shadow-sm"
          >
            Browse More Products
          </Link>
        </div>
      </div>
    </main>
  );
}