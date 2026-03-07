# 📋 TESDA Registration System
### Noveleta Training Center — Digital Learner Enrollment Platform

A full-stack web application for managing TESDA learner registrations at Noveleta Training Center. Built to digitize and streamline the TESDA MIS Form 03-01 (Learners Profile Form) with role-based access control, audit logging, and multi-theme support.

---

## 🖥️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript (Vite 8) |
| Backend | Node.js + Fastify 5 |
| Database | MySQL 8 (HeidiSQL) |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Data Fetching | TanStack Query v5 |
| Auth | JWT (@fastify/jwt) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Animations | Framer Motion |

---

## ✨ Features

### 🔐 Authentication
- Two-step login — identifier detection then password entry
- Supports **Employee ID** (9-digit), **Username**, or **Email** as login identifier
- **Remember Me** (7-day token) or standard 8-hour session
- Role detection — UI adapts based on detected role before password entry

### 👤 Role-Based Access

| Feature | Admin | Encoder |
|---|:---:|:---:|
| Dashboard with charts | ✅ | ✅ |
| Register new learner | ❌ | ✅ |
| View registration records | ✅ | ✅ |
| Archive registrants | ✅ | ❌ |
| User management | ✅ | ❌ |
| Audit trail | ✅ | ❌ |
| Generate reset tickets | ✅ | ❌ |
| Forgot password (email + security question) | ✅ | ❌ |
| Password reset via ticket | ❌ | ✅ |

### 📝 Learner Registration (TESDA MIS Form 03-01)
Multi-step registration form covering:
- Personal Information & Birthdate
- Complete Permanent Mailing Address
- Employment Status & Type
- Educational Attainment & Course/Qualification
- Learner Classification & Privacy Consent

### 📊 Admin Dashboard
- Total registrants, today's count, monthly count, active courses
- Monthly registrations bar chart
- Registrations by course pie chart

### ⚙️ Settings (Admin)
- **User Management** — create Admin/Encoder accounts, toggle active status
- **Audit Trail** — full log of all system actions with IP tracking
- **Reset Tickets** — generate 8-character one-time tickets for encoder password resets (valid 24h)

### 🎨 Themes
- Light Mode
- Dark Mode

---

## 📁 Project Structure

```
Tesda-Registration-Noveleta-Training-Center/
├── frontend/                  # React + TypeScript
│   ├── src/
│   │   ├── components/        # AppHeader, Sidebar, ThemeToggle
│   │   ├── layouts/           # DashboardLayout
│   │   ├── lib/               # Axios instance (api.ts)
│   │   ├── pages/
│   │   │   ├── Welcome.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── admin/         # Home, Reports, Settings
│   │   │   └── encoder/       # Home, Registration, Reports
│   │   ├── store/             # Zustand stores (auth, theme)
│   │   └── index.css          # Theme variables + custom classes
│   ├── index.html
│   └── package.json
│
├── backend/                   # Node.js + Fastify
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js          # MySQL connection pool
│   │   │   └── schema.sql     # Full DB schema + seed data
│   │   ├── controllers/       # auth, registrant, admin
│   │   ├── middleware/        # JWT authentication
│   │   ├── routes/            # auth, registrant, admin
│   │   ├── utils/             # helpers (ULI gen, ticket gen, etc.)
│   │   └── index.js           # Fastify server entry point
│   └── package.json
│
└── package.json               # Root — runs both with concurrently
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8.0
- HeidiSQL (or any MySQL client)

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/Tesda-Registration-Noveleta-Training-Center.git
cd Tesda-Registration-Noveleta-Training-Center
```

### 2. Set up the database
Open HeidiSQL, connect to your MySQL server, open a new query tab, and run the entire contents of:
```
backend/src/config/schema.sql
```
This creates the database, all tables, and seeds default accounts.

### 3. Configure environment variables
Create `backend/.env`:
```env
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=tesda_registration
JWT_SECRET=your-secret-key-here
FRONTEND_URL=http://localhost:5173
```

### 4. Install all dependencies
```bash
npm run install:all
```

### 5. Run the development server
```bash
npm run dev
```
This starts both frontend and backend concurrently with color-coded output.

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |

---

## 🔑 Default Accounts

> ⚠️ Change these passwords immediately in a production environment.

| Role | Employee ID | Username | Password |
|---|---|---|---|
| Admin | 202500001 | admin | `Admin@12345` |
| Encoder | 202500002 | encoder1 | `Encoder@12345` |
| Encoder | 202500003 | encoder2 | `Encoder@12345` |

**Admin security question answer:** `(whatever was set during schema seed)`

---

## 🔌 API Endpoints

### Auth — `/api/auth`
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/detect` | Detect user role by identifier | Public |
| POST | `/login` | Login and receive JWT | Public |
| POST | `/logout` | Logout + audit log | 🔒 |
| POST | `/forgot-password/question` | Get admin security question | Public |
| POST | `/forgot-password/reset` | Reset admin password via security answer | Public |
| POST | `/reset-ticket/generate` | Generate encoder reset ticket | 🔒 Admin |
| POST | `/reset-ticket/use` | Use ticket to reset encoder password | Public |

### Registrants — `/api/registrants`
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/` | List registrants (paginated, searchable) | 🔒 |
| GET | `/:id` | Get single registrant | 🔒 |
| GET | `/stats` | Dashboard statistics | 🔒 |
| POST | `/` | Create new registrant | 🔒 |
| PUT | `/:id` | Update registrant | 🔒 |
| PATCH | `/:id/archive` | Archive registrant (soft delete) | 🔒 Admin |

### Admin — `/api/admin`
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/users` | List all users | 🔒 Admin |
| POST | `/users` | Create new user | 🔒 Admin |
| PATCH | `/users/:id/toggle` | Toggle user active status | 🔒 Admin |
| GET | `/audit-logs` | Get audit trail | 🔒 Admin |
| GET | `/courses` | List all courses | 🔒 |
| POST | `/courses` | Create new course | 🔒 Admin |
| POST | `/change-password` | Change own password | 🔒 |

---

## 🗄️ Database Schema

| Table | Description |
|---|---|
| `users` | Admin and Encoder accounts with role, security Q&A, reset tickets |
| `registrants` | Full TESDA MIS Form 03-01 learner data |
| `audit_logs` | System activity log with user, action, module, IP |
| `courses` | Course/qualification catalog |
| `backup_logs` | Backup history records |

---

## 📌 Notes

- Employee IDs follow the format: `YYYY#####` (4-digit year + 5-digit sequence)
- ULI numbers are auto-generated in the format `PH-IVA-XXXXXX`
- Reset tickets are 8 alphanumeric characters, valid for 24 hours, single-use
- All sensitive actions are logged to the audit trail with IP address
- Passwords are hashed with bcrypt (cost factor 10)

---

## 📄 License

This project is developed for **TESDA Noveleta Training Center** internal use.

---

<p align="center">
  Built with ❤️ for TESDA Noveleta Training Center
</p>
