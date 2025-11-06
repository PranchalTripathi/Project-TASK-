import React from 'react';

const EditEventModal = ({ isOpen, onClose, event }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="glass-card p-6 rounded-2xl max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Edit Event</h2>
        <p className="text-gray-600 mb-4">Edit event form coming soon...</p>
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
      </div>
    </div>
  );
};

export default EditEventModal;