// Mock data for VaaniVisit application

export interface PatientRecord {
  id: string;
  name: string;
  age: number;
  language: string;
  status: "Pending" | "In Review" | "Approved" | "Rejected";
  date: string;
  complaint: string;
  story: string;
  extracted: ExtractedField[];
  reviewerNotes?: string;
  avatarColor?: string;
}

export interface ExtractedField {
  field: string;
  value: string;
  original: string;
  confidence: number;
  status: "High" | "Medium" | "Low" | "Unknown";
  iconType: "lungs" | "clock" | "chart" | "pill" | "shield" | "heart" | "brain";
}

export interface CommunityPost {
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
  views?: string;
  tags: string[];
  isLiked?: boolean;
}

export const mockPatients: PatientRecord[] = [
  {
    id: "VP001",
    name: "Rohan Kumar",
    age: 28,
    language: "Hindi",
    status: "Pending",
    date: "28 Oct 2026",
    complaint: "Khansi (cough)",
    story: "Mujhe 3 din se khansi hai. Raat ko zyada hoti hai. Allergy ki medicine kabhi-kabhi leta hoon.",
    extracted: [
      {
        field: "Main Complaint",
        value: "Khansi (cough)",
        original: "Mujhe teen din se khana hai.",
        confidence: 98,
        status: "High",
        iconType: "lungs"
      },
      {
        field: "Duration",
        value: "3 din",
        original: "3 din",
        confidence: 95,
        status: "High",
        iconType: "clock"
      },
      {
        field: "Symptom Pattern",
        value: "Raat ko zyada hoti hai",
        original: "Raat ko zyada hoti hai.",
        confidence: 92,
        status: "High",
        iconType: "chart"
      },
      {
        field: "Medicine Use",
        value: "Allergy ki medicine kabhi-kabhi leta hoon",
        original: "Allergy ki medicine kabhi-kabhi leta hoon.",
        confidence: 88,
        status: "High",
        iconType: "pill"
      },
      {
        field: "Known Allergies",
        value: "Not provided",
        original: "No clear mention in text",
        confidence: 0,
        status: "Unknown",
        iconType: "shield"
      }
    ],
    reviewerNotes: "Patient reported recurring nocturnal cough. Check for seasonal allergens.",
    avatarColor: "linear-gradient(135deg, #f59e0b, #ef4444)"
  },
  {
    id: "VP002",
    name: "Neha Verma",
    age: 32,
    language: "Hinglish",
    status: "Pending",
    date: "27 Oct 2026",
    complaint: "Pet me dard rehta hai",
    story: "Pet me dard rehta hai, saam kabhi ulti bhi hoti hai. Khana khane ke baad discomfort badhta hai.",
    extracted: [
      {
        field: "Main Complaint",
        value: "Pet dard (Stomach ache)",
        original: "Pet me dard rehta hai",
        confidence: 96,
        status: "High",
        iconType: "chart"
      },
      {
        field: "Duration",
        value: "2 din se",
        original: "2 din se rehta hai",
        confidence: 90,
        status: "High",
        iconType: "clock"
      },
      {
        field: "Symptom Pattern",
        value: "Khana khane ke baad",
        original: "Khana khane ke baad discomfort badhta hai",
        confidence: 86,
        status: "High",
        iconType: "chart"
      },
      {
        field: "Associated Symptoms",
        value: "Nausea / Ulti",
        original: "saam kabhi ulti bhi hoti hai",
        confidence: 84,
        status: "High",
        iconType: "lungs"
      },
      {
        field: "Known Allergies",
        value: "Not provided",
        original: "No clear mention in text",
        confidence: 0,
        status: "Unknown",
        iconType: "shield"
      }
    ],
    reviewerNotes: "Possible gastric irritation. Recommend light diet and hydration.",
    avatarColor: "linear-gradient(135deg, #ec4899, #8b5cf6)"
  },
  {
    id: "VP003",
    name: "Amit Singh",
    age: 36,
    language: "English",
    status: "In Review",
    date: "27 Oct 2026",
    complaint: "Fever for 2 days, body pain",
    story: "Fever for 2 days, body pain and slight throat irritation. Paracetamol provided temporary relief.",
    extracted: [
      {
        field: "Main Complaint",
        value: "Fever & Body pain",
        original: "Fever for 2 days, body pain",
        confidence: 97,
        status: "High",
        iconType: "lungs"
      },
      {
        field: "Duration",
        value: "2 days",
        original: "for 2 days",
        confidence: 96,
        status: "High",
        iconType: "clock"
      },
      {
        field: "Medicine Use",
        value: "Paracetamol",
        original: "Paracetamol provided temporary relief",
        confidence: 91,
        status: "High",
        iconType: "pill"
      },
      {
        field: "Throat Symptoms",
        value: "Slight irritation",
        original: "slight throat irritation",
        confidence: 89,
        status: "High",
        iconType: "chart"
      },
      {
        field: "Known Allergies",
        value: "Penicillin (reported verbally)",
        original: "Self-stated allergy to penicillin",
        confidence: 75,
        status: "Medium",
        iconType: "shield"
      }
    ],
    reviewerNotes: "Monitoring temperature curve. CBC recommended if fever persists.",
    avatarColor: "linear-gradient(135deg, #3b82f6, #06b6d4)"
  },
  {
    id: "VP004",
    name: "Pooja Sharma",
    age: 26,
    language: "Hindi",
    status: "Approved",
    date: "26 Oct 2026",
    complaint: "Sir dard, aankhon me jalan",
    story: "Sir dard, aankhon me jalan hoti hai screen dekhne ke baad. Subah theek lagta hai.",
    extracted: [
      {
        field: "Main Complaint",
        value: "Sir dard (Headache)",
        original: "Sir dard, aankhon me jalan",
        confidence: 99,
        status: "High",
        iconType: "brain"
      },
      {
        field: "Trigger",
        value: "Screen exposure",
        original: "screen dekhne ke baad",
        confidence: 94,
        status: "High",
        iconType: "chart"
      },
      {
        field: "Eye Irritation",
        value: "Burning sensation",
        original: "aankhon me jalan hoti hai",
        confidence: 92,
        status: "High",
        iconType: "lungs"
      },
      {
        field: "Known Allergies",
        value: "Not provided",
        original: "No clear mention in text",
        confidence: 0,
        status: "Unknown",
        iconType: "shield"
      }
    ],
    reviewerNotes: "Computer vision syndrome symptoms. Advised 20-20-20 rule and lubricating eye drops.",
    avatarColor: "linear-gradient(135deg, #10b981, #06b6d4)"
  },
  {
    id: "VP005",
    name: "Suresh Yadav",
    age: 52,
    language: "Hindi",
    status: "Approved",
    date: "25 Oct 2026",
    complaint: "Mera hath, kabhi-kabhi khansi",
    story: "Mera hath sunn ho jaata hai, kabhi-kabhi khansi bhi hoti hai subah ke waqt.",
    extracted: [
      {
        field: "Main Complaint",
        value: "Hand numbness & Morning cough",
        original: "Mera hath sunn ho jaata hai, kabhi-kabhi khansi",
        confidence: 94,
        status: "High",
        iconType: "lungs"
      },
      {
        field: "Timing",
        value: "Morning hours",
        original: "subah ke waqt",
        confidence: 88,
        status: "High",
        iconType: "clock"
      },
      {
        field: "Known Allergies",
        value: "Not provided",
        original: "No clear mention in text",
        confidence: 0,
        status: "Unknown",
        iconType: "shield"
      }
    ],
    reviewerNotes: "Approved for neurological consultation regarding peripheral numbness.",
    avatarColor: "linear-gradient(135deg, #8b5cf6, #3b82f6)"
  }
];

export const mockCurrentDraft = mockPatients[0];

export const mockCommunityPosts: CommunityPost[] = [
  {
    id: "post-mental-health",
    author: "Priya Sharma",
    authorRole: "Health Advocate",
    timeAgo: "2 days ago",
    category: "Mental Health",
    title: "Mental health matters – It's okay to ask for help",
    content: "Mujhe bhi kabhi kabhi anxiety hoti thi. Pehle samajh nahi aata tha ki kya karu. Phir maine apne doston aur family se baat ki. Agar aap bhi aisa feel kar rahe ho, toh please akela mat raho. Help maangna kamzori nahi, himmat hai. 💙",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    likes: 245,
    comments: 12,
    views: "2.4k views",
    tags: ["#MentalHealth", "#Wellness", "#Story"],
    isLiked: false
  },
  {
    id: "post-chhoti-chhoti",
    author: "Priya Sharma",
    authorRole: "Wellness Contributor",
    timeAgo: "2h ago",
    category: "Mental Health",
    title: "Chhoti chhoti baatein bhi zaroori hoti hain",
    content: "Anxiety se ladne ka journey hai... main bhi yahi se guzri thi. Chhoti habits jaise walk karna aur deep breathing ne meri life badal di.",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&q=80",
    likes: 245,
    comments: 12,
    views: "2.4k views",
    tags: ["#MentalHealth", "#StudentLife"],
    isLiked: false
  },
  {
    id: "post-healthy-khana",
    author: "Neha Verma",
    authorRole: "Nutrition Enthusiast",
    timeAgo: "5h ago",
    category: "Nutrition",
    title: "Healthy khana, healthy mind",
    content: "Ghar ka khana hi best hai... quick aur easy recipes share kar rahi hoon jo pet ko bhi halka rakhein aur body ko poora poshan dein.",
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80",
    likes: 189,
    comments: 9,
    views: "1.8k views",
    tags: ["#Nutrition", "#HealthyLiving"],
    isLiked: false
  },
  {
    id: "post-healthy-habits",
    author: "Dr. Sunita Rao",
    authorRole: "Medical Doctor",
    timeAgo: "1 day ago",
    category: "Health Tips",
    title: "Healthy habits for a better life",
    content: "10 minutes of morning sunlight, 3 liters of clean water, and regular sleep cycles can solve 70% of lifestyle fatigue.",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&q=80",
    likes: 312,
    comments: 24,
    views: "2.1k views",
    tags: ["#HealthTips", "#Wellness"],
    isLiked: false
  },
  {
    id: "post-stay-positive",
    author: "Rohan Kumar",
    authorRole: "Student Voice",
    timeAgo: "3 days ago",
    category: "Stories",
    title: "How to stay positive in college",
    content: "Exam stress aur future tension se deal karne ke real practical tareeqe jo maine apne final year mein seekhe.",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500&q=80",
    likes: 178,
    comments: 15,
    views: "1.5k views",
    tags: ["#StudentLife", "#Motivation"],
    isLiked: true
  },
  {
    id: "post-nutrition-tips",
    author: "Kavita Mishra",
    authorRole: "Clinical Nutritionist",
    timeAgo: "4 days ago",
    category: "Nutrition",
    title: "Nutrition tips for students",
    content: "Budget-friendly desi superfoods: sattu, roasted chana, seasonal fruits aur buttermilk jo brain focus aur stamina badhate hain.",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=500&q=80",
    likes: 215,
    comments: 18,
    views: "1.8k views",
    tags: ["#Nutrition", "#DesiHealth"],
    isLiked: false
  },
  {
    id: "post-self-care",
    author: "Ananya Joshi",
    authorRole: "Mindfulness Coach",
    timeAgo: "6 days ago",
    category: "Lifestyle",
    title: "Self care is not selfish",
    content: "Jab tak aap khud healthy aur shaant nahi honge, aap doosron ki dekhbhaal nahi kar sakte. Give yourself permission to rest.",
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=500&q=80",
    likes: 421,
    comments: 35,
    views: "1.2k views",
    tags: ["#SelfCare", "#Lifestyle"],
    isLiked: false
  }
];

export const trendingTopics = [
  "#MentalHealth",
  "#Nutrition",
  "#WomenHealth",
  "#Fitness",
  "#CollegeLife",
  "#Motivation",
  "#HealthyLiving"
];
