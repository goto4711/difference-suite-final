import os
import random
import datetime

# Configuration
OUTPUT_DIR = "sample_data/election_tweets"
COUNT = 50

# Content Templates
CANDIDATES = ["Senator Smith", "Governor Jones", "The Incumbent", "The Challenger"]
TOPICS = ["economy", "healthcare", "immigration", "climate change", "education", "corruption"]
HASHTAGS = ["#Vote2024", "#ElectionDay", "#Smith2024", "#JonesForFuture", "#FakeNews", "#DebateNight", "#Democracy"]
SENTIMENTS = ["positive", "negative", "neutral", "fearful", "angry"]

TEMPLATES = [
    "I can't believe {candidate} said that about {topic}! This is why we need change. {hashtag}",
    "{candidate} is the only one who cares about {topic}. {hashtag}",
    "Just read the latest polls. {candidate} is surging in the swing states! {hashtag}",
    "Why is the media ignoring the {topic} crisis? It's all a distraction. {hashtag}",
    "Vote for {candidate} if you want to save our {topic}. {hashtag}",
    "The debate last night was a disaster for {candidate}. {hashtag} #politics",
    "Breaking: New scandal involving {candidate} and {topic}. Unbelievable.",
    "I'm voting for {candidate} because they have a plan for {topic}. {hashtag}",
    "Whatever happens, we must protect our democracy. Go vote! {hashtag}",
    "{candidate} is a puppet of the lobbyists. Wake up sheeple! {hashtag}",
    "My family is divided. Half voting for Smith, half for Jones. Discussing {topic} is banned at dinner.",
    "The economy is the only thing that matters. {candidate} gets it. {hashtag}",
    "Climate change is real, but {candidate} ignores it. {hashtag} #ClimateAction",
    "Can we just fast forward to after the election? I'm tired of the ads about {topic}.",
    "Don't forget to register to vote! Deadlines are approaching. {hashtag}"
]

def generate_tweet():
    candidate = random.choice(CANDIDATES)
    topic = random.choice(TOPICS)
    hashtag = random.choice(HASHTAGS)
    template = random.choice(TEMPLATES)
    
    text = template.format(candidate=candidate, topic=topic, hashtag=hashtag)
    
    # Add random noise/variations
    if random.random() < 0.2:
        text = text.upper()
    if random.random() < 0.1:
        text += " !!!"
        
    return text

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        
    print(f"Generating {COUNT} tweets in {OUTPUT_DIR}...")
    
    for i in range(COUNT):
        text = generate_tweet()
        # Create filename: tweet_01.txt, tweet_02.txt...
        filename = f"tweet_{i+1:03d}.txt"
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        with open(filepath, "w") as f:
            f.write(text)
            
    print("Done.")

if __name__ == "__main__":
    main()
