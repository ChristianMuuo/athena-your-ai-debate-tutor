import json
import os
# Installation: pip install gTTS
from gtts import gTTS

def generate_unlimited_podcast(json_history_path, output_filename="debate_recap.mp3"):
    """
    Converts a debate session JSON into an unlimited MP3 podcast.
    Uses Google Translate's TTS (via gTTS) - free and high-limit.
    """
    try:
        with open(json_history_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        messages = data.get('messages', [])
        topic = data.get('topic', 'Debate Recap')
        
        full_text = f"Welcome to the ATHENA Debate Recap. Today's topic is: {topic}. \n\n"
        
        for msg in messages:
            role = "Athena" if msg['role'] == 'assistant' else "Participant"
            content = msg['content']
            full_text += f"{role} says: {content}. \n\n"
            
        full_text += "This concludes our recap. Sharpen your mind, and see you in the next debate."
        
        print(f"Generating audio for topic: {topic}...")
        tts = gTTS(text=full_text, lang='en', slow=False)
        tts.save(output_filename)
        
        print(f"✅ Success! Podcast saved to: {output_filename}")
        print(f"File size: {os.path.getsize(output_filename) / 1024:.2f} KB")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    # Example usage:
    # 1. Export your debate session as 'session.json' from the app
    # 2. Run: python podcast_gen.py
    if os.path.exists("session.json"):
        generate_unlimited_podcast("session.json")
    else:
        print("Please provide a 'session.json' file exported from Athena.")
