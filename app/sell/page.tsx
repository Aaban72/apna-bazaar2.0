"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SellPage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("Used");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Check authentication before showing the listing form.
  useEffect(() => {
    let active = true;

    async function checkLogin() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !user) {
          router.replace("/login?next=/sell");
          return;
        }

        setAuthorized(true);
      } catch {
        if (active) {
          router.replace("/login?next=/sell");
        }
      } finally {
        if (active) {
          setAuthChecking(false);
        }
      }
    }

    void checkLogin();

    return () => {
      active = false;
    };
  }, [router]);

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG, WebP, or GIF image.");
      event.target.value = "";
      setImage("");
      setImageFile(null);
      setImageName("");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      event.target.value = "";
      setImage("");
      setImageFile(null);
      setImageName("");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImage(reader.result);
        setImageFile(file);
        setImageName(file.name);
        setError("");
      }
    };

    reader.onerror = () => {
      setError("Unable to read the image. Please try again.");
    };

    reader.readAsDataURL(file);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!authorized) {
      router.replace("/login?next=/sell");
      return;
    }

    if (!imageFile) {
      setError("Please upload a product photo.");
      return;
    }

    if (!location.trim()) {
      setError("Please enter a valid location.");
      return;
    }

    if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
      setError("Please enter a valid price greater than zero.");
      return;
    }

    setSaving(true);

    let uploadedFilePath: string | null = null;

    try {
      // Verify the current user again before publishing.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setAuthorized(false);
        router.replace("/login?next=/sell");
        return;
      }

      const fileExtension = imageFile.name
        .split(".")
        .pop()
        ?.toLowerCase();

      const safeExtension =
        fileExtension && /^[a-z0-9]+$/.test(fileExtension)
          ? fileExtension
          : "jpg";

      uploadedFilePath = `${user.id}/${crypto.randomUUID()}.${safeExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(uploadedFilePath, imageFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: imageFile.type,
        });

      if (uploadError) {
        console.error("Supabase image upload error:", uploadError);
        setError(`Photo upload failed: ${uploadError.message}`);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(uploadedFilePath);

      const { error: insertError } = await supabase
        .from("products")
        .insert({
          user_id: user.id,
          title: title.trim(),
          price: Number(price),
          category,
          condition,
          location: location.trim(),
          description: description.trim(),
          image_url: publicUrlData.publicUrl,
        });

      if (insertError) {
        console.error("Supabase listing insert error:", insertError);

        await supabase.storage
          .from("product-images")
          .remove([uploadedFilePath]);

        uploadedFilePath = null;

        setError(`Listing save failed: ${insertError.message}`);
        return;
      }

      uploadedFilePath = null;

      router.push("/?listed=success");
      router.refresh();
    } catch (err) {
      console.error("Listing submission error:", err);

      if (uploadedFilePath) {
        try {
          await supabase.storage
            .from("product-images")
            .remove([uploadedFilePath]);
        } catch (cleanupError) {
          console.error("Image cleanup error:", cleanupError);
        }
      }

      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Do not display the form while checking login or redirecting.
  if (authChecking || !authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617] px-4 text-slate-100 font-sans">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-900 border-t-cyan-400" />
          <p className="mt-4 text-xs font-bold text-cyan-400 animate-pulse">
            Checking your login...
          </p>
        </div>
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

        <div className="mt-6 rounded-2xl border border-cyan-500/30 bg-[#070d1e] p-5 shadow-2xl sm:p-8 backdrop-blur-xl">
          <div className="mb-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
              Sell on Apna Bazaar
            </p>

            <h1 className="mt-2 text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
              Sell Your Item
            </h1>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Enter your product details to publish your listing securely.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-300">
                Product Name *
              </label>

              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Samsung Galaxy S23"
                minLength={3}
                maxLength={100}
                required
                className="w-full rounded-xl border border-cyan-500/30 bg-slate-900 px-4 py-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="price" className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-300">
                  Price (₹) *
                </label>

                <input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="5000"
                  min="1"
                  max="100000000"
                  step="1"
                  required
                  className="w-full rounded-xl border border-cyan-500/30 bg-slate-900 px-4 py-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div>
                <label htmlFor="category" className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-300">
                  Category *
                </label>

                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="w-full rounded-xl border border-cyan-500/30 bg-slate-900 px-4 py-3 text-xs text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                >
                  <option value="" className="bg-slate-900 text-slate-400">Choose a category</option>
                  <option value="Mobiles" className="bg-slate-900">Mobiles</option>
                  <option value="Electronics" className="bg-slate-900">Electronics</option>
                  <option value="Vehicles" className="bg-slate-900">Cars & Bikes</option>
                  <option value="Furniture" className="bg-slate-900">Furniture</option>
                  <option value="Fashion" className="bg-slate-900">Fashion</option>
                  <option value="Home & Kitchen" className="bg-slate-900">Home & Kitchen</option>
                  <option value="Books" className="bg-slate-900">Books & Education</option>
                  <option value="Other" className="bg-slate-900">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="condition" className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-300">
                Product Condition *
              </label>

              <select
                id="condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                required
                className="w-full rounded-xl border border-cyan-500/30 bg-slate-900 px-4 py-3 text-xs text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              >
                <option value="New" className="bg-slate-900">Brand New</option>
                <option value="Like new" className="bg-slate-900">Like New</option>
                <option value="Used" className="bg-slate-900">Used</option>
                <option value="Good condition" className="bg-slate-900">Good Condition</option>
              </select>
            </div>

            <div>
              <label htmlFor="location" className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-300">
                Location / City *
              </label>

              <input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Patna, Bihar or Delhi / NCR"
                maxLength={100}
                required
                className="w-full rounded-xl border border-cyan-500/30 bg-slate-900 px-4 py-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
              <p className="mt-1.5 text-[10px] text-slate-500">
                Buyers from this location will be able to discover your item easily.
              </p>
            </div>

            <div>
              <label htmlFor="description" className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-300">
                Product Description *
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the product, its features, and condition..."
                rows={5}
                minLength={10}
                maxLength={2000}
                required
                className="w-full resize-y rounded-xl border border-cyan-500/30 bg-slate-900 px-4 py-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />

              <p className="mt-1 text-right text-[10px] text-slate-500">
                {description.length}/2000 characters
              </p>
            </div>

            <div>
              <label htmlFor="image" className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-300">
                Product Photo *
              </label>

              <input
                id="image"
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageChange}
                required={!imageFile}
                disabled={saving}
                className="sr-only"
              />

              <label
                htmlFor="image"
                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cyan-500/30 bg-slate-900/60 px-5 py-8 text-center transition hover:border-cyan-400 hover:bg-slate-900 ${
                  saving ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                }`}
              >
                <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-950/40 text-2xl text-cyan-300 shadow-sm">
                  📷
                </span>

                <span className="text-xs font-extrabold text-white">
                  {imageName ? "Change product photo" : "Upload product photo"}
                </span>

                <span className="mt-1 text-[11px] text-slate-400">
                  Click here to choose an image from your device
                </span>

                <span className="mt-1 text-[10px] text-slate-500">
                  JPG, PNG, WebP or GIF · Maximum 5 MB
                </span>

                <span className="mt-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500">
                  {imageName ? "Choose another photo" : "Choose photo"}
                </span>
              </label>

              {imageName && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-cyan-500/20 bg-slate-900 p-3 shadow-inner">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="text-xl">🖼️</span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase text-cyan-400">
                        Photo Selected
                      </p>
                      <p className="truncate text-xs text-slate-300">
                        {imageName}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setImage("");
                      setImageFile(null);
                      setImageName("");
                      setError("");

                      const input = document.getElementById(
                        "image"
                      ) as HTMLInputElement | null;

                      if (input) input.value = "";
                    }}
                    className="shrink-0 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-1.5 text-xs font-bold text-rose-300 transition hover:bg-rose-900/60 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              )}

              {image && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950 p-2 shadow-inner">
                  <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Photo Preview
                  </p>

                  <Image
                    src={image}
                    alt="Product photo preview"
                    width={800}
                    height={600}
                    unoptimized
                    className="h-64 w-full rounded-xl object-contain"
                  />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/30 p-4 text-xs leading-relaxed text-cyan-300">
              <strong className="text-white">Note:</strong> Your product photo will be securely uploaded to Apna Bazaar storage, and your listing will be published instantly.
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-rose-500/30 bg-rose-950/60 p-3 text-xs font-bold text-rose-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60 uppercase tracking-wider"
            >
              {saving
                ? "Uploading and Publishing..."
                : "Save and Publish Listing →"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}