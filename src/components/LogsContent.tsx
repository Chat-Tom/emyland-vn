import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, User, Home, FileText, Trash2, RefreshCw } from 'lucide-react';

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

const LogsContent = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [storedData, setStoredData] = useState<StoredData>({
    users: [],
    properties: [],
    valuations: [],
    logs: []
  });

  const loadData = () => {
    const savedLogs = localStorage.getItem('emyland_logs');
    const logEntries = savedLogs ? JSON.parse(savedLogs) : [];
    
    const users = JSON.parse(localStorage.getItem('emyland_users') || '[]');
    const properties = JSON.parse(localStorage.getItem('emyland_properties') || '[]');
    const valuations = JSON.parse(localStorage.getItem('emyland_valuations') || '[]');
    
    setLogs(logEntries);
    setStoredData({ users, properties, valuations, logs: logEntries });
  };

  useEffect(() => {
    loadData();
  }, []);

  const clearLogs = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả logs?')) {
      setLogs([]);
      localStorage.removeItem('emyland_logs');
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
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'register': return 'bg-green-100 text-green-800';
      case 'login': return 'bg-blue-100 text-blue-800';
      case 'property': return 'bg-purple-100 text-purple-800';
      case 'valuation': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Dashboard Logs & Data</h2>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={clearLogs} variant="outline" size="sm" className="text-orange-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Logs
          </Button>
        </div>
      </div>

      {/* Thống kê */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Activity className="h-6 w-6 text-blue-600" />
              <div className="ml-3">
                <p className="text-xs text-gray-600">Logs</p>
                <p className="text-lg font-bold">{logs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <User className="h-6 w-6 text-green-600" />
              <div className="ml-3">
                <p className="text-xs text-gray-600">Users</p>
                <p className="text-lg font-bold">{storedData.users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Home className="h-6 w-6 text-purple-600" />
              <div className="ml-3">
                <p className="text-xs text-gray-600">Properties</p>
                <p className="text-lg font-bold">{storedData.properties.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <FileText className="h-6 w-6 text-orange-600" />
              <div className="ml-3">
                <p className="text-xs text-gray-600">Valuations</p>
                <p className="text-lg font-bold">{storedData.valuations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="users">Users Data</TabsTrigger>
          <TabsTrigger value="properties">Properties Data</TabsTrigger>
          <TabsTrigger value="valuations">Valuations Data</TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity Logs ({logs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 p-2 border rounded text-sm">
                      <div className={`p-1 rounded ${getLogColor(log.type)}`}>
                        {getLogIcon(log.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {log.type.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDate(log.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm">{log.message}</p>
                      </div>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      Chưa có logs nào
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Users Data ({storedData.users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <pre className="text-xs bg-gray-50 p-2 rounded">
                  {JSON.stringify(storedData.users, null, 2)}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Properties Data ({storedData.properties.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <pre className="text-xs bg-gray-50 p-2 rounded">
                  {JSON.stringify(storedData.properties, null, 2)}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="valuations">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Valuations Data ({storedData.valuations.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <pre className="text-xs bg-gray-50 p-2 rounded">
                  {JSON.stringify(storedData.valuations, null, 2)}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LogsContent;