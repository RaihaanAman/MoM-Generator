import React, { useState } from "react";
import axios from "axios";

const UploadTest = () => {
  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a video file!");

    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);

    try {
      const response = await axios.post("http://localhost:5000/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && Array.isArray(response.data)) {
        setTranscript(response.data);
      } else {
        alert("No transcript data received!");
      }
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-xl w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Upload a Video File</h2>

        <input
          type="file"
          accept="video/*"
          onChange={handleChange}
          className="mb-4 w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          className={`w-full py-2 px-4 rounded-xl text-white font-semibold transition duration-200 ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {loading ? "Processing..." : "Upload and Transcribe"}
        </button>

        {transcript.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-700 mb-4 text-center">
              Transcript with Speaker Diarization
            </h3>
            <ul className="space-y-3 max-h-80 overflow-y-auto px-2">
              {transcript.map((line, idx) => (
                <li
                  key={idx}
                  className="bg-gray-50 border border-gray-200 p-3 rounded-lg shadow-sm"
                >
                  <strong className="text-indigo-600">{line.speaker}:</strong> {line.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadTest;
