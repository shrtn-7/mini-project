// components/PatientDetailsModal.jsx
import React from 'react';

function PatientDetailsModal({ isOpen, onClose, data, isLoading }) {
  if (!isOpen) return null;

  const { profile, records } = data || {}; // Destructure safely

  return (
    // Basic Modal structure (you might want a library like react-modal for better features)
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button onClick={onClose} style={styles.closeButton}>X</button>
        <h2 className="text-2xl font-bold mb-4">Patient Details</h2>

        {isLoading ? (
          <p>Loading patient data...</p>
        ) : (
          <>
            {profile ? (
              <div className="mb-6 border-b pb-4">
                <h3 className="text-xl font-semibold mb-2">Profile</h3>
                <p><strong>Name:</strong> {profile.name}</p>
                <p><strong>Email:</strong> {profile.email}</p>
                {/* Add any other relevant profile fields */}
              </div>
            ) : (
              <p>Could not load patient profile.</p>
            )}

            <div>
              <h3 className="text-xl font-semibold mb-2">Medical Records</h3>
              {records && records.length > 0 ? (
                <ul className="space-y-3">
                  {records.map((record) => (
                    <li key={record.id} className="border p-3 rounded bg-gray-50">
                      <p><strong>Date:</strong> {new Date(record.created_at).toLocaleDateString()}</p>
                      <p><strong>Diagnosis:</strong></p>
                      <p className="ml-2 whitespace-pre-wrap">{record.diagnosis || 'N/A'}</p> {/* Handle potentially empty text */}
                      <p className="mt-1"><strong>Prescription:</strong></p>
                      <p className="ml-2 whitespace-pre-wrap">{record.prescription || 'N/A'}</p>
                      {/* Link to actual file if you implement file uploads later */}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No medical records found for this patient.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Basic inline styles for the modal - consider moving to CSS/Tailwind
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000, // Ensure it's on top
  },
  modal: {
    backgroundColor: '#fff',
    padding: '25px',
    borderRadius: '8px',
    position: 'relative',
    width: '90%',
    maxWidth: '600px', // Limit modal width
    maxHeight: '80vh', // Limit modal height
    overflowY: 'auto', // Allow scrolling if content exceeds height
  },
  closeButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    // background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
  },
};

export default PatientDetailsModal;