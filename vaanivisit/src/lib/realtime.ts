import { getSupabaseBrowserClient } from "./supabase";

export type RealtimeSyncEventType =
  | "intake_submitted"
  | "draft_reviewed"
  | "draft_updated"
  | "post_created"
  | "post_liked"
  | "comment_added"
  | "new_message"
  | "consultation_updated"
  | "consultation_accepted"
  | "prescription_issued";

export interface RealtimeSyncPayload {
  event: RealtimeSyncEventType;
  intakeId?: string;
  draftId?: string;
  postId?: string;
  status?: string;
  timestamp: number;
  data?: Record<string, any>;
}

/**
 * Broadcast an event across all open tabs, windows, and connected users.
 */
export async function broadcastRealtimeEvent(
  event: RealtimeSyncEventType,
  data?: Record<string, any>
) {
  if (typeof window === "undefined") return;

  try {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const channel = supabase.channel("vaanivisit_live_sync");
      await channel.send({
        type: "broadcast",
        event: "sync_event",
        payload: {
          event,
          timestamp: Date.now(),
          data,
        },
      });
    }

    // Also trigger native BroadcastChannel for zero-latency local tab sync
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel("vaanivisit_local_sync");
      bc.postMessage({ event, timestamp: Date.now(), data });
      bc.close();
    }
  } catch (err) {
    console.warn("Realtime broadcast error:", err);
  }
}

/**
 * Subscribe to real-time events across Supabase Realtime WebSocket and local tabs.
 */
export function subscribeToRealtimeEvents(
  onEvent: (payload: RealtimeSyncPayload) => void
) {
  if (typeof window === "undefined") return () => {};

  const supabase = getSupabaseBrowserClient();
  let supabaseChannel: any = null;
  let localBc: BroadcastChannel | null = null;

  try {
    if (supabase) {
      supabaseChannel = supabase
        .channel("vaanivisit_live_sync")
        .on("broadcast", { event: "sync_event" }, ({ payload }: { payload: any }) => {
          onEvent(payload);
        })
        .on(
          "postgres_changes" as any,
          { event: "*", schema: "public", table: "patient_intakes" },
          (payload: any) => {
            onEvent({
              event: "intake_submitted",
              intakeId: payload.new?.id || payload.old?.id,
              status: payload.new?.status,
              timestamp: Date.now(),
              data: payload.new,
            });
          }
        )
        .on(
          "postgres_changes" as any,
          { event: "*", schema: "public", table: "clinical_drafts" },
          (payload: any) => {
            onEvent({
              event: "draft_reviewed",
              draftId: payload.new?.id || payload.old?.id,
              status: payload.new?.status,
              timestamp: Date.now(),
              data: payload.new,
            });
          }
        )
        .subscribe();
    }

    if ("BroadcastChannel" in window) {
      localBc = new BroadcastChannel("vaanivisit_local_sync");
      localBc.onmessage = (msg: MessageEvent) => {
        onEvent(msg.data);
      };
    }
  } catch (err) {
    console.warn("Realtime subscription error:", err);
  }

  return () => {
    if (supabaseChannel && supabase) {
      supabase.removeChannel(supabaseChannel);
    }
    if (localBc) {
      localBc.close();
    }
  };
}

