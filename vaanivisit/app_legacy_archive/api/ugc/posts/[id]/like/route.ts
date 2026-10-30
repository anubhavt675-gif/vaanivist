import { NextRequest, NextResponse } from "next/server";
import { toggleLikePost } from "@/app/lib/ugc/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const newLikes = toggleLikePost(id);
    return NextResponse.json({ success: true, likes: newLikes });
  } catch (err: unknown) {
    console.error("Error in POST /api/ugc/posts/[id]/like:", err);
    return NextResponse.json({ error: "Failed to update like" }, { status: 500 });
  }
}

