import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Database, User, Home, FileText, Trash2, RefreshCw } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'register' | 'login' | 'property' | 'valuation' | 'error';
  message: string;
  data?: any;
}

interface StoredData {
  users: any[];
  properties: any[];
  valuations: any[];
  logs: LogEntry[];
}

const LogsDashboard = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [storedData, setStoredData] = useState<StoredData>({
    users: [],
    properties: [],
    valuations: [],
    logs: []
  });

  const loadData = () => {
    // Load logs from localStorage
    const savedLogs = localStorage.getItem('emyland_logs');
    const logEntries = savedLogs ? JSON.parse(savedLogs) : [];
    
    // Load other data
    const users = JSON.parse(localStorage.getItem('emyland_users') || '[]');
    const properties = JSON.parse(localStorage.getItem('emyland_properties') || '[]');
    const valuations = JSON.parse(localStorage.getItem('emyland_valuations') || '[]');
    
    setLogs(logEntries);
    setStoredData({
      users,
      properties,
      valuations,
      logs: logEntries
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const addLog = (type: LogEntry['type'], message: string, data?: any) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    };
    
    const updatedLogs = [newLog, ...logs].slice(0, 100); // Keep only last 100 logs
    setLogs(updatedLogs);
    localStorage.setItem('emyland_logs', JSON.stringify(updatedLogs));
  };

  const clearLogs = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả logs?')) {
      setLogs([]);
      localStorage.removeItem('emyland_logs');
    }
  };

  const clearAllData = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa TẤT CẢ dữ liệu? Hành động này không thể hoàn tác!')) {
      localStorage.removeItem('emyland_users');
      localStorage.removeItem('emyland_properties');
      localStorage.removeItem('emyland_valuations');
      localStorage.removeItem('emyland_logs');
      loadData();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'register': return <User className="h-4 w-4" />;
      case 'login': return <User className="h-4 w-4" />;
      case 'property': return <Home className="h-4 w-4" />;
      case 'valuation': return <FileText className="h-4 w-4" />;
      case 'error': return <Activity className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'register': return 'bg-green-100 text-green-800';
      case 'login': return 'bg-blue-100 text-blue-800';
      case 'property': return 'bg-purple-100 text-purple-800';
      case 'valuation': return 'bg-orange-100 text-orange-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Logs & Data</h1>
            <p className="text-gray-600">Xem logs hoạt động và dữ liệu đã lưu trong hệ thống</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={clearLogs} variant="outline" className="text-orange-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Logs
            </Button>
            <Button onClick={clearAllData} variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
          </div>
        </div>

        {/* Thống kê tổng quan */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tổng Logs</p>
                  <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <User className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Users</p>
                  <p className="text-2xl font-bold text-gray-900">{storedData.users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Home className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Properties</p>
                  <p className="text-2xl font-bold text-gray-900">{storedData.properties.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Valuations</p>
                  <p className="text-2xl font-bold text-gray-900">{storedData.valuations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="logs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="logs">Activity Logs</TabsTrigger>
            <TabsTrigger value="users">Users Data</TabsTrigger>
            <TabsTrigger value="properties">Properties Data</TabsTrigger>
            <TabsTrigger value="valuations">Valuations Data</TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activity Logs ({logs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className={`p-2 rounded-full ${getLogColor(log.type)}`}>
                          {getLogIcon(log.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={getLogColor(log.type)}>
                              {log.type.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {formatDate(log.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm font-medium">{log.message}</p>
                          {log.data && (
                            <pre className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Chưa có logs nào. Hãy thực hiện một số hoạt động để xem logs.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Users Data ({storedData.users.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
                    {JSON.stringify(storedData.users, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="properties" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Properties Data ({storedData.properties.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
                    {JSON.stringify(storedData.properties, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="valuations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Valuations Data ({storedData.valuations.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
                    {JSON.stringify(storedData.valuations, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default LogsDashboard;