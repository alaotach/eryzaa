import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { JobsProvider } from './contexts/JobsContext';
import { Web3Provider } from './contexts/Web3Context';
import { RoleProvider } from './contexts/RoleContext';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import MyJobs from './pages/MyJobs';
import JobsLedger from './pages/JobsLedger';
import JobDetailsSimple from './pages/JobDetailsSimple';
import CreateJob from './pages/CreateJob';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Community from './pages/Community';
import SmartContracts from './pages/SmartContracts';
import SystemMonitoring from './pages/SystemMonitoring';
import JobsDisplay from './components/JobsDisplay';

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
          
          <Route path="/jobs/:jobId" element={
            <ProtectedRoute>
              <JobDetailsSimple />
            </ProtectedRoute>
          } />
          
          <Route path="/create-job" element={
            <ProtectedRoute>
              <CreateJob />
            </ProtectedRoute>
          } />
          
          {/* Main routes - each page shows real content */}
          <Route path="/submit-job" element={
            <ProtectedRoute>
              <CreateJob />
            </ProtectedRoute>
          } />
          
          <Route path="/my-jobs" element={
            <ProtectedRoute>
              <MyJobs />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          <Route path="/ledger" element={
            <ProtectedRoute>
              <JobsLedger />
            </ProtectedRoute>
          } />
          
          <Route path="/community" element={
            <ProtectedRoute>
              <Community />
            </ProtectedRoute>
          } />
          
          <Route path="/conditions" element={
            <ProtectedRoute>
              <SmartContracts />
            </ProtectedRoute>
          } />
          
          <Route path="/server" element={
            <ProtectedRoute>
              <SystemMonitoring />
            </ProtectedRoute>
          } />
          
          <Route path="/jobs-display" element={<JobsDisplay />} />
          
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
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
      <Web3Provider>
        <AuthProvider>
          <RoleProvider>
            <JobsProvider>
              <AppContent />
            </JobsProvider>
          </RoleProvider>
        </AuthProvider>
      </Web3Provider>
    </ThemeProvider>
  );
}

export default App;