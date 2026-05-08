"use client";

import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Server, Clock, AlertCircle } from 'lucide-react';

export default function Home() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'historical' | 'realtime'>('realtime');
    const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
    const [availableHosts, setAvailableHosts] = useState<string[]>([]);

    useEffect(() => {
        const controller = new AbortController();
        const fetchData = async () => {
            try {
                // Pass selected hosts to the backend to filter data at the source
                const hostsQuery = selectedHosts.length > 0 ? `&hosts=${selectedHosts.join(',')}` : '';
                const response = await fetch(`/api/latency?type=${viewMode}${hostsQuery}`, {
                    signal: controller.signal
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                if (result.error) {
                    throw new Error(result.error);
                }
                
                const formattedData = result.map((item: any) => ({
                    ...item,
                    formattedTime: new Date(item.time).toLocaleString('id-ID', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })
                }));
                setData(formattedData);
                
                // Update available hosts only if we fetched everything (no hosts filter)
                // or if we want to detect new hosts that might have appeared
                if (selectedHosts.length === 0 || availableHosts.length === 0) {
                    const hosts = Array.from(new Set(result.flatMap((d: any) => Object.keys(d))))
                        .filter(key => key !== 'time' && key !== 'formattedTime') as string[];
                    
                    setAvailableHosts(prev => {
                        if (JSON.stringify(prev.sort()) !== JSON.stringify(hosts.sort())) {
                            if (prev.length === 0) {
                                setSelectedHosts(hosts);
                            }
                            return hosts;
                        }
                        return prev;
                    });
                }

                setError(null);
            } catch (e: any) {
                if (e.name === 'AbortError') {
                    return; // Ignore abort errors
                }
                console.error("Fetch error:", e);
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const refreshRate = viewMode === 'realtime' ? 5000 : 60000;
        const interval = setInterval(fetchData, refreshRate);
        
        return () => {
            clearInterval(interval);
            controller.abort();
        };
    }, [viewMode, selectedHosts]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900/90 border border-gray-700/50 backdrop-blur-md p-4 rounded-xl shadow-2xl text-sm">
                    <p className="text-gray-300 mb-2 font-medium border-b border-gray-700 pb-2">{payload[0].payload.formattedTime}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={`item-${index}`} className="flex items-center gap-2 py-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-gray-400">{entry.name}:</span>
                            <span className="font-semibold text-white">{entry.value !== undefined ? `${entry.value.toFixed(2)} ms` : 'N/A'}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <main className="min-h-screen bg-[#0a0a0c] text-white p-6 md:p-12 font-sans selection:bg-indigo-500/30">
            <div className="max-w-full mx-auto mb-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-medium mb-4 border border-indigo-500/20">
                            <Activity size={16} />
                            <span>Live Monitoring</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tight">
                            Network Latency
                        </h1>
                        <p className="text-gray-400 mt-2 max-w-xl">
                            {viewMode === 'realtime' ? 'Real-time latency metrics for internal network nodes over the last 15 minutes.' : 'Historical latency metrics for internal network nodes over the last 7 days.'}
                        </p>
                    </div>
                    <div className="flex flex-col md:items-end gap-4">
                        <div className="flex bg-gray-900/50 p-1 rounded-lg border border-gray-700/50 w-fit">
                            <button 
                                onClick={() => setViewMode('realtime')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'realtime' ? 'bg-indigo-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                Real-time (15m)
                            </button>
                            <button 
                                onClick={() => setViewMode('historical')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'historical' ? 'bg-indigo-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                7 Days (5m Avg)
                            </button>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 backdrop-blur-sm flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
                                    <Server size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Status</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <p className="font-semibold">Online</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 backdrop-blur-sm sm:flex items-center gap-4 hidden">
                                <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Interval</p>
                                    <p className="font-semibold">{viewMode === 'realtime' ? '5s Avg' : '5m Avg'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-full mx-auto">
                <div className="bg-gray-900/40 border border-gray-800/60 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10" />

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <h2 className="text-xl font-semibold text-gray-200">{viewMode === 'realtime' ? 'Real-time Performance Trend' : '7-Day Performance Trend'}</h2>
                        
                        {/* Host Filters */}
                        <div className="flex flex-wrap gap-2">
                            {availableHosts.map((host, index) => {
                                const isSelected = selectedHosts.includes(host);
                                const hue = (index * (360 / Math.max(availableHosts.length, 5))) % 360;
                                const color = `hsl(${hue}, 70%, 60%)`;
                                
                                return (
                                    <button
                                        key={host}
                                        onClick={() => {
                                            setSelectedHosts(prev => 
                                                prev.includes(host) 
                                                    ? prev.filter(h => h !== host) 
                                                    : [...prev, host]
                                            );
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-2 ${
                                            isSelected 
                                                ? 'bg-gray-800 border-gray-600 text-white shadow-lg' 
                                                : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-700'
                                        }`}
                                    >
                                        <div 
                                            className={`w-2 h-2 rounded-full ${!isSelected && 'grayscale opacity-30'}`} 
                                            style={{ backgroundColor: color }} 
                                        />
                                        {host}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="h-[500px] w-full">
                        {loading ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-indigo-400">
                                <Activity className="animate-bounce mb-4" size={32} />
                                <p className="font-medium animate-pulse">Loading metric data...</p>
                            </div>
                        ) : error ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-red-400 bg-red-500/5 rounded-2xl border border-red-500/20 p-8 text-center">
                                <AlertCircle className="mb-4" size={48} />
                                <h3 className="text-xl font-semibold mb-2">Failed to load data</h3>
                                <p className="text-red-400/80 max-w-md">{error}</p>
                            </div>
                        ) : data.length === 0 ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-800/30 rounded-2xl border border-gray-700/30">
                                <Server className="mb-4 opacity-50" size={48} />
                                <p>No latency data available for the {viewMode === 'realtime' ? 'last 15 minutes' : 'last 7 days'}.</p>
                                <p className="text-sm mt-2 opacity-60">Ensure the worker is running and writing to InfluxDB.</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        {/* Dynamically generate gradients for every unique host found in the entire dataset */}
                                        {availableHosts.map((host, index) => {
                                                const hue = (index * (360 / Math.max(availableHosts.length, 5))) % 360;
                                                const color = `hsl(${hue}, 70%, 60%)`;
                                                return (
                                                    <linearGradient key={`grad-${host}`} id={`color-${host.replace(/\./g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                                    </linearGradient>
                                                );
                                            })
                                        }
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.4} />
                                    <XAxis 
                                        dataKey="formattedTime" 
                                        stroke="#9ca3af" 
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickMargin={10} 
                                        minTickGap={50}
                                    />
                                    <YAxis 
                                        stroke="#9ca3af" 
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickFormatter={(value) => `${value}ms`}
                                        tickMargin={10}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend 
                                        verticalAlign="top" 
                                        height={36} 
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }}
                                    />
                                    {/* Dynamically render Areas for every unique host found in the entire dataset */}
                                    {availableHosts
                                        .filter(host => selectedHosts.includes(host))
                                        .map((host, index) => {
                                            const hue = (index * (360 / Math.max(availableHosts.length, 5))) % 360;
                                            const strokeColor = `hsl(${hue}, 70%, 60%)`;
                                            const dotColor = `hsl(${hue}, 70%, 75%)`;
                                            const gradientId = `url(#color-${host.replace(/\./g, '-')})`;
                                            
                                            return (
                                                <Area 
                                                    key={host}
                                                    type="monotone" 
                                                    dataKey={host} 
                                                    name={`Node ${host}`}
                                                    stroke={strokeColor} 
                                                    strokeWidth={3}
                                                    fillOpacity={1} 
                                                    fill={gradientId} 
                                                    activeDot={{ r: 6, strokeWidth: 0, fill: dotColor }}
                                                    isAnimationActive={false}
                                                    connectNulls={true}
                                                />
                                            );
                                        })
                                    }
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
