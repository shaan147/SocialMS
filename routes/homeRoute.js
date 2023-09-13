const express = require('express');
const axios = require('axios');
const natural = require('natural');
const Sentiment = require('sentiment'); // Import the sentiment library
const router = express.Router();
const NGrams = natural;
const wrapAsync = require('../utils/wrapAsync');

// Import the tokenizer and frequency analysis functions
const tokenizer = new natural.WordTokenizer();

function preprocessText(text) {
  // Tokenize the text
  const tokens = tokenizer.tokenize(text);
  // Perform other preprocessing steps here if needed
  return tokens;
}

function analyzeTextFrequency(textData, n, minOccurrences) {
  // Create n-grams (you can choose the n value, e.g., 1 for words, 2 for bigrams, etc.)
  const nGrams = natural.NGrams.ngrams(textData, n);

  // Calculate the frequency of each n-gram
  const nGramFrequency = {};
  nGrams.forEach((gram) => {
    const gramStr = gram.join(' ');
    nGramFrequency[gramStr] = (nGramFrequency[gramStr] || 0) + 1;
  });

  // Filter n-grams that occur at least 'minOccurrences' times
  const mostCommonWords = Object.keys(nGramFrequency).filter(
    (gram) => nGramFrequency[gram] >= minOccurrences
  );

  return mostCommonWords;
}

// Your existing /home route
router.get('/home', wrapAsync(async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Code not provided');
  }
  const appId = process.env.APP_ID;
  const appSecret = process.env.APP_SECRET;
  const redirectURI = 'http://localhost:3001/home';

  // Make a request to exchange the code for an access token
  const response = await axios.get(
    `https://graph.facebook.com/v6.0/oauth/access_token`,
    {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectURI,
        code: code,
      },
    }
  );

  if (response.data.access_token) {
    
    const userAccessToken = response.data.access_token;

    // You can use or store the access token as needed
    req.session.userAccessToken = userAccessToken;

    // Fetch user data using the user access token
    const userDataResponse = await axios.get(
      'https://graph.facebook.com/v13.0/me',
      {
        params: {
          fields:
            'id,name,email,birthday,age_range,gender,hometown,link',
          access_token: req.session.userAccessToken,
        },
      }
    );
    const userData = userDataResponse.data;

    const fetchUserFeed = await axios.get(
      'https://graph.facebook.com/v13.0/me/feed',
      {
        params: {
          access_token: req.session.userAccessToken,
        },
      }
    );

    const feedData = fetchUserFeed.data;

    // Process and analyze text frequency from the feedData
    const feedText = feedData.data.map((item) => item.message).join(' ');
    const tokens = preprocessText(feedText);
    const n = 1; // for bigrams
    const minOccurrences = 5;
    const mostCommonWords = analyzeTextFrequency(tokens, n, minOccurrences);

    // Analyze the sentiment of the text using the sentiment library
    const sentiment = new Sentiment();
    const sentimentResult = sentiment.analyze(feedText);

    res.render('./homepage', {
      userData,
      feedData,
      mostCommonWords, // Pass the most common words to the template
      sentiment: sentimentResult, // Pass the sentiment analysis result to the template
    });
  } else {
    res.status(400).send('Failed to obtain user access token');
  }
}));

module.exports = router;
