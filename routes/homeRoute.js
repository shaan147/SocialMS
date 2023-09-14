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
  // Remove punctuation and lowercase the text
  text = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').toLowerCase();

  // Tokenize the text
  const tokens = tokenizer.tokenize(text);

  // Define a list of common stopwords
  const stopwords = ["the", "and", "of", "in", "to", "a", "for", "on", "with", "as", "by", "an", "at"];

  // Filter out stopwords
  const filteredTokens = tokens.filter((token) => !stopwords.includes(token));

  return filteredTokens;
}

function analyzeTextFrequency(textData, minOccurrences) {
  // Calculate the frequency of each word
  const wordFrequency = {};
  textData.forEach((word) => {
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  });

  // Sort the wordFrequency object by frequency in descending order
  const sortedWordFrequency = Object.entries(wordFrequency).sort(
    (a, b) => b[1] - a[1]
  );

  // Filter words that occur at least 'minOccurrences' times
  const mostCommonWords = sortedWordFrequency
    .filter((entry) => entry[1] >= minOccurrences)
    .map((entry) => ({word: entry[0], count: entry[1]}));

  return { mostCommonWords, wordFrequency }; // Return both most common words and word frequency
}

router.get('/', wrapAsync(async (req, res) => {
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
  const minOccurrences = 5;
  const { mostCommonWords, wordFrequency } = analyzeTextFrequency(tokens, minOccurrences);

  // Analyze the sentiment of the text using the sentiment library
  const sentiment = new Sentiment();
  const sentimentResult = sentiment.analyze(feedText);
  // res.send(mostCommonWords)
  res.render('./homepage', {
    userData,
    feedData,
    mostCommonWords,
    wordFrequency,  
    sentiment: sentimentResult, 
  });
}));

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
    return res.redirect('/')
  } else {
    res.status(400).send('Failed to obtain user access token');
  }
}));

module.exports = router;
