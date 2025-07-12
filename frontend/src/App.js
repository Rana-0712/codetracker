import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import Layout from './components/Layout';
import Home from './pages/Home';
import ProblemPage from './pages/ProblemPage';
import TopicPage from './pages/TopicPage';
import AddTopicPage from './pages/AddTopicPage';
import SettingsPage from './pages/SettingsPage';
import { AuthProvider } from './context/AuthContext';

const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing Publishable Key")
}

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/problem/:id" element={<ProblemPage />} />
              <Route path="/topics/:slug" element={<TopicPage />} />
              <Route path="/add-topic" element={<AddTopicPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </ClerkProvider>
  );
}

export default App;