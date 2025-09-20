import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, Users, Download, Terminal, Brain, Cpu } from 'lucide-react';
import ParticleBackground from '../components/UI/ParticleBackground';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';

const Landing: React.FC = () => {
  const features = [
    {
      icon: Terminal,
      title: 'Direct SSH Access',
      description: 'Secure remote terminal access to rental servers via ZeroTier VPN. Perfect for development and system administration.',
      link: '/login'
    },
    {
      icon: Brain,
      title: 'AI Model Training',
      description: 'Deploy and train ML models using Docker containers. Full support for PyTorch, TensorFlow, and custom frameworks.',
      link: '/login'
    },
    {
      icon: Cpu,
      title: 'Edge Computing',
      description: 'Distribute compute jobs across multiple GPU nodes with automatic load balancing and real-time monitoring.',
      link: '/login'
    }
  ];

  const downloads = [
    {
      platform: 'Linux x64',
      icon: '🐧',
      description: 'Full automatic installation with Docker and ZeroTier',
      filename: 'eryzaa-x86_64-unknown-linux-gnu.tar.gz',
      available: true
    },
    {
      platform: 'Windows x64',
      icon: '🪟',
      description: 'Manual Docker Desktop and ZeroTier installation required',
      filename: 'eryzaa-windows-x64.zip',
      available: false
    },
    {
      platform: 'macOS',
      icon: '🍎',
      description: 'Support for Intel and Apple Silicon processors',
      filename: 'eryzaa-macos.dmg',
      available: false
    }
  ];

  const stats = [
    { label: 'Access Types', value: '3' },
    { label: 'Global Reach', value: '∞' },
    { label: 'Network Nodes', value: '24/7' },
    { label: 'Blockchain Ready', value: '✓' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-blue-900 to-dark-bg text-white relative overflow-hidden">
      <ParticleBackground />
      
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-neon-blue rounded-lg flex items-center justify-center">
            <Zap size={24} className="text-white" />
          </div>
          <span className="text-2xl font-bold">Eryzaa</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <a href="#downloads" className="text-gray-300 hover:text-white transition-colors">
            Downloads
          </a>
          <a href="#features" className="text-gray-300 hover:text-white transition-colors">
            Features
          </a>
          <Link to="/login" className="text-gray-300 hover:text-white transition-colors">
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 text-center py-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            🚀 Eryzaa
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-accent-blue">
              <br />Decentralized Computing
            </span>
            <br />Resource Sharing
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Rent & share computing resources globally. Three access types: SSH, AI Training, and Edge Computing.
            Powered by ZeroTier networking and Avalanche blockchain.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              as="a"
              href="#downloads"
              size="lg"
              className="text-lg px-8 py-4"
            >
              Download Now
              <Download size={20} className="ml-2" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              as={Link}
              to="/login"
              className="text-lg px-8 py-4 border-white text-white hover:bg-white hover:text-dark-bg"
            >
              Launch Dashboard
              <ArrowRight size={20} className="ml-2" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-neon-blue mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-300">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Downloads Section */}
      <section id="downloads" className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">📥 Download Eryzaa</h2>
            <p className="text-xl text-gray-300">
              Choose your platform and start sharing or accessing computing resources
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {downloads.map((download, index) => (
              <motion.div
                key={download.platform}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
              >
                <Card hover className="p-8 h-full text-center bg-dark-card/50 backdrop-blur-sm border-gray-600">
                  <div className="text-6xl mb-4">{download.icon}</div>
                  <h3 className="text-2xl font-bold mb-4">{download.platform}</h3>
                  <p className="text-gray-300 mb-6">{download.description}</p>
                  
                  {download.available ? (
                    <Button 
                      as="a" 
                      href={`/${download.filename}`}
                      download
                      className="bg-neon-blue text-white hover:bg-blue-600"
                    >
                      Download
                      <Download size={16} className="ml-2" />
                    </Button>
                  ) : (
                    <Button disabled className="opacity-50 cursor-not-allowed">
                      Coming Soon
                    </Button>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Three Ways to Access Computing</h2>
            <p className="text-xl text-gray-300">
              Eryzaa provides three distinct access types for different computing needs
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
              >
                <Card hover className="p-8 h-full text-center bg-dark-card/50 backdrop-blur-sm border-gray-600">
                  <div className="w-16 h-16 bg-neon-blue bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <feature.icon size={32} className="text-neon-blue" />
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-gray-300 mb-6">{feature.description}</p>
                  
                  <Button as={Link} to={feature.link} variant="outline" className="border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-white">
                    Learn More
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Network & Blockchain Info */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Card className="p-8 bg-green-900/20 border-green-500/30">
                <h3 className="text-2xl font-bold mb-4 text-green-400">🌐 Network Information</h3>
                <ul className="space-y-3 text-gray-300">
                  <li><strong>ZeroTier Network:</strong> <code className="bg-gray-800 px-2 py-1 rounded">363c67c55ad2489d</code></li>
                  <li><strong>Join Command:</strong> <code className="bg-gray-800 px-2 py-1 rounded">sudo zerotier-cli join 363c67c55ad2489d</code></li>
                  <li><strong>Encryption:</strong> End-to-end encrypted P2P connections</li>
                  <li><strong>Global Reach:</strong> Access computers worldwide securely</li>
                </ul>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Card className="p-8 bg-blue-900/20 border-blue-500/30">
                <h3 className="text-2xl font-bold mb-4 text-blue-400">💰 Blockchain Features</h3>
                <ul className="space-y-3 text-gray-300">
                  <li><strong>EryzaaToken (ERZC):</strong> ERC-20 token for payments</li>
                  <li><strong>Smart Contracts:</strong> Automated escrow and billing</li>
                  <li><strong>Network:</strong> Avalanche Fuji testnet</li>
                  <li><strong>Staking:</strong> Stake tokens for better rental rates</li>
                </ul>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-4xl font-bold mb-6">
            Ready to Join the Decentralized Computing Revolution?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Start earning by sharing your computer or access powerful computing resources from around the world.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              as="a" 
              href="#downloads"
              size="lg"
              className="text-lg px-12 py-4 animate-pulse-neon"
            >
              Download Eryzaa
            </Button>
            
            <Button 
              as={Link} 
              to="/login"
              variant="outline"
              size="lg"
              className="text-lg px-12 py-4 border-white text-white hover:bg-white hover:text-dark-bg"
            >
              View Dashboard
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800 py-8 px-6">
        <div className="max-w-6xl mx-auto text-center text-gray-400">
          <p>&copy; 2025 Eryzaa. Decentralized Computing Resource Sharing Platform.</p>
          <p className="mt-2 text-sm">Built with Rust 🦀 | Docker 🐳 | Avalanche ⚡ | ZeroTier 🌐</p>
          <p className="mt-2 text-xs">ZeroTier Network: 363c67c55ad2489d | Avalanche Fuji Testnet</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;