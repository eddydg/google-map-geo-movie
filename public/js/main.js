//var BASE_OMDB_API = "http://www.omdbapi.com/?plot=short&r=json&t="
var THEMOVIEDB_API = "cc5d266598f3f83d020f116ec5bb2a7f";
var THEMOVIEDB_SEARCH = `https://api.themoviedb.org/3/search/multi?api_key=${THEMOVIEDB_API}&query=`;
var THEMOVIEDB_POSTER_MOVIE = "https://image.tmdb.org/t/p/w150";
var THEMOVIEDB_POSTER_PROFILE = "https://image.tmdb.org/t/p/w45";
var centerLatLng = { lat: 48.858093, lng: 2.294694 };
var currentSelectedYear = 2000;

var map = null;
var geocoder = null;
var infoWindow = null;
var movieHttpRequest = null;

var movies = [];
var movieCircles = [];
var movieDataCache = {};

var fakeLoader = null;

/* External plugins */
$(() => {
  fakeLoader = $("#fakeLoader");
  fakeLoader.fakeLoader({
    bgColor: "#34495e",
    spinner:"spinner1"
  });

  $("#yearRangeSelector").asRange({
    value: currentSelectedYear + "",
    onChange: changedSelectedYear
  });
});

/* Google Map */
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 5,
    center: centerLatLng
  });

  requestMovieData();
  geocoder = new google.maps.Geocoder();
}

/* Socket.io */
var socket = io.connect('http://localhost:3000');
socket.on('tweet', function (tweet) {
  tweet = tweet.tweet;
  if (!tweet.place) return;

  console.log("New tweet!");
  console.log(tweet);
  let text = tweet.text;
  let date = tweet.created_at;
  let place = tweet.place.full_name;

  if (geocoder) {
    geocoder.geocode( { 'address': place }, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        let marker = new google.maps.Marker({
          position: results[0].geometry.location,
          map: map,
          draggable: false,
          animation: google.maps.Animation.DROP,
          title: text
        });

        setTimeout(() => {
          marker.setMap(null);
          delete marker;
        }, 30 * 1000);
      } else {
        console.log('Geocode was not successful for the following reason: ' + status);
      }
    });
  }

});


function changedSelectedYear() {
  let value = $("#yearRangeSelector").val();
  if (value != currentSelectedYear) {
    currentSelectedYear = parseInt(value);

    if (movieHttpRequest && movieHttpRequest.readyState != 4) {
      movieHttpRequest.abort();
      console.log("Canceling movie request.");
    }
    requestMovieData(currentSelectedYear);
    console.log("Requesting movies...");
  }
}

function requestMovieData(year = currentSelectedYear) {
  if (movieDataCache[year]) {
    console.log("Movie data already cached.");
    updateMovie(movieDataCache[year])
  }
  else {
    if (fakeLoader) fakeLoader.fadeIn();
    movieHttpRequest = $.getJSON("/movies/" + year, function(data) {
      console.log("Received movie data.");
      movieDataCache[year] = data;
      updateMovie(data);
    });
  }
}

function updateMovie(movies) {
  for (let movieCircle of movieCircles) {
    movieCircle.setMap(null);
  }
  movieCircles = [];

  for (let movie of movies) {
    let movieTitle = movie.title;
    let latlng = movie.latlng.split(',');
    latlng = { lat: parseInt(latlng[0]), lng: parseInt(latlng[1]) };

    let movieCircle = new google.maps.Circle({
      strokeColor: '#0000FF',
      strokeOpacity: 0.8,
      strokeWeight: 1,
      fillColor: '#0000FF',
      fillOpacity: 0.35,
      map: map,
      center: latlng,
      radius: 0, //Math.sqrt(movie.votes_this_year) * 1000,
      title: movieTitle,
      clickable: true
    });

    let radius = movie.votes_this_year * movie.votes_this_year / 100;

    if (radius > 100000) {
      var increaseRadius = setInterval(() => {
        let currentRadius = movieCircle.getRadius();
        if (currentRadius < radius)
          movieCircle.setRadius(currentRadius + 10000);
        else
          clearInterval(increaseRadius);
      }, 30);
    } else {
      movieCircle.setRadius(radius);
    }


    google.maps.event.addListener(movieCircle, 'mouseover', function(ev){
      if (infoWindow) infoWindow.close(map);
      infoWindow = new google.maps.InfoWindow({content: movieTitle});
      infoWindow.setPosition(movieCircle.getCenter());
      infoWindow.open(map);
    });

    google.maps.event.addListener(movieCircle, 'click', function(ev){
        map.panTo(latlng);
        if (infoWindow) infoWindow.close(map);
        infoWindow = new google.maps.InfoWindow({content: "loading..."});
        setInfoWindowContent(movieTitle)
        infoWindow.setPosition(movieCircle.getCenter());
        infoWindow.open(map);

        trackTwitterTag(movieTitle);
    });

    movieCircles.push(movieCircle);
  }

  if (fakeLoader) fakeLoader.fadeOut();
}

function setInfoWindowContent(movieTitle) {
  let q = movieTitle.replace(/ *\([^)]*\) */g, "") // Remove (year)
  let apiUrl = THEMOVIEDB_SEARCH + q;

  $.getJSON(apiUrl, function(data){
    if (data.results.length > 0) {
      let movieId = data.results[0].id;

      let THEMOVIEDB_MOVIE = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${THEMOVIEDB_API}&append_to_response=keywords,alternative_titles,changes,credits,images,keywords,lists,releases,reviews,similar,translations,videos`;
      $.getJSON(THEMOVIEDB_MOVIE, function(result){
        if (infoWindow) {

          let director = "";
          for (let crew of result.credits.crew) {
            if (crew.job.toLowerCase() === "director") {
              director = crew.name;
              break;
            }
          }

          let content = `
            <h2>${movieTitle}</h2>
            <img style='float:left;margin:0 20px 20px 0' src='${THEMOVIEDB_POSTER_MOVIE + result.poster_path}'/><br>
            <i>${director}</i><br>
            <p>${result.overview}</p><br><br>
          `;

          for (var i = 0; i < result.credits.cast.length; i++) {
            if (i == 5) break;
            let cast = result.credits.cast[i];

            content += `<img src="${THEMOVIEDB_POSTER_PROFILE + cast.profile_path}" title="${cast.name}" alt="${cast.name}" />`;

          }
          infoWindow.setContent(content);
        }
      })
    } else {
      console.log("Movie not found in TheMovieDB.");
    }
  });
}

function trackTwitterTag(movieTitle) {
  movieTitle = movieTitle.replace(/ *\([^)]*\) */g, "") // Remove (year)
  if (!movieTitle) return;

  $.getJSON("/track/" + movieTitle, function(tweet) {
    console.log("Start tracking '" + movieTitle + "' on Twitter (those with geoloc).");
  });
}