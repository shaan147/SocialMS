const express = require('express');
const axios = require('axios');
const natural = require('natural');
const Sentiment = require('sentiment');
const Tesseract = require('tesseract.js'); // Import the Tesseract OCR library
const router = express.Router();
const NGrams = natural;
const wrapAsync = require('../utils/wrapAsync');

const tokenizer = new natural.WordTokenizer();

function preprocessText(text) {
  text = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').toLowerCase();
  const tokens = tokenizer.tokenize(text);
  const stopwords = ["the", "da", "i", "s", "is", "and", "of", "in", "to", "a", "for", "on", "with", "as", "by", "an", "at"];
  const filteredTokens = tokens.filter((token) => !stopwords.includes(token));
  return filteredTokens;
}

function analyzeTextFrequency(textData, minOccurrences) {
  const wordFrequency = {};
  textData.forEach((word) => {
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  });
  const sortedWordFrequency = Object.entries(wordFrequency).sort(
    (a, b) => b[1] - a[1]
  );
  const mostCommonWords = sortedWordFrequency
    .filter((entry) => entry[1] >= minOccurrences)
    .map((entry) => ({ word: entry[0], count: entry[1] }));

  return { mostCommonWords, wordFrequency };
}

router.get('/', wrapAsync(async (req, res) => {
  // Fetch user data using the user access token
  const userDataResponse = await axios.get(
    'https://graph.facebook.com/v13.0/me',
    {
      params: {
        fields:
          'id,name,email,birthday,age_range,gender,hometown,link,likes,groups,picture,languages,favorite_teams,favorite_athletes,businesses,photos',
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

  // Fetch albums and photos data
  const albumsResponse = await axios.get(
    'https://graph.facebook.com/v13.0/me?fields=albums{photos{images}}',
    {
      params: {
        access_token: req.session.userAccessToken,
      },
    }
  );
  const albumsData = albumsResponse.data.albums.data;

  const feedData = fetchUserFeed.data;

  // Extract liked pages data
  const likedPagesData = userData.likes.data;
  const likedGroupsData = userData.groups.data;

  // Preprocess liked page names and descriptions
  const tokenizer = new natural.WordTokenizer();
  const stopwords = ["the", "and", "of", "in", "to", "a", "for", "on", "with", "as", "by", "an", "at"];
  const pageWords = [];
  const groupWords = [];

  likedPagesData.forEach((page) => {
    const text = (page.name + ' ' + page.description).toLowerCase();
    const tokens = tokenizer.tokenize(text);
    const filteredTokens = tokens.filter((token) => !stopwords.includes(token));
    pageWords.push(...filteredTokens);
  });

  likedGroupsData.forEach((group) => {
    const text = (group.name + ' ' + group.description).toLowerCase();
    const tokens = tokenizer.tokenize(text);
    const filteredTokens = tokens.filter((token) => !stopwords.includes(token));
    groupWords.push(...filteredTokens);
  });

  // Perform NLP analysis (TF-IDF in this example)
  const TfIdf = natural.TfIdf;
  const tfidf = new TfIdf();

  pageWords.forEach((word) => {
    tfidf.addDocument(pageWords); // Add documents for analysis
  });

  groupWords.forEach((word) => {
    tfidf.addDocument(groupWords); // Add documents for analysis
  });

  const interests = [];
  const interestsFromGroups = [];

  tfidf.listTerms(0 /* Document index to analyze */).forEach((item) => {
    // You can set a threshold for term importance to filter results
    if (item.tfidf > 0.1) {
      interests.push(item.term);
    }
  });

  tfidf.listTerms(0 /* Document index to analyze */).forEach((item) => {
    // You can set a threshold for term importance to filter results
    if (item.tfidf > 4) {
      interestsFromGroups.push(item.term);
    }
  });

  const groupinterest = interestsFromGroups[2];
  const topInterest = interests[1];

  // Extract favorite athletes and teams data
  const favoriteAthletesData = userData.favorite_athletes?.data || [];
  const favoriteTeamsData = userData.favorite_teams?.data || [];

  const athleteWords = [];
  const teamWords = [];

  favoriteAthletesData.forEach((athlete) => {
    const text = athlete.name.toLowerCase();
    const tokens = tokenizer.tokenize(text);
    const filteredTokens = tokens.filter((token) => !stopwords.includes(token));
    athleteWords.push(...filteredTokens);
  });

  favoriteTeamsData.forEach((team) => {
    const text = team.name.toLowerCase();
    const tokens = tokenizer.tokenize(text);
    const filteredTokens = tokens.filter((token) => !stopwords.includes(token));
    teamWords.push(...filteredTokens);
  });

  // Perform NLP analysis (TF-IDF) on athleteWords and teamWords
  const athleteTfidf = new TfIdf();
  athleteWords.forEach((word) => {
    athleteTfidf.addDocument(athleteWords);
  });

  const teamTfidf = new TfIdf();
  teamWords.forEach((word) => {
    teamTfidf.addDocument(teamWords);
  });

  const athleteInterests = [];
  const teamInterests = [];

  athleteTfidf.listTerms(0 /* Document index to analyze */).forEach((item) => {
    // You can set a threshold for term importance to filter results
    if (item.tfidf > 0.1) {
      athleteInterests.push(item.term);
    }
  });

  teamTfidf.listTerms(0 /* Document index to analyze */).forEach((item) => {
    // You can set a threshold for term importance to filter results
    if (item.tfidf > 0.1) {
      teamInterests.push(item.term);
    }
  });

  const topAthleteInterest = athleteInterests[0]; // You can modify this based on your criteria
  const topTeamInterest = teamInterests[0]; // You can modify this based on your criteria

  // Analyze the user's feed data as before
  const feedText = feedData.data.map((item) => item.message).join(' ');
  const tokens = preprocessText(feedText);
  const minOccurrences = 5;
  const { mostCommonWords, wordFrequency } = analyzeTextFrequency(tokens, minOccurrences);

  const sentiment = new Sentiment();
  const sentimentResult = sentiment.analyze(feedText);

  res.render('./homepage', {
    userData,
    feedData,
    mostCommonWords,
    wordFrequency,
    sentiment: sentimentResult,
    interest: topInterest, 
    interestsFromGroups: groupinterest,
    albumsData,
    topAthleteInterest,
    topTeamInterest,
    languages: userData.languages,
  });
}));

router.get('/home', wrapAsync(async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Code not provided');
  }
  const appId = process.env.APP_ID;
  const appSecret = process.env.APP_SECRET;
  const redirectURI = 'http://localhost:3001/home';

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
    req.session.userAccessToken = userAccessToken;
    return res.redirect('/')
  } else {
    res.status(400).send('Failed to obtain user access token');
  }
}));

module.exports = router;
