import React from 'react'
import Treatment from '../components/Treatment'
import Contact from '../components/Contact'
import Footer from '../components/Footer'

const Overview = () => {
  return (
      <div className='container mx-auto px-5'>
          <h2 className='mb-8 text-3xl font-bold text-center'>Overview</h2>
          <div className="flex flex-col md:flex-row gap-3">
              <p className='text-lg text-justify'>Lorem ipsum dolor sit amet consectetur adipisicing elit. Recusandae incidunt atque veritatis unde iste, exercitationem voluptas odio eveniet numquam non ipsam. Asperiores at earum voluptatum quasi. Repellendus doloremque eveniet itaque! Lorem ipsum dolor sit amet consectetur, adipisicing elit. Sunt earum odit laudantium! Atque, enim exercitationem doloremque amet sequi dignissimos animi quae tenetur? Ipsa voluptates odio, hic expedita enim ut deleniti.</p>
              <img className='h-50 w-auto self-center' src="https://www.devtopics.com/wp-content/uploads/2023/01/React-icon.svg_.png" alt="some image" />
          </div>
      </div>
  )
}


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
