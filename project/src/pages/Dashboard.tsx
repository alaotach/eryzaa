import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Zap, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Users,
  Wallet,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useJobs } from '../contexts/JobsContext';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { jobs, myJobs } = useJobs();

  // Mock data for charts
  const activityData = [
    { name: 'Jan', jobs: 12, earnings: 150 },
    { name: 'Feb', jobs: 19, earnings: 280 },
    { name: 'Mar', jobs: 8, earnings: 120 },
    { name: 'Apr', jobs: 15, earnings: 220 },
    { name: 'May', jobs: 22, earnings: 350 },
    { name: 'Jun', jobs: 18, earnings: 290 },
  ];

  const jobStatusData = [
    { name: 'Completed', value: 45, color: '#10B981' },
    { name: 'Running', value: 25, color: '#00D1FF' },
    { name: 'Pending', value: 20, color: '#F59E0B' },
    { name: 'Failed', value: 10, color: '#EF4444' },
  ];

  const getStatsForRole = () => {
    if (user?.role === 'provider') {
      return [
        {
          title: 'Jobs Completed',
          value: user.completedJobs,
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-100 dark:bg-green-900',
        },
        {
          title: 'Active Jobs',
          value: myJobs.filter(job => job.status === 'running').length,
          icon: Zap,
          color: 'text-neon-blue',
          bgColor: 'bg-blue-100 dark:bg-blue-900',
        },
        {
          title: 'Tokens Earned',
          value: user.tokensEarned,
          icon: Wallet,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900',
        },
        {
          title: 'Reputation',
          value: `${user.reputation}/5`,
          icon: TrendingUp,
          color: 'text-purple-500',
          bgColor: 'bg-purple-100 dark:bg-purple-900',
        },
      ];
    }

    return [
      {
        title: 'Jobs Submitted',
        value: myJobs.length,
        icon: BarChart3,
        color: 'text-blue-500',
        bgColor: 'bg-blue-100 dark:bg-blue-900',
      },
      {
        title: 'Running Jobs',
        value: myJobs.filter(job => job.status === 'running').length,
        icon: Clock,
        color: 'text-orange-500',
        bgColor: 'bg-orange-100 dark:bg-orange-900',
      },
      {
        title: 'Completed',
        value: myJobs.filter(job => job.status === 'completed').length,
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-100 dark:bg-green-900',
      },
      {
        title: 'Token Balance',
        value: user?.tokenBalance || 0,
        icon: Wallet,
        color: 'text-neon-blue',
        bgColor: 'bg-blue-100 dark:bg-blue-900',
      },
    ];
  };

  const stats = getStatsForRole();

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.email}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {user?.role === 'provider' 
              ? 'Monitor your compute jobs and earnings' 
              : 'Manage your AI compute jobs and submissions'
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            user?.role === 'provider' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          }`}>
            {user?.role === 'provider' ? '🛡️ Provider' : '👤 User'}
          </span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {user?.role === 'provider' ? 'Monthly Earnings' : 'Job Activity'}
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="name" 
                    className="text-gray-600 dark:text-gray-400" 
                  />
                  <YAxis className="text-gray-600 dark:text-gray-400" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--tw-color-dark-card)',
                      border: '1px solid var(--tw-color-dark-border)',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={user?.role === 'provider' ? 'earnings' : 'jobs'} 
                    stroke="#00D1FF" 
                    strokeWidth={3}
                    dot={{ fill: '#00D1FF', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Job Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Job Status
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={jobStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {jobStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {jobStatusData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Jobs
            </h3>
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </div>
          
          <div className="space-y-4">
            {myJobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    job.status === 'completed' ? 'bg-green-100 text-green-600 dark:bg-green-900' :
                    job.status === 'running' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900' :
                    job.status === 'assigned' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-700'
                  }`}>
                    {job.status === 'completed' ? <CheckCircle size={20} /> :
                     job.status === 'running' ? <Zap size={20} /> :
                     job.status === 'assigned' ? <Clock size={20} /> :
                     <AlertTriangle size={20} />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {job.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {job.computeSize} • {job.reward} ETZ
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    job.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    job.status === 'running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    job.status === 'assigned' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {job.status.replace('_', ' ')}
                  </span>
                  
                  {job.progress > 0 && (
                    <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-neon-blue h-2 rounded-full transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {myJobs.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>No jobs yet. {user?.role === 'user' ? 'Submit your first job!' : 'Start accepting jobs!'}</p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Dashboard;