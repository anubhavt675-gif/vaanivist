import fs from "fs";
import path from "path";

export interface StoredPost {
  id: string;
  author: string;
  authorRole: string;
  timeAgo: string;
  category: string;
  title: string;
  content: string;
  image: string;
  likes: number;
  comments: number;
  views: string;
  tags: string[];
  createdAt: number;
}

export interface StoredComment {
  id: string;
  postId: string;
  author: string;
  text: string;
  time: string;
  createdAt: number;
}

const DATA_DIR = path.join(process.cwd(), "data");
const POSTS_FILE = path.join(DATA_DIR, "community_posts.json");
const COMMENTS_FILE = path.join(DATA_DIR, "community_comments.json");

const INITIAL_POSTS: StoredPost[] = [
  {
    id: "post-mental-health",
    author: "Priya Sharma",
    authorRole: "Health Advocate",
    timeAgo: "2 days ago",
    category: "Mental Health",
    title: "Mental health matters – It's okay to ask for help",
    content: "Mujhe bhi kabhi kabhi anxiety hoti thi. Pehle samajh nahi aata tha ki kya karu. Fir maine apne doston aur family se baat ki.\n\nAgar aap bhi aisa feel kar rahe ho, toh please akela mat raho.\n\nHelp maangna kamzori nahi, himmat hai. 💙",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
    likes: 245,
    comments: 12,
    views: "2.4k views",
    tags: ["MentalHealth", "Wellness", "Story"],
    createdAt: Date.now() - 172800000,
  },
  {
    id: "post-chhoti-chhoti",
    author: "Priya Sharma",
    authorRole: "Health Advocate",
    timeAgo: "2h ago",
    category: "Stories",
    title: "Chhoti chhoti baatein bhi zaroori hoti hain",
    content: "Anxiety se ladna ek journey hai, main bhi yahan se guzri thi...",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80",
    likes: 245,
    comments: 12,
    views: "2.4k views",
    tags: ["MentalHealth", "StudentLife"],
    createdAt: Date.now() - 7200000,
  },
  {
    id: "post-healthy-khana",
    author: "Neha Verma",
    authorRole: "Nutrition Coach",
    timeAgo: "5h ago",
    category: "Nutrition",
    title: "Healthy khana, healthy mind",
    content: "Ghar ka khana hi best hai... quick aur easy recipes share kar rahi hoon.",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
    likes: 189,
    comments: 8,
    views: "1.8k views",
    tags: ["Nutrition", "HealthyLiving"],
    createdAt: Date.now() - 18000000,
  },
  {
    id: "post-habits",
    author: "Dr. Priya Sharma",
    authorRole: "Medical Reviewer",
    timeAgo: "1 day ago",
    category: "Health Tips",
    title: "Healthy habits for a better life",
    content: "Roz subah 20 minute walk aur adequate hydration se bohot sare lifestyle issues theek ho sakte hain.",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
    likes: 312,
    comments: 19,
    views: "2.1k views",
    tags: ["HealthTips", "Fitness"],
    createdAt: Date.now() - 86400000,
  },
];

const INITIAL_COMMENTS: StoredComment[] = [
  {
    id: "c1",
    postId: "post-mental-health",
    author: "Suresh Verma",
    text: "Bahut hi helpful post hai. Mujhe bhi ye problem thi, ab theek hoon.",
    time: "2 hrs ago",
    createdAt: Date.now() - 7200000,
  },
  {
    id: "c2",
    postId: "post-mental-health",
    author: "Anita Singh",
    text: "Thank you for sharing this. We need more awareness about mental health in India.",
    time: "4 hrs ago",
    createdAt: Date.now() - 14400000,
  },
];

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getStoredPosts(): StoredPost[] {
  ensureDir();
  if (!fs.existsSync(POSTS_FILE)) {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(INITIAL_POSTS, null, 2), "utf-8");
    return INITIAL_POSTS;
  }
  try {
    const raw = fs.readFileSync(POSTS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return INITIAL_POSTS;
  }
}

export function savePost(post: Omit<StoredPost, "id" | "createdAt" | "likes" | "comments" | "views">): StoredPost {
  ensureDir();
  const posts = getStoredPosts();
  const newPost: StoredPost = {
    ...post,
    id: "post-" + Date.now(),
    likes: 1,
    comments: 0,
    views: "1 view",
    createdAt: Date.now(),
  };
  posts.unshift(newPost);
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), "utf-8");
  return newPost;
}

export function toggleLikePost(postId: string): number {
  ensureDir();
  const posts = getStoredPosts();
  const post = posts.find((p) => p.id === postId);
  if (post) {
    post.likes += 1;
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), "utf-8");
    return post.likes;
  }
  return 0;
}

export function getStoredComments(postId: string): StoredComment[] {
  ensureDir();
  if (!fs.existsSync(COMMENTS_FILE)) {
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(INITIAL_COMMENTS, null, 2), "utf-8");
    return INITIAL_COMMENTS.filter((c) => c.postId === postId);
  }
  try {
    const raw = fs.readFileSync(COMMENTS_FILE, "utf-8");
    const all: StoredComment[] = JSON.parse(raw);
    return all.filter((c) => c.postId === postId);
  } catch {
    return INITIAL_COMMENTS.filter((c) => c.postId === postId);
  }
}

export function addStoredComment(postId: string, author: string, text: string): StoredComment {
  ensureDir();
  let all: StoredComment[] = [];
  if (fs.existsSync(COMMENTS_FILE)) {
    try {
      all = JSON.parse(fs.readFileSync(COMMENTS_FILE, "utf-8"));
    } catch {
      all = INITIAL_COMMENTS;
    }
  } else {
    all = INITIAL_COMMENTS;
  }

  const newComment: StoredComment = {
    id: "comm-" + Date.now(),
    postId,
    author: author || "Rohan Kumar",
    text,
    time: "Just now",
    createdAt: Date.now(),
  };

  all.unshift(newComment);
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify(all, null, 2), "utf-8");

  // Also increment comments counter on post
  const posts = getStoredPosts();
  const post = posts.find((p) => p.id === postId);
  if (post) {
    post.comments += 1;
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), "utf-8");
  }

  return newComment;
}

