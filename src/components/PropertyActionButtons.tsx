'use client';

export default function PropertyActionButtons() {
  const scrollToForm = () => {
    const formSection = document.getElementById('property-inquiry-form');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.warn('PropertyActionButtons: Could not find element with id "property-inquiry-form"');
    }
  };

  const handleSaveProperty = () => {
    // Save property functionality - placeholder for future implementation
    console.log('Save property feature coming soon');
  };

  return (
    <div className="space-y-3">
      <button 
        onClick={scrollToForm}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-semibold transition-colors"
      >
        Schedule a Tour
      </button>
      <button 
        onClick={scrollToForm}
        className="w-full border-2 border-blue-600 text-blue-600 hover:bg-blue-50 py-3 rounded-md font-semibold transition-colors"
      >
        Request Information
      </button>
      <button 
        onClick={handleSaveProperty}
        className="w-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-md font-semibold transition-colors"
      >
        Save Property
      </button>
    </div>
  );
}
