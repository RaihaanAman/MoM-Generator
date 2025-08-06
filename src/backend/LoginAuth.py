from flask import Flask, request, jsonify, redirect, url_for
from flask_cors import CORS
from pymongo import MongoClient
import yt_dlp
import os
os.environ["SPEECHBRAIN_LOCAL_FILE_STRATEGY"] = "copy"
import whisper
import sys
import time
import subprocess
from pydub import AudioSegment
from flask_socketio import SocketIO
from transformers import pipeline
import torch
import wave
import datetime
import contextlib
import numpy as np
from pyannote.audio import Pipeline
from werkzeug.utils import secure_filename
import torchaudio
import whisper
from transformers import AutoTokenizer, pipeline
from dotenv import load_dotenv


load_dotenv()

app = Flask(__name__)

socketio = SocketIO(app, cors_allowed_origins="*")  
CORS(app)
UPLOAD_FOLDER = 'uploads'

# mongo_uri = os.getenv("MONGODB_URI")

# # Ensure mongo_uri is correctly fetched
# if mongo_uri is None:
#     print("MongoDB URI is not set.")
# else:
#     # Initialize MongoDB client
#     client = MongoClient(mongo_uri)
    
#     # Access the database and collection
#     db = client["myDatabase"]
#     users_collection = db["users"]

#     print("MongoDB connected successfully")

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

#Model loading


#Before WhisperX
device = "cuda" if torch.cuda.is_available() else "cpu"

# Load models once at startup
diarization_pipeline = Pipeline.from_pretrained(
    "pyannote/speaker-diarization@2.1",
    use_auth_token=os.getenv("HUGGINGFACE_TOKEN")
)
diarization_pipeline.to(torch.device(device))

device = "cuda" if torch.cuda.is_available() else "cpu"

@app.route("/")
def root():
    return redirect(url_for("upload"))


# @app.route('/register', methods=['POST'])
# def register():
#     data = request.json
#     username = data.get("username")
#     password = data.get("password")

#     if not username or not password:
#         return jsonify({"status": "error", "message": "Username and password required"}), 400

#     existing_user = users_collection.find_one({"username": username})
#     if existing_user:
#         return jsonify({"status": "error", "message": "Username already taken"}), 409

#     users_collection.insert_one({"username": username, "password": password})
#     print(f"\n✅ User Registered: {username}")
#     return jsonify({"status": "success", "message": "User registered"}), 201

# @app.route('/login', methods=['POST'])
# def login():
#     data = request.json
#     username = data.get("username")
#     password = data.get("password")

#     print(f"\n🔍 Login Attempt: Username={username}, Password={password}")

#     existing_user = users_collection.find_one({"username": username})

#     if not existing_user:
#         print("❌ User not found in DB")
#         return jsonify({"status": "error", "message": "Invalid Credentials"}), 401

#     stored_password = existing_user.get("password")
#     print(f"🛠️ Stored Password in DB: {stored_password}")

#     if stored_password != password:
#         print("❌ Incorrect password")
#         return jsonify({"status": "error", "message": "Invalid Credentials"}), 401

#     print("✅ Login Successful")
#     return jsonify({"status": "success", "message": "Login Successful!"}), 200

@app.route('/get_video_details',methods=['POST'])
def get_video_details():
    data = request.get_json()
    video_url = data.get('url')

    try:
        ydl_opts = {
            'format': 'bestaudio/best',  # Download best available audio
            'outtmpl': 'downloads/%(title)s.%(ext)s',  # Save in downloads folder
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'wav',  
                'preferredquality': '0',  # "0" for best quality
            }],
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            audio_filename = ydl.prepare_filename(info).replace(info['ext'], 'wav') 

        return jsonify({'message': 'Download successful', 'file_path': audio_filename})

    except Exception as e:
        return jsonify({'error': str(e)}), 400
    
@app.route('/summarize_audio',methods=["POST"]) #testing function for testing purpose
def summarize_audio():
    downloads_folder = "downloads"
    
    if not os.path.exists(downloads_folder):
        return jsonify({"error": "Downloads folder not found"}), 404

    audio_files = [os.path.join(downloads_folder, f) for f in os.listdir(downloads_folder) if f.endswith((".mp3", ".wav"))]

    if not audio_files:
        return jsonify({"error": "No audio files found"}), 404
    latest_audio = max(audio_files, key=os.path.getmtime)

    print(f"\n[Processing file: {latest_audio}]\n")

    model = whisper.load_model("large-v3-turbo")

    print("\n[Transcribing...]\n")

    result = model.transcribe(latest_audio)
    transcription = result["text"]

    print("\n[Transcription Complete]\n")

    return jsonify({"summary": transcription.strip()}) 




@app.route('/meetingAudioSummarizer', methods=["POST"])
def transcribeAudio():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400

    video_file = request.files['video']
    if video_file.filename == '':
        return jsonify({'error': 'No video file selected'}), 400

    vids_folder = "vids"
    os.makedirs(vids_folder, exist_ok=True)

    video_path = os.path.join(vids_folder, video_file.filename)
    video_file.save(video_path)

    audio_path_wav = os.path.join(vids_folder, "temp_audio.wav")
    try:
        subprocess.run(['ffmpeg', '-i', video_path, '-q:a', '0', '-map', 'a', '-ar', '16000', '-ac', '1', audio_path_wav], 
                       check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        return jsonify({'error': f'Failed to extract audio: {str(e)}'}), 500

    #websocket
    socketio.start_background_task(target=transcribe_audio_stream, audio_path=audio_path_wav, video_filename=video_file.filename)

    return jsonify({'message': 'Transcription started. Connect via WebSocket to receive real-time updates.'})

def transcribe_audio_stream(audio_path, video_filename):
    """Splits audio into chunks and sends real-time transcription via websocket"""
    model = whisper.load_model("large-v3-turbo")
    audio = AudioSegment.from_file(audio_path)
    chunk_length_ms = 5000  # 5-second chunks

    # Open a text file to store the transcript
    transcript_file_path = os.path.join("vids", "transcription_output.txt")
    with open(transcript_file_path, 'w') as transcript_file:
        for i in range(0, len(audio), chunk_length_ms):
            chunk = audio[i : i + chunk_length_ms]
            chunk_path = f"chunk_{i//1000}.wav"
            chunk.export(chunk_path, format="wav")

            try:
                result = model.transcribe(chunk_path)
                transcript_text = result["text"]

                # Write the transcription to the file
                transcript_file.write(transcript_text + "\n")

                # Send transcript to frontend via WebSocket
                socketio.emit('transcription_update', {'text': transcript_text})

                os.remove(chunk_path)

            except Exception as e:
                socketio.emit('transcription_error', {'error': str(e)})

        socketio.emit('transcription_complete', {'message': 'Transcription finished.'})

    


@app.route('/upload', methods=['POST'])
def upload():
    whisper_model = whisper.load_model("large-v3-turbo", device=device)
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    filename = secure_filename(file.filename)

    video_path = os.path.join(UPLOAD_FOLDER, filename)
    audio_path = os.path.join(UPLOAD_FOLDER, 'converted.wav')

    file.save(video_path)

    # Step 1: Extract audio using ffmpeg
    try:
        ffmpeg_command = [
            "ffmpeg",
            "-i", video_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            audio_path,
            "-y"
        ]
        subprocess.run(ffmpeg_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

    except subprocess.CalledProcessError as e:
        return jsonify({'error': f'FFmpeg failed: {e.stderr.decode()}'}), 500

    # Step 2: Run diarization
    try:
        diarization = diarization_pipeline(audio_path)
    except Exception as e:
        return jsonify({'error': f'Diarization failed: {str(e)}'}), 500

    # Step 3: Transcribe using Whisper
    try:
        result = whisper_model.transcribe(audio_path, word_timestamps=True)
    except Exception as e:
        return jsonify({'error': f'Transcription failed: {str(e)}'}), 500

    # Step 4: Merge consecutive same-speaker segments
    transcript = []
    last_speaker = None

    for segment in result['segments']:
        segment_start = segment['start']
        segment_end = segment['end']
        text = segment['text']
        speaker = "Unknown"

        for turn, _, label in diarization.itertracks(yield_label=True):
            if turn.start <= segment_start <= turn.end or turn.start <= segment_end <= turn.end:
                speaker = label
                break

        if transcript and speaker == last_speaker:
            transcript[-1]["text"] += " " + text.strip()
        else:
            transcript.append({"speaker": speaker, "text": text.strip()})
            last_speaker = speaker
    print(transcript)

    # **Remove the audio file after processing**
    if os.path.exists(audio_path):
        os.remove(audio_path)
        print(f"✅ Removed audio file: {audio_path}")

    # **Remove the video file after processing**
    if os.path.exists(video_path):
        os.remove(video_path)
        print(f"✅ Removed video file: {video_path}")

    return jsonify(transcript)




@app.route('/summaryBART', methods=['POST'])
def summaryBART():
    import os
    from flask import jsonify
    import shutil
    from transformers import AutoTokenizer, pipeline

    file_path = os.path.join("vids", "transcription_output.txt")

    if not os.path.exists(file_path):
        return jsonify({"error": "Transcription file not found"}), 404

    with open(file_path, 'r', encoding='utf-8') as file:
        long_paragraph = file.read().strip()

    if not long_paragraph:
        return jsonify({"error": "Transcription file is empty"}), 400

    # Lazy-load tokenizer and summarizer
    tokenizer = AutoTokenizer.from_pretrained("facebook/bart-large-cnn")
    summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
    max_token_length = tokenizer.model_max_length

    def chunk_text_by_tokens(text, tokenizer, max_length=1000):
        max_chunk_length = max_length - 100
        tokens = tokenizer.encode(text)

        chunks = []
        current_chunk = []
        current_length = 0

        for token in tokens:
            if current_length < max_chunk_length:
                current_chunk.append(token)
                current_length += 1
            else:
                chunks.append(tokenizer.decode(current_chunk, skip_special_tokens=True))
                current_chunk = [token]
                current_length = 1

        if current_chunk:
            chunks.append(tokenizer.decode(current_chunk, skip_special_tokens=True))

        return chunks

    def summarize_text(text):
        chunks = chunk_text_by_tokens(text, tokenizer)

        summaries = []
        for chunk in chunks:
            summary = summarizer(chunk, max_length=250, min_length=100, do_sample=False)[0]['summary_text']
            summaries.append(summary)

        combined_summary = " ".join(summaries)

        if len(tokenizer.encode(combined_summary)) > max_token_length:
            final_summary = summarizer(
                combined_summary,
                max_length=500,
                min_length=150,
                do_sample=False
            )[0]['summary_text']
        else:
            final_summary = combined_summary

        return final_summary

    # Do the summarization
    summary = summarize_text(long_paragraph)
    print(summary)

    # ✅ Clean up transcription file after summarization
    folder_path = "vids"
    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.remove(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
            print(f"✅ Removed: {file_path}")
        except Exception as e:
            print(f"⚠️ Failed to delete {file_path}: {e}")

        
    return jsonify({"summary": summary})



if __name__ == "__main__":
    if not os.path.exists('downloads'):
        os.makedirs('downloads')
    socketio.run(debug=True, host='0.0.0.0', port=5000)
