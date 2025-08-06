import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(null);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post("http://127.0.0.1:5000/register", { username, password });

      if (response.data.status === "success") {
        setMessage("✅ Registration Successful!");
        setIsSuccess(true);
        setTimeout(() => navigate("/"), 1000);
      }
    } catch (error) {
      setMessage("❌ " + (error.response?.data?.message || "Registration failed!"));
      setIsSuccess(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-purple-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/80 border border-gray-200 backdrop-blur-md rounded-2xl shadow-xl p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          Register for Minutes of Meeting Generator
        </h1>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              placeholder="Enter username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition"
          >
            Register
          </button>
        </form>

        {message && (
          <div
            className={`text-sm text-center p-2 rounded-lg ${
              isSuccess ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
