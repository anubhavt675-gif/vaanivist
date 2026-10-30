import { useState, useEffect, useCallback, Suspense } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import BottomBrandStrip from "../components/BottomBrandStrip";
import { broadcastRealtimeEvent, subscribeToRealtimeEvents } from "../lib/realtime";

function PostDetailContent() {
  const params = useParams();
  const postId = params?.id as string;
  
  const [post, setPost] = useState<any>(null);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [comments, setComments] = useState<any[]>([]);

  const fetchPostDetails = useCallback(async () => {
    if (!postId) return;
    try {
      const res = await fetch(`/api/ugc/posts/${postId}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.post) {
          setPost(data.post);
          setLikeCount(data.post.likes || 0);
        }
      }
    } catch (err) {
      console.warn("Error fetching post details:", err);
    }
  }, [postId]);

  const fetchRelatedPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/ugc/posts");
      if (res.ok) {
        const data = await res.json();
        if (data?.posts) {
          setRelatedPosts(data.posts.filter((p: any) => p.id !== postId).slice(0, 4));
        }
      }
    } catch (err) {
      console.warn("Error fetching related posts:", err);
    }
  }, [postId]);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    try {
      const res = await fetch(`/api/ugc/posts/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
        if (data?.comments) {
          setComments(data.comments);
        }
      }
    } catch (err) {
      console.warn("Error fetching comments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPostDetails();
    fetchRelatedPosts();
    fetchComments();

    const unsubscribe = subscribeToRealtimeEvents((event) => {
      if (event.event === "comment_added") {
        fetchComments();
      }
      if (event.event === "post_liked" && event.postId === postId) {
        if (typeof event.data?.likes === "number") {
          setLikeCount(event.data.likes);
        }
      }
    });

    return () => unsubscribe();
  }, [fetchPostDetails, fetchRelatedPosts, fetchComments, postId]);

  const toggleLike = async () => {
    setIsLiked(prev => {
      setLikeCount(c => prev ? c - 1 : c + 1);
      return !prev;
    });

    try {
      const res = await fetch(`/api/ugc/posts/${postId}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLikeCount(data.likes);
        broadcastRealtimeEvent("post_liked", { postId, likes: data.likes });
      }
    } catch (err) {
      console.warn("Like error:", err);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    const textToSend = commentText.trim();
    setCommentText("");

    try {
      const res = await fetch(`/api/ugc/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: "Rohan Kumar",
          text: textToSend,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments(prev => [data.comment, ...prev]);
        broadcastRealtimeEvent("comment_added", { postId });
      }
    } catch (err) {
      console.warn("Error adding comment:", err);
    }
    setIsSubmittingComment(false);
  };

  return (
    <div className="page-bg" style={{ minHeight: "100vh", display: "flex" }}>
      <Sidebar />
      
      <main className="main-content">
        {/* Top Header */}
        <header style={{
          background: "white",
          borderBottom: "1px solid #e2eaf6",
          padding: "12px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 30,
          boxShadow: "0 1px 4px rgba(15,21,53,0.03)"
        }}>
          {/* Search Visit */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#f4f8fc",
            borderRadius: "20px",
            padding: "6px 14px",
            border: "1px solid #e1e9f4",
            width: "280px"
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#889bb5">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              placeholder="Search Visit"
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "12px",
                color: "#0f1535",
                width: "100%"
              }}
            />
          </div>

          {/* Right profile / user */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#0f1535", margin: 0 }}>
                Rohan Kumar
              </p>
              <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>
                Patient
              </p>
            </div>
            <div style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 700,
              color: "white"
            }}>
              R
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div style={{
          padding: "20px 32px 32px",
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: "24px",
          flex: 1
        }}>
          {/* Main Left Post View */}
          <div>
            {/* Back button */}
            <Link
              to="/ugc"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#64748b",
                fontSize: "12px",
                fontWeight: 600,
                textDecoration: "none",
                marginBottom: "14px"
              }}
            >
              <span>← Back</span>
            </Link>

            <div className="card" style={{ overflow: "hidden", marginBottom: "16px" }}>
              {/* Author bar */}
              <div style={{
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #f1f5f9"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "white"
                  }}>
                    {post ? (post.author ? post.author[0].toUpperCase() : "P") : "P"}
                  </div>
                  <div>
                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0f1535", margin: 0 }}>
                      {post ? post.author : "Loading author..."}
                    </h3>
                    <p style={{ fontSize: "11px", color: "#889bb5", margin: 0 }}>
                      {post?.views || "1.2k views"} • {post?.timeAgo || "Recently"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsFollowing(!isFollowing)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "20px",
                    border: "1px solid #06b6d4",
                    background: isFollowing ? "#f0fdfa" : "white",
                    color: "#0891b2",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {isFollowing ? "Following" : "+ Follow"}
                </button>
              </div>

              {/* Big Featured Image */}
              <div style={{ height: "240px", overflow: "hidden", position: "relative" }}>
                <img
                  src={post?.image || "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80"}
                  alt={post?.title || "Story"}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              {/* Post Content */}
              <div style={{ padding: "20px" }}>
                <h1 style={{ fontSize: "18px", fontWeight: 800, color: "#0f1535", margin: "0 0 10px", lineHeight: 1.3 }}>
                  {post?.title || "Loading story..."}
                </h1>

                {/* Tags */}
                <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
                  {(post?.tags || [post?.category || "Community"]).map((t: string) => (
                    <span
                      key={t}
                      style={{
                        background: "#eff6ff",
                        color: "#2563eb",
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: "12px"
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* Real Dynamic Story Paragraphs */}
                <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.8, margin: "0 0 16px", whiteSpace: "pre-line" }}>
                  {post?.content || "Loading content..."}
                </div>

                {/* Engagement Bar */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "24px",
                  marginTop: "18px",
                  paddingTop: "14px",
                  borderTop: "1px solid #f1f5f9"
                }}>
                  <button
                    onClick={toggleLike}
                    style={{
                      background: "none",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: isLiked ? "#ef4444" : "#64748b",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    <span>❤</span> {likeCount}
                  </button>

                  <button
                    style={{
                      background: "none",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "#64748b",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    <span>💬</span> {comments.length}
                  </button>

                  <button
                    style={{
                      background: "none",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "#64748b",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    <span>↗</span> Share
                  </button>
                </div>
              </div>
            </div>

            {/* Comment Section & Input */}
            <div className="card" style={{ padding: "16px 20px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "16px"
              }}>
                <div style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "white"
                }}>
                  R
                </div>

                <div style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  background: "#f8fafd",
                  borderRadius: "20px",
                  padding: "6px 14px",
                  border: "1px solid #e1ebf7"
                }}>
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleComment()}
                    style={{
                      border: "none",
                      background: "transparent",
                      outline: "none",
                      fontSize: "12px",
                      color: "#0f1535",
                      width: "100%"
                    }}
                  />
                  <button
                    onClick={handleComment}
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #06b6d4, #2563eb)",
                      border: "none",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      cursor: "pointer"
                    }}
                  >
                    ➤
                  </button>
                </div>
              </div>

              {/* Comments List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {comments.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "16px", color: "#94a3b8", fontSize: "12px" }}>
                    No comments yet. Be the first to share your thoughts!
                  </div>
                ) : (
                  comments.map((c, i) => (
                    <div key={c.id || i} style={{ padding: "8px 12px", background: "#f8fbfe", borderRadius: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#0f1535" }}>{c.author}</span>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>{c.time || "Just now"}</span>
                      </div>
                      <p style={{ fontSize: "12px", color: "#475569", margin: 0 }}>{c.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div>
            {/* Related Posts */}
            <div className="card" style={{ padding: "16px", marginBottom: "18px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0f1535", margin: "0 0 12px" }}>
                Related Posts
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {relatedPosts.map(rp => (
                  <Link key={rp.id} to={`/ugc/${rp.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                      <div style={{ width: "48px", height: "48px", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
                        <img
                          src={rp.image}
                          alt={rp.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h4 style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#0f1535",
                          margin: "0 0 2px",
                          lineHeight: 1.3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {rp.title}
                        </h4>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                          {rp.views || "1.5k views"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Promo Card: Better Health for the Future */}
            <div style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: "14px",
              padding: "20px 18px",
              textAlign: "center"
            }}>
              <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#065f46", margin: "0 0 4px", lineHeight: 1.3 }}>
                Better Health<br />for the Future
              </h4>
              <p style={{ fontSize: "11px", color: "#047857", margin: "0 0 12px" }}>
                VaaniVisit Community
              </p>

              {/* Heart plant vector */}
              <div style={{
                width: "60px",
                height: "60px",
                margin: "0 auto 12px",
                borderRadius: "50%",
                background: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.2)"
              }}>
                <span style={{ fontSize: "28px" }}>🌱</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "#0f1535" }}>Vaani</span>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "#059669" }}>Visit</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom persistent Brand strip */}
        <BottomBrandStrip />
      </main>
    </div>
  );
}

export default function PostDetailPage() {
  return (
    <Suspense fallback={<div className="page-bg" style={{ minHeight: "100vh" }} />}>
      <PostDetailContent />
    </Suspense>
  );
}
