import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/index.jsx';
import Toast from './components/Toast.jsx';

function App() {
    return (
        <BrowserRouter>
            <AppRoutes />
            <Toast />
        </BrowserRouter>
    );
}

export default App;
