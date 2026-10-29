"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  user_id: string;
  title: string;
  price: number;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type SellerProfile = {
  display_name: string | null;
};

function ChatPageContent() {
  const params = useParams<{ productId: string }>();
  const router = useRouter();
  const productId = params.productId;

  const [userId, setUserId] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [sellerName, setSellerName] = useState("Seller");
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function initializeChat() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          router.replace(
            `/login?next=${encodeURIComponent(`/chat/${productId}`)}`
          );
          return;
        }

        if (!active) return;
        setUserId(user.id);

        // Load the listing from Supabase.
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("id, user_id, title, price")
          .eq("id", productId)
          .maybeSingle();

        if (productError) throw productError;

        if (!productData) {
          throw new Error(
            "Product not found. Chat is currently available for listings saved in Supabase."
          );
        }

        const foundProduct = productData as Product;

        if (!active) return;
        setProduct(foundProduct);

        if (foundProduct.user_id === user.id) {
          throw new Error("You cannot start a chat with your own listing.");
        }

        // Load the seller's public profile.
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", foundProduct.user_id)
          .maybeSingle();

        if (profileError) throw profileError;

        const profile = profileData as SellerProfile | null;

        if (profile?.display_name?.trim()) {
          setSellerName(profile.display_name.trim());
        }

        // Look for an existing buyer-seller conversation.
        const { data: existingConversation, error: conversationError } =
          await supabase
            .from("conversations")
            .select("id")
            .eq("product_id", foundProduct.id)
            .eq("buyer_id", user.id)
            .eq("seller_id", foundProduct.user_id)
            .maybeSingle();

        if (conversationError) throw conversationError;

        let activeConversationId: string | null =
          existingConversation?.id ?? null;

        // Create the conversation if this is the first message.
        if (!activeConversationId) {
          const { data: createdConversation, error: createError } =
            await supabase
              .from("conversations")
              .insert({
                product_id: foundProduct.id,
                buyer_id: user.id,
                seller_id: foundProduct.user_id,
              })
              .select("id")
              .single();

          if (createError) throw createError;

          activeConversationId = createdConversation.id;
        }

        if (!active || !activeConversationId) return;

        setConversationId(activeConversationId);

        // Load existing messages in chronological order.
        const { data: messageData, error: messageError } = await supabase
          .from("messages")
          .select("id, conversation_id, sender_id, body, created_at")
          .eq("conversation_id", activeConversationId)
          .order("created_at", { ascending: true });

        if (messageError) throw messageError;

        if (!active) return;

        setMessages((messageData ?? []) as ChatMessage[]);
      } catch (err: unknown) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not open the chat. Please try again."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    if (productId) {
      void initializeChat();
    }

    return () => {
      active = false;
    };
  }, [productId, router]);

  const refreshMessages = useCallback(async () => {
    if (!conversationId) return;

    const { data, error: refreshError } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!refreshError && data) {
      setMessages(data as ChatMessage[]);
    }
  }, [conversationId]);

  // Listen for new messages while the chat is open.
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void refreshMessages();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, refreshMessages]);

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const body = newMessage.trim();

    if (!body || !conversationId || !userId || sending) return;

    setSending(true);
    setError("");

    try {
      const { data, error: sendError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          body,
        })
        .select("id, conversation_id, sender_id, body, created_at")
        .single();

      if (sendError) throw sendError;

      setMessages((previous) => {
        if (previous.some((message) => message.id === data.id)) {
          return previous;
        }

        return [...previous, data as ChatMessage];
      });

      setNewMessage("");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Message could not be sent. Please try again."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-6 text-slate-100">
      <div className="mx-auto flex min-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#070d1e] shadow-2xl">
        <header className="border-b border-cyan-900/60 p-4 sm:p-5 bg-slate-950/40 backdrop-blur-md">
          <Link
            href="/"
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
          >
            ← Back to Apna Bazaar
          </Link>

          <h1 className="mt-3 text-lg font-black tracking-wide text-white uppercase">
            Chat with Seller
          </h1>

          {product && (
            <div className="mt-3 rounded-xl border border-cyan-500/20 bg-slate-900/80 p-3 shadow-inner">
              <p className="font-bold text-slate-200">{product.title}</p>

              <p className="mt-1 text-xs font-black text-cyan-400">
                ₹{Number(product.price).toLocaleString("en-IN")}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Seller: <span className="text-slate-200 font-semibold">{sellerName}</span>
              </p>
            </div>
          )}
        </header>

        {loading ? (
          <div className="flex flex-1 items-center justify-center p-8 text-xs font-bold text-cyan-400 animate-pulse">
            Opening conversation...
          </div>
        ) : error && !product ? (
          <div className="m-4 rounded-xl border border-rose-500/30 bg-rose-950/60 p-4 text-xs font-bold text-rose-300">
            <p>{error}</p>

            <button
              type="button"
              onClick={() => router.refresh()}
              className="mt-3 underline hover:text-white"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <section
              aria-live="polite"
              className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-cyan-500/20"
            >
              {messages.length === 0 ? (
                <div className="m-auto max-w-sm py-10 text-center">
                  <p className="text-sm font-bold text-slate-200">
                    Start the conversation
                  </p>

                  <p className="mt-1.5 text-xs text-slate-400">
                    Ask the seller about the product, price, or availability.
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                  const mine = message.sender_id === userId;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        mine ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                          mine
                            ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white border border-cyan-400/30"
                            : "bg-slate-900 text-slate-100 border border-slate-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">
                          {message.body}
                        </p>

                        <p
                          className={`mt-2 text-right text-[10px] ${
                            mine ? "text-cyan-100" : "text-slate-400"
                          }`}
                        >
                          {new Date(message.created_at).toLocaleString(
                            "en-IN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </section>

            {error && (
              <p role="alert" className="mx-4 mb-2 text-xs font-bold text-rose-400">
                {error}
              </p>
            )}

            <form
              onSubmit={handleSend}
              className="flex gap-2 border-t border-cyan-900/60 bg-slate-950/60 p-3 sm:p-4 backdrop-blur-md"
            >
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Write a secure message..."
                aria-label="Write a message"
                maxLength={3000}
                disabled={!conversationId || sending}
                className="min-w-0 flex-1 rounded-xl border border-cyan-500/30 bg-slate-900 px-4 py-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 disabled:bg-slate-950"
              />

              <button
                type="submit"
                disabled={
                  !newMessage.trim() || sending || !conversationId
                }
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-xs font-extrabold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}


export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#020617] px-4 text-sm font-semibold text-cyan-400">
          Loading chat...
        </main>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
