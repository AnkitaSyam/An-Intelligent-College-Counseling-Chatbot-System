# An Intelligent College Counseling Chatbot System

**A Mini Project**

**Under the Guidance of:** Ms. Akshaya Jayaraj  
**Developed By:** Ankita Syam, Anwa A V, Aqsa Fathima  

---

## Overview
The Intelligent College Counseling Chatbot System is a comprehensive web application engineered to facilitate student mental health support within academic institutions. The system integrates asynchronous artificial intelligence assistance, synchronous human counseling, and pastoral oversight via a secure, role-based architecture.

By combining continuous AI availability with structured professional intervention, the platform aims to provide accessible mental health resources for students while outfitting counselors with necessary data analytics and session management utilities.

---

## System Architecture & Portals

### 1. The Student Portal
Developed to provide secure access to mental health resources and tracking.
- **AI Counselor:** Integrated with the Groq API, the system offers continuous conversational support. The architecture supports a multi-session interface, allowing students to maintain and review distinct historical interactions.
- **Counseling Appointments:** Students can view counselor availability, request specific appointment times, and engage in encrypted, real-time messaging during approved slot intervals.
- **Reflective Journaling:** A secure text entry utility for personal reflection and mood logging.
- **Global Mood Tracking:** An analytics dashboard that visually represents longitudinal emotional trends (categorized as Happy, Calm, Anxious, or Sad) utilizing a dynamic line graph, aggregated mood scores, and stability indices.

### 2. The Counselor Portal
Engineered for efficient student management and analytical oversight.
- **Slot Management:** Counselors establish availability parameters. The system automatically processes and prunes expired time slots to maintain database integrity and accurate scheduling records.
- **Active Session Administration:** Real-time counseling sessions employ automated security protocols, including an inactivity timeout terminating abandoned virtual connections to preserve confidentiality.
- **AI Conversation Summaries:** A hierarchical data viewer that permits counselors to review a student's prior multi-session interactions with the AI, establishing critical context prior to direct human intervention.

### 3. The Tutor Portal
Designed for structured pastoral oversight, strictly adhering to privacy protocols.
- **Authentic Access Requests:** Tutors submit formal requests (via Student College ID) to the counselor for authorization to review a specific student's counseling records.
- **Temporal Access Restrictions:** Upon counselor authorization, tutors receive read-only privileges. Systemic constraints mathematically restrict data visibility exclusively to records generated chronologically prior to the precise timestamp of the access request.

---

## Intelligence Engine

### Sentiment Analysis & Early Warning Protocol
The platform incorporates a centralized, passive sentiment analysis engine. Text inputs across the AI chatbot, human counselor interactions, and journal entries are analyzed for positive and negative linguistic markers. 

These interactions are quantified and recorded to drive the Student Dashboard analytics. As a critical secondary function, the engine identifies profound negative indicators or distress signals, subsequently generating and dispatching high-priority automated alerts to the Counselor Portal to facilitate rapid intervention.

---

## Technical Stack

- **Frontend:** React.js, Vite, and Tailwind CSS.
- **Database & Authentication:** Firebase Firestore (NoSQL) with real-time state synchronization across all application states and user roles.
- **Backend Infrastructure:** A Node.js and Express intermediate server brokers secure requests to the Groq API, utilizing specialized LPUs to ensure highly responsive LLM interactions.

---

## Deployment & Execution

### System Requirements
- Node.js (version 16 or newer)
- Firebase Project configured with Firestore and Authentication
- Active Groq API Key

### Initialization Procedure

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd final
   ```

2. **Frontend Dependencies:**
   ```bash
   npm install
   ```

3. **Backend Dependencies:**
   ```bash
   cd server
   npm install
   cd ..
   ```

4. **Environment Configuration:**
   - Define Firebase parameters within `src/firebaseConfig.js`.
   - Define the Groq API key within a `.env` configuration file inside the `/server` directory.

5. **Execution:**
   - **Launch API Server:**
     ```bash
     cd server
     npm run dev
     ```
   - **Launch Frontend Interace:**
     ```bash
     npm run dev
     ```
