# Shareable Academic Moodle Boilerplate

An open-source, full-stack Learning Management System (LMS) starter kit designed for academic institutes, training programs, and values-based education platforms. Clone it, configure it with your own branding, and launch a full-featured online academy in hours.

---

## ✨ Key Features

### Platform
- Public-facing marketing pages: home, about, courses catalog, contact, and FAQ
- Inquiry intake system with admin response management
- Live-session and content publishing (Zoom / YouTube integration)
- File and image upload support via Vercel Blob

### Learning
- Course, module, and lesson management with drag-and-drop reordering
- Resource attachments per lesson
- Video lesson support via YouTube playlist import

### Assessment
- Exams with multiple-choice questions and image support
- Quiz engine with automatic grading
- Homework assignments with teacher feedback
- Manual grade overrides and old-grade record migration

### Users & Access
- JWT authentication with refresh-token rotation
- Google Sign-In (OAuth 2.0)
- Role-based access control: **Admin**, **Teacher**, **Student**
- Profile management and optional profile-completion gate

### Admin Tools
- Course lifecycle management (draft → published → archived)
- Student enrollment management
- Reporting/content-error workflow
- Site settings panel (site content, Zoom live schedule, home promotions)
- Grade export to Excel

---

## 🛠 Tech Stack

| Layer       | Technology                                     |
|-------------|------------------------------------------------|
| Frontend    | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| API         | Express, TypeScript, Zod                       |
| Database    | PostgreSQL, Prisma ORM                         |
| Auth        | JWT + refresh tokens, Google OAuth             |
| Storage     | Vercel Blob (optional)                         |
| Monorepo    | Turbo, npm workspaces                          |
| Testing     | Jest, @testing-library/react, Supertest        |

---

## 📁 Project Structure

```
shareable-academic-moodle/
├── apps/
│   ├── web/          # Next.js 14 frontend
│   └── api/          # Express API backend
│       └── prisma/   # Schema, migrations & seed scripts
├── docs/             # Developer notes
├── .env.example      # Template for all required variables
└── package.json      # Root workspace config
```

---

## 🚀 Getting Started — Local Development

### Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL 14+ (local) **or** a [Neon DB](https://neon.tech) free-tier database

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/shareable-academic-moodle.git
cd shareable-academic-moodle

# 2. Install all workspace dependencies
npm install

# 3. Create local environment files from the template
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
# Then edit both files and fill in your real values

# 4. Generate the Prisma client
npm run db:generate

# 5. Run database migrations
npm run db:migrate

# 6. Seed demo users and sample content
npm run db:seed

# 7. Start the development servers (frontend + API concurrently)
npm run dev
```

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:3000  |
| API      | http://localhost:3001  |

### Default Demo Accounts (after seeding)

| Role    | Email               | Password    |
|---------|---------------------|-------------|
| Admin   | admin@example.com   | admin123    |
| Teacher | teacher@example.com | teacher123  |
| Student | student@example.com | student123  |

> ⚠️ Change all passwords before any public or shared deployment.

---

## 🌐 Deployment & Infrastructure Guide

### 1. Vercel Deployment

This project is structured as a monorepo and deploys best as **two separate Vercel projects** — one for the frontend and one for the API.

**Recommended Vercel project setup:**

| Project                                | Root Directory  |
|----------------------------------------|-----------------|
| `your-project-api`  (Express/Node)     | `apps/api`      |
| `your-project-web`  (Next.js)          | `apps/web`      |

**Import from GitHub:**
1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New → Project** and import your GitHub repository.
3. On the configuration screen, set the **Root Directory** to `apps/api` (for the API project) or `apps/web` (for the frontend project).
4. Add the required environment variables (see table below).
5. Deploy.

**⚠️ Vercel Hobby Tier Notes:**
- Hobby (free) tier allows personal projects and demos.
- It imposes limits on serverless function execution time, bandwidth, team members, and concurrent builds.
- Cron jobs and advanced Edge features require a paid plan.
- For a production classroom with many simultaneous users, evaluate whether Vercel Pro or a dedicated Node host (Railway, Render, Fly.io) is more cost-effective for the API.

---

### 2. Database Setup with Neon DB

[Neon](https://neon.tech) provides serverless PostgreSQL with a **free tier** that is well-suited for development, staging, and small production workloads.

**Steps:**
1. Create a free account at [neon.tech](https://neon.tech).
2. Click **New Project** and choose a region close to your Vercel deployment region.
3. From the project dashboard, copy:
   - **Connection string (pooled)** → use as `DATABASE_URL`
   - **Connection string (direct / non-pooled)** → use as `DIRECT_URL` (required for Prisma migrations)
4. Run migrations from your local machine before the first production deploy:
   ```bash
   DATABASE_URL="<neon-pooled-url>" DIRECT_URL="<neon-direct-url>" npm run db:migrate
   ```
5. Optionally seed demo data:
   ```bash
   DATABASE_URL="<neon-pooled-url>" npm run db:seed
   ```

---

### 3. Linking Neon DB to Vercel Projects via Environment Variables

Configure environment variables in **Vercel → Project → Settings → Environment Variables** for each project.

**API project variables:**

| Variable                  | Description                                     |
|---------------------------|-------------------------------------------------|
| `DATABASE_URL`            | Neon pooled connection string                   |
| `DIRECT_URL`              | Neon direct (non-pooler) connection string      |
| `JWT_SECRET`              | Long random string (32+ characters)             |
| `JWT_REFRESH_SECRET`      | Long random string (32+ characters)             |
| `FRONTEND_URL`            | Full public URL of your frontend (e.g. `https://your-domain.com`) |
| `NEXT_PUBLIC_FRONTEND_URL`| Same as above                                   |
| `NODE_ENV`                | `production`                                    |
| `GOOGLE_CLIENT_ID`        | From Google Cloud Console                       |
| `BLOB_READ_WRITE_TOKEN`   | Optional — from Vercel Storage                  |

**Web project variables:**

| Variable                        | Description                              |
|---------------------------------|------------------------------------------|
| `NEXT_PUBLIC_API_URL`           | Full public URL of your API project      |
| `NEXT_PUBLIC_FRONTEND_URL`      | Full public URL of your frontend         |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`  | From Google Cloud Console                |
| `BLOB_READ_WRITE_TOKEN`         | Optional — if the frontend uploads directly |

**Deployment order:**
1. Deploy the **API** project first and note its Vercel URL.
2. Add `NEXT_PUBLIC_API_URL=<api-vercel-url>` to the **Web** project.
3. Add `FRONTEND_URL=<web-vercel-url>` to the **API** project.
4. Trigger a redeploy of both projects.

---

## 🧑‍💻 Developer Advice

- **Migrations**: Keep each migration small and descriptive. Never edit a migration after it has been applied to a shared or production database — create a new one instead.
- **Seed data**: Treat seeds as disposable demo content. Keep them generic and test them after schema changes.
- **Environment variables**: Every new third-party integration must immediately add its variables to `.env.example` with a clear placeholder.
- **Staging**: Always run and verify schema changes on a staging database before applying them to production. Neon supports database branching for exactly this purpose.
- **Cleanup**: Periodically prune stale test accounts, orphaned uploads in Vercel Blob, and resolved inquiry/report records.
- **Authorization**: Audit every admin and teacher route after adding new features — role checks can be silently bypassed if not added explicitly.
- **Monorepo tips**: Use `npm run db:studio` to inspect the database interactively. Run `npm run build` from the root before merging large refactors to catch cross-package type errors early.

---

## 📄 License

MIT
