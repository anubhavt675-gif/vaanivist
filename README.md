<div align="center">

# 🩺 Clario
### AI-Powered Multilingual Patient–Doctor Teleconsultation & Clinical Intake System
*Evidence-Backed Multilingual Healthcare • हर आवाज़ मायने रखती है (Every Voice Matters)*

[![React](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.5_Flash-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_%26_DB-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Express](https://img.shields.io/badge/Node_Express-3001-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<br/>

<img src="./docs/images/screenshot3.png" alt="Vaani Vision Platform Preview" width="100%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);" />

</div>

---

## 🌟 Executive Overview

**Vaani Vision** is a healthcare platform bridging the communication gap between patients and medical professionals across linguistic barriers. In regions where millions speak mixed vernaculars like **Hindi, Hinglish, and regional Indian dialects**, explaining complex medical symptoms to busy doctors is daunting.

Vaani Vision allows patients to simply **speak or type their symptoms naturally in their mother tongue**. Our integrated **Google Gemini AI** engine transcribes the audio, performs clinical fact extraction, flags emergency red flags, and summarizes the complaint into an actionable clinical draft. 

Once approved by the patient, the health signal is delivered in **real-time** to the assigned physician's dashboard (e.g. **Dr. Priya Sharma**), where the doctor can review the AI clinical extraction, accept the consultation, interact over secure live chat, and issue a **cryptographically verified digital prescription (SHA-256)** downloadable as an official A4 PDF.

---

## 📸 Visual Showcase

<div align="center">

### 1. Multilingual Symptom Voice Studio & AI Clinical Intake
Patients can describe symptoms in Hindi, Hinglish, or English with live waveform audio capture.
<img src="./docs/images/screenshot3.png" alt="Voice Studio & Multilingual Intake" width="90%" style="border-radius: 10px; margin-bottom: 24px;" />

---

### 2. Patient Command Center & Real-Time Tracking
Patients track consultations, pending reviews, doctor notes, and quick health signals.
<img src="./docs/images/screenshot.png" alt="Patient Dashboard" width="90%" style="border-radius: 10px; margin-bottom: 24px;" />

---

### 3. Doctor Review Dashboard & Clinical Queue
Physicians receive live incoming patient requests, clinical urgency ratings, and draft approvals.
<img src="./docs/images/screenshot2.png" alt="Doctor Dashboard" width="90%" style="border-radius: 10px; margin-bottom: 24px;" />

---

### 4. Patient & Doctor Portals with Role-Based Authentication
Independent login pathways for patients and medical practitioners with Supabase Auth.
<img src="./docs/images/screenshot4.png" alt="Login & Role Separation" width="90%" style="border-radius: 10px;" />

</div>

---

## 🏗️ End-to-End System Architecture

```mermaid
flowchart TD
    subgraph PatientExperience["🧑‍💼 Patient Experience"]
        A["Spoken Voice / Text Input\n(Hindi / Hinglish / English)"] --> B["Web Speech API +\nAudio Stream Recording"]
        B --> C["Gemini AI Clinical Engine\n(Symptom Extraction & Red Flag Detection)"]
        C --> D["Patient AI Draft Review\n(Clinical Summary & Evidence Linking)"]
        D --> E["Click 'Send Health Signal to Doctor'"]
    end

    subgraph BackendSync["⚡ Backend & Real-Time Sync (Express + Supabase)"]
        E --> F["POST /api/consultations"]
        F --> G[("Supabase Database\npatient_intakes & clinical_drafts")]
        F --> H["Server-Sent Events / Realtime Broadcast\n('consultation_submitted')"]
    end

    subgraph DoctorExperience["👨‍⚕️ Doctor Command Center"]
        H --> I["Real-Time Doctor Notification Alert"]
        I --> J["Doctor Reviews Clinical Extraction & Audio"]
        J --> K{"Doctor Action"}
        K -->|"Accept"| L["Consultation Activated\nStatus: in_progress"]
        K -->|"Request Info"| M["Ask Clarifying Question to Patient"]
        L --> N["Real-Time Bidirectional Chat\n(ChatModal)"]
        L --> O["Doctor Issues Digital Prescription\n(POST /api/consultations/:id/prescriptions)"]
    end

    subgraph Verification["🛡️ Cryptographic Verification & Delivery"]
        O --> P["SHA-256 Digital Hash Stamp\n(Tamper-Evident Rx Signature)"]
        P --> Q["Patient Receives Real-Time Alert\n'Prescription Ready'"]
        Q --> R["Download Official A4 Printable PDF\n(jsPDF Clinical Layout)"]
    end

    style PatientExperience fill:#f0f9ff,stroke:#0284c7,stroke-width:2px
    style BackendSync fill:#fefce8,stroke:#ca8a04,stroke-width:2px
    style DoctorExperience fill:#ecfdf5,stroke:#059669,stroke-width:2px
    style Verification fill:#fdf4ff,stroke:#a855f7,stroke-width:2px
```

---

## ✨ Core Features

### 🎙️ Multilingual Voice & Text Intake
- **Languages Supported**: Hindi, Hinglish (mixed colloquial Hindi-English), and standard English.
- **Audio Capture**: Browser `SpeechRecognition` and `MediaStream` with live animated waveform feedback.
- **Intelligent Pre-processing**: Handles hesitation, colloquial terms (e.g., *"seene me dawab"*, *"pet kharab"*, *"khansi raat me zyada"*).

### 🤖 Gemini AI Clinical Structuring & Red Flag Engine
- **Main Complaint Extraction**: Identifies the primary ailment and related secondary symptoms.
- **Temporal & Pattern Analysis**: Extracts duration (e.g. *"3 days"*), trigger factors, and progression patterns.
- **Evidence Quote Verification**: Maps each extracted medical entity back to the exact substring in the patient's statement, preventing AI hallucinations.
- **Emergency Red Flag Detection**: Instantly tags cardiac distress (*"chest pain"*, *"saans lene me takleef"*), acute bleeding, or syncope as **🚨 Urgent**.

### 👨‍⚕️ Strict Doctor & Patient Role Separation
- **Independent Interfaces**: Doctors and patients operate in dedicated dashboard environments.
- **Unified Navigation**: Zero duplicate sidebars or nested layout bugs. Direct URL routing (`/patient/prescriptions`, `/doctor`, `/review`) works seamlessly across back/forward navigation and page refresh.
- **Route Guarding**: Role-aware protected routes backed by Supabase profile roles (`patient`, `reviewer`, `doctor`).

### 📄 Cryptographically Verified Digital Prescriptions
- **SHA-256 Integrity Seal**: Every prescription generates a unique cryptographic hash verifying the doctor's registration, date, and medicines.
- **Vector PDF Output**: Generates clean, hospital-grade A4 printable PDF documents using `jsPDF` with clinic letterheads, dosage schedules, precautions, and verified doctor digital signatures.

### 💬 Real-Time Bidirectional Messaging
- Instant communication modal (`ChatModal`) connecting active patients to their assigned physician.
- Live notifications for incoming questions, accepted consultations, and issued prescriptions.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 19, Vite 8, TypeScript 5.5, React Router 7 |
| **Styling & Design** | Custom Design System, Modern Inter Typography, Glassmorphism, Responsive CSS3 |
| **Backend API** | Node.js (ES Modules), Express.js (Port 3001) |
| **AI & NLP** | Google Gemini 2.5 Flash / 3.5 Flash Lite via `@google/genai` |
| **Database & Auth** | Supabase PostgreSQL, Row Level Security (RLS), Supabase Auth |
| **PDF Generation** | `jsPDF`, `html2canvas` |
| **Realtime Engine** | Server-Sent Events (SSE) & Supabase Realtime Channels |

---

## 🚀 Quick Start & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/anubhavt675-gif/vaanivist.git
cd vaanivist
```

### 2. Install Dependencies
```bash
# Install workspace dependencies
npm install

# Install frontend application dependencies
cd vaanivisit
npm install
cd ..
```

### 3. Configure Environment Variables
Create or verify `.env` (and `.env.local` inside `vaanivisit/`):

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://wlwlbzrfazwtvsboljzp.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_IqnTtw8qtmdUHCJHFm2ZbA_hu8qRlXF
NEXT_PUBLIC_SUPABASE_URL=https://wlwlbzrfazwtvsboljzp.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_IqnTtw8qtmdUHCJHFm2ZbA_hu8qRlXF
SUPABASE_SECRET_KEY=sb_secret_Kx6UFZ1noCM15ElDOP-dmA_DfsK95Lw

# Google Gemini AI Configuration
GEMINI_API_KEY=AQ.Ab8RN6KWm4aWaLCx8wxPmqafLkiulRrjcpNEB2KdOIMKQKuGcw
GEMINI_MODEL=gemini-3.5-flash-lite

# Server Configuration
PORT=3001
NODE_ENV=production
```

### 4. Build and Launch Application
```bash
# Build the production bundle
npm run build

# Start the full-stack server (serves API & production SPA)
npm run server
```

The application will be live at: **http://localhost:3001**

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/consultations` | Submit voice/text health symptoms, triggers Gemini AI clinical extraction, and alerts doctor |
| `GET` | `/api/consultations` | List consultations filtered by `role`, `status`, `q`, and `patient_id` |
| `GET` | `/api/consultations/:id` | Fetch specific consultation intake details and linked prescription |
| `POST` | `/api/consultations/:id/accept` | Doctor accepts consultation request atomically; sets status to `in_progress` |
| `POST` | `/api/consultations/:id/notes` | Doctor appends clinical assessment notes or asks patient follow-up questions |
| `POST` | `/api/consultations/:id/prescriptions` | Generate digital prescription with medicines list and SHA-256 verification hash |
| `GET` | `/api/prescriptions` | Retrieve verified digital prescriptions for patient |
| `GET` | `/api/doctor/overview` | KPI overview metrics (Pending requests, active reviews, urgent alerts) |
| `GET` | `/api/messages` | Fetch real-time chat history between patient and doctor |
| `POST` | `/api/messages` | Send message in consultation chat thread |
| `GET` | `/api/notifications` | Fetch user notifications with read status |
| `POST` | `/api/notifications/mark-read` | Mark notifications as read |

---

## 📁 Repository Directory Structure

```text
vaanivist/
├── docs/
│   └── images/                    # UI screenshots & showcase visuals
│       ├── screenshot.png         # Patient Dashboard Overview
│       ├── screenshot2.png        # Doctor Command Center
│       ├── screenshot3.png        # Multilingual Voice Studio
│       ├── screenshot4.png        # Authentication Portal
│       └── doctor-hero.png        # Medical illustrations
├── vaanivisit/                    # Core Application
│   ├── public/                    # Static assets, branding, logos, wave artwork
│   ├── server/
│   │   └── index.mjs              # Express API Server, Gemini AI & Supabase integration
│   ├── src/
│   │   ├── components/            # Sidebar, ChatModal, VoiceConsultationModal, TopHeader
│   │   ├── lib/                   # Supabase client, PDF generator, Realtime, Role management
│   │   ├── pages/                 # PatientDashboardPage, DoctorDashboardPage, AIDraftPage,
│   │   │                          # HomePage, LoginPage, SignupPage, ExportPage
│   │   ├── App.tsx                # Role-guarded route hierarchy & tabs
│   │   └── main.tsx               # Client entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.local
├── .env                           # Environment keys and deployment configuration
├── .gitignore                     # Optimized gitignore protecting dependencies
├── package.json                   # Workspace root script runner
└── README.md                      # Project documentation and showcase
```

---

## 🔒 Security & Clinical Safety

- **Evidence Anchoring**: Gemini AI extractions are strictly cross-verified against patient spoken input (`exact_quote` verification). Fabricated symptoms are rejected automatically.
- **Cryptographic Seals**: Prescriptions feature a SHA-256 hash stamp containing patient, doctor, and medicine attributes to eliminate prescription tampering.
- **Role Isolation**: Authentication uses Supabase RLS and token verification to ensure patients cannot access doctor review queues or unauthorized clinical records.

---

## 👥 Contributors & Acknowledgements

Developed with ❤️ for **Vaani Vision (वाणी विज़न)** — *Empowering every voice with accessible, AI-powered healthcare.*
