import { useRoutes } from "react-router-dom";
import Landing from "./components/Landing";
import Dashboard from "./components/dashboard/Dashboard";
import Login from "./components/auth/Login";
import Profile from "./components/user/Profile";
import Signup from "./components/auth/Signup";
import CreateRepo from "./components/repo/CreateRepo";
import RepoDetail from "./components/repo/RepoDetail";
import PrivateRoute from "./components/PrivateRoute";

const NotFound = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-primary)' }}>
    <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>404</h1>
    <p style={{ color: 'var(--text-secondary)' }}>Page not found.</p>
  </div>
);

const ProjectRoutes = () => {
  const element = useRoutes([
    { path: "/", element: <Landing /> },
    {
      element: <PrivateRoute />,
      children: [
        { path: "/dashboard", element: <Dashboard /> },
        { path: "/profile", element: <Profile /> },
        { path: "/create", element: <CreateRepo /> },
        { path: "/repo/:id", element: <RepoDetail /> }
      ]
    },
    { path: "/auth", element: <Login /> },
    { path: "/signup", element: <Signup /> },
    { path: "*", element: <NotFound /> }
  ]);

  return element;
};

export default ProjectRoutes;
