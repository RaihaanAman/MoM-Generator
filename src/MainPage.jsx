import React, { useState } from 'react';
import './style/MainPage.css';

const MainPage = () => {
  const [url, setUrl] = useState('');
  const [videoDetails, setVideoDetails] = useState(null);
  const [audioDownloaded, setAudioDownloaded] = useState(false);
  const [summary, setSummary] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:5000/get_video_details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        const data = await response.json();
        setVideoDetails(data);
        setAudioDownloaded(true); 
      } else {
        console.error('Failed to fetch video details');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSummarize = async () => {
    try {
      const response = await fetch('http://localhost:5000/summarize_audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      } else {
        console.error('Failed to summarize audio');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label>Enter the video URL</label>
        <input
          type="text"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit">Get Video Details</button>
      </form>

      {videoDetails && (
        <div>
          <h2>Video Details:</h2>
          <p>Title: {videoDetails.title}</p>
          <p>Description: {videoDetails.description}</p>
          <img src={videoDetails.thumbnail} alt="Thumbnail" />
          <p>
            URL:{' '}
            <a href={videoDetails.url} target="_blank" rel="noopener noreferrer">
              {videoDetails.url}
            </a>
          </p>
        </div>
      )}

      {audioDownloaded && (
        <div>
          <p style={{ color: 'balck',fontWeight:'bolder' }}>Audio downloaded successfully!</p>
          <button onClick={handleSummarize}>Summarize</button>
        </div>
      )}

      {summary && (
        <div>
          <h2>Summary:</h2>
          <p style={{color:'white',fontWeight:'bolder'}}>{summary}</p>
        </div>
      )}
    </div>
  );
};

export default MainPage;
