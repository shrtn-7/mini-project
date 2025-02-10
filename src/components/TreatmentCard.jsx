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

export default TreatmentCard
