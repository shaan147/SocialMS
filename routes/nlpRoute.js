// routes/nlpRoute.js
const express = require("express");
const router = express.Router();
const natural = require("natural");
const { FreqDist } = natural;

// Define your NLP-related route handlers here
const tokenizer = new natural.WordTokenizer();
function preprocessText(text) {
  // Tokenize the text
  const tokens = tokenizer.tokenize(text);
  // Perform other preprocessing steps here
  return tokens;
}
function analyzeTextFrequency(textData) {
  const freq = new FreqDist(textData);
  const mostCommonWords = freq.mostCommon();
  return mostCommonWords;
}
router.post("/analyze-text", (req, res) => {
  const { textData } = req.body;

  // Preprocess the text data
  const preprocessedText = preprocessText(textData);

  // Analyze the text for most common words
  const mostCommonWords = analyzeTextFrequency(preprocessedText);

  res.json({ mostCommonWords });
});

module.exports = router;
