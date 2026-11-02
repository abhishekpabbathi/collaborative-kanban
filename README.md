# Collaborative Kanban

A collaborative task management application designed to help teams organize work, manage tasks, and coordinate their progress through a structured Kanban workflow.

## About the Project

Collaborative Kanban provides a centralized workspace for managing tasks and tracking their progress. It combines a modern frontend with a backend API and real-time communication to support a collaborative work environment.

The project focuses on simplicity, maintainability, and reliable task management.

## Key Features

- **Task Management** – Create, organize, update, and manage tasks.
- **Kanban Workflow** – Track work through an organized task management workflow.
- **Real-Time Communication** – Socket.IO integration for real-time application updates.
- **Authentication** – JWT-based authentication.
- **Secure Password Handling** – Password hashing with bcrypt.
- **Concurrent Updates** – Version-based checks to help prevent conflicting task updates.
- **Data Persistence** – SQLite database integration.
- **API Integration** – REST API powered by Express.js.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, JavaScript, Vite |
| Backend | Node.js, Express.js |
| Real-Time Communication | Socket.IO |
| Database | SQLite, Prisma tooling |
| Authentication | JSON Web Tokens (JWT) |
| Password Security | bcrypt |
| Version Control | Git, GitHub |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |

## Project Structure

```text
collaborative-kanban/
│
├── backend/
│   ├── prisma/
│   ├── src/
│   │   └── server.js
│   ├── package.json
│   └── prisma7.config.ts
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── index.html
│
├── database/
├── docs/
│   ├── API.md
│   └── WEBSOCKET.md
│
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

Make sure the following tools are installed:

- Node.js
- npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/abhishekpabbathi/collaborative-kanban.git
cd collaborative-kanban
```

### 2. Set Up the Backend

```bash
cd backend
npm install
```

Configure the backend environment variables in `backend/.env`.

### 3. Set Up the Frontend

Open another terminal:

```bash
cd frontend
npm install
```

Configure the frontend environment variables in `frontend/.env`.

### 4. Run the Application

Start the backend:

```bash
cd backend
npm start
```

Start the frontend in a separate terminal:

```bash
cd frontend
npm run dev
```

Open the local URL provided by Vite in your browser.

## Environment Configuration

Environment variables are used to keep application configuration separate from source code.

### Backend

| Variable | Purpose |
|---|---|
| `PORT` | Backend server port |
| `NODE_ENV` | Application environment |
| `JWT_SECRET` | Secret used for JWT signing and verification |
| `DB_PATH` | SQLite database file location |
| `FRONTEND_URL` | Allowed frontend origin |

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend API base URL |
| `VITE_SOCKET_URL` | Backend Socket.IO server URL |

**Security Notice**

- Never commit `.env` files to GitHub.
- Never publish passwords, API keys, JWT secrets, access tokens, or database credentials.
- Use secure environment variables in deployment platforms.
- Keep `.env.example` limited to variable names and safe placeholder values.
- Generate a unique, strong `JWT_SECRET` for production.

## Deployment

The application uses separate hosting platforms for its frontend and backend.

- **Frontend:** Vercel
- **Backend:** Render

Production environment variables should be configured through the respective platform dashboards rather than committed to the repository.

## Documentation

Additional technical documentation is available in the `docs/` directory:

- `docs/API.md` – API documentation.
- `docs/WEBSOCKET.md` – WebSocket communication documentation.

## Project Purpose

This project demonstrates the integration of frontend development, backend services, authentication, database management, and real-time communication in a collaborative task management application.

It reflects an effort to build a structured, maintainable application while understanding how different technologies work together in a practical software project.

## Author

**Abhishek Pabbathi**

GitHub: [@abhishekpabbathi](https://github.com/abhishekpabbathi)

---

*Built with a focus on collaboration, clarity, and continuous learning.*
