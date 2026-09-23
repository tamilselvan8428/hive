import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from './Navbar'
import honey from '../assets/Honey.jpg'
import axios from 'axios'
import { authAPI, heaterAPI, getApiBaseUrl, setApiBaseUrl } from '../api'

const mockSignIn = (email, password) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email.includes('@')) {
        resolve({ token: 'fake-token', user: { email } })
      } else {
        if (!email.includes('@')) {
          reject(new Error('Invalid email format'))
        }
      }
    }, 700)
  })
}

const Login = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showServerConfig, setShowServerConfig] = useState(false)
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl())
  const [testStatus, setTestStatus] = useState('')

  const handleTestConnection = async () => {
    setTestStatus('Testing...')
    try {
      setApiBaseUrl(serverUrl)
      const res = await heaterAPI.getStatus()
      if (res.status === 200 || res.data) {
        setTestStatus('✅ Connected to backend successfully!')
      } else {
        setTestStatus(`⚠️ Server responded with status ${res.status}`)
      }
    } catch (err) {
      console.error('Test connection error:', err)
      const msg = err.response?.data?.message || err.message || 'Network error'
      setTestStatus(`❌ Could not connect: ${msg}`)
    }
  }

  const handleSaveServer = () => {
    setApiBaseUrl(serverUrl)
    setTestStatus('💾 Server URL saved!')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email) return setError('Please enter your email')
    if (!password) return setError('Please enter your password')

    setLoading(true)
    try {
      const res = await authAPI.login({
        email,
        password,
      })

      localStorage.setItem('user', JSON.stringify(res.data.user))
      localStorage.setItem('farmId', res.data.user.farmId)
      localStorage.setItem('token', res.data.token)
      console.log('res.data:', res.data.user)
      navigate('/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      if (err.response && err.response.data) {
        setError(err.response.data.message || err.response.data.error || 'Invalid email or password')
      } else if (err.request) {
        setError(`Cannot reach backend at ${getApiBaseUrl()}. Tap "Server Settings" below to configure your PC IP or test connection.`)
      } else {
        setError(err.message || 'Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Motion variants for the card
  const cardVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: 'easeOut' } },
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="flex flex-col justify-center items-center max-w-4xl mx-auto px-6 py-12 mt-24 md:mt-40">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-xl p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 w-full"
        >
          <div className="flex-shrink-0 text-center md:text-left">
            <img src={honey} alt="Sharan" className="w-48 h-48 md:w-72 md:h-72 rounded-xl shadow-md" />
          </div>

          <div className="w-full flex flex-col justify-center">
            <h2 className="text-2xl font-semibold mb-2 text-center text-[#33691e]">
              Sign in to your account
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="text-sm text-[#f0f4c3]">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nsharan006@gmail.com"
                  className="mt-1 block w-full max-w-lg rounded-md bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300 transition"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm text-white/90">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="mt-1 block w-full max-w-lg rounded-md bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300 transition"
                  required
                />
              </label>

              {error && <div className="text-red-700 text-center">{error}</div>}

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 bg-yellow-200 text-green-800 font-semibold px-5 py-2 rounded shadow hover:scale-105 hover:shadow-lg transition ease-in-out duration-200 disabled:opacity-60"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>

                <a
                  href="#"
                  className="text-sm text-white/90 hover:underline text-center md:text-left"
                >
                  Forgot password?
                </a>
              </div>
              <p className="text-white text-center">
                Don't Have an Account?{' '}
                <a href="/signup" className="underline">
                  Sign up
                </a>
              </p>

              {/* Server URL Settings for Mobile / Local Network */}
              <div className="pt-3 border-t border-white/20 text-center">
                <button
                  type="button"
                  onClick={() => setShowServerConfig(!showServerConfig)}
                  className="text-xs text-yellow-200/90 hover:text-yellow-100 flex items-center justify-center gap-1 mx-auto underline"
                >
                  ⚙️ {showServerConfig ? 'Hide Server Settings' : 'Mobile / Server Connection Settings'}
                </button>

                {showServerConfig && (
                  <div className="mt-3 p-3 bg-black/30 rounded-xl text-left space-y-2 border border-yellow-400/30">
                    <label className="block text-xs text-yellow-200">
                      Backend Server API URL:
                      <input
                        type="text"
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                        placeholder="http://10.99.165.134:5000"
                        className="mt-1 block w-full rounded bg-white/20 px-2 py-1 text-xs text-white placeholder-white/50 border border-white/30 focus:outline-none"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setServerUrl('http://10.99.165.134:5000')}
                        className="px-2 py-0.5 bg-white/20 rounded text-yellow-100 hover:bg-white/30"
                      >
                        Host PC (10.99.165.134)
                      </button>
                      <button
                        type="button"
                        onClick={() => setServerUrl('http://localhost:5000')}
                        className="px-2 py-0.5 bg-white/20 rounded text-yellow-100 hover:bg-white/30"
                      >
                        Localhost (USB Reverse)
                      </button>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveServer}
                        className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs font-medium"
                      >
                        Save URL
                      </button>
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        className="px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-medium"
                      >
                        Test Connection
                      </button>
                    </div>
                    {testStatus && (
                      <div className="text-[11px] text-white/90 pt-1 font-mono">{testStatus}</div>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

export default Login
