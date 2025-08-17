# Schedasito Platform

This repository contains a minimal full stack implementation for managing website projects. The frontend is built with **React** + **Vite** and the backend uses **FastAPI** with **SQLModel**.

## Backend

1. Install dependencies:

```bash
pip install -r backend/requirements.txt
```

2. Run the API server:

```bash
uvicorn backend.main:app --reload
```

The API exposes `/projects/` and `/tasks/` endpoints backed by a SQLite database populated with sample data on startup.

## Frontend

1. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

The frontend expects the API to run on `http://localhost:8000`. You can change the base URL by defining the `VITE_API_URL` environment variable.

## Available Scripts

- `npm run dev` – start the development server with hot reload.
- `npm run build` – create a production build in the `dist` folder.
- `npm run lint` – run ESLint.
