import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ErrorBoundary from '@/components/ErrorBoundary';
import SearchPage from './pages/SearchPage';
import RecommendationResult from './pages/RecommendationResult';
import Suggest from './pages/Suggest';
import Discover from './pages/Discover';
import Admin from './pages/Admin';
import BottomNav from './components/BottomNav';

const TAB_ROOTS = ['/', '/discover', '/suggest', '/admin'];

// Determine active tab based on pathname
// Returns index of matching route, or 0 (home) if no match
const getTabIndex = (path) => {
  // Exact match takes precedence
  if (path === '/') return 0;
  if (path === '/discover') return 1;
  if (path === '/suggest') return 2;
  if (path === '/admin') return 3;
  
  // Nested routes fallback to parent
  if (path.startsWith('/recommend')) return 0; // /recommendation belongs to home
  
  // Unknown routes → home
  return 0;
};

// Protected route: check admin role before rendering
function ProtectedAdminRoute() {
  const { user, isLoadingAuth } = useAuth();
  
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-accent/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-syne text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground">You don't have permission to access this area.</p>
          <a
            href="/"
            className="mt-6 inline-block px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }
  
  return <Admin />;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.18, ease: "easeInOut" }}
        style={{ minHeight: "100vh" }}
      >
        <Routes location={location}>
          <Route path="/" element={<SearchPage />} />
          <Route path="/recommendation" element={<RecommendationResult />} />
          <Route path="/suggest" element={<Suggest />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/admin" element={<ProtectedAdminRoute />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-accent/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <>
      <AnimatedRoutes />
    </>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App