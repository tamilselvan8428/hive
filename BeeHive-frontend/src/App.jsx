import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './Componenets/Navbar'
import Home from './Componenets/Home'
import Login from './Componenets/Login'
import Signup from './Componenets/Signup'
import Dashboard from './Componenets/Dborad'
import Errorpage from './Componenets/Errorpage'

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  const user = localStorage.getItem('user')
  
  if (!token || !user) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

const App = () => {
  return (
    <div className="min-h-screen">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route path='*' element={<Errorpage />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App