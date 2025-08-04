import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppProvider } from '@/contexts/AppContext';
import Home from '@/pages/Home';
import Properties from '@/pages/Properties';
import PropertyDetail from '@/pages/PropertyDetail';
import PostProperty from '@/pages/PostProperty';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import SystemDashboard from '@/pages/SystemDashboard';
import PlanningLookup from '@/pages/PlanningLookup';
import ValuationCertificate from '@/pages/ValuationCertificate';
import LogsDashboard from '@/pages/LogsDashboard';
import NotFound from '@/pages/NotFound';
import ForgotPassword from '@/pages/ForgotPassword';
import './App.css';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="emyland-ui-theme">
      <AuthProvider>
        <AppProvider>
          <Router>
            <div className="App">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/properties" element={<Properties />} />
                <Route path="/property/:id" element={<PropertyDetail />} />
                <Route path="/post-property" element={<PostProperty />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/system-dashboard" element={<SystemDashboard />} />
                <Route path="/planning-lookup" element={<PlanningLookup />} />
                <Route path="/valuation-certificate" element={<ValuationCertificate />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
            </div>
          </Router>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
