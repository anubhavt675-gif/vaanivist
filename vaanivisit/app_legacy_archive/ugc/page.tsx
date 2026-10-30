"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import BottomBrandStrip from "../components/BottomBrandStrip";
import { mockCommunityPosts, trendingTopics } from "../lib/mockData";
import { broadcastRealtimeEvent, subscribeToRealtimeEvents } from "../lib/realtime";

type CategoryType = "All" | "Health Tips" | "Stories" | "Mental Health" | "Nutrition" | "Lifestyle";

export default function UGCPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryType>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<any[]>(mockCommunityPosts);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set(["post-chhoti-chhoti"]));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostCategory, setNewPostCategory] = useState<CategoryType>("Stories");
  const [newPostText, setNewPostText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories: CategoryType[] = ["All", "Health Tips", "Stories", "Mental Health", "Nutrition", "Lifestyle"];

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/ugc/posts?category=${activeCategory}&q=${searchQuery}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.posts && data.posts.length > 0) {
          setPosts(data.posts);
        }
      }
    } catch (err) {
      console.warn("Fetch posts error:", err);
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    fetchPosts();

    const unsubscribe = subscribeToRealtimeEvents((event) => {
      if (event.event === "post_created" || event.event === "post_liked") {
        fetchPosts();
      }
    });

    return () => unsubscribe();
  }, [fetchPosts]);

  const filteredPosts = posts.filter(post => {
    const matchesCategory = activeCategory === "All" || post.category === activeCategory;
    const matchesSearch = !searchQuery ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleLike = async (postId: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch(`/api/ugc/posts/${postId}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLikedPosts((prev) => new Set(prev).add(postId));
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, likes: data.likes } : p))
        );
        broadcastRealtimeEvent("post_liked", { postId, likes: data.likes });
      }
    } catch (err) {
      console.warn("Like error:", err);
    }
  };

  const handlePublishPost = async () => {
    if (!newPostText.trim()) return;
    setIsSubmitting(true);
    try {
      const title = newPostTitle.trim() || newPostText.substring(0, 40) + "...";
      const res = await fetch("/api/ugc/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: newPostText,
          category: newPostCategory,
          author: "Rohan Kumar",
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewPostText("");
        setNewPostTitle("");
        broadcastRealtimeEvent("post_created");
        fetchPosts();
      }
    } catch (err) {
      console.warn("Publish post error:", err);
    }
    setIsSubmitting(false);
  };

  // 2 Primary Cards shown side-by-side in screenshot
  const card1 = filteredPosts[0] || mockCommunityPosts[1];
  const card2 = filteredPosts[1] || mockCommunityPosts[2];

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

          {/* Right profile / notification */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#889bb5",
              padding: "6px",
              display: "flex",
              alignItems: "center"
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
            </button>

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
        <div style={{ padding: "24px 32px", flex: 1 }}>
          {/* Heading */}
          <div style={{ marginBottom: "16px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#0f1535", margin: "0 0 4px" }}>
              Community & Health Stories
            </h1>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
              Real people. Real stories. Better health.
            </p>
          </div>

          {/* Search Row & Create Post Button */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "white",
              borderRadius: "20px",
              padding: "8px 16px",
              border: "1px solid #dbe4f0",
              flex: 1,
              maxWidth: "520px"
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#94a3b8">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                type="text"
                placeholder="Search posts, topics, or hashtags..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
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

            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: "8px 18px",
                borderRadius: "20px",
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                color: "white",
                border: "none",
                fontSize: "12px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(79, 70, 229, 0.3)"
              }}
            >
              <span>+</span> Create Post
            </button>
          </div>

          {/* Category Tabs */}
          <div style={{
            display: "flex",
            gap: "8px",
            marginBottom: "20px",
            overflowX: "auto",
            paddingBottom: "4px"
          }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "16px",
                  border: "1px solid",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  borderColor: activeCategory === cat ? "#0d1b3e" : "#dbe4f0",
                  background: activeCategory === cat ? "#0d1b3e" : "white",
                  color: activeCategory === cat ? "white" : "#475569",
                  transition: "all 0.15s ease"
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 2-Column UGC Content */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 240px",
            gap: "24px",
            alignItems: "start"
          }}>
            {/* Left: 2 Main Cards & Bottom Bar */}
            <div>
              {/* 2 Cards Grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "18px",
                marginBottom: "20px"
              }}>
                {/* Card 1: Chhoti chhoti baatein */}
                <Link href={`/ugc/${card1.id}`} style={{ textDecoration: "none" }}>
                  <div className="card card-hover" style={{ overflow: "hidden", cursor: "pointer", height: "100%", display: "flex", flexDirection: "column" }}>
                    <div style={{ height: "160px", overflow: "hidden", position: "relative" }}>
                      <img
                        src={card1.image}
                        alt={card1.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <div style={{
                        position: "absolute",
                        bottom: "8px",
                        left: "10px",
                        display: "flex",
                        gap: "6px"
                      }}>
                        {card1.tags.map(t => (
                          <span key={t} style={{
                            background: "rgba(13, 27, 62, 0.75)",
                            backdropFilter: "blur(4px)",
                            color: "white",
                            fontSize: "10px",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            fontWeight: 600
                          }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0f1535", margin: "0 0 6px", lineHeight: 1.3 }}>
                          {card1.title}
                        </h3>
                        <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 12px", lineHeight: 1.5 }}>
                          {card1.content}
                        </p>
                      </div>

                      <div>
                        {/* Author */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                          <div style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            color: "white",
                            fontWeight: 700
                          }}>
                            P
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#0f1535" }}>
                            {card1.author}
                          </span>
                          <span style={{ fontSize: "10px", color: "#94a3b8", marginLeft: "auto" }}>
                            {card1.views} • {card1.timeAgo}
                          </span>
                        </div>

                        {/* Likes & Comments */}
                        <div style={{ display: "flex", gap: "14px", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                          <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                            ❤ {card1.likes}
                          </span>
                          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                            💬 {card1.comments}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Card 2: Healthy khana */}
                <Link href={`/ugc/${card2.id}`} style={{ textDecoration: "none" }}>
                  <div className="card card-hover" style={{ overflow: "hidden", cursor: "pointer", height: "100%", display: "flex", flexDirection: "column" }}>
                    <div style={{ height: "160px", overflow: "hidden", position: "relative" }}>
                      <img
                        src={card2.image}
                        alt={card2.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <div style={{
                        position: "absolute",
                        bottom: "8px",
                        left: "10px",
                        display: "flex",
                        gap: "6px"
                      }}>
                        {card2.tags.map(t => (
                          <span key={t} style={{
                            background: "rgba(13, 27, 62, 0.75)",
                            backdropFilter: "blur(4px)",
                            color: "white",
                            fontSize: "10px",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            fontWeight: 600
                          }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0f1535", margin: "0 0 6px", lineHeight: 1.3 }}>
                          {card2.title}
                        </h3>
                        <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 12px", lineHeight: 1.5 }}>
                          {card2.content}
                        </p>
                      </div>

                      <div>
                        {/* Author */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                          <div style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #10b981, #06b6d4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            color: "white",
                            fontWeight: 700
                          }}>
                            N
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#0f1535" }}>
                            {card2.author}
                          </span>
                          <span style={{ fontSize: "10px", color: "#94a3b8", marginLeft: "auto" }}>
                            {card2.views} • {card2.timeAgo}
                          </span>
                        </div>

                        {/* Likes & Comments */}
                        <div style={{ display: "flex", gap: "14px", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                          <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                            ❤ {card2.likes}
                          </span>
                          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                            💬 {card2.comments}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Bottom Community Bar matching screenshot */}
              <div style={{
                background: "white",
                borderRadius: "12px",
                padding: "14px 20px",
                border: "1px solid #e1e9f4",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ color: "#059669", fontSize: "16px" }}>🌿</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f1535" }}>
                    Share your story | Inspire others | Build a healthier India
                  </span>
                </div>

                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
                    color: "white",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Join Community →
                </button>
              </div>
            </div>

            {/* Right: Trending Topics Sidebar */}
            <div className="card" style={{ padding: "18px 16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0f1535", margin: "0 0 14px" }}>
                Trending Topics
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {trendingTopics.map(topic => (
                  <button
                    key={topic}
                    onClick={() => setSearchQuery(topic.replace("#", ""))}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#0284c7",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <span>{topic}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom persistent Brand strip */}
        <BottomBrandStrip />
      </main>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 21, 53, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100
        }} onClick={() => setShowCreateModal(false)}>
          <div
            className="card"
            style={{ padding: "24px", width: "480px", maxWidth: "90vw" }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f1535", margin: "0 0 14px" }}>
              Share Your Health Story
            </h3>
            <input
              type="text"
              value={newPostTitle}
              onChange={e => setNewPostTitle(e.target.value)}
              placeholder="Post title (e.g., My journey with seasonal allergy)..."
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #dbe4f0",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                outline: "none",
                fontFamily: "inherit",
                marginBottom: "10px",
                boxSizing: "border-box"
              }}
            />
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Category:</span>
              <select
                value={newPostCategory}
                onChange={e => setNewPostCategory(e.target.value as CategoryType)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #dbe4f0",
                  fontSize: "12px",
                  outline: "none"
                }}
              >
                {categories.filter(c => c !== "All").map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <textarea
              value={newPostText}
              onChange={e => setNewPostText(e.target.value)}
              placeholder="Apna experience share karein... tips, recovery journey, ya lifestyle advice..."
              style={{
                width: "100%",
                minHeight: "130px",
                padding: "12px",
                border: "1px solid #dbe4f0",
                borderRadius: "8px",
                fontSize: "13px",
                outline: "none",
                fontFamily: "inherit",
                marginBottom: "16px",
                boxSizing: "border-box"
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #dbe4f0",
                  background: "white",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#64748b",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                disabled={isSubmitting || !newPostText.trim()}
                onClick={handlePublishPost}
                className="btn-gradient"
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: isSubmitting || !newPostText.trim() ? "not-allowed" : "pointer",
                  opacity: isSubmitting || !newPostText.trim() ? 0.6 : 1
                }}
              >
                {isSubmitting ? "Publishing..." : "Publish Story"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
