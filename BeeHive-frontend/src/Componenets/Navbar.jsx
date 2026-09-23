import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiMenu, FiX } from 'react-icons/fi'

const Navbar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const loggedIn = !!localStorage.getItem('user')
  const [isOpen, setIsOpen] = useState(false)

  const logout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('farmId')
    window.location.href = '/'
  }

  const goToContact = () => {
    setIsOpen(false)
    if (location.pathname !== '/') {
      navigate('/')
      setTimeout(() => {
        const el = document.getElementById('contact')
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } else {
      const el = document.getElementById('contact')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header>
      <div
        style={{ backgroundColor: '#f0f4c3' }}
        className="flex justify-between items-center fixed top-3 right-0 left-0 z-50 px-4 md:px-6 py-2 mx-4 md:mx-16 lg:mx-32 xl:mx-64 rounded-full shadow-md h-16"
      >
        <div className="flex items-center gap-2 text-2xl md:text-3xl font-semibold px-2 md:px-6" style={{ color: '#33691e', fontFamily: 'Roboto' }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 md:w-8 md:h-8"
            fill="#ffb300"
            viewBox="0 0 24 24"
            stroke="#33691e"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 2l2.5 5 5.5.8-4 3.8 1 5-4.5-2.3L7 16l1-5-4-3.8 5.5-.8L12 2z"
            />
          </svg>
          <span className="hidden sm:inline">SMARTBEE</span>
          <span className="inline sm:hidden">SB</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 md:w-6 md:h-6"
            fill="#ffb300"
            viewBox="0 0 24 24"
            stroke="#33691e"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 2l2.5 5 5.5.8-4 3.8 1 5-4.5-2.3L7 16l1-5-4-3.8 5.5-.8L12 2z"
            />
          </svg>
        </div>

        {/* Mobile menu toggle */}
        <div className="md:hidden flex items-center pr-4">
          <button onClick={() => setIsOpen(!isOpen)} className="text-[#33691e] focus:outline-none">
            {isOpen ? <FiX size={28} /> : <FiMenu size={28} />}
          </button>
        </div>

        {/* Desktop Nav */}
        <nav style={{ color: '#33691e' }} className="hidden md:flex space-x-4 gap-5 font-semibold px-6" aria-label="Main navigation">
          <Link className="hover:underline" to="/">Home</Link>
          <button onClick={goToContact} className="hover:underline bg-transparent border-none cursor-pointer">Contact</button>
          
          {loggedIn ? (
            <>
              <Link className="hover:underline" to="/dashboard">DashBoard</Link>
              <Link className="hover:underline" to="/" onClick={logout}>Logout</Link>
            </>
          ) : (
            <>
              <Link className="hover:underline" to="/login">Login</Link>
              <Link className="hover:underline" to="/signup">Signup</Link>
            </>
          )}
        </nav>
      </div>

      {/* Mobile Nav Dropdown */}
      {isOpen && (
        <div className="md:hidden fixed top-20 left-4 right-4 z-40 bg-[#f0f4c3] rounded-2xl shadow-xl border border-[#cddc39] flex flex-col p-4 gap-4 text-center font-semibold" style={{ color: '#33691e' }}>
          <Link className="hover:bg-[#dcedc8] p-2 rounded-lg" to="/" onClick={() => setIsOpen(false)}>Home</Link>
          <button onClick={goToContact} className="hover:bg-[#dcedc8] p-2 rounded-lg bg-transparent border-none cursor-pointer text-[#33691e] font-semibold w-full text-center">Contact</button>
          
          {loggedIn ? (
            <>
              <Link className="hover:bg-[#dcedc8] p-2 rounded-lg" to="/dashboard" onClick={() => setIsOpen(false)}>DashBoard</Link>
              <Link className="hover:bg-[#dcedc8] p-2 rounded-lg" to="/" onClick={logout}>Logout</Link>
            </>
          ) : (
            <>
              <Link className="hover:bg-[#dcedc8] p-2 rounded-lg" to="/login" onClick={() => setIsOpen(false)}>Login</Link>
              <Link className="hover:bg-[#dcedc8] p-2 rounded-lg" to="/signup" onClick={() => setIsOpen(false)}>Signup</Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}

export default Navbar
