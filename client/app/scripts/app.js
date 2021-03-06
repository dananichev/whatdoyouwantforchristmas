'use strict';

angular.module('clientApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute'
]).config(function ($routeProvider) {

  $routeProvider
    .when('/', {
      templateUrl: 'views/main.html',
      controller: 'MainCtrl'
    })
    .when('/where-to-send', {
      templateUrl: 'views/where-to-send.html',
      controller: 'LoginCtrl'
    })
    .when('/login', {
      templateUrl: 'views/login.html',
      controller: 'LoginCtrl'
    })
    .when('/me', {
      templateUrl: 'views/me.html',
      controller: 'MeCtrl'
    })
    .when('/friends', {
      templateUrl: 'views/friends.html',
      controller: 'FriendsCtrl'
    })
    .when('/friends/:friendId', {
      templateUrl: 'views/friends.html',
      controller: 'FriendsCtrl'
    })
    .when('/letters/:userId', {
      templateUrl: 'views/letters.html',
      controller: 'LettersCtrl'
    })
    .otherwise({
      redirectTo: '/'
    });

}).run(function ($rootScope, $timeout, $location, Fb, Backend) {

  $rootScope.getDefaultLetter = function (user) {
    if (!user) { return ''; }

    if (user.gender === 'male') {
      return (
          'В этом году я вел себя хорошо. ' +
          'Вот что ты мне за это должен:'
      );
    }

    if (user.gender === 'female') {
      return (
          'В этом году я вела себя хорошо. ' +
          'Вот что ты мне за это должен:'
      );
    }

    return ('Это был отличный год! Если решишь зайти, захвати:');
  }

  $rootScope.getImage = function () {
    var n = Math.floor(Math.random() * 100) % 5;

    if (_.has($rootScope, 'image')) {
      return $rootScope.image;
    }

    $rootScope.image = n;
    return n;
  };

  $rootScope.$safeApply = function (fn) {
    if ($rootScope.$$phase === '$digest') { return fn(); }
    $rootScope.$apply(fn);
  };

  $rootScope.goToMyLetter = function () {
    $rootScope.$safeApply(function () {
      $location.path('/me');
      $location.replace();
    });
  };


  $rootScope.goToLogin = function () {
    $rootScope.$safeApply(function () {
      $location.path('/where-to-send');
    });
  };

  $rootScope.fetchUser = function () {
    var d = $.Deferred();

    if ($rootScope.user) {
      $timeout(function () { d.resolve(); }, 0);
      return d.promise();
    }

    Backend.getCurrentUser()
      .then(function (user) {
        $rootScope.user = user;
        user.id = user._id;
        analytics.identify(user.id, user);
        d.resolve();
      });

    return d.promise();
  };

});

// Load the SDK asynchronously
(function(d){
 var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
 if (d.getElementById(id)) {return;}
 js = d.createElement('script'); js.id = id; js.async = true;
 js.src = "//connect.facebook.net/ru_RU/all.js";
 ref.parentNode.insertBefore(js, ref);
}(document));



window.fbAsyncInit = function () {

  function triggerEvent(name) {
    var doc = window.document;
    if ('createEvent' in doc) {
      var e = doc.createEvent('HTMLEvents');
      e.initEvent(name, false, true);
      doc.dispatchEvent(e);
    } else {
      doc.fireEvent(name);
    }
  };

  var FB = window.FB;

  window.fbConnected = false;

  FB.init({
    appId: '558478794247173',
    // check login status
    status: true,
    // enable cookies to allow the server to access the session
    cookie: true,
    // parse XFBML
    xfbml: true
  });

  window.fbReady = true;
  triggerEvent('fb-ready');
  console.log('Ho ho ho, looks like I\'ve connected to FB');

  FB.Event.subscribe('auth.authResponseChange', function (response) {
    // Here we specify what we do with the response anytime this event
    // occurs.
    if (response.status === 'connected') {
      // The response object is returned with a status field that lets the
      // app know the current login status of the person.  In this case,
      // we're handling the situation where they have logged in to the
      // app.

      console.log('FB authorized');
      window.fbConnected = true;
      triggerEvent('fb-connected');

    } else if (response.status === 'not_authorized') {
      // In this case, the person is logged into Facebook, but not into
      // the app, so we call FB.login() to prompt them to do so.  In
      // real-life usage, you wouldn't want to immediately prompt someone
      // to login like this, for two reasons: (1) JavaScript created popup
      // windows are blocked by most browsers unless they result from
      // direct interaction from people using the app (such as a mouse
      // click) (2) it is a bad experience to be continually prompted to
      // login upon page load.

      window.location.hash = '/where-to-send';
    } else {
      // In this case, the person is not logged into Facebook, so we call
      // the login() function to prompt them to do so. Note that at this
      // stage there is no indication of whether they are logged into the
      // app. If they aren't then they'll see the Login dialog right after
      // they log in to Facebook.  The same caveats as above apply to the
      // FB.login() call here.
      window.location.hash = '/where-to-send';
    }
  });

};
