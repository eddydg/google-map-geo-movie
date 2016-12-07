//var BASE_OMDB_API = "http://www.omdbapi.com/?plot=short&r=json&t="
var BASE_THEMOVIEDB_API = "https://api.themoviedb.org/3/search/multi?api_key=cc5d266598f3f83d020f116ec5bb2a7f&language=fr-FR&query=";
var BASE_THEMOVIEDB_POSTER = "https://image.tmdb.org/t/p/w150";
var centerLatLng = { lat: 48.858093, lng: 2.294694 };
var currentSelectedYear = 2000;

var map = null;
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
}

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
    });

    movieCircles.push(movieCircle);
  }

  if (fakeLoader) fakeLoader.fadeOut();
}

function setInfoWindowContent(movieTitle) {
  let q = movieTitle.replace(/ *\([^)]*\) */g, "") // Remove (year)
  let apiUrl = BASE_THEMOVIEDB_API + q;
  $.getJSON(apiUrl, function(data){
    if (infoWindow) {
      let content = "";
      if (data.results.length > 0) {
        let result = data.results[0];
        content += "<h3>"+result.title+"</h3><br>"
        content += "<img src='"+BASE_THEMOVIEDB_POSTER+result.poster_path+"'/><br>"
        content += result.overview;
      } else {
        content = "Movie not found in TheMovieDB.";
      }
      infoWindow.setContent(content);
    }
  });
}