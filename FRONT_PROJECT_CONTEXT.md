# FRONT_PROJECT_CONTEXT.md
> **Purpose:** This document is the canonical AI memory/handoff artifact for the `frontend_final` project. An AI assistant that reads this file end-to-end can immediately continue development, security auditing, debugging, or deployment of the project without reading the raw source code.
>
> **Generated:** 2026-06-22 | **Confidence:** High — derived from direct source-file analysis, updated after Chatbot integration, Password flows, and Recommendation Engine addition.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Full Tech Stack](#2-full-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [System Architecture](#4-system-architecture)
5. [Frontend Analysis](#5-frontend-analysis)
6. [API Documentation](#6-api-documentation)
7. [Authentication & Security](#7-authentication--security)
8. [Infrastructure & Deployment](#8-infrastructure--deployment)
9. [AI / ML Services](#9-ai--ml-services)
10. [Dependencies Analysis](#10-dependencies-analysis)
11. [Environment Variables Reference](#11-environment-variables-reference)
12. [Development Workflow](#12-development-workflow)
13. [Known Issues & Technical Debt](#13-known-issues--technical-debt)
14. [Suggested Improvements](#14-suggested-improvements)
15. [AI Context Summary](#15-ai-context-summary)

---

## 1. Project Overview

### What the System Does
**Galala Uni** is a university student portal and admission gateway — a static, pure-HTML/CSS/JavaScript front-end web application that connects enrolled students and prospective applicants to their academic world. It acts as a thin client that communicates with remote REST APIs (`api.galalabot.app` for main university operations, and `soc.galalabot.app` for the Course Recommendation Engine).

### Main Business / Domain Purpose
- **University of Galala** (Egypt) student-facing portal.
- Serves two distinct user populations:
  1. **Guests / Prospective Students** — unauthenticated users who can talk to an Admission Chatbot to learn about deadlines, scholarships, visa requirements, and tuition.
  2. **Enrolled Students (authenticated)** — students who log in via Bearer-token authentication to access their academic profile, GPA tracker, vehicle campus-access permit system, password management, course recommendations, and an AI-powered academic assistant chatbot.

### Core Features
| Feature | Target User | Auth Required |
|---|---|---|
| Landing page / journey selector | Guest + Student | No |
| AI Admission Chatbot | Guest | No |
| Student Login / Forgot / Reset Password | Student | No (initiates auth) |
| Student Dashboard (GPA, credits, identity card) | Student | Yes |
| Change Password | Student | Yes |
| AI Academic Assistant Chatbot | Student | Yes |
| Vehicle Campus Access Permit (request, view, history) | Student | Yes |
| AI Course Recommendation Engine | Student | Yes |
| Help & Support page | Student | Yes |

### User Roles
| Role | Description | Access |
|---|---|---|
| **Guest** | Unauthenticated visitor | Landing page + Public Chatbot |
| **Student** | Authenticated via Bearer token stored in `sessionStorage` | Full portal (Dashboard, Chatbot, Vehicle, Help, Recommendations, Password Mgmt) |

There are **no admin roles** in this frontend — administration is backend-only.

### High-Level Architecture Summary
- **Type:** Multi-page static web application (MPA). No JavaScript framework (React, Vue, etc.). No build step, no bundler, no package.json.
- **Hosting model inferred:** Static file server / CDN serving HTML/CSS/JS directly. The backend is a remote API at a different domain.
- **Module system:** Native ES Modules (`type="module"`).
- **Auth model:** Bearer-token SPA pattern — token lives in `sessionStorage`.
- **API communication:** Handled by a centralized `api.js` utility that manages `fetch()` with `Authorization: Bearer <token>` headers and standardized error handling.
- **Chatbot:** Connects to the live remote API (`api.galalabot.app/api/v1/student/chats` and `/guest/chat/messages`).
- **Recommendation Engine:** Connects to a separate dockerized Python Flask backend hosted on `soc.galalabot.app` (using Nginx to proxy port 8055).

---

## 2. Full Tech Stack

### Frontend
| Layer | Technology | Notes |
|---|---|---|
| Structure | HTML5 | Semantic, WCAG-aware |
| Styling | Vanilla CSS (custom design system) | CSS custom properties (tokens), no framework |
| Logic | Vanilla JavaScript (ES2020+) | Native ES Modules (`import`/`export`) |
| API Client | `api.js` Utility | Centralized fetch wrapper + XSS escaping |
| Fonts | Inter (body/head) + self-hosted woff2 subset | Loaded from `css/fonts/fonts.css` |
| Icons | Inline SVG (Heroicons style) | No external icon library |
| Animations | CSS keyframes + transitions | `@keyframes slide-up-fade`, `msg-in`, `typing-bounce`, `pulse-dot`, `float-scroll` |

### Backend (Remote — Not in this repo)
| Layer | Technology | Notes |
|---|---|---|
| Main API Base | `https://api.galalabot.app/api/v1` | Core university endpoints (auth, profiles, chatbots, vehicles) |
| Rec API Base | `https://soc.galalabot.app` | Course Recommendation AI Engine (Flask + ChromaDB + Ollama) |
| Auth | Bearer Token (JWT-style) | Issued at `/student/login/verify-otp`, invalidated at `/student/logout` |

### Deployment Stack (Inferred)
| Component | Details |
|---|---|
| Hosting | Static file server (no server-side rendering) |
| Domain inferred | `galalabot.app` (shared with API) |
| Recommendation Proxy | Nginx reverse proxy on `soc.galalabot.app` providing CORS and mapping paths to Docker |

---

## 3. Repository Structure

```
frontend_final/
├── index.html                      ← ENTRY POINT: Landing page (public)
├── gu_logo.png                     
├── pages/
│   ├── login.html                  ← Student login form
│   ├── forgot-password.html        ← Password recovery
│   ├── reset-password.html         ← Password reset (via token)
│   ├── change-password.html        ← Authenticated password change
│   ├── dashboard.html              ← Authenticated student home
│   ├── chatbot.html                ← AI Academic Assistant
│   ├── chatbot-public.html         ← Admission Chatbot
│   ├── vehicle.html                ← Vehicle permit management
│   ├── recommendations.html        ← AI Course Recommendations Engine
│   └── help.html                   ← Help & Support
├── js/
│   ├── api.js                      ← ⭐ CENTRAL API CLIENT: fetch wrapper, auth headers, escapeHtml()
│   ├── config.js                   ← Central configuration (URLs)
│   ├── nav.js                      ← Navigation & logout logic
│   ├── login.js                    ← Login + OTP handling
│   ├── forgot-password.js          
│   ├── reset-password.js           
│   ├── change-password.js          
│   ├── dashboard.js                ← Profile hydration
│   ├── vehicle.js                  ← Vehicle state machine
│   ├── chatbot.js                  ← Unified chatbot UI + API connectivity
│   └── recommendations.js          ← Recommendation Engine logic + Profile storage
├── css/
│   ├── globals.css                 ← ⭐ DESIGN SYSTEM
│   ├── dashboard.css               
│   ├── landing.css                 
│   ├── chatbot.css                 
│   └── fonts/                      
└── .git/
```

### Key File Roles at a Glance
| File | Role |
|---|---|
| `js/api.js` | Single source of truth for making authenticated requests and escaping HTML to prevent XSS. |
| `js/config.js` | Exports `APP_CONFIG` containing `API_BASE_URL` and endpoint paths. |
| `js/chatbot.js` | Powers both authenticated and public chatbots, handles streaming/delay simulation, and calls backend APIs. |
| `js/recommendations.js` | Connects to `soc.galalabot.app` to provide tailored course recommendations via LLM. |

---

## 4. System Architecture

### High-Level Flow

```mermaid
graph TD
    subgraph "Client (Browser)"
        A[index.html] -->|Guest| B[chatbot-public.html]
        A -->|Student| C[login.html]
        C -->|POST| D{api.galalabot.app}
        D -->|token| E[sessionStorage]
        E --> F[dashboard.html]
        F --> G[chatbot.html]
        F --> H[vehicle.html]
        F --> I[recommendations.html]
        F --> J[change-password.html]
    end

    subgraph "Main Backend"
        D
        K[/student/profile]
        L[/student/chats]
    end

    subgraph "Recommendation Backend"
        M[soc.galalabot.app]
    end

    F -->|GET + Bearer| K
    G -->|POST + Bearer| L
    I -->|POST| M
```

---

## 5. Frontend Analysis

### Central Utilities
- **`api.js`**: Introduced to deduplicate `escapeHtml()` and standardize all `fetch` calls. It automatically attaches the `Authorization: Bearer` header, checks `response.ok`, and throws standardized errors if the API fails.

### Pages & Logic
- **Password Management**: Full suite added (`forgot-password`, `reset-password`, `change-password`). Integrates with `api.js` to communicate with the backend.
- **Chatbot (`chatbot.js`)**: Now points to real endpoints (`/student/chats` and `/guest/chat/messages`). It sends `{ message: text }` and expects a `{ success, data: { response } }` format.
- **Course Recommendations (`recommendations.html` / `recommendations.js`)**: 
  - Gathers user's major, semester, and interests.
  - Stores this profile locally in `localStorage` (`rec_profile`).
  - Calls `https://soc.galalabot.app/api/v1/recommend` and `/api/v1/ask-course`.
  - Supports detailed markdown/HTML responses from the LLM.
  - The offline health check was removed to prevent browser CORS confusion; relies purely on fetch error catching.

---

## 6. API Documentation

> **Main Base URL:** `https://api.galalabot.app/api/v1`
> **Rec Base URL:** `https://soc.galalabot.app`

### Main Endpoints (Configured in `config.js`)
- `POST /student/login` + `POST /student/login/verify-otp` (Auth)
- `POST /student/logout`
- `GET /student/profile`
- `POST /student/forgot-password` + `POST /student/forgot-password/reset`
- `POST /student/change-password`
- `GET /student/vehicle` + `POST /student/vehicle-requests` + `GET /student/vehicle-requests/history`
- `POST /student/chats` (Authenticated Chat)
- `POST /guest/chat/messages` (Public Chat)

### Recommendation Engine (via `soc.galalabot.app`)
- **`POST /api/v1/recommend`**: Accepts `{ student_profile, context }`
- **`POST /api/v1/ask-course`**: Accepts `{ question, context }`

---

## 7. Authentication & Security

### Security Controls Applied
| Control | Details |
|---|---|
| **XSS Prevention** | `api.js` exposes `escapeHtml()`. Used exclusively when rendering API data into `innerHTML`. Text content uses `.textContent`. |
| **Global Config** | `config.js` uses `Object.freeze()`. |
| **Auth Guards** | `dashboard.js`, `vehicle.js`, `change-password.js`, `recommendations.js` check token presence and redirect to `login.html` if missing. |
| **CORS** | The Nginx config on `soc.galalabot.app` strictly handles preflight `OPTIONS` and appends `Access-Control-Allow-Origin: *` to responses. |

---

## 8. Infrastructure & Deployment

### Nginx Proxy for Recommendations
The recommendation engine is deployed via Docker on a DigitalOcean droplet (46.101.138.186). To avoid **Mixed Content** errors (since `galalabot.app` is HTTPS), the engine is proxied through `soc.galalabot.app` over HTTPS using Nginx with specific CORS headers enabled for `/api/v1/recommend` and `/api/v1/ask-course`.

---

## 9. Dependencies Analysis
> **No package.json exists.** All code is vanilla browser JavaScript.
> - Uses native `fetch` API.
> - Relies on `sessionStorage` for Auth Tokens.
> - Relies on `localStorage` for Course Recommendation profiles (`rec_profile`).

---

## 10. Development Workflow
To run locally:
1. Use VS Code Live Server or `python -m http.server 8080`.
2. Ensure you access via HTTP to test, but note that calls to `soc.galalabot.app` will be HTTPS.

---

## 11. Known Issues & Technical Debt
- **No Token Refresh Mechanism**: Expired tokens simply cause a 401 error, clearing session and forcing a hard re-login.
- **Frontend Rate Limiting**: The 5-attempt brute-force protection on the login page is purely client-side. The backend must enforce true rate limiting.
- **Hardcoded Recommendation LLM Delays**: `recommendations.js` simulates typing delays; this could be transitioned to Server-Sent Events (SSE) if the Python backend supports streaming in the future.

*End of FRONT_PROJECT_CONTEXT.md — Last updated: 2026-06-22.*
