# DevHub

A full-stack, GitHub-inspired code hosting platform. Users can sign up, create public or private repositories, upload and browse files, open and track issues, follow other developers, star repositories, and view an activity heatmap — backed by a secure REST API.

---

## Features

- **Authentication** — signup/login/logout with JWT stored in an `httpOnly` cookie; passwords hashed with bcrypt.
- **Repositories** — create, update, delete; toggle public/private visibility; per-user and global storage limits.
- **File management** — upload, list, view, and delete text files within a repository (stored in MongoDB).
- **Issues** — open, update, and close issues on repositories.
- **Social** — follow/unfollow users and star/unstar repositories.
- **Activity heatmap** — contribution-style calendar on user profiles.
- **Security hardening** — Helmet headers, CORS allow-list, request rate limiting, input validation, and ownership-based authorization on every mutating route.

---

## Tech Stack

| Layer    | Technology                                             |
| -------- | ------------------------------------------------------ |
| Frontend | React 19, Vite, React Router 7, Axios, react-hot-toast |
| Backend  | Node.js, Express 5, Mongoose                           |
| Database | MongoDB (Atlas)                                        |
| Auth     | JWT (HS256) via httpOnly cookies, bcryptjs             |
| Security | Helmet, CORS, custom rate limiter                      |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB connection string (e.g. MongoDB Atlas)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in the values below
npm start                 # runs: node index.js start
```

**`backend/.env`**

```env
PORT=3002
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>
JWT_SECRET_KEY=<a long random string, e.g. `openssl rand -hex 32`>
FRONTEND_URL=http://localhost:5173
# COOKIE_SAMESITE=lax        # set to "none" when frontend/backend are on different domains
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env      # set VITE_API_URL if not using the default
npm run dev
```

**`frontend/.env`**

```env
VITE_API_URL=http://localhost:3002
```

The app runs at `http://localhost:5173`.

---

## API Reference

Base URL: `VITE_API_URL` (default `http://localhost:3002`). Authenticated routes require the auth cookie.

### Users

| Method | Endpoint             | Auth | Description                |
| ------ | -------------------- | ---- | -------------------------- |
| POST   | `/signup`            | —    | Create an account          |
| POST   | `/login`             | —    | Log in (sets cookie)       |
| POST   | `/logout`            | —    | Log out (clears cookie)    |
| GET    | `/allUsers`          | ✓    | List users                 |
| GET    | `/userProfile/:id`   | ~    | Get a user profile         |
| PUT    | `/updateProfile/:id` | ✓    | Update own profile         |
| DELETE | `/deleteProfile/:id` | ✓    | Delete own account         |
| POST   | `/toggleFollow/:id`  | ✓    | Follow / unfollow a user   |
| POST   | `/toggleStar/:id`    | ✓    | Star / unstar a repository |

### Repositories

| Method | Endpoint               | Auth | Description                 |
| ------ | ---------------------- | ---- | --------------------------- |
| GET    | `/repo/all`            | —    | List public repositories    |
| GET    | `/repo/:id`            | ~    | Get repository by ID        |
| GET    | `/repo/name/:name`     | ~    | Find repositories by name   |
| GET    | `/repo/user/:userID`   | ~    | List a user's repositories  |
| POST   | `/repo/create`         | ✓    | Create a repository         |
| PUT    | `/repo/update/:id`     | ✓    | Update a repository (owner) |
| PATCH  | `/repo/toggle/:id`     | ✓    | Toggle visibility (owner)   |
| DELETE | `/repo/delete/:id`     | ✓    | Delete a repository (owner) |
| GET    | `/repo/:id/files`      | ~    | List files                  |
| GET    | `/repo/:id/file?path=` | ~    | Get a file's content        |
| POST   | `/repo/:id/files`      | ✓    | Upload files (owner)        |
| DELETE | `/repo/:id/file?path=` | ✓    | Delete a file (owner)       |

### Issues

| Method | Endpoint                 | Auth | Description                  |
| ------ | ------------------------ | ---- | ---------------------------- |
| GET    | `/repo/:id/issues`       | ~    | List issues for a repository |
| GET    | `/issue/:id`             | ~    | Get an issue                 |
| POST   | `/repo/:id/issue/create` | ✓    | Create an issue              |
| PUT    | `/issue/update/:id`      | ✓    | Update an issue (author)     |
| DELETE | `/issue/delete/:id`      | ✓    | Delete an issue (author)     |

`✓` = auth required · `~` = optional auth (affects visibility of private items) · `—` = public

### Storage limits

| Limit                | Value  |
| -------------------- | ------ |
| Max file size        | 100 KB |
| Max files per repo   | 50     |
| Max repo size        | 1 MB   |
| Max repos per user   | 10     |
| Max storage per user | 5 MB   |

---

## CLI (optional)

The backend also ships a small Git-like CLI for versioning a local directory:

```bash
node index.js init                 # initialise a repo (.apnaGit/)
node index.js add <file>           # stage a file
node index.js commit "<message>"   # commit staged changes
node index.js revert <commitID>    # revert to a commit
node index.js push                 # push commits to S3   (requires AWS config)
node index.js pull                 # pull commits from S3 (requires AWS config)
```

`push`/`pull` require AWS S3 credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`) and are optional — the web app and all other commands work without them.

---
