var express = require('express');
var router = express.Router();

var sentiment = require('sentiment');
var twitter = require('twitter');

var stream = null;
var currentKeyword = null;
var sentimentTotal = 0;
var tweets = 0;
var percentage = {negative: 0, neutral: 0, positive: 0};

var client = new twitter({
    consumer_key: process.env.TWITTER_KEY,
    consumer_secret: process.env.TWITTER_SECRET,
    access_token_key: process.env.TWITTER_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_TOKEN_SECRET
});


function initStream(keyword) {
    currentKeyword = keyword;
    stream = client.stream('statuses/filter', {track: keyword});
    stream.on('data', function (data) {
        if (data.lang === 'en' && !(data.text[0] === 'R' && data.text[1] === 'T')) {
            // console.log(data.text + "\n");
            sentiment(data.text, function (err, result) {
                tweets++;
                sentimentTotal += result.score;
                if (result.score > 1)
                    percentage.positive++;
                else if (result.score > -1)
                    percentage.neutral++;
                else
                    percentage.negative++;
            });
        }
    });
}

function destroyStream() {
    if (stream) {
        stream.destroy();
        stream = null;
        console.log("Stream destroy");
    }
    currentKeyword = null;
    sentimentTotal = 0;
    tweets = 0;
    percentage.negative = percentage.neutral = percentage.positive = 0;
}

router.post('/results', function (req, res, next) {

    if (req.body.keyword !== currentKeyword && stream == null) {
        destroyStream();
        initStream(req.body.keyword);
        setTimeout(destroyStream, 1000 * (60 * 2));
    }
    const data = {
        keyword: currentKeyword,
        sentiment: sentimentTotal / tweets,
        tweets: tweets,
        percentage: percentage
    };
    res.send(JSON.stringify(data));
});

router.get('/', function (req, res, next) {
    res.render('index', {keyword: currentKeyword});
});

module.exports = router;
