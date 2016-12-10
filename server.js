var request = require("request");
var pg = require('pg');
var path = require('path');

var express = require('express');
var app = express();
var server = require('http').Server(app);
var socket = require('socket.io').listen(server);

var Twit = require('twit');
var twitterClient = new Twit({
    consumer_key: 'FCAJfprhkxH113WXFjk2CSqwi',
    consumer_secret: 'nmPTgEsf7hsJpPMm5fTSX9XIIMiz73mPH0q06GFPuOdlxpZ2CW',
    access_token: '19071711-eySAafROa2CWdAK72ZLnYYJyHjxtrQ77Oowsz8YLo',
    access_token_secret: '0wJomiJ5AKhulh1SVTFDmmrv4yVokq3Z6xnrVqcW4p1xQ'
});

var connectionString = process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/geo';

app.use('/public', express.static(path.join(__dirname, '/public')));

app.get('/', function (req, res) {
    res.sendFile('index.html', {root: __dirname })
})

server.listen(3000, function () {
    console.log('App listening on port 3000!');
})

app.get('/movies/:year', function (req, res) {
    var client = new pg.Client(connectionString);
    client.connect();
    var year = req.params.year;

    const query = client.query(`
        SELECT
            r.imdb_id,
            r.title,
            movies.year AS movie_year,
            movies.votes AS total_votes,
            r.votes AS votes_this_year,
            r.year AS votes_year,
            location, rank, genres, latlng
         FROM get_count_ratings_by_year(${year}) AS r
         JOIN movies ON movies.imdb_id = r.imdb_id
    `);

    var results = [];
    query.on('row', (row) => {
        results.push(row);
    });

    query.on('end', () => {
        return res.json(results);
    });
})

var trackingMovie = null;
var tweetStream = null;
app.get('/track/:movie', function (req, res) {

    if (req.params.movie) {
        if (tweetStream) {
            console.log("Stopped tweet stream on '"+trackingMovie+"'");
            tweetStream.stop()
        }

        trackingMovie = req.params.movie;
        if (trackingMovie == "") {
            console.log("Not tracking tweets anymore.");
            return res.end('Request ended');
        }

        console.log("Start tweet stream on '"+trackingMovie+"'");

        // Keep only alphanumeric \w and space \s
        var keywords = trackingMovie.replace(/[^\w\s]/gi, '').split();

        var options = {
            track: keywords,
            language: 'en'
        }
        tweetStream = twitterClient.stream('statuses/filter', options);

        tweetStream.on('tweet', (tweet) => {
            if (tweet.place) {
                console.log(" == New tweet: " + tweet.text + " ==");
                socket.emit('tweet', { tweet: tweet });
            } else {
                console.log("Tweet without place: '"+tweet.text+"'");
            }
        });
    }

    return res.end('Request ended');
});