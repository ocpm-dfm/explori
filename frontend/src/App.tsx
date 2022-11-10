import React from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Home from "./components/Home/Home";
import { Session } from "./components/Session/Session";
import { Routes, Route, Link } from "react-router-dom";
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';

function App() {
                
    return (
        <React.Fragment>
            <Navbar 
                bg="dark" 
                variant="dark" 
                fixed="top" // this does currently help in rendering the graph component correctly, but will be removed
            > 
                <Navbar.Brand as={Link} to="/" className='navbar_padded'>Explori</Navbar.Brand> {/*  add img here for logo */}
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="justify-content-end flex-grow-1 pe-3">
                    <Nav.Link as={Link} to="/">Home</Nav.Link>
                    <Nav.Link as={Link} to="/session">New Session</Nav.Link>
                    <NavDropdown title="Dropdown Demo" id="basic-nav-dropdown">
                    <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
                    <NavDropdown.Item href="#action/3.2">
                        Another action
                    </NavDropdown.Item>
                    <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item href="#action/3.4">
                        Separated link
                    </NavDropdown.Item>
                    </NavDropdown>
                </Nav>
                </Navbar.Collapse>
            </Navbar>
        
            <Routes>
                <Route path="/" element={<Home/>}></Route>
                <Route path="/session" element={<Session/>}></Route> 
            </Routes>
        </React.Fragment>
    );
}

export default App;
