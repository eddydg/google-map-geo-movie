var request = require("request");
var pg = require('pg');

var express = require('express');
var app = express();

var connectionString = process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/geo';


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
        "SELECT * FROM movies"
        //" WHERE extract(year from to_timestamp(timestamp)) = " + year +
        //" LIMIT 100"
    );

    var results = [];
    query.on('row', (row) => {
        results.push(row);
    });

    query.on('end', () => {
        return res.json(results);
    });
})
