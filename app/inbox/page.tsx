"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Conversation = {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
};

type Product = {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
};

type Profile = {
  user_id: string;
  display_name: string | null;
};

type InboxItem = {
  conversation: Conversation;
  product: Product | null;
  otherPersonName: string;
  lastMessage: string;
  lastMessageTime: string;
};

export default function InboxPage() {
  const router = useRouter();

  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadInbox() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          router.replace("/login?next=%2Finbox");
          return;
        }

        const { data: conversations, error: conversationsError } =
          await supabase
            .from("conversations")
            .select("id, product_id, buyer_id, seller_id, created_at")
            .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
            .order("created_at", { ascending: false });

        if (conversationsError) throw conversationsError;

        const conversationRows = (conversations ?? []) as Conversation[];

        if (conversationRows.length === 0) {
          if (active) setItems([]);
          return;
        }

        const productIds = [
          ...new Set(conversationRows.map((item) => item.product_id)),
        ];

        const otherUserIds = [
          ...new Set(
            conversationRows.map((item) =>
              item.buyer_id === user.id ? item.seller_id : item.buyer_id
            )
          ),
        ];

        const conversationIds = conversationRows.map((item) => item.id);

        const [
          { data: products, error: productsError },
          { data: profiles, error: profilesError },
          { data: messages, error: messagesError },
        ] = await Promise.all([
          supabase
            .from("products")
            .select("id, title, price, image_url")
            .in("id", productIds),
          supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", otherUserIds),
          supabase
            .from("messages")
            .select("id, conversation_id, body, created_at")
            .in("conversation_id", conversationIds)
            .order("created_at", { ascending: false }),
        ]);

        if (productsError) throw productsError;
        if (profilesError) throw profilesError;
        if (messagesError) throw messagesError;

        const productMap = new Map<string, Product>(
          ((products ?? []) as Product[]).map((product) => [
            product.id,
            product,
          ])
        );

        const profileMap = new Map<string, string>(
          ((profiles ?? []) as Profile[]).map((profile) => [
            profile.user_id,
            profile.display_name?.trim() || "Apna Bazaar user",
          ])
        );

        const latestMessageMap = new Map<
          string,
          { body: string; created_at: string }
        >();

        for (const message of messages ?? []) {
          if (!latestMessageMap.has(message.conversation_id)) {
            latestMessageMap.set(message.conversation_id, {
              body: message.body,
              created_at: message.created_at,
            });
          }
        }

        const inboxItems: InboxItem[] = conversationRows.map(
          (conversation) => {
            const otherUserId =
              conversation.buyer_id === user.id
                ? conversation.seller_id
                : conversation.buyer_id;

            const latestMessage = latestMessageMap.get(conversation.id);

            return {
              conversation,
              product: productMap.get(conversation.product_id) ?? null,
              otherPersonName:
                profileMap.get(otherUserId) || "Apna Bazaar user",
              lastMessage: latestMessage?.body || "No messages yet",
              lastMessageTime:
                latestMessage?.created_at || conversation.created_at,
            };
          }
        );

        // Sort by latest message, falling back to conversation creation time.
        inboxItems.sort(
          (a, b) =>
            new Date(b.lastMessageTime).getTime() -
            new Date(a.lastMessageTime).getTime()
        );

        if (active) setItems(inboxItems);
      } catch (err: unknown) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load your inbox. Please try again."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInbox();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
        >
          ← Back to Apna Bazaar
        </Link>

        <div className="mt-5 rounded-2xl border border-cyan-500/30 bg-[#070d1e] p-5 shadow-2xl sm:p-7 backdrop-blur-md">
          <h1 className="text-xl font-black text-white uppercase tracking-wide">My Chats</h1>
          <p className="mt-1 text-xs text-slate-400">
            Your active conversations with buyers and sellers.
          </p>

          {loading ? (
            <div className="py-12 text-center text-xs font-bold text-cyan-400 animate-pulse">
              Loading your inbox...
            </div>
          ) : error ? (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-rose-500/30 bg-rose-950/60 p-4 text-xs font-bold text-rose-300"
            >
              {error}
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="ml-2 underline hover:text-white"
              >
                Try again
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-950/40 text-cyan-300">
                <span className="text-2xl" aria-hidden="true">
                  💬
                </span>
              </div>

              <h2 className="mt-4 text-sm font-bold text-slate-200">
                No chats yet
              </h2>

              <p className="mt-1.5 text-xs text-slate-400">
                When you contact a seller or a buyer contacts you, your
                conversations will appear here.
              </p>

              <Link
                href="/"
                className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition"
              >
                Explore listings
              </Link>
            </div>
          ) : (
            <div className="mt-5 divide-y divide-cyan-900/40">
              {items.map((item) => (
                <Link
                  key={item.conversation.id}
                  href={`/chat/${encodeURIComponent(item.conversation.product_id)}`}
                  className="flex gap-3.5 py-4 transition hover:bg-slate-900/50 sm:px-3 rounded-xl"
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-cyan-500/20 bg-slate-950">
                    {item.product?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.product.image_url}
                        alt={item.product.title || "Product"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl" aria-hidden="true">
                        📦
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="truncate text-xs font-extrabold text-slate-100">
                        {item.otherPersonName}
                      </h2>

                      <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                        {new Date(item.lastMessageTime).toLocaleDateString(
                          "en-IN",
                          { day: "numeric", month: "short" }
                        )}
                      </span>
                    </div>

                    <p className="mt-1 truncate text-xs font-bold text-slate-300">
                      {item.product?.title || "Product listing"}
                    </p>

                    {item.product && (
                      <p className="mt-0.5 text-xs font-black text-cyan-400">
                        ₹
                        {Number(item.product.price).toLocaleString("en-IN")}
                      </p>
                    )}

                    <p className="mt-1 truncate text-xs text-slate-400">
                      {item.lastMessage}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}