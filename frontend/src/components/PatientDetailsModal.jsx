import React from 'react';
import dayjs from 'dayjs'; // Import dayjs for formatting dates

function PatientDetailsModal({ isOpen, onClose, data, isLoading }) {
  if (!isOpen) return null;

  // Data now contains { profile: {...}, records: [...] }
  const { profile, records } = data || {}; 

  return (
    <div style={styles.overlay}> {/* Keep existing overlay style */}
      <div style={styles.modal} className="bg-white p-6 rounded-lg shadow-xl relative w-11/12 max-w-2xl max-h-[85vh] overflow-y-auto"> {/* Use Tailwind for modal styling */}
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-2xl leading-none font-bold focus:outline-none"
          aria-label="Close modal"
        >
          &times; {/* Better close icon */}
        </button>
        <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">Patient Details</h2>

        {isLoading ? (
          <p className="text-center text-gray-600">Loading patient data...</p>
        ) : (
          <div className="space-y-6"> {/* Add spacing between sections */}
            {/* Profile Section */}
            {profile ? (
              <section className="mb-6 border-b pb-4">
                <h3 className="text-xl font-semibold mb-2 text-gray-700">Profile</h3>
                <p><strong>Name:</strong> {profile.name}</p>
                <p><strong>Email:</strong> {profile.email}</p>
                {/* Display role if needed */}
                {/* <p><strong>Role:</strong> {profile.role}</p> */}
              </section>
            ) : (
              <p className="text-red-600">Could not load patient profile.</p>
            )}

            {/* Detailed Medical Records Section */}
            <section>
              <h3 className="text-xl font-semibold mb-3 text-gray-700">Medical Records History</h3>
              {records && records.length > 0 ? (
                <ul className="space-y-4">
                  {records.map((record) => (
                    <li key={record.id} className="border p-4 rounded bg-gray-50 shadow-sm">
                       <p className="text-xs text-gray-500 mb-2">Recorded on: {dayjs(record.created_at).format('YYYY-MM-DD HH:mm')}</p>
                       <p className="mb-1"><strong>Problem / Reason:</strong></p>
                       <p className="ml-2 text-gray-800 whitespace-pre-wrap">{record.problem || 'N/A'}</p>
                       
                       <p className="mt-2 mb-1"><strong>Previous Medications:</strong></p>
                       <p className="ml-2 text-gray-800 whitespace-pre-wrap">{record.previous_medications || 'N/A'}</p>
                       
                       <p className="mt-2 mb-1"><strong>Medical History:</strong></p>
                       <p className="ml-2 text-gray-800 whitespace-pre-wrap">{record.medical_history || 'N/A'}</p>

                       {/* Display Prescription Links */}
                       {record.prescriptions && record.prescriptions.length > 0 && (
                         <div className="mt-3">
                           <strong className="text-sm font-medium">Prescriptions:</strong>
                           <ul className="list-disc list-inside ml-4 mt-1">
                             {record.prescriptions.map((url, index) => (
                               <li key={`rec-${record.id}-presc-${index}`}>
                                 <a href={`http://localhost:5000${url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                   View Prescription {index + 1}
                                 </a>
                               </li>
                             ))}
                           </ul>
                         </div>
                       )}

                       {/* Display Lab Report Links */}
                        {record.lab_reports && record.lab_reports.length > 0 && (
                         <div className="mt-3">
                           <strong className="text-sm font-medium">Lab Reports:</strong>
                           <ul className="list-disc list-inside ml-4 mt-1">
                             {record.lab_reports.map((url, index) => (
                               <li key={`rec-${record.id}-lab-${index}`}>
                                 <a href={`http://localhost:5000${url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                   View Lab Report {index + 1}
                                 </a>
                               </li>
                             ))}
                           </ul>
                         </div>
                       )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No detailed medical records found for this patient.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

// Basic inline styles for the overlay (can be replaced with Tailwind if preferred)
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Darker overlay
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000, 
  },
   // Modal styles are now primarily handled by Tailwind classes above
  modal: { 
     // Keep basic structure if needed, but Tailwind classes handle appearance
  }
};

export default PatientDetailsModal;
