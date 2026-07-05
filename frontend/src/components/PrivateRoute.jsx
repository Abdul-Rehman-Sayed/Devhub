import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../authContext";

const PrivateRoute = () => {
  const { currentUser } = useAuth();
  const userId = localStorage.getItem("userId");

  if (!currentUser && !userId) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
