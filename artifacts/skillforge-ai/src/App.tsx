import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider } from '@/hooks/use-auth';
import { ThemeProvider } from '@/components/shared/ThemeProvider';

// Pages
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import Home from '@/pages/public/Home';
import CourseList from '@/pages/public/CourseList';
import CourseDetail from '@/pages/public/CourseDetail';

// Shared Pages
import Messages from '@/pages/shared/Messages';
import Notifications from '@/pages/shared/Notifications';

// Student Pages
import Dashboard from '@/pages/student/Dashboard';
import Profile from '@/pages/student/Profile';
import Certificates from '@/pages/student/Certificates';
import AITools from '@/pages/student/AITools';
import LessonPlayer from '@/pages/student/LessonPlayer';
import QuizPlayer from '@/pages/student/QuizPlayer';

// Instructor Pages
import InstructorDashboard from '@/pages/instructor/Dashboard';
import InstructorCourseList from '@/pages/instructor/CourseList';
import CourseBuilder from '@/pages/instructor/CourseBuilder';

// Admin Pages
import AdminDashboard from '@/pages/admin/Dashboard';
import AdminUsers from '@/pages/admin/Users';
import AdminCourses from '@/pages/admin/Courses';
import AdminCategories from '@/pages/admin/Categories';
import AdminLogs from '@/pages/admin/Logs';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Public & Auth */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/courses" component={CourseList} />
      <Route path="/courses/:id" component={CourseDetail} />

      {/* Shared Authenticated Routes */}
      <Route path="/messages" component={Messages} />
      <Route path="/instructor/messages" component={Messages} />
      <Route path="/notifications" component={Notifications} />

      {/* Student Routes */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/certificates" component={Certificates} />
      <Route path="/ai" component={AITools} />
      <Route path="/learn/:courseId" component={LessonPlayer} />
      <Route path="/learn/:courseId/quiz/:quizId" component={QuizPlayer} />

      {/* Instructor Routes */}
      <Route path="/instructor/dashboard" component={InstructorDashboard} />
      <Route path="/instructor/courses" component={InstructorCourseList} />
      <Route path="/instructor/courses/new" component={CourseBuilder} />
      <Route path="/instructor/courses/:id/edit" component={CourseBuilder} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/courses" component={AdminCourses} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/logs" component={AdminLogs} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
