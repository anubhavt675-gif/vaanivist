import { NextRequest, NextResponse } from "next/server";
import { getStoredPosts, savePost } from "@/app/lib/ugc/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "All";
    const q = (searchParams.get("q") || "").toLowerCase();

    let posts = getStoredPosts();

    if (category !== "All") {
      posts = posts.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }

    if (q) {
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ posts });
  } catch (err: unknown) {
    console.error("Error in GET /api/ugc/posts:", err);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, content, category, author } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const newPost = savePost({
      title,
      content,
      category: category || "Stories",
      author: author || "Rohan Kumar",
      authorRole: "Community Member",
      timeAgo: "Just now",
      image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
      tags: ["Community", category || "Stories"],
    });

    return NextResponse.json({ success: true, post: newPost }, { status: 201 });
  } catch (err: unknown) {
    console.error("Error in POST /api/ugc/posts:", err);
    return NextResponse.json({ error: "Failed to save post" }, { status: 500 });
  }
}

