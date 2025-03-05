import React from 'react'

const Contact = () => {
    return (
        <div className='container mx-auto px-5'>
            <h2 className='font-bold text-3xl text-center my-10'>Contact</h2>
            <div className='flex flex-col items-center lg:flex-row gap-10'>
                <div className="w-full lg:w-2/3 h-125">
                    <h3 className="text-xl mb-2">Location</h3>
                    <iframe
                        title="Location Map"
                        className="w-full h-full"
                        // frameBorder="0"
                        // scrolling="no"
                        // marginHeight="0"
                        // marginWidth="0"
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3807.4126499574345!2d78.31943679999999!3d17.391973500000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb94eba8ad7c87%3A0xb78f51ed556f7cc5!2sChaitanya%20Bharathi%20Institute%20of%20Technology!5e0!3m2!1sen!2sin!4v1739203229713!5m2!1sen!2sin"
                    ></iframe>
                </div>
                <div>
                    <h3 className="text-xl mb-2">Contact Us</h3>
                    <p>Osman Sagar Rd, Kokapet, Gandipet, Hyderabad, Telangana 500075</p>
                    <p>9085674123</p>
                    <p>9085674123</p>
                </div>
            </div>
        </div>
    )
}

export default Contact
{/* <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3807.4126499574345!2d78.31943679999999!3d17.391973500000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb94eba8ad7c87%3A0xb78f51ed556f7cc5!2sChaitanya%20Bharathi%20Institute%20of%20Technology!5e0!3m2!1sen!2sin!4v1739203229713!5m2!1sen!2sin" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe> */ }