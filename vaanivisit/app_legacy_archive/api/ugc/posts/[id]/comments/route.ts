import { NextRequest, NextResponse } from "next/server";
import { getStoredComments, addStoredComment } from "@/app/lib/ugc/store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const comments = getStoredComments(id);
    return NextResponse.json({ comments });
  } catch (err: unknown) {
    console.error("Error in GET /api/ugc/posts/[id]/comments:", err);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { author, text } = body;

    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "Comment text cannot be empty" }, { status: 400 });
    }

    const newComment = addStoredComment(id, author || "Rohan Kumar", text.trim());
    return NextResponse.json({ success: true, comment: newComment }, { status: 201 });
  } catch (err: unknown) {
    console.error("Error in POST /api/ugc/posts/[id]/comments:", err);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}

