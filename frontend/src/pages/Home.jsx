import React from 'react'
import Treatment from '../components/Treatment'
import Overview from '../components/Overview'
import Contact from '../components/Contact'
import Footer from '../components/Footer'

const Home = () => {
  return (
    <div>
      <Overview/>
      <Treatment/>
      <Contact/>
      <Footer/>
    </div>
  )
}

export default Home
