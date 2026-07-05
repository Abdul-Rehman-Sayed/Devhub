import { createContext, useState, useContext, useMemo } from "react";
import axios from "axios";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem("userId"));

  const authAxios = useMemo(() => {
    const instance = axios.create({
      baseURL: import.meta.env.VITE_API_URL || "http://localhost:3002",
      withCredentials: true,
    });
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem("userId");
          setCurrentUser(null);
          window.location.assign("/auth");
        }
        return Promise.reject(error);
      }
    );
    return instance;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, authAxios }}>
      {children}
    </AuthContext.Provider>
  );
};
