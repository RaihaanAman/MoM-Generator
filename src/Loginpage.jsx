import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post("http://127.0.0.1:5000/login", { username, password });

      if (response.data.status === "success") {
        setMessage("Login Successful!");
        setIsSuccess(true);
        setTimeout(() => navigate("/meetingVidUpload"), 1000);
      } else {
        setMessage("Invalid Credentials!");
        setIsSuccess(false);
      }
    } catch (error) {
      console.error("Login error:", error.response ? error.response.data : error.message);
      setMessage("Invalid Credentials. Try again!");
      setIsSuccess(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-sky-50 to-blue-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/80 border border-gray-200 backdrop-blur-md rounded-2xl shadow-xl p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          Minutes of Meeting Generator
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              placeholder="Enter username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition"
          >
            Login
          </button>
        </form>

        {message && (
          <div
            className={`text-sm text-center p-2 rounded-lg ${
              isSuccess ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100"
            }`}
          >
            {isSuccess ? "✅" : "❌"} {message}
          </div>
        )}

        <div className="text-center pt-4">
          <p className="text-sm text-gray-600">Don't have an account?</p>
          <button
            className="mt-2 text-blue-600 hover:underline font-medium"
            onClick={() => navigate("/register")}
          >
            Register Here
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
