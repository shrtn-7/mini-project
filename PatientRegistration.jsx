import { useState } from "react";

const PatientRegistration = () => {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    email: "",
    phone: "",
    address: "",
    medicalHistory: "",
    file: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, file: e.target.files[0] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Registration successful!");
    console.log(formData);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-4">
          Patient Registration
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            required
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md"
          />
          <input
            type="number"
            name="age"
            placeholder="Age"
            required
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md"
          />
          <select
            name="gender"
            required
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md"
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md"
          />
          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            required
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md"
          />
          <textarea
            name="address"
            placeholder="Address"
            required
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md resize-none"
          ></textarea>
          <textarea
            name="medicalHistory"
            placeholder="Medical History"
            required
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md resize-none"
          ></textarea>
          <label className="block text-gray-700 text-sm font-semibold">
            Upload Medical Scan (PDF/Image):
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md"
          />
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-md transition duration-200"
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
};

export default PatientRegistration;
