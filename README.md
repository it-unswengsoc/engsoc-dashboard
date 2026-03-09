# EngSoc Dashboard

This is the Official GitHub Repository for UNSW Engineering Society's Dashboard

A full-stack application with Next.js React frontend and Express.js backend.

## Project Structure

```
engsoc-dashboard/
├── frontend/          # Next.js React application
│   ├── src/
│   │   └── app/      # Next.js App Router
│   ├── public/       # Static assets
│   └── package.json
├── backend/          # Express.js API server
│   ├── src/
│   │   ├── routes/   # API routes
│   │   └── middleware/
│   └── package.json
└── README.md         # This file
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm installed
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd engsoc-dashboard
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
npm install
```

### Running the Application

#### Development Mode

1. Start the backend server (in terminal 1):
```bash
cd backend
npm run dev
```
The backend will run on http://localhost:5000

2. Start the frontend (in terminal 2):
```bash
cd frontend
npm run dev
```
The frontend will run on http://localhost:3000

#### Production Build

1. Build the backend:
```bash
cd backend
npm run build
npm start
```

2. Build the frontend:
```bash
cd frontend
npm run build
npm start
```

## Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **CSS Modules** - Component-scoped styling

### Backend
- **Express.js** - Web framework for Node.js
- **TypeScript** - Type-safe JavaScript
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security middleware
- **Morgan** - HTTP request logger

## API Endpoints

- `GET /health` - Health check
- `GET /api/health` - API health check
- `GET /api/example` - Example endpoint

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Backend (.env)
```
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## Development

- Frontend hot-reload is enabled in development mode
- Backend uses nodemon for automatic restart on file changes
- TypeScript provides type checking for both frontend and backend

## Learn More

- [Frontend Documentation](./frontend/README.md)
- [Backend Documentation](./backend/README.md)

## License

ISC
