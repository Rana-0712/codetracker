# CodeTracker - MERN Stack

A full-stack MERN application for tracking and organizing coding practice problems with Chrome extension support.

## 🚀 Tech Stack

- **Frontend**: React.js with React Router
- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: Clerk
- **Styling**: Tailwind CSS
- **Extension**: Chrome Extension with Manifest V3

## 📁 Project Structure

```
codetracker/
├── backend/                 # Express.js API server
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Authentication middleware
│   └── server.js           # Main server file
├── frontend/               # React.js application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context
│   │   └── App.js          # Main App component
│   └── public/             # Static assets
├── chrome_ext/             # Chrome extension
│   ├── manifest.json       # Extension manifest
│   ├── popup.html          # Extension popup
│   ├── popup.js            # Popup logic
│   └── content.js          # Content script
└── package.json            # Root package.json
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account or local MongoDB
- Clerk account for authentication

### 1. Clone the repository
```bash
git clone <repository-url>
cd codetracker
```

### 2. Install dependencies
```bash
npm run install-all
```

### 3. Environment Setup

#### Backend (.env)
```env
PORT=5000
MONGO_URI=mongodb+srv://duttarana189:wWBbmR3TAG36HZrj@cluster0.u2z6t.mongodb.net/lms
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
CLERK_SECRET_KEY=sk_test_18•••••h2J
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_YXdhaXRlZC1sYW1wcmV5LTI5LmNsZXJrLmFjY291bnRzLmRldiQ
```

### 4. Start the application
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend application on http://localhost:3000

## 🔧 Features

### Web Application
- ✅ User authentication with Clerk
- ✅ Problem tracking and management
- ✅ Topic-based organization
- ✅ Problem completion tracking
- ✅ Notes and tagging system
- ✅ Responsive design with Tailwind CSS

### Chrome Extension
- ✅ Automatic problem detection on coding platforms
- ✅ One-click problem saving
- ✅ Local storage with server sync
- ✅ Support for LeetCode, GeeksForGeeks, InterviewBit, CodeChef, Codeforces

### Supported Platforms
- LeetCode
- GeeksForGeeks
- InterviewBit
- CodeChef
- Codeforces

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Topics
- `GET /api/topics` - Get all topics
- `POST /api/topics` - Create new topic
- `GET /api/topics/:slug` - Get topic by slug
- `GET /api/topics/:slug/problems` - Get problems for topic

### Problems
- `GET /api/problems` - Get all problems
- `POST /api/problems` - Create new problem
- `GET /api/problems/:id` - Get problem by ID
- `PATCH /api/problems/:id` - Update problem
- `DELETE /api/problems/:id` - Delete problem
- `POST /api/problems/check` - Check if problem exists

## 🔌 Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `chrome_ext` folder
4. The extension will appear in your browser toolbar

## 🚀 Deployment

### Backend Deployment
1. Deploy to platforms like Heroku, Railway, or DigitalOcean
2. Update environment variables
3. Ensure MongoDB connection string is correct

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy to Netlify, Vercel, or similar platforms
3. Update API URLs in environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

This project is licensed under the MIT License.