# Pricing Optimizer MVP

A comprehensive web-based pricing optimization software that serves as a pricing calculator and rate card management system. This application allows users to create, store, and share rate cards with various pricing models, making pricing calculations accessible across an organization.

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18 with TypeScript for type safety and maintainability
- Tailwind CSS for modern, consistent styling
- React Router for navigation
- React Hook Form with Zod validation
- Axios for API communication
- Recharts for data visualizations
- TanStack Table for data grids

**Backend:**
- Node.js with Express.js REST API
- TypeScript for type safety
- SQLite with Prisma ORM (easily migrable to PostgreSQL)
- JWT for authentication
- Bcrypt for password hashing
- Express middleware for validation and security

**Development Tools:**
- Vite for fast development and building
- ESLint and Prettier for code quality
- Concurrently for running both frontend and backend

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager

### Installation

1. **Clone and install all dependencies:**
   ```bash
   git clone <your-repo-url>
   cd pricing-optimizer-mvp
   npm run install:all
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your configuration.

3. **Initialize the database:**
   ```bash
   cd server
   npm run db:generate
   npm run db:push
   ```

4. **Start the development servers:**
   ```bash
   # From the root directory
   npm run dev
   ```

   This will start:
   - Frontend server at http://localhost:3000
   - Backend API server at http://localhost:5000

## 📁 Project Structure

```
pricing-optimizer-mvp/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── auth/      # Authentication components
│   │   │   └── layout/    # Layout components (Navbar, Sidebar)
│   │   ├── pages/        # Page components (Dashboard, Login, etc.)
│   │   ├── services/     # API service functions
│   │   ├── types/        # TypeScript type definitions
│   │   ├── utils/        # Helper functions
│   │   └── styles/       # Global styles and Tailwind
│   ├── public/           # Static assets
│   └── package.json
├── server/                # Express backend
│   ├── src/
│   │   ├── controllers/  # Route controllers
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── utils/        # Helper functions
│   ├── prisma/
│   │   └── schema.prisma # Database schema
│   └── package.json
├── .env.example          # Environment variables template
└── package.json          # Root package.json for scripts
```

## 🔧 Available Scripts

### Root Directory
- `npm run dev` - Start both client and server in development mode
- `npm run build` - Build both client and server for production
- `npm run install:all` - Install dependencies for all packages
- `npm run lint` - Run ESLint on both client and server
- `npm run format` - Format code with Prettier

### Client
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code

### Server
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run db:migrate` - Run Prisma migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database

## 🗄️ Database Schema

The application uses a well-structured SQLite database with the following main entities:

- **Users** - Authentication and user management
- **RateCards** - Pricing structures owned by users
- **RateCardItems** - Individual items within rate cards
- **PricingTiers** - Tiered pricing for volume discounts

## 🔐 Authentication

The application implements JWT-based authentication with:
- User registration and login
- Password hashing with bcrypt
- Protected routes on both frontend and backend
- Token-based API authentication

## 🎨 UI/UX Design

The interface follows modern SaaS design principles:
- Clean, professional layout with Tailwind CSS
- Responsive design for desktop and mobile
- Consistent color scheme and typography
- Intuitive navigation with sidebar and top navigation

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Rate Cards
- `GET /api/rate-cards` - List user's rate cards
- `POST /api/rate-cards` - Create new rate card
- `GET /api/rate-cards/:id` - Get specific rate card
- `PUT /api/rate-cards/:id` - Update rate card
- `DELETE /api/rate-cards/:id` - Delete rate card

### Calculator
- `POST /api/calculator/calculate` - Calculate pricing
- `POST /api/calculator/bulk-calculate` - Bulk calculations

## 🚦 Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Database
DATABASE_URL="file:./dev.db"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=5000
NODE_ENV="development"

# Client Configuration
VITE_API_URL="http://localhost:5000"
```

## 🧪 Development

### Code Quality
The project maintains high code quality through:
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Consistent file and folder structure

### Security Features
- JWT token authentication
- Password hashing with bcrypt
- Input validation with express-validator
- Rate limiting and security headers
- CORS configuration

## 🚀 Production Deployment

### Build for Production
```bash
npm run build
```

### Environment Setup
1. Set `NODE_ENV=production` in your `.env` file
2. Update database URL for production database
3. Set secure JWT secret
4. Configure CORS for production domain

### Database Migration
For production, consider migrating from SQLite to PostgreSQL:
1. Update `DATABASE_URL` in schema.prisma
2. Run `npx prisma migrate dev`
3. Update environment variables

## 🗺️ Development Roadmap

### Phase 1: MVP Foundation ✅
- [x] Project structure and configuration
- [x] Authentication system
- [x] Basic UI components and layout
- [x] Database schema and API structure

### Phase 2: Core Features (Next)
- [ ] Rate card creation and management
- [ ] Pricing calculator functionality
- [ ] CSV import/export capabilities
- [ ] Basic reporting and analytics

### Phase 3: Advanced Features
- [ ] Advanced pricing models (tiered, volume, percentage)
- [ ] User roles and permissions
- [ ] Rate card sharing and collaboration
- [ ] Advanced analytics and reporting
- [ ] API documentation with Swagger

### Phase 4: Enhancement
- [ ] Advanced data visualizations
- [ ] Bulk operations and batch processing
- [ ] Integration capabilities
- [ ] Mobile-responsive optimizations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is proprietary. All rights reserved.

## 🆘 Support

For support or questions:
1. Check the documentation
2. Review existing issues
3. Create a new issue with detailed information

---

**Built with ❤️ for pricing optimization**