import React from 'react'

const Overview = () => {
    return (
        <div className='container mx-auto px-5 mt-100'>
            <h2 className='mb-8 text-3xl font-bold text-center'>Overview</h2>
            <p className='mb-20'>Remove mt-100 in Overview card. And also this line </p>
            <div className="flex flex-col md:flex-row gap-3">
                <p className='text-lg text-justify'>Lorem ipsum dolor sit amet consectetur adipisicing elit. Recusandae incidunt atque veritatis unde iste, exercitationem voluptas odio eveniet numquam non ipsam. Asperiores at earum voluptatum quasi. Repellendus doloremque eveniet itaque! Lorem ipsum dolor sit amet consectetur, adipisicing elit. Sunt earum odit laudantium! Atque, enim exercitationem doloremque amet sequi dignissimos animi quae tenetur? Ipsa voluptates odio, hic expedita enim ut deleniti.</p>
                <img className='h-50 w-auto self-center' src="https://www.devtopics.com/wp-content/uploads/2023/01/React-icon.svg_.png" alt="some image" />
            </div>
        </div>
    )
}

export default Overview
