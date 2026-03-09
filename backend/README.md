# EngSoc Dashboard Backend

This is the backend API built with Express.js and TypeScript.

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

The server will start on [http://localhost:5000](http://localhost:5000)

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main application entry point
│   ├── routes/               # API route handlers
│   │   └── api.ts            # API routes
│   ├── middleware/           # Express middleware
│   │   └── errorHandler.ts  # Error handling middleware
│   └── config/               # Configuration files
├── dist/                     # Compiled JavaScript (generated)
├── .env                      # Environment variables
├── package.json              # Project dependencies
├── tsconfig.json             # TypeScript configuration
└── nodemon.json              # Nodemon configuration
```

## Available Scripts

- `npm run dev` - Run development server with hot reload
- `npm run build` - Build for production
- `npm start` - Run production server
- `npm run lint` - Lint the codebase

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check
- `GET /api/health` - API health check
- `GET /api/example` - Example endpoint

## Learn More

- [Express Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
