import React from "react";
import ProjectRoutes from "./Routes";
import { Toaster } from "react-hot-toast";
import "./App.css";

const App = () => {
  return (
    <>
      <Toaster position="bottom-right" />
      <ProjectRoutes />
    </>
  );
};

export default App;