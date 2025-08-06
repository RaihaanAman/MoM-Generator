import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Loginpage";
import MainPage from "./MainPage";
import Register from "./ResisterPage";
import MeetingVidUpload from "./MeetingVidUpload";
import UploadTest from "./UploadTest";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<MeetingVidUpload />} />
        {/* <Route path="/mainPage" element={<MainPage />} /> */}
        <Route path="/meetingVidUpload" element={<MeetingVidUpload />} />
        <Route path='/upload' element={<UploadTest />}/>
      </Routes>
    </Router>
  </React.StrictMode>
);
