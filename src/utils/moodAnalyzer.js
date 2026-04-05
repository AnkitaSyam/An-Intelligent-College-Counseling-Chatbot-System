export const analyzeMood = (text) => {
    if (!text) return { score: 3, emotion: 'Calm' };

    const lowerStr = text.toLowerCase();
    
    let scores = { happy: 0, calm: 0, anxious: 0, sad: 0 };
    
    const dic = {
        happy: ['happy', 'great', 'awesome', 'good', 'excite', 'love', 'amazing', 'glad', 'joy', 'wonderful', 'perfect', 'yay', 'best', 'enjoy', 'positive'],
        calm: ['okay', 'fine', 'alright', 'calm', 'relax', 'normal', 'quiet', 'peace', 'chill', 'sooth'],
        anxious: ['anxious', 'worried', 'worry', 'nervous', 'stress', 'scare', 'fear', 'panic', 'overwhelm', 'pressure', 'deadline', 'exam', 'hard', 'stuck', 'confuse'],
        sad: ['sad', 'depress', 'cry', 'hopeless', 'terrible', 'awful', 'bad', 'fail', 'lonely', 'hate', 'grief', 'miserable', 'exhaust', 'tired', 'upset', 'mad', 'angry', 'negative', 'down']
    };

    for (const [emotion, words] of Object.entries(dic)) {
        words.forEach(word => {
            // Removing \b boundary to catch things like "happyyy" or "sadness"
            const regex = new RegExp(word, 'gi');
            const matches = lowerStr.match(regex);
            if (matches) scores[emotion] += matches.length;
        });
    }

    // Default if no matches based on an optimistic baseline
    if (Object.values(scores).every(v => v === 0)) {
        return { score: 3, emotion: 'Calm' };
    }

    // Find the emotion with highest score
    let maxEmotion = 'calm';
    let maxVal = -1;
    for (const [emotion, val] of Object.entries(scores)) {
        if (val > maxVal) {
            maxVal = val;
            maxEmotion = emotion;
        }
    }

    const map = { happy: 4, calm: 3, anxious: 2, sad: 1 };
    
    return {
        score: map[maxEmotion],
        emotion: maxEmotion.charAt(0).toUpperCase() + maxEmotion.slice(1)
    };
};
