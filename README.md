# RateCardLab - Pricing Optimization Platform

A comprehensive web-based pricing optimization software that serves as a pricing calculator and rate card management system. This MVP application allows organizations to create, manage, and share rate cards with five distinct pricing models, making pricing calculations accessible across teams while maintaining security and performance.

## ✨ Features

### Core Functionality
- **User Authentication** - Secure JWT-based authentication with password hashing
- **Rate Card Management** - Create, edit, delete, and organize rate cards in folders
- **Five Pricing Models** - Tiered, Seat-based, Flat-rate, Cost-plus, and Subscription pricing
- **Price Calculator** - Interactive calculator with real-time pricing calculations
- **CSV Import/Export** - Bulk import rate cards and export calculations
- **Public Sharing** - Generate secure public links for rate card sharing
- **Folder Organization** - Hierarchical folder structure for rate card management

### Technical Highlights
- **Performance Optimized** - Database indexing, React.memo, lazy loading, pagination
- **Security Focused** - Rate limiting, input validation, security headers, audit logging
- **Responsive Design** - Modern UI/UX with Tailwind CSS and consistent design system
- **Type Safe** - Full TypeScript implementation across frontend and backend
- **Production Ready** - Comprehensive error handling, logging, and monitoring

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS with custom design system
- React Router with lazy loading
- React Hook Form with Zod validation
- Axios for API communication
- Recharts for data visualizations
- TanStack Table for data grids

**Backend:**
- Node.js with Express.js REST API
- TypeScript for type safety
- SQLite with Prisma ORM (production-ready for PostgreSQL migration)
- JWT authentication with bcrypt
- Rate limiting and security middleware
- Comprehensive audit logging

**Development & Deployment:**
- Vite for fast development and building
- ESLint and Prettier for code quality
- Concurrently for development orchestration
- Database migrations with Prisma

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ratecardlab
   ```

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```
   
   Update the `.env` files with your configuration (see Environment Variables section).

4. **Initialize the database:**
   ```bash
   cd server
   npm run db:generate
   npm run db:push
   cd ..
   ```

5. **Start the development servers:**
   ```bash
   npm run dev
   ```

   This starts both servers:
   - **Frontend:** http://localhost:3000
   - **Backend API:** http://localhost:5000

## 📋 Environment Variables

### Root `.env`
```env
NODE_ENV=development
```

### Server `.env` (server/.env)
```env
# Database Configuration
DATABASE_URL="file:./dev.db"

# JWT Configuration  
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=5000
NODE_ENV="development"

# Security Configuration (Optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
```

### Client `.env` (client/.env)
```env
# API Configuration
VITE_API_URL="http://localhost:5000"

# App Configuration (Optional)
VITE_APP_NAME="RateCardLab"
VITE_APP_VERSION="1.0.0"
```

## 🗄️ Database Schema

### Core Entities
- **Users** - Authentication and user management with security logging
- **Folders** - Hierarchical organization system for rate cards
- **RateCards** - Core pricing structures with support for 5 pricing models
- **RateCardItems** - Individual line items within rate cards
- **PricingTiers** - Volume-based pricing tiers for tiered pricing model
- **SecurityLogs** - Comprehensive audit trail for security events

### Pricing Models Supported
1. **Tiered Pricing** - Volume-based pricing with multiple tiers
2. **Seat-based Pricing** - Per-user or per-seat pricing
3. **Flat-rate Pricing** - Simple fixed pricing
4. **Cost-plus Pricing** - Cost with markup percentage
5. **Subscription Pricing** - Recurring subscription models

## 🔐 Security Features

- **JWT Authentication** with secure token management
- **Password Hashing** using bcrypt with salt rounds
- **Rate Limiting** with tiered protection (5 auth attempts, 100 general requests per 15 min)
- **Input Validation** using Zod schemas and express-validator
- **Security Headers** including CSP, HSTS, and security headers
- **Audit Logging** for all authentication and sensitive operations
- **SQL Injection Prevention** through Prisma ORM parameterized queries
- **XSS Prevention** with input sanitization and CSP headers

## ⚡ Performance Optimizations

- **Database Indexing** - Strategic indexes on high-query columns
- **React Optimization** - React.memo for expensive components
- **Code Splitting** - Lazy loading for all routes
- **Pagination** - Efficient data loading with pagination
- **Caching** - Strategic caching for repeated calculations
- **Bundle Optimization** - Vite's tree-shaking and code splitting

## 📁 Project Structure

```
ratecardlab/
├── client/                    # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── auth/         # Authentication components
│   │   │   ├── calculator/   # Calculator components
│   │   │   ├── dashboard/    # Dashboard widgets
│   │   │   ├── layout/       # Layout components (Navbar, Sidebar)
│   │   │   ├── rate-cards/   # Rate card management components
│   │   │   ├── sharing/      # Share functionality components
│   │   │   └── ui/           # Base UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Page components (Dashboard, Login, etc.)
│   │   ├── services/        # API service functions
│   │   ├── styles/          # Design system and global styles
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Helper functions and utilities
│   ├── public/              # Static assets
│   ├── .env.example         # Client environment template
│   └── package.json
├── server/                   # Express.js backend API
│   ├── src/
│   │   ├── controllers/     # Route controllers and business logic
│   │   ├── middleware/      # Express middleware functions
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Core business services
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Helper functions and utilities
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema definition
│   │   └── migrations/      # Database migration files
│   ├── .env.example         # Server environment template
│   └── package.json
├── .env.example             # Root environment template
├── package.json             # Root package.json with scripts
└── README.md                # This documentation
```

## 🔧 Available Scripts

### Root Directory Scripts
```bash
npm run dev              # Start both frontend and backend in development
npm run build            # Build both applications for production
npm run install:all      # Install dependencies for all packages
npm run lint             # Run ESLint on both client and server
npm run format           # Format all code with Prettier
npm run start            # Start production build
```

### Frontend Scripts (client/)
```bash
npm run dev              # Start Vite development server (port 3000)
npm run build            # Build optimized production bundle
npm run preview          # Preview production build locally
npm run lint             # Run ESLint on frontend code
npm run format           # Format frontend code with Prettier
```

### Backend Scripts (server/)
```bash
npm run dev              # Start development server with hot reload (port 5000)
npm run build            # Compile TypeScript to JavaScript
npm run start            # Start production server
npm run lint             # Run ESLint on backend code
npm run format           # Format backend code with Prettier

# Database Scripts
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema changes to database
npm run db:migrate       # Create and run database migrations
npm run db:studio        # Open Prisma Studio (database GUI)
npm run db:seed          # Seed database with sample data (if configured)
```

## 🔧 Complete API Reference

### Authentication Endpoints
```
POST   /api/auth/register     # User registration
POST   /api/auth/login        # User authentication  
GET    /api/auth/profile      # Get authenticated user profile
PUT    /api/auth/profile      # Update user profile
POST   /api/auth/refresh      # Refresh JWT token
POST   /api/auth/logout       # Logout user (optional)
```

### Folder Management
```
GET    /api/folders           # List user's folders
POST   /api/folders           # Create new folder
GET    /api/folders/:id       # Get folder details
PUT    /api/folders/:id       # Update folder
DELETE /api/folders/:id       # Delete folder
```

### Rate Card Management
```
GET    /api/rate-cards        # List rate cards (with pagination & filters)
POST   /api/rate-cards        # Create new rate card
GET    /api/rate-cards/:id    # Get specific rate card
PUT    /api/rate-cards/:id    # Update rate card
DELETE /api/rate-cards/:id    # Delete rate card
POST   /api/rate-cards/:id/duplicate  # Duplicate rate card
```

### Share Management
```
POST   /api/rate-cards/:id/share      # Generate share token
DELETE /api/rate-cards/:id/share      # Revoke share token  
GET    /api/shared/:token             # Get public rate card
```

### Import/Export
```
POST   /api/import/csv        # Import rate cards from CSV
GET    /api/rate-cards/:id/export/csv  # Export rate card as CSV
POST   /api/export/calculation-results # Export calculation results
```

### Calculator & Dashboard
```
POST   /api/calculator/calculate      # Perform pricing calculation
POST   /api/calculator/bulk-calculate # Bulk pricing calculations
GET    /api/dashboard/stats           # Get dashboard statistics
GET    /api/dashboard/recent-activity # Get recent activity
```

## 🧪 Development Guidelines

### Code Quality Standards
- **TypeScript** - Strict type checking enabled across all code
- **ESLint** - Enforced code style and quality rules
- **Prettier** - Consistent code formatting
- **React Best Practices** - Hooks, memo, error boundaries
- **Express Patterns** - Middleware, controllers, services architecture

### Testing Strategy
- **Unit Tests** - Jest for utility functions and services
- **Integration Tests** - API endpoint testing with Supertest
- **Component Tests** - React Testing Library for UI components
- **E2E Testing** - Cypress for critical user workflows (recommended)

### Security Best Practices
- **Input Validation** - All inputs validated with Zod schemas
- **Authentication** - JWT tokens with secure httpOnly cookies
- **Rate Limiting** - Tiered rate limiting for different endpoint types
- **SQL Injection** - Prisma ORM prevents SQL injection
- **XSS Prevention** - Input sanitization and Content Security Policy
- **Security Headers** - Helmet.js for security headers

## 🚀 Production Deployment

### Pre-deployment Checklist
1. **Environment Variables**
   - Set `NODE_ENV=production`
   - Use strong JWT secrets (32+ characters)
   - Configure production database URL
   - Set up CORS for production domain

2. **Database Setup**
   - Run `npm run db:migrate` for schema migration
   - Set up database backups
   - Configure connection pooling if needed

3. **Security Configuration**
   - Enable HTTPS in production
   - Configure rate limiting for production load
   - Set up monitoring and alerting
   - Review and update CORS settings

### Build and Deploy
```bash
# Build applications
npm run build

# Database migration (production)
cd server && npm run db:migrate

# Start production server
npm run start
```

### Database Migration to PostgreSQL
```bash
# 1. Update schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

# 2. Install PostgreSQL client
npm install pg @types/pg

# 3. Run migration
npx prisma migrate dev --name init

# 4. Update environment variable
DATABASE_URL="postgresql://user:password@host:port/database"
```

## 📊 Monitoring and Analytics

### Performance Metrics
- **Response Times** - Monitor API response times
- **Database Queries** - Track slow queries and optimize
- **Memory Usage** - Monitor memory consumption
- **Error Rates** - Track application errors and exceptions

### Security Monitoring
- **Authentication Attempts** - Monitor failed login attempts
- **Rate Limit Hits** - Track rate limiting violations
- **Suspicious Activity** - Monitor unusual access patterns
- **Security Events** - Review security audit logs

## 🔄 Development Workflow

### Feature Development
1. Create feature branch from `main`
2. Implement feature with tests
3. Run linting and formatting
4. Test locally with full stack
5. Submit pull request with description
6. Code review and merge

### Database Changes
1. Modify `schema.prisma`
2. Generate migration: `npx prisma migrate dev`
3. Test migration on development database
4. Update any affected API endpoints
5. Document schema changes

## 🆘 Troubleshooting

### Common Issues
- **Empty Screen**: Check browser console for React errors
- **API Connection**: Verify VITE_API_URL matches backend port
- **Database Errors**: Run `npx prisma db:push` to sync schema
- **Build Failures**: Clear node_modules and reinstall dependencies
- **Authentication Issues**: Verify JWT_SECRET is set correctly

### Debug Commands
```bash
# Check database connection
npx prisma studio

# View application logs
npm run dev # Check console output

# Database schema status
npx prisma migrate status

# Reset database (development only)
npx prisma migrate reset
```

## 🤝 Contributing

### Getting Started
1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Install dependencies: `npm run install:all`
4. Create a feature branch: `git checkout -b feature/your-feature-name`
5. Make your changes following the coding standards
6. Run tests: `npm run test` (if tests are configured)
7. Run linting: `npm run lint`
8. Format code: `npm run format`
9. Commit with clear messages
10. Push to your fork and submit a pull request

### Code Standards
- Follow TypeScript best practices
- Write meaningful commit messages
- Add comments for complex business logic
- Ensure all new features have proper error handling
- Update documentation for significant changes

## 📝 Changelog

### Version 1.0.0 - MVP Release
- ✅ Complete authentication system with JWT
- ✅ Five pricing models implementation
- ✅ Rate card CRUD operations
- ✅ Folder organization system
- ✅ CSV import/export functionality
- ✅ Public sharing with secure tokens
- ✅ Interactive price calculator
- ✅ Responsive UI with Tailwind CSS
- ✅ Performance optimizations
- ✅ Security features and audit logging
- ✅ Comprehensive error handling

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support & Documentation

### Getting Help
1. **Documentation**: Check this README and inline code documentation
2. **Common Issues**: Review the Troubleshooting section above
3. **API Documentation**: See the Complete API Reference section
4. **Development Setup**: Follow the Quick Start guide

### Reporting Issues
When reporting issues, please include:
- Operating system and Node.js version
- Steps to reproduce the issue
- Expected vs actual behavior
- Console error messages (if any)
- Screenshots (for UI issues)

### Contact
For questions about implementation or deployment:
- Review the existing documentation
- Check the troubleshooting section
- Create detailed issue reports with reproduction steps

---

**🎯 RateCardLab MVP - Built for pricing optimization excellence**

*This MVP provides a solid foundation for pricing optimization with room for advanced features like multi-user teams, advanced analytics, API integrations, and enterprise security features in future iterations.*