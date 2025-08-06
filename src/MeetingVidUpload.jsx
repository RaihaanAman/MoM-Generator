import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './style/MeetingVidUpload.css';

const MeetingVidUpload = () => {
  const [videoFile, setVideoFile] = useState(null);
  const [videoURL, setVideoURL] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [transcriptList, setTranscriptList] = useState([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [summary, setSummary] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const transcriptRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io("http://localhost:5000");

    socketRef.current.on("transcription_update", (data) => {
      setTranscript((prev) => prev + data.text + " ");
    });

    socketRef.current.on("transcription_complete", (data) => {
      setIsLoading(false);
      if (data.full_transcript) {
        setTranscript(data.full_transcript);
      }
    });

    socketRef.current.on("transcription_error", (data) => {
      setErrorMessage(data.error);
      setIsLoading(false);
    });

    socketRef.current.on("summary_ready", (data) => {
      setSummary(data.bullet_points || data.summary);
      setShowSummary(true);
      setIsGeneratingSummary(false);
    });

    socketRef.current.on("summary_error", (data) => {
      setErrorMessage(data.error);
      setIsGeneratingSummary(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setVideoFile(file);
      setVideoURL(URL.createObjectURL(file));
      resetState();
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      setVideoFile(file);
      setVideoURL(URL.createObjectURL(file));
      resetState();
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const resetState = () => {
    setTranscript('');
    setTranscriptList([]);
    setShowTranscript(false);
    setShowSummary(false);
    setSummary('');
    setErrorMessage('');
  };

  const handleSummarize = async () => {
    if (!videoFile) return;

    setIsLoading(true);
    setErrorMessage('');
    setShowTranscript(true);

    const formData = new FormData();
    formData.append('video', videoFile);

    try {
      const response = await fetch("http://localhost:5000/meetingAudioSummarizer", {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
    } catch (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
    }
  };

  const handleDiarization = async () => {
    if (!videoFile) return;

    setIsLoading(true);
    setErrorMessage('');
    setShowTranscript(true);

    const formData = new FormData();
    formData.append('file', videoFile);

    try {
      const response = await fetch("http://localhost:5000/upload", {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setTranscriptList(data);
      } else {
        throw new Error("Invalid diarization data received");
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!transcript && transcriptList.length === 0) {
      setErrorMessage('No transcript available to summarize');
      return;
    }

    setIsGeneratingSummary(true);
    setErrorMessage('');

    try {
      let fullText = transcript;

      if (transcriptList.length > 0) {
        fullText = transcriptList.map(item => `${item.speaker}: ${item.text}`).join('\n');
      }

      const response = await fetch("http://localhost:5000/summaryBART", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: fullText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setSummary(data.bullet_points || data.summary || '');
      setShowSummary(true);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
  
      // Title
      doc.setFontSize(20);
      doc.text("Minutes of the Meeting", pageWidth / 2, 20, { align: 'center' });
  
      // Metadata
      doc.setFontSize(12);
      const today = new Date().toLocaleDateString();
      const meetingName = videoFile?.name || "Meeting";
      const attendeeCount = new Set(transcriptList.map(item => item.speaker)).size || 'N/A';
  
      doc.text(`Meeting Name: ${meetingName}`, 14, 35);
      doc.text(`Generated on: ${today}`, 14, 43);
      doc.text(`Number of Attendees: ${attendeeCount}`, 14, 51);
  
      let y = 60;
  
      // Speaker-wise Transcript Section
      if (transcriptList.length > 0) {
        doc.setFontSize(14);
        doc.text("Speaker-wise Transcript (Diarization):", 14, y);
        y += 5;
  
        autoTable(doc, {
          startY: y + 5,
          head: [['Speaker', 'Content']],
          body: transcriptList.map(item => [item.speaker, item.text]),
          theme: 'striped',
          headStyles: { fillColor: [52, 152, 219], textColor: 255 },
          styles: { overflow: 'linebreak', cellPadding: 4 },
          margin: { left: 14, right: 14 }
        });
  
        y = doc.lastAutoTable.finalY + 10;
      }
  
      // Summary Section
      if (summary) {
        doc.setFontSize(14);
        doc.text("Summary:", 14, y);
  
        const summaryLines = doc.splitTextToSize(summary, pageWidth - 28);
        doc.setFontSize(12);
        doc.text(summaryLines, 14, y + 8);
      }
  
      // Save
      doc.save(meetingName.replace(/\.[^/.]+$/, '') + '_minutes.pdf');
    } catch (error) {
      setErrorMessage("Failed to generate PDF: " + error.message);
    }
  };
  
  return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6 flex items-center justify-center">
          <div className="w-full max-w-4xl backdrop-blur-lg bg-white/70 border border-gray-200 rounded-2xl shadow-2xl p-8 space-y-6">
            <h2 className="text-3xl font-semibold text-gray-800 text-center tracking-tight">
              Upload a Meeting Video
            </h2>
    
            <div
              className={`transition border-2 border-dashed rounded-xl p-6 text-center cursor-pointer ${
                isDragging ? 'bg-blue-100 border-blue-400' : 'bg-white border-gray-300'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{ display: videoURL && !isLoading ? 'none' : 'block' }} // Hide this when video is uploaded and not loading
            >
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
                id="videoUpload"
              />
              <label htmlFor="videoUpload" className="block cursor-pointer text-gray-500">
                <div className="flex justify-center mb-2">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 5V19M5 12H19"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                Drag & Drop a video file here <br /> or{' '}
                <span className="text-blue-600 underline">click to browse</span>
              </label>
            </div>
    
            {videoURL && (
              <div className="mt-4">
                <video controls className="w-full rounded-xl shadow-md">
                  <source src={videoURL} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                
                {/* Add a change video button for better UX */}
                <div className="mt-2 text-right">
                  <label htmlFor="videoUpload" className="inline-block text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                    Change video
                  </label>
                </div>
              </div>
            )}
    
            {videoFile && (
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <button
                  onClick={handleSummarize}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-xl disabled:opacity-50 transition"
                >
                  {isLoading ? 'Processing...' : 'Transcribe'}
                </button>
                <button
                  onClick={handleDiarization}
                  disabled={isLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-xl disabled:opacity-50 transition"
                >
                  {isLoading ? 'Processing...' : 'Diarize'}
                </button>
              </div>
            )}
    
            {showTranscript && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-700">Meeting Transcript</h3>
    
                {isLoading && !errorMessage && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent animate-spin rounded-full"></div>
                    Transcribing... please wait
                  </div>
                )}
    
                {errorMessage && (
                  <div className="p-3 bg-red-100 text-red-700 rounded-lg border border-red-300">
                    {errorMessage}
                  </div>
                )}
    
                {transcript && (
                  <div
                    className="bg-white/80 border border-gray-300 p-4 rounded-xl shadow-inner h-48 overflow-y-auto whitespace-pre-wrap text-sm font-mono text-gray-800"
                    ref={transcriptRef}
                  >
                    {transcript}
                    {isLoading && !errorMessage && <span className="animate-pulse">|</span>}
                  </div>
                )}
    
                {transcriptList.length > 0 && (
                  <ul className="space-y-2 bg-white/80 border border-gray-300 p-4 rounded-xl shadow-inner max-h-80 overflow-y-auto text-sm text-gray-800">
                    {transcriptList.map((line, idx) => (
                      <li key={idx} className="bg-gray-50 border border-gray-200 p-3 rounded-lg shadow-sm">
                        <strong className="text-indigo-600">{line.speaker}:</strong> {line.text}
                      </li>
                    ))}
                  </ul>
                )}
    
                {!isLoading && (transcript || transcriptList.length > 0) && (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingSummary}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-xl disabled:opacity-50 transition"
                    >
                      {isGeneratingSummary ? 'Generating Summary...' : 'Generate Summary'}
                    </button>
                  </div>
                )}
    
                {showSummary && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-700 mt-4">Summary</h3>
                    <div className="bg-white border border-gray-200 p-4 rounded-xl text-gray-800 text-sm space-y-2">
                      {summary.split('\n').filter(point => point.trim()).map((point, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                          <p>{point}</p>
                        </div>
                      ))}
                    </div>
    
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleDownloadPDF}
                        className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-xl transition"
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    };
    
    export default MeetingVidUpload;
