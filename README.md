# BuildWise

BuildWise is a full-stack platform for AI-assisted code scanning, team collaboration, pricing requests, and admin-led plan management. The project combines a FastAPI backend with a React/Vite frontend and includes support for authentication, billing workflows, email notifications, and deployment-ready configuration.

## Overview

BuildWise provides:
- AI-powered code analysis and repository scanning
- Team and project management workflows
- Customer and admin custom pricing request handling
- Razorpay-based payment flow for custom plans
- Email notifications for request, approval, payment, and confirmation events
- A modern frontend experience for customers and administrators

## Tech Stack

### Backend
- Python 3.10+
- FastAPI
- Uvicorn
- PostgreSQL
- SQLAlchemy
- JWT and bcrypt-based authentication
- Razorpay integration
- SMTP-based email service

### Frontend
- React 19
- Vite
- React Router
- Tailwind CSS
- ESLint

## Project Structure

- api/ - FastAPI routers and application entrypoints
- core/ - business logic, scanning, pricing, reporting, and services
- db/ - SQL schema files for database setup
- utils/ - shared helpers such as auth, email, token, and dependency utilities
- buildwise-frontend/ - React frontend application
- cli/ - terminal-based command interface

## Prerequisites

Before running the project locally, make sure you have:
- Python 3.10 or newer
- Node.js 18 or newer
- PostgreSQL running locally or remotely
- A package manager such as pip and npm

## Backend Setup

1. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   ```

2. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a .env file in the project root with the required configuration values, including:
   ```env
   SECRET_KEY=your-secret-key
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=buildwise
   DB_USER=postgres
   DB_PASSWORD=your-password
   FRONTEND_URL=http://localhost:5173
   BACKEND_URL=http://localhost:8000
   ```

4. Create the required database tables using the SQL files in the db/ directory.

5. Start the backend:
   ```bash
   python -m uvicorn api.main:app --reload
   ```

The API will be available at:
- http://localhost:8000
- Swagger UI: http://localhost:8000/docs

## Frontend Setup

1. Change to the frontend directory:
   ```bash
   cd buildwise-frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at:
- http://localhost:5173

## Key Features

### Authentication and Access Control
- Secure login for users and admins
- JWT-based session handling
- Role-based access for administrative workflows

### Custom Pricing Workflow
- Customer can submit pricing requests
- Admin can review, approve, reject, and prepare payment plans
- Razorpay order creation and payment confirmation flow

### Notifications
- Automated customer and admin emails for request lifecycle events
- Payment and approval notifications

### Code and Project Intelligence
- Repository scanning and issue analysis modules
- Project and team management services

## Running the Main CLI

You can also run the repository CLI entrypoint:
```bash
python main.py
```

## Deployment Notes

The repository includes deployment-oriented documentation for both backend and frontend hosting:
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [DEPLOY_READY.md](DEPLOY_READY.md)
- [RAILWAY_SETUP.md](RAILWAY_SETUP.md)
- [buildwise-frontend/README.md](buildwise-frontend/README.md)

## Documentation

Additional project documentation is available in the repository root:
- [API_ENDPOINTS_REFERENCE.md](API_ENDPOINTS_REFERENCE.md)
- [CUSTOM_PRICING_IMPLEMENTATION_SUMMARY.md](CUSTOM_PRICING_IMPLEMENTATION_SUMMARY.md)
- [COMPLETE_TESTING_GUIDE.md](COMPLETE_TESTING_GUIDE.md)
- [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md)
- [RENEWAL_SYSTEM_GUIDE.md](RENEWAL_SYSTEM_GUIDE.md)

## Notes

- Keep secrets out of source control; use environment variables for credentials and API keys.
- For production, update OAuth redirect URLs and payment/email configuration before deployment.
- Review the deployment documents before publishing the app.

- done.
