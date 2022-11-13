import React from 'react';
import './App.css';
import Home from "./components/Home/Home";
import { Session } from "./components/Session/Session";
import { Routes, Route } from "react-router-dom";

function App() {
                
    return (
        <React.Fragment>
            <Routes>
                <Route path="/" element={<Home/>}></Route>
                <Route path="/session" element={<Session/>}></Route> 
            </Routes>
        </React.Fragment>
    );
}

export default App;
