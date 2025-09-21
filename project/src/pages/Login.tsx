import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Mail, Lock, User, Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCoreWallet } from '../hooks/useCoreWallet';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'user' | 'provider'>('user');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { login, register } = useAuth();
  const { connect: connectWallet, isLoading: walletLoading } = useCoreWallet();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (isLogin) {
        const result = await login(email, password);
        if (result.success) {
          setSuccess('Login successful!');
          navigate('/dashboard');
        } else {
          setError(result.message || 'Login failed');
        }
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        
        const result = await register({
          name,
          email,
          password,
          confirmPassword
        });
        
        if (result.success) {
          setSuccess('Registration successful! Welcome to Eryza!');
          navigate('/dashboard');
        } else {
          setError(result.message || 'Registration failed');
        }
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWalletConnect = async () => {
    try {
      await connectWallet();
      // After wallet connection, you might want to auto-login or redirect
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-blue-900 to-dark-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Link to="/" className="inline-flex items-center space-x-2">
            <div className="w-12 h-12 bg-neon-blue rounded-lg flex items-center justify-center">
              <Zap size={28} className="text-white" />
            </div>
            <span className="text-3xl font-bold text-white">Eryza</span>
          </Link>
          <p className="text-gray-300 mt-2">Decentralized AI Compute Network</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-8 bg-dark-card/80 backdrop-blur-sm border-gray-600">
            {/* Toggle Login/Signup */}
            <div className="flex mb-6 p-1 bg-gray-700 rounded-lg">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  isLogin 
                    ? 'bg-neon-blue text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  !isLogin 
                    ? 'bg-neon-blue text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name - only show for registration */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-neon-blue focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-neon-blue focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-neon-blue focus:border-transparent"
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password - only show for registration */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={!isLogin}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-neon-blue focus:border-transparent"
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="p-3 bg-green-500/20 border border-green-500 rounded-lg">
                  <p className="text-green-400 text-sm">{success}</p>
                </div>
              )}

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('user')}
                    className={`flex items-center justify-center space-x-2 p-3 rounded-lg border transition-colors ${
                      role === 'user'
                        ? 'border-neon-blue bg-neon-blue bg-opacity-20 text-neon-blue'
                        : 'border-gray-600 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <User size={20} />
                    <span>User</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('provider')}
                    className={`flex items-center justify-center space-x-2 p-3 rounded-lg border transition-colors ${
                      role === 'provider'
                        ? 'border-neon-blue bg-neon-blue bg-opacity-20 text-neon-blue'
                        : 'border-gray-600 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <Shield size={20} />
                    <span>Provider</span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                loading={loading}
                className="w-full py-3 text-base font-medium"
              >
                {isLogin ? 'Login' : 'Sign Up'}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-gray-600"></div>
              <span className="px-4 text-sm text-gray-400">or</span>
              <div className="flex-1 border-t border-gray-600"></div>
            </div>

            {/* Core Wallet Connect */}
            <Button
              onClick={handleWalletConnect}
              loading={walletLoading}
              variant="outline"
              className="w-full py-3 text-base font-medium border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-white"
            >
              <Shield size={20} className="mr-2" />
              Connect with Core Wallet
            </Button>

            {/* Forgot Password */}
            {isLogin && (
              <div className="mt-6 text-center">
                <button className="text-sm text-neon-blue hover:text-accent-blue">
                  Forgot your password?
                </button>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Back to Landing */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-center"
        >
          <Link 
            to="/" 
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Back to Home
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;