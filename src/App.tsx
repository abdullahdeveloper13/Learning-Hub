import { Route, Switch, Router as WouterRouter } from 'wouter';

// ... other imports

// Instructor Pages
import InstructorDashboard from '@/pages/instructor/Dashboard';
import InstructorCourseList from '@/pages/instructor/CourseList';
import CourseBuilder from '@/pages/instructor/CourseBuilder';

// Admin Pages
import AdminDashboard from '@/pages/admin/Dashboard';
import AdminUsers from '@/pages/admin/Users';

// ... inside Router Switch ...

      {/* Instructor Routes */}
      <Route path="/instructor/dashboard" component={InstructorDashboard} />
      <Route path="/instructor/courses" component={InstructorCourseList} />
      <Route path="/instructor/courses/new" component={CourseBuilder} />
      <Route path="/instructor/courses/:id/edit" component={CourseBuilder} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />

