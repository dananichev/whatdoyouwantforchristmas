var express = require('express'),
    Q = require('q'),
    log = require('./log'),
    _ = require('underscore'),
    db = require('./db'),
    fb = require('./fb'),
    model = require('./model'),
    app = express();

module.exports = app;

app.get('/users', function (req, res, next) {
  var fields, findUser;

  log.debug('Searching for user', req.query);

  if (req.query.fields) {
    fields = req.query.fields.split(',');
  }

  findUser = db.findOne('users', req.query.query, fields)

  if (_.contains(fields, 'wishlist')) {
    findUser = findUser
      .then(function (user) {
        log.debug('User', user);
        return [
          user,
          db.find('wishes', {
            userId: user._id
          }, [
            'type',
            'descr',
            'address'
          ]) ];
      })
      .spread(function (user, wishlist) {
        user.wishlist = wishlist;
        return user;
      });
  }

  return findUser.then(
    successCb(req, res, next),
    errorCb(req, res, next)
  ).done();

});


app.get('/users/:id/friends', function (req, res, next) {
  log.debug('In find friends');
  return db.findById('users', req.params.id)
    .then(function (user) {
      var frIdList = _.map(user.fbFriends, function (friend) {
        return friend.fbId;
      });

      return db.find('users', { fbId: { $in: frIdList } });
    }).then(function (friends) {
      log.debug('found friends, %s', friends.length);
      if (!friends) { return []; }

      return Q.all(_.map(friends, function (friend) {
        log.debug('Searching wishes for', friend._id.toString(), friend);
        return db.find('wishes', { userId: friend._id, removed: false })
          .then(function (wishlist) {
            console.log('Got wishlist', wishlist.length);
            friend.wishlist = wishlist;
            return friend;
          });
      }));
    })
    .then(function (arr) {
      console.log('Filtering friends');
      return _.filter(arr, function (fr) {
        log.debug('filtering', fr);
        return fr.wishlist.length > 0;
      });
    })
    .then(
      successCb(req, res, next)
    ).done();
});


app.post('/users/signup', function (req, res, next) {
  log.debug('Got new user', req.body);

  var user = _.omit(req.body, 'authData'),
      userRef = {},
      authData = req.body.authData;

  if (!_.has(authData, 'accessToken')) {
    res.status(400);
    res.json({ status: 400, error: 'Valid authData required' });
    return res.end();
  }

  db.insert('users', user).then(
    successCb(req, res, next, 201),
    errorCb(req, res, next)
  ).then(function (user) {
    userRef.user = user;
  }).done();

  fb.fetchFriends(authData).then(function (result) {
    log.debug('Fetched user friends, found %d', result.length);

    var updateHash = {
      $set: {
        fbFriends: result
      }
    };

    return db.updateById('users', userRef.user._id, updateHash);
  }).then(function () {
    log.info('User friends fetched and saved');
  }).done();

});



app.post('/wishes', function (req, res, next) {
  return model.wish.parse(req.body)
    .then(function (wish) {
      return db.insert('wishes', wish);
    })
    .then(
      successCb(req, res, next, 201)
      //errorCb(req, res, next)
    )
    .done();

});

app.put('/wishes', function (req, res, next) {
  return model.wish.parse(req.body)
    .then(function (wish) {
      return db.save('wishes', wish);
    })
    .then(
      successCb(req, res, next)
      //errorCb(req, res, next)
    )
    .done();
});



function successCb(req, res, next, status) {
  status = status || 200;
  return function (data) {
    log.debug('In success cb');
    res.status(status);
    res.json({ data: data, status: status });
    res.end();
    return data;
  };
}

function errorCb(req, res, next, status) {
  status = status || 500;
  return function (err) {
    res.status(status);
    res.json({ error: err, status: status });
    res.end();
  }
}
