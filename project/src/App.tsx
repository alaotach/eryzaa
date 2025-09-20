import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { JobsProvider } from './contexts/JobsContext';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
};

// App Content Component (inside providers)
const AppContent: React.FC = () => {
  const { user } = useAuth();

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/jobs" element={
            <ProtectedRoute>
              <Jobs />
            </ProtectedRoute>
          } />
          
          {/* Temporary placeholders for other routes */}
          <Route path="/submit-job" element={
            <ProtectedRoute>
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Submit Job</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Coming soon...</p>
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/my-jobs" element={
            <ProtectedRoute>
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Jobs</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Coming soon...</p>
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Coming soon...</p>
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/ledger" element={
            <ProtectedRoute>
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ledger</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Coming soon...</p>
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/community" element={
            <ProtectedRoute>
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Community</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Coming soon...</p>
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/conditions" element={
            <ProtectedRoute>
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Smart Contract Conditions</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Coming soon...</p>
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute>
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Coming soon...</p>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </Layout>
    </Router>
  );
};

// Main App Component
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <JobsProvider>
          <AppContent />
        </JobsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;