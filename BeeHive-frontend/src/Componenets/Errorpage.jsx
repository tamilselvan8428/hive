import React from 'react'
import Navbar from './Navbar'
import { color } from 'framer-motion'

const Errorpage = () => {
  return (
    <>
    <Navbar/>
    <div className="text-center text-6xl font-bold mt-24 pt-12 flex justify-center items-center " ><span className='text-[400px]'>404</span> PAGE NOT FOUND</div>
    </>
  )
}

export default Errorpage