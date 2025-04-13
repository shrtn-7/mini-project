import { useState } from "react";

function MedicalRecords() {
  const [records, setRecords] = useState([]);

  const handleFileUpload = (event) => {
    const files = event.target.files;
    const uploadedFiles = Array.from(files).map((file) => ({ name: file.name, url: URL.createObjectURL(file) }));
    setRecords([...records, ...uploadedFiles]);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">Medical Records</h2>
      <input type="file" multiple onChange={handleFileUpload} className="mt-4 border p-2" />
      <ul className="mt-4">
        {records.map((record, index) => (
          <li key={index} className="border p-2 mb-2">
            <a href={record.url} target="_blank" rel="noopener noreferrer">{record.name}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MedicalRecords;
