<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=timeGradient&height=250&section=header&text=Advanced%20Classes&fontSize=60&fontAlignY=35&desc=Study%20Hub%20&%20Learning%20Management%20System&descAlignY=55" width="100%" />
  
  <br />
  
  <img src="https://readme-typing-svg.herokuapp.com?font=Plus+Jakarta+Sans&weight=600&size=24&pause=1000&color=6366F1&center=true&vCenter=true&random=false&width=600&lines=Advanced+Study+Hub;Real-time+Collaboration;Digital+Notes+%26+Resource+Management;Built+for+Advanced+Classes+Sonai" alt="Typing SVG" />

  <p align="center">
    <img src="https://img.shields.io/badge/version-13.6-blue?style=for-the-badge" alt="Version 13.6" />
    <img src="https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  </p>

  <br />
  
  <video src="https://ik.imagekit.io/zwgtg4n9j/Screen%20Recording%202026-08-17%2019.44.mp4" width="800" autoplay loop muted playsinline style="border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);"></video>

  <br />
  <br />

  <a href="https://advancedclasses.online/" target="_blank">
    <img src="https://img.shields.io/badge/🔴_Live_Demo-advancedclasses.online-6366F1?style=for-the-badge" alt="Live Demo" />
  </a>

  <br />
</div>

> **A sophisticated study hub and learning management system built for Advanced Classes Sonai. This platform features real-time collaborative chat, resource management, digital notes, and automated enrollment tracking.**

---

## ✨ Key Features

<details>
<summary><b>Click to expand Features</b></summary>
<br/>

- 📊 **Student Dashboard:** An overview of personal progress, batches, and programs.
- 📚 **Resource Management:** Secure, organized access to PDFs, Digital Notes, and Library resources.
- 📝 **Digital Notes:** Rich text content viewer for in-depth studying with custom typographic styling.
- 💬 **Real-Time Collaboration:** Chat Rooms allowing students to communicate and discuss subjects instantly using Firebase.
- ⚙️ **Automated Tracking:** Fee structures, enrollment history, and tests tracking.
- 🎨 **Branding & Theming:** Integrated dark/light modes with customizable branding configurations tailored to Advanced Classes Sonai.
</details>

## 🛠️ Architecture & Tech Stack

<details>
<summary><b>Click to expand Tech Stack details</b></summary>
<br/>

- **Frontend:** React 18, Vite, Tailwind CSS, Framer Motion
- **Backend/Services:** Node.js (Express server)
- **Databases:** 
  - **Firebase:** Utilized for Authentication, Real-Time Database (for live chat and real-time syncing), and Firestore.
  - **MongoDB:** Utilized as a combined secondary data store for robust, scalable document storage and complex queries.
- **Hosting & Infrastructure:** 
  - **Hosting:** Render (Web Service)
  - **Domain Management:** Hostinger
</details>

## 🚀 Complete Setup & Installation Guide

<details>
<summary><b>1. Prerequisites</b></summary>
<br/>

Before you begin, ensure you have the following installed and configured:
- **Node.js** (v18+ recommended)
- **Git**
- **Firebase Account:** Create a project, enable Authentication, Firestore, and Real-Time Database.
- **MongoDB Atlas Account:** Create a cluster and retrieve your connection string.
- **Render Account:** For production deployment.
</details>

<details>
<summary><b>2. Environment Configuration</b></summary>
<br/>

Copy the `.env.example` file to a new file named `.env`. You will need to fill in credentials for both Firebase and MongoDB.

```bash
cp .env.example .env
```

**Required Variables (Example structure):**
```env
# Firebase Configuration
FIREBASE_API_KEY="your_api_key"
FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
FIREBASE_PROJECT_ID="your_project_id"
FIREBASE_STORAGE_BUCKET="your_project.appspot.com"
FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
FIREBASE_APP_ID="your_app_id"
FIREBASE_DATABASE_URL="https://your_project.firebaseio.com"

# MongoDB Configuration
MONGODB_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/dbname?retryWrites=true&w=majority"
```
</details>

<details>
<summary><b>3. Local Development Setup</b></summary>
<br/>

1. **Clone the Repository:**
   ```bash
   git clone <repository_url>
   cd <repository_name>
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:3000`.
</details>

## 🌍 Deployment Guide (Render & Hostinger)

<details>
<summary><b>Click to expand Deployment Instructions</b></summary>
<br/>

This project is configured to be hosted natively on **Render** with a custom domain managed via **Hostinger**.

### Step 1: Deploying on Render
1. Log in to Render and create a new **Web Service**.
2. Connect your GitHub repository.
3. Configure the service with the following settings:
   - **Environment:** `Node`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start` (or the equivalent command starting your compiled node server)
4. **Environment Variables:** In the Render dashboard (under the Environment tab), add all the keys from your local `.env` file.
5. Click **Deploy**. Once the build finishes, Render will provide a `.onrender.com` URL.

### Step 2: Custom Domain via Hostinger
1. In your Render Web Service dashboard, navigate to **Settings** -> **Custom Domains**.
2. Add your desired domain (e.g., `advancedclasses.com`).
3. Render will provide DNS records (typically a `CNAME` for subdomains like `www`, and an `A` record or `ALIAS` for the root domain).
4. Log into your **Hostinger** control panel and navigate to the **DNS / Nameservers** section for your domain.
5. Add the exact DNS records provided by Render.
6. Wait for DNS propagation (this can take up to 24 hours, but usually happens within minutes). Render will automatically provision an SSL certificate for secure `https` access.
</details>

## 🎨 Branding & Customization
The application branding (logos, theme colors, and institution names) is tailored specifically for **Advanced Classes Sonai**. Branding configurations are centralized within internal configuration files (e.g., `BrandingConfig`) to maintain visual consistency across all views. If a new developer is setting up a white-labeled version, these configurations can be easily customized without altering core UI components.

---

<div align="center">
  <h3>👨‍💻 Developed By</h3>
  <br />
  <p>
    <a href="https://instagram.com/Xavy.dev">
      <img src="https://img.shields.io/badge/Instagram-%23E4405F.svg?style=for-the-badge&logo=Instagram&logoColor=white" alt="Instagram" />
    </a>
    <a href="https://github.com/SabbirXavier">
      <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
    </a>
  </p>
  <p>Built with ❤️ for <b>Advanced Classes Sonai</b></p>
</div>
