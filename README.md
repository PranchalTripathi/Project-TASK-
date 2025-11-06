# SlotSwapper 🔄

A modern, full-stack peer-to-peer time-slot scheduling application built with the MERN stack. Users can create calendar events, mark them as swappable, and exchange time slots with other users through an intuitive swap request system.

## 🌟 Features

### Core Functionality
- **User Authentication**: Secure JWT-based signup/login system
- **Event Management**: Create, view, update, and delete calendar events
- **Slot Swapping**: Mark events as swappable and exchange with other users
- **Swap Requests**: Send, receive, accept, or reject swap proposals
- **Real-time Updates**: Dynamic UI updates after swaps and responses
- **Notifications**: Track incoming and outgoing swap requests

### Advanced Features
- **Smart Validation**: Prevents time conflicts and invalid swaps
- **Status Management**: Comprehensive event status tracking (BUSY, SWAPPABLE, SWAP_PENDING)
- **Swap History**: Complete audit trail of all completed swaps
- **Responsive Design**: Beautiful, mobile-first UI with Tailwind CSS
- **Protected Routes**: Secure navigation with authentication guards
- **Error Handling**: Comprehensive error management and user feedback

## 🏗️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Express Validator** - Input validation
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing

### Frontend
- **React.js** - UI library with hooks
- **React Router** - Client-side routing
- **React Query** - Server state management
- **React Hook Form** - Form handling
- **Tailwind CSS** - Utility-first styling
- **Axios** - HTTP client
- **React Hot Toast** - Notifications
- **Lucide React** - Icons
- **date-fns** - Date utilities

## 📁 Project Structure

```
TASK/
├── backend/                 # Node.js/Express backend
│   ├── models/             # MongoDB schemas
│   │   ├── User.js         # User model with auth
│   │   ├── Event.js        # Event/slot model
│   │   └── SwapRequest.js  # Swap request model
│   ├── routes/             # API endpoints
│   │   ├── auth.js         # Authentication routes
│   │   ├── events.js       # Event management routes
│   │   └── swaps.js        # Swap request routes
│   ├── middleware/         # Custom middleware
│   │   └── auth.js         # JWT authentication
│   ├── server.js           # Express server setup
│   ├── package.json        # Backend dependencies
│   └── .env.example        # Environment variables template
│
├── frontend/               # React frontend
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API services
│   │   ├── utils/          # Helper functions
│   │   ├── App.js          # Main app component
│   │   └── index.js        # React entry point
│   ├── package.json        # Frontend dependencies
│   └── tailwind.config.js  # Tailwind configuration
│
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd TASK/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/slotswapper
   JWT_SECRET=your_super_secret_jwt_key_here
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

   Server will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd TASK/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

   Frontend will run on `http://localhost:3000`

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/signup` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| GET | `/api/auth/me` | Get current user | Yes |
| PUT | `/api/auth/profile` | Update profile | Yes |
| POST | `/api/auth/change-password` | Change password | Yes |

### Event Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/events` | Get user's events | Yes |
| POST | `/api/events` | Create new event | Yes |
| GET | `/api/events/:id` | Get specific event | Yes |
| PUT | `/api/events/:id` | Update event | Yes |
| DELETE | `/api/events/:id` | Delete event | Yes |
| PATCH | `/api/events/:id/status` | Update event status | Yes |
| GET | `/api/events/swappable-slots` | Get swappable events | Yes |

### Swap Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/swap/request` | Create swap request | Yes |
| GET | `/api/swap/incoming` | Get incoming requests | Yes |
| GET | `/api/swap/outgoing` | Get outgoing requests | Yes |
| POST | `/api/swap/response/:id` | Accept/reject swap | Yes |
| POST | `/api/swap/cancel/:id` | Cancel swap request | Yes |
| GET | `/api/swap/history` | Get swap history | Yes |

## 🎯 Usage Guide

### 1. User Registration & Login
- Create an account with name, email, and secure password
- Login to access the dashboard

### 2. Managing Events
- **Create Events**: Add new calendar events with title, time, and details
- **Mark as Swappable**: Change event status to allow swapping
- **Edit/Delete**: Modify or remove your events (not during pending swaps)

### 3. Marketplace
- Browse swappable events from other users
- Filter by category, date range, or other criteria
- Send swap requests with optional messages

### 4. Swap Requests
- **Incoming**: Review and respond to requests from others
- **Outgoing**: Track your sent requests and their status
- **Accept/Reject**: Respond to requests with optional messages
- **Cancel**: Withdraw your pending requests

### 5. Notifications
- View all swap-related activities
- Track request status changes
- Access swap history

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds for password security
- **Input Validation**: Comprehensive server-side validation
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Configured cross-origin resource sharing
- **Helmet Security**: Security headers and protection middleware
- **Protected Routes**: Frontend route guards for authenticated access

## 🎨 UI/UX Features

- **Glassmorphism Design**: Modern glass-effect cards and components
- **Gradient Backgrounds**: Beautiful color gradients throughout
- **Responsive Layout**: Mobile-first design that works on all devices
- **Smooth Animations**: Subtle transitions and hover effects
- **Toast Notifications**: Real-time feedback for user actions
- **Loading States**: Elegant loading indicators
- **Status Badges**: Color-coded status indicators
- **Form Validation**: Real-time form validation with error messages

## 🧪 Testing

### Backend Testing
```bash
cd TASK/backend
npm test
```

### Frontend Testing
```bash
cd TASK/frontend
npm test
```

## 📦 Deployment

### Backend Deployment (Render/Heroku)
1. Set environment variables in your hosting platform
2. Ensure MongoDB connection string is configured
3. Deploy from the `backend` directory

### Frontend Deployment (Vercel/Netlify)
1. Set `REACT_APP_API_URL` to your backend URL
2. Build the project: `npm run build`
3. Deploy the `build` directory

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ServiceHive** for the technical challenge
- **MongoDB** for the excellent database solution
- **React Team** for the amazing frontend library
- **Tailwind CSS** for the utility-first styling approach
- **Express.js** for the robust backend framework

## 📞 Support

For support, email [your-email@example.com] or create an issue in the repository.

---

**Built with ❤️ for the ServiceHive Technical Challenge**