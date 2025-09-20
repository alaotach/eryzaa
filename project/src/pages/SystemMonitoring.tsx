import React, { useState, useEffect, useCallback } from 'react';
import Card from '../components/UI/Card';

interface SystemMetrics {
  total_gpus: number;
  rented_gpus: number;
  available_gpus: number;
  active_subnets: number;
  total_compute_power: number;
  total_memory: number;
  avg_system_utilization: number;
  blockchain_connected: boolean;
  last_updated: string;
}

interface GPUMetrics {
  gpu_id: string;
  utilization: number;
  temperature: number;
  power_draw: number;
  memory_used: number;
  memory_total: number;
  compute_power: number;
  is_rented: boolean;
  current_subnet?: string;
  last_updated: string;
}

interface SubnetMetrics {
  subnet_id: string;
  coordinator: string;
  gpu_count: number;
  total_compute: number;
  total_memory: number;
  avg_utilization: number;
  avg_temperature: number;
  total_power_draw: number;
  active: boolean;
  created_at: string;
  purpose: string;
}

const SystemMonitoringDashboard: React.FC = () => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [gpuMetrics, setGpuMetrics] = useState<{ [key: string]: GPUMetrics }>({});
  const [subnetMetrics, setSubnetMetrics] = useState<{ [key: string]: SubnetMetrics }>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [systemWs, setSystemWs] = useState<WebSocket | null>(null);

  // WebSocket connection for real-time system metrics
  const connectSystemWebSocket = useCallback(() => {
    if (systemWs?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket('ws://localhost:8000/api/v1/monitoring/ws/system');
    
    ws.onopen = () => {
      console.log('System WebSocket connected');
      setConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'system_metrics') {
          setSystemMetrics(data.data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('System WebSocket disconnected');
      setConnectionStatus('disconnected');
      // Reconnect after 3 seconds
      setTimeout(connectSystemWebSocket, 3000);
    };

    ws.onerror = (error) => {
      console.error('System WebSocket error:', error);
      setConnectionStatus('disconnected');
    };

    setSystemWs(ws);
  }, [systemWs]);

  // Fetch initial data via REST API
  const fetchInitialData = async () => {
    try {
      // Fetch system metrics
      const systemResponse = await fetch('/api/v1/monitoring/system');
      if (systemResponse.ok) {
        const systemData = await systemResponse.json();
        setSystemMetrics(systemData.data);
      }

      // Fetch GPU metrics
      const gpuResponse = await fetch('/api/v1/monitoring/gpus');
      if (gpuResponse.ok) {
        const gpuData = await gpuResponse.json();
        setGpuMetrics(gpuData.data);
      }

      // Fetch subnet metrics
      const subnetResponse = await fetch('/api/v1/monitoring/subnets');
      if (subnetResponse.ok) {
        const subnetData = await subnetResponse.json();
        setSubnetMetrics(subnetData.data);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  useEffect(() => {
    fetchInitialData();
    connectSystemWebSocket();

    return () => {
      if (systemWs) {
        systemWs.close();
      }
    };
  }, []);

  const getHealthColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-500';
    if (value >= thresholds.warning) return 'text-yellow-500';
    return 'text-green-500';
  };

  const formatBytes = (bytes: number) => {
    return `${bytes.toFixed(1)} GB`;
  };

  const formatTFLOPS = (tflops: number) => {
    return `${tflops.toFixed(1)} TFLOPS`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Eryza GPU Network Monitor</h1>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${
              connectionStatus === 'connected' ? 'text-green-400' : 
              connectionStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400' : 
                connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
              }`}></div>
              <span className="text-sm font-medium">{connectionStatus}</span>
            </div>
            {systemMetrics && (
              <div className={`flex items-center space-x-2 ${
                systemMetrics.blockchain_connected ? 'text-green-400' : 'text-red-400'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  systemMetrics.blockchain_connected ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <span className="text-sm font-medium">Blockchain</span>
              </div>
            )}
          </div>
        </div>

        {/* System Overview */}
        {systemMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gray-800 p-6">
              <h3 className="text-lg font-semibold mb-2">Total GPUs</h3>
              <div className="text-3xl font-bold text-blue-400">{systemMetrics.total_gpus}</div>
              <div className="text-sm text-gray-400 mt-2">
                {systemMetrics.rented_gpus} rented • {systemMetrics.available_gpus} available
              </div>
            </Card>

            <Card className="bg-gray-800 p-6">
              <h3 className="text-lg font-semibold mb-2">Compute Power</h3>
              <div className="text-3xl font-bold text-purple-400">
                {formatTFLOPS(systemMetrics.total_compute_power)}
              </div>
              <div className="text-sm text-gray-400 mt-2">Total system capacity</div>
            </Card>

            <Card className="bg-gray-800 p-6">
              <h3 className="text-lg font-semibold mb-2">System Utilization</h3>
              <div className={`text-3xl font-bold ${getHealthColor(systemMetrics.avg_system_utilization, { warning: 80, critical: 95 })}`}>
                {systemMetrics.avg_system_utilization.toFixed(1)}%
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${systemMetrics.avg_system_utilization}%` }}
                ></div>
              </div>
            </Card>

            <Card className="bg-gray-800 p-6">
              <h3 className="text-lg font-semibold mb-2">Active Subnets</h3>
              <div className="text-3xl font-bold text-green-400">{systemMetrics.active_subnets}</div>
              <div className="text-sm text-gray-400 mt-2">Running subnet clusters</div>
            </Card>
          </div>
        )}

        {/* GPU Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">GPU Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.values(gpuMetrics).map((gpu) => (
              <Card key={gpu.gpu_id} className="bg-gray-800 p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">{gpu.gpu_id}</h3>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    gpu.is_rented ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {gpu.is_rented ? 'RENTED' : 'AVAILABLE'}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Utilization</span>
                    <span className={getHealthColor(gpu.utilization, { warning: 80, critical: 95 })}>
                      {gpu.utilization.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${gpu.utilization}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Temperature</span>
                    <span className={getHealthColor(gpu.temperature, { warning: 85, critical: 90 })}>
                      {gpu.temperature.toFixed(1)}°C
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Memory</span>
                    <span className="text-white">
                      {formatBytes(gpu.memory_used)} / {formatBytes(gpu.memory_total)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(gpu.memory_used / gpu.memory_total) * 100}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Power Draw</span>
                    <span className={getHealthColor(gpu.power_draw, { warning: 350, critical: 400 })}>
                      {gpu.power_draw.toFixed(0)}W
                    </span>
                  </div>

                  {gpu.current_subnet && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Subnet</span>
                      <span className="text-blue-400 text-sm font-medium">
                        {gpu.current_subnet.slice(-6)}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Subnet Status */}
        {Object.keys(subnetMetrics).length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Subnet Status</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.values(subnetMetrics).map((subnet) => (
                <Card key={subnet.subnet_id} className="bg-gray-800 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{subnet.subnet_id}</h3>
                      <p className="text-gray-400 text-sm">{subnet.purpose}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      subnet.active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                    }`}>
                      {subnet.active ? 'ACTIVE' : 'INACTIVE'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-gray-400 text-sm">GPUs</span>
                      <div className="text-xl font-bold text-blue-400">{subnet.gpu_count}</div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Compute</span>
                      <div className="text-xl font-bold text-purple-400">
                        {formatTFLOPS(subnet.total_compute)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Utilization</span>
                      <span className={getHealthColor(subnet.avg_utilization, { warning: 80, critical: 95 })}>
                        {subnet.avg_utilization.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${subnet.avg_utilization}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Temperature</span>
                      <span className={getHealthColor(subnet.avg_temperature, { warning: 85, critical: 90 })}>
                        {subnet.avg_temperature.toFixed(1)}°C
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Power</span>
                      <span className="text-white">{subnet.total_power_draw.toFixed(0)}W</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-400">Coordinator</span>
                      <span className="text-blue-400 text-sm font-mono">
                        {subnet.coordinator.slice(0, 6)}...{subnet.coordinator.slice(-4)}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          {systemMetrics && (
            <p>Last updated: {new Date(systemMetrics.last_updated).toLocaleTimeString()}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemMonitoringDashboard;