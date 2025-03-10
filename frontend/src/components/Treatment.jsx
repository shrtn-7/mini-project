import React from 'react'

const TreatmentCard = (props) => {
  return (
      <div>
          <div className="bg-white rounded-xl transform transition duration-400 hover:scale-110 hover:shadow-xl shadow-md overflow-hidden">
              <img src={props.image} alt={props.title} className="w-full h-24 md:h-32 object-cover" />
              <div className="p-4">
                  <h3 className="text-lg font-medium text-center">{props.title}</h3>
              </div>
          </div>
      </div>
  )
}


const Treatment = () => {
  return (
    <>
        <div className="container mx-auto px-2">
            <h2 className='my-10 text-3xl font-bold text-center'>Our Treatments</h2>
            <div className="flex flex-wrap justify-center gap-4">
                <TreatmentCard image="https://www.devtopics.com/wp-content/uploads/2023/01/React-icon.svg_.png" title="Diabetes"/>
                <TreatmentCard image="https://www.devtopics.com/wp-content/uploads/2023/01/React-icon.svg_.png" title="Diabetes"/>
                <TreatmentCard image="https://www.devtopics.com/wp-content/uploads/2023/01/React-icon.svg_.png" title="Diabetes"/>
                <TreatmentCard image="https://www.devtopics.com/wp-content/uploads/2023/01/React-icon.svg_.png" title="Diabetes"/>
                <TreatmentCard image="https://www.devtopics.com/wp-content/uploads/2023/01/React-icon.svg_.png" title="Diabetes"/>
                <TreatmentCard image="https://www.devtopics.com/wp-content/uploads/2023/01/React-icon.svg_.png" title="Diabetes"/>
                <TreatmentCard image="https://www.devtopics.com/wp-content/uploads/2023/01/React-icon.svg_.png" title="Diabetes"/>
                <TreatmentCard image="https://www.devtopics.com/wp-content/uploads/2023/01/React-icon.svg_.png" title="Diabetes"/>
                <TreatmentCard image="https://www.devtopics.com/wp-content/uploads/2023/01/React-icon.svg_.png" title="Diabetes"/>
                <TreatmentCard image="https://www.devtopics.com/wp-content/uploads/2023/01/React-icon.svg_.png" title="Diabetes"/>
                <TreatmentCard image="https://www.devtopics.com/wp-content/uploads/2023/01/React-icon.svg_.png" title="Diabetes"/>
                <TreatmentCard image="https://www.devtopics.com/wp-content/uploads/2023/01/React-icon.svg_.png" title="Diabetes"/>
                <TreatmentCard image="https://www.devtopics.com/wp-content/uploads/2023/01/React-icon.svg_.png" title="Diabetes"/>
            </div>
        </div>
    </>
  )
}

export default Treatment
