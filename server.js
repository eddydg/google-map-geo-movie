var request = require("request");
var pg = require('pg');
var path = require('path');

var express = require('express');
var app = express();

var connectionString = process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/geo';

app.use('/public', express.static(path.join(__dirname, '/public')));

app.get('/', function (req, res) {
    res.sendFile('index.html', {root: __dirname })
})

app.listen(3000, function () {
    console.log('App listening on port 3000!')
})

app.get('/movies/:year', function (req, res) {
    var client = new pg.Client(connectionString);
    client.connect();
    var year = req.params.year;

    const query = client.query(
        "SELECT " +
            "r.imdb_id," +
            "r.title," +
            "movies.year AS movie_year," +
            "movies.votes AS total_votes," +
            "r.votes AS votes_this_year," +
            "r.year AS votes_year," +
            "location, rank, genres, latlng" +
        " FROM get_count_ratings_by_year("+year+") AS r" +
        " JOIN movies ON movies.imdb_id = r.imdb_id"
    );

    var results = [];
    query.on('row', (row) => {
        results.push(row);
    });

    query.on('end', () => {
        return res.json(results);
    });
})
