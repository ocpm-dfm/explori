import React from 'react';
import './App.css';
import Home from "./components/Home/Home";
import { Session } from "./components/Session/Session";
import { EventLogList } from "./components/EventLogList/EventLogList";
import { Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from 'react-query'

function App() {
    const queryClient = new QueryClient();
    return (
        <QueryClientProvider client={queryClient}>
            <Routes>
                <Route path="/" element={<Home/>}></Route>
                <Route path="/session" element={<EventLogList/>}></Route>
            </Routes>
        </QueryClientProvider>
    );
}

export default App;
