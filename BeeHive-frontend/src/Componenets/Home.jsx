import React from 'react'
import { motion } from 'framer-motion'
import Navbar from './Navbar'
import sharan from '../assets/Sharan.jpg'
import github from '../assets/github.png'
import linkedin from '../assets/linkedin.png'
import { useNavigate } from 'react-router-dom'

const Home = () => {
  const features = [
    { icon: '🌡️', title: 'Temperature Monitoring', desc: 'Track hive temperature in real-time to maintain optimal conditions for bees.', btn: 'View Temperature' },
    { icon: '💧', title: 'pH Level Monitoring', desc: "Monitor the hive's pH levels to ensure a healthy environment for the colony.", btn: 'Check pH' },
    { icon: '💨', title: 'Humidity Tracking', desc: "Keep humidity levels stable to protect your bees and their honey production.", btn: 'View Humidity' },
    { icon: '📦', title: 'Hive Load Measurement', desc: 'Measure hive weight to track honey production and bee activity trends.', btn: 'Check Hive Load' },
    { icon: '⚡', title: 'Instant Alerts', desc: 'Receive real-time alerts via SMS or app notifications if any parameter crosses safe limits.', btn: 'View Alerts' },
    { icon: '📊', title: 'Historical Data', desc: 'Analyze historical data to understand trends and make informed beekeeping decisions.', btn: 'View Data' }
  ]

  const navigate=useNavigate();

  const fadeUp = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 },
    sphidden: { opacity: 0.6 ,y: 50},
  }

  return (
    <div className="m-0 p-0">
      <div className="text-[#33691eec] m-0 p-0">
        <div
          className="text-center font-semibold pt-4 border-l-4 border-r-4 border-b-4 shadow-lg m-0 rounded-br-[1000px] rounded-bl-[1000px]"
          style={{ backgroundColor: '#558b2f', borderColor: '#f0f4c3' }}
        >
          <Navbar />

          <div className="flex flex-col items-center justify-center h-[85vh] gap-6 p-6">
            <h1
              className="text-3xl md:text-5xl font-bold text-[#f0f4c3]"

            >
              Welcome to <span className="text-yellow-200">SMARTBEE 🐝!</span>
            </h1>

            <p
              className="max-w-2xl text-lg text-[#f0f4c3]"
            >
              Monitor your bee hives in real time with our IoT-powered system. Stay informed, protect your bees, and optimize honey production.
            </p>

            <button
               onClick={() => navigate('/signup')} className="bg-[#f0f4c3] text-[#33691e] font-semibold px-6 py-3 rounded-lg shadow-lg hover:scale-105 transition-transform"
              >Transform Your Hive Monitoring With Us</button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center mt-16 gap-10 p-6">
          <motion.h2
            className="text-3xl font-bold text-[#f0f4c3]"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Our Features
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-[90%] md:w-10/12 ">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="bg-[#f0f4c3] rounded-2xl shadow-md p-6 text-center"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                whileHover={{ scale: 1.05, transition: { duration: 0.3, ease: "easeInOut" } }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-[#558b2f]">{feature.title}</h3>
                <p className="mt-2 text-[#33691e]">{feature.desc}</p>
                <button className="mt-4 bg-[#558b2f] text-[#f0f4c3] px-4 py-2 rounded-full hover:bg-[#33691e] transition">
                  {feature.btn}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* 
         <motion.h2
            className="text-3xl font-bold text-[#f0f4c3] text-center mt-20"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Meet Our Team
          </motion.h2>


        <motion.div
        className="flex flex-col md:flex-row items-center md:items-start justify-center mt-16 gap-10 p-4 mb-10 bg-[#f0f4c3] rounded-2xl shadow-md w-[90%] md:w-3/4 lg:w-1/2 mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        >
        <motion.div
            className="flex flex-col w-48 h-48 md:w-72 md:h-72"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
        >
            <img src={sharan} alt="Sharan" className="w-full h-full rounded-2xl" />
        </motion.div>

       <motion.div
        className="flex flex-col justify-center w-full md:w-1/2 relative"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        >
        
        <h1 className="text-2xl font-bold mb-4 self-center md:self-center">SOFTWARE DEVELOPER</h1>

        <div className="flex flex-col items-center justify-center h-full">
            <p className="text-gray-700 text-center max-w-md">
              Hi! I’m Sharan N, the creator of Smart Bee. Passionate about bringing new ideas to life, One of my  build solutions that make farming smarter and simpler. Smart Bee helps monitor hive data seamlessly, giving insights to optimize beekeeping and enhance productivity. I love turning data into actionable insights and creating tools that make life easier.
              </p>

            <div className="flex gap-4 justify-center mt-4">
            <a href="https://github.com/sharan560" aria-label="GitHub"><img src={github}  alt="GitHub" className="w-10 h-10" /></a>
            <a href="https://www.linkedin.com/in/sharan-n-046706291/" aria-label="LinkedIn"><img src={linkedin} alt="LinkedIn" className="w-10 h-10" /></a>
            </div>
        </div>
        </motion.div>
        </motion.div>
        */}

        <footer id="contact" className="w-full bg-[#2e7d32] text-[#f0f4c3] mt-12">
          <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-lg font-semibold mb-2">SmartBee</h4>
              <p className="text-sm">IoT hive monitoring to protect your bees and optimize honey production.</p>
            </div>

            <div>
              <h5 className="font-semibold mb-2">Quick Links</h5>
              <ul className="text-sm space-y-1">
                <li><a href="#" className="hover:underline">Home</a></li>
                <li><a href="#features" className="hover:underline">Features</a></li>
                <li><a href="#pricing" className="hover:underline">Pricing</a></li>
                <li><a href="#contact" className="hover:underline">Contact</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-semibold mb-2">Resources</h5>
              <ul className="text-sm space-y-1">
                <li><a href="#" className="hover:underline">Documentation</a></li>
                <li><a href="#" className="hover:underline">API</a></li>
                <li><a href="#" className="hover:underline">Support</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-semibold mb-2">Contact</h5>
              <p className="text-sm">Email: <a href="mailto:info@smartbee.example" className="hover:underline">nsharan006@gmail.com</a></p>
              <p className="text-sm">Phone: +91 93454 80377</p>
              <div className="mt-3 flex space-x-3">
                <a href="https://www.linkedin.com/in/sharan-n-046706291/" aria-label="LinkedIn" className="text-sm hover:underline">LinkedIn</a>
                <a href="https://github.com/sharan560" aria-label="GitHub" className="text-sm hover:underline">GitHub</a>
              </div>
            </div>
          </div>

          <div className="border-t border-[#f0f4c3] bg-opacity-10 py-4">
            <div className="max-w-6xl mx-auto px-6 text-sm text-center">© 2025 SmartBee. All rights reserved.</div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default Home
