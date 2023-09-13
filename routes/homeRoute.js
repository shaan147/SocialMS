const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/home', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('Code not provided');
    }
    const appId = process.env.APP_ID;
    const appSecret = process.env.APP_SECRET;
    const redirectURI = 'http://localhost:3001/home';
    // Make a request to exchange the code for an access token
    const response = await axios.get(`https://graph.facebook.com/v6.0/oauth/access_token`, {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectURI,
        code: code,
      },
    });
    if (response.data.access_token) {
      // You have the user access token here
      const userAccessToken = response.data.access_token;
      // Fetch user data using the user access token
      const userDataResponse = await axios.get(
        'https://graph.facebook.com/v13.0/me',
        {
          params: {
            fields:
              'id,name,email,birthday,age_range,gender,hometown,link',
            access_token: userAccessToken,
          },
        }
      );
      const userData = userDataResponse.data;

      const fetchUserFeed = await axios.get('https://graph.facebook.com/v13.0/me/feed', {
        params: {
          access_token: userAccessToken,
        }
      });

      const feedData = fetchUserFeed.data;
      res.render('./homepage', {
        userData,
        feedData

      });
    } else {
      res.status(400).send('Failed to obtain user access token');
    }
  } catch (error) {
    console.error('Error:', error);
    res.redirect('/auth/facebook');
  }
});

module.exports = router;


