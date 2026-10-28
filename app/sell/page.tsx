"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SellPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("Used");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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

    if (!imageFile) {
      setError("Please upload a product photo.");
      return;
    }

    if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
      setError("Please enter a valid price greater than zero.");
      return;
    }

    setSaving(true);

    let uploadedFilePath: string | null = null;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        setError("Unable to verify your login. Please try again.");
        return;
      }

      if (!user) {
        router.push("/login?next=/sell");
        return;
      }

      const fileExtension = imageFile.name.split(".").pop()?.toLowerCase();

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
          description: description.trim(),
          location: null,
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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-bold text-emerald-700 transition hover:text-emerald-900"
        >
          ← Apna Bazaar
        </Link>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">
              SELL ON APNA BAZAAR
            </p>

            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Sell your item
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Enter your product details to publish a listing.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-bold"
              >
                Product name *
              </label>

              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Samsung Galaxy S23"
                minLength={3}
                maxLength={100}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="price"
                  className="mb-2 block text-sm font-bold"
                >
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label
                  htmlFor="category"
                  className="mb-2 block text-sm font-bold"
                >
                  Category *
                </label>

                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600"
                >
                  <option value="">Choose a category</option>
                  <option value="Mobiles">Mobiles</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Vehicles">Cars & Bikes</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Home & Kitchen">Home & Kitchen</option>
                  <option value="Books">Books & Education</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="condition"
                className="mb-2 block text-sm font-bold"
              >
                Product condition *
              </label>

              <select
                id="condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600"
              >
                <option value="New">Brand new</option>
                <option value="Like new">Like new</option>
                <option value="Used">Used</option>
                <option value="Good condition">Good condition</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-bold"
              >
                Product description *
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
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {description.length}/2000 characters
              </p>
            </div>

            {/* Product photo upload */}
            <div>
              <label
                htmlFor="image"
                className="mb-3 block text-sm font-bold text-slate-800"
              >
                Product photo *
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
                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 px-5 py-8 text-center transition hover:border-emerald-500 hover:bg-emerald-50 ${
                  saving
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer"
                }`}
              >
                <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">
                  📷
                </span>

                <span className="text-base font-bold text-emerald-800">
                  {imageName ? "Change product photo" : "Upload product photo"}
                </span>

                <span className="mt-2 text-sm text-slate-500">
                  Click here to choose an image from your device
                </span>

                <span className="mt-1 text-xs text-slate-400">
                  JPG, PNG, WebP or GIF · Maximum 5 MB
                </span>

                <span className="mt-4 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800">
                  {imageName ? "Choose another photo" : "Choose photo"}
                </span>
              </label>

              {imageName && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-xl">🖼️</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-emerald-800">
                        Photo selected
                      </p>
                      <p className="truncate text-sm text-slate-600">
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
                    className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              )}

              {image && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2">
                  <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Photo preview
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

            <div className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <strong>Note:</strong> Your product photo will be uploaded
              to Apna Bazaar storage, and your listing details will be
              saved to the database.
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-emerald-700 px-5 py-4 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Uploading and publishing..."
                : "Save and publish listing →"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
