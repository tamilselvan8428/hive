import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from './Navbar'
import honey from '../assets/Honey.jpg'
import axios from 'axios'
import { authAPI, getApiBaseUrl } from '../api'

const Signup = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    address: '',
    farmName: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if(!form.phoneNumber || form.phoneNumber.trim().length < 8){
      setError('Please enter a valid mobile number (+91...) for heater SMS alerts')
      setLoading(false)
      return
    }

    if(form.password.length < 6){
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      const response = await authAPI.signup(form)
      console.log(response.data) 
      localStorage.setItem('user', JSON.stringify(response.data.user))
      localStorage.setItem('farmId', response.data.user.farmId)
      localStorage.setItem('token', response.data.token)
      console.log(response.data.user.farmId)
      console.log('Signup successful')
      navigate('/dashboard') 
    } catch (err) {
      console.error('Signup error:', err)
      if (err.response && err.response.data) {
        setError(err.response.data.message || err.response.data.error || 'Signup failed')
      } else if (err.request) {
        setError(`Cannot reach backend server at ${getApiBaseUrl()}. Check if phone is connected to host PC hotspot/Wi-Fi.`)
      } else {
        setError(err.message || 'Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="z-10">
        <Navbar />
      </div>

      <main className="flex flex-col justify-center items-center max-w-6xl mx-auto px-6 py-12 mt-24 md:mt-32">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-xl p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 w-full"
        >
          <div className="flex-shrink-0 text-center md:text-left">
            <img src={honey} alt="Signup" className="w-48 h-48 md:w-[400px] md:h-[400px] lg:w-[500px] lg:h-[500px] rounded-xl shadow-md" />
          </div>

          <div className="w-full flex flex-col justify-center">
            <h2 className="text-2xl font-semibold mb-2 text-center text-[#33691e]">
              Create your account
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="text-sm text-[#f0f4c3]">Name</span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Sharan N"
                  className="mt-1 block w-full max-w-lg rounded-md bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300 transition"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm text-[#f0f4c3]">Farm Name</span>
                <input
                  type="text"
                  name="farmName"
                  value={form.farmName}
                  onChange={handleChange}
                  placeholder="Your farm name"
                  className="mt-1 block w-full max-w-lg rounded-md bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300 transition"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm text-[#f0f4c3]">Email</span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="nsharan006@gmail.com"
                  className="mt-1 block w-full max-w-lg rounded-md bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300 transition"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm text-[#f0f4c3]">Password</span>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Your password"
                  className="mt-1 block w-full max-w-lg rounded-md bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300 transition"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm text-[#f0f4c3]">Phone Number</span>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className="mt-1 block w-full max-w-lg rounded-md bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300 transition"
                />
              </label>

              <label className="block">
                <span className="text-sm text-[#f0f4c3]">Address</span>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Your farm address"
                  className="mt-1 block w-full max-w-lg rounded-md bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300 transition"
                />
              </label>

              {error && <div className="text-red-700 text-center">{error}</div>}

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 bg-yellow-200 text-green-800 font-semibold px-5 py-2 rounded shadow hover:scale-105 hover:shadow-lg transition ease-in-out duration-200 disabled:opacity-60"
                >
                  {loading ? 'Signing up...' : 'Sign up'}
                </button>
              </div>

              <p className="text-white text-center">
                Already have an account?{' '}
                <a href="/login" className="underline">
                  Sign in
                </a>
              </p>
            </form>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

export default Signup
