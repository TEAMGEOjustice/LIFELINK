# 🩸 LifeLink Connect

**LifeLink Connect** is a centralized, real-time platform designed to bridge the gap between hospitals, blood donors, and organ donors. By leveraging real-time geospatial matching, automated reward systems, and secure role-based access, LifeLink ensures that critical medical emergencies are handled swiftly and transparently.

![LifeLink Dashboard](https://images.unsplash.com/photo-1536856136534-bb679c52a9aa?w=1200&q=80)

---

## 🚀 Key Features

### 🏥 For Hospitals
- **Emergency Broadcasting:** Instantly raise urgent requests for blood or specific organs.
- **Geospatial Matching:** Automatically ping eligible donors within the immediate vicinity using Haversine distance calculations.
- **Inter-Hospital Feed:** Communicate with other registered medical facilities to share surplus resources or request urgent transfers.
- **Secure Confirmations:** Validate actual donations securely to prevent reward fraud.

### ❤️ For Donors
- **Real-Time Notifications:** Receive immediate alerts when nearby hospitals have critical emergencies matching your blood group.
- **Organ Pledge Registry:** Officially register as an organ donor with a secure, distance-sorted hospital selection process.
- **Reward System:** Earn points, tier-based badges (Bronze, Silver, Gold, Platinum, Guardian Angel), and officially verifiable PDF certificates for successful donations and pledges.

### 🛡️ For Administrators
- **User Management Dashboard:** Monitor system health and securely manage or remove users/hospitals directly from the interface.
- **Role-Based Access Control (RBAC):** Strict isolation between `donor`, `hospital`, and `admin` roles.

---

## 🛠️ Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Routing:** TanStack Router (File-based routing)
- **State & Real-time:** Supabase Client (WebSockets)
- **Backend / Database:** Supabase (PostgreSQL)
- **Security:** PostgreSQL Row Level Security (RLS) & Security Definer RPCs
- **Document Generation:** jsPDF (Client-side certificate rendering)

---

## 🔒 Security Architecture

LifeLink prioritizes the security and privacy of medical data:
1. **Row Level Security (RLS):** Donors can only see their own data. Hospitals can only manage their own emergencies. 
2. **RPC Centralization:** Complex operations (like confirming a donation and awarding points) are handled exclusively via server-side PostgreSQL functions (`confirm_hospital_donation()`) to prevent client-side manipulation and point fraud.
3. **Trigger Automations:** Badges and Organ Pledge points are awarded automatically via database triggers, eliminating race conditions.

---

## ⚙️ Local Development Setup

### Prerequisites
- Node.js (v18+)
- npm or yarn
- A Supabase Project

### 1. Clone the repository
```bash
git clone https://github.com/TEAMGEOjustice/LIFELINK.git
cd lifelink-connect
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add your Supabase credentials. Do **not** commit this file.
```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"

# Required ONLY for running the backend migration scripts locally
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-anon-key"
```

### 4. Database Setup
You can set up your Supabase database in one go. Connect to your Supabase SQL editor and run the contents of the initialization script:
1. Open `supabase/COMPLETE_SETUP.sql`.
2. Copy the entire content.
3. Paste and run it in your Supabase SQL Editor. 
*(This script is idempotent and handles all ENUMs, Tables, RLS Policies, Functions, and Triggers).*

### 5. Run the Application
```bash
npm run dev
```
The application will be available at `http://localhost:8080`.

---

## 🗄️ Database Schema Overview

- `profiles`: Core user information and geolocation.
- `user_roles`: Maps Auth UUIDs to `donor`, `hospital`, or `admin`.
- `donor_profiles`: Blood group, availability status, and reward points.
- `emergency_requests`: Active hospital requirements.
- `notifications`: Real-time alerts sent to matched donors.
- `donations`: Verified records of completed blood donations.
- `badges` & `certificates`: Gamification and official proof of contribution.
- `organ_pledges` & `organ_requests`: Specialized tables for the organ registry workflow.

---

## 🤝 Contribution

This project was built to solve critical healthcare communication gaps. If you'd like to contribute:
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License
This project is proprietary and built for the GEO Justice initiative. All rights reserved.
