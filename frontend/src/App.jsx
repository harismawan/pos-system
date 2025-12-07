import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/index.jsx";
import Toast from "./components/Toast.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
        <Toast />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
