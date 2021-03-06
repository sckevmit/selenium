// Copyright 2013 Selenium committers
// Copyright 2013 Software Freedom Conservancy
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//     You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

require('./_bootstrap').init(module);

var assert = require('assert'),
    http = require('http'),
    util = require('selenium-webdriver').http.util;

describe('webdriver.http.util', function() {

  var server, baseUrl;

  var status, value, responseCode;

  function startServer(done) {
    if (server) return done();

    server = http.createServer(function(req, res) {
      var data = JSON.stringify({status: status, value: value});
      res.writeHead(responseCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(data, 'utf8')
      });
      res.end(data);
    });

    server.listen(0, '127.0.0.1', function(e) {
      if (e) return done(e);

      var addr = server.address();
      baseUrl = 'http://' + addr.address + ':' + addr.port;
      done();
    });
  }

  function killServer(done) {
    if (!server) return done();
    server.close(done);
    server = null;
  }

  after(killServer);

  beforeEach(function(done) {
    status = 0;
    value = 'abc123';
    responseCode = 200;
    startServer(done);
  });

  describe('#getStatus', function() {
    it('should return value field on success', function(done) {
      util.getStatus(baseUrl).then(function(response) {
        assert.equal('abc123', response);
      }).addBoth(done);
    });

    it('should fail if response object is not success', function(done) {
      status = 1;
      util.getStatus(baseUrl).then(function() {
        throw Error('expected a failure');
      }, function(err) {
        assert.equal(status, err.code);
        assert.equal(value, err.message);
      }).addBoth(done);
    });

    it('should fail if the server is not listening', function(done) {
      killServer(function(e) {
        if(e) return done(e);

        util.getStatus(baseUrl).then(function() {
          throw Error('expected a failure');
        }, function() {
          // Expected.
        }).addBoth(done);
      });
    });

    it('should fail if HTTP status is not 200', function(done) {
      status = 1;
      responseCode = 404;
      util.getStatus(baseUrl).then(function() {
        throw Error('expected a failure');
      }, function(err) {
        assert.equal(status, err.code);
        assert.equal(value, err.message);
      }).addBoth(done);
    });
  });

  describe('#waitForServer', function() {
    it('resolves when server is ready', function(done) {
      status = 1;
      setTimeout(function() { status = 0; }, 100);
      util.waitForServer(baseUrl, 200).
          then(function() {}).  // done needs no argument to pass.
          addBoth(done);
    });

    it('should fail if server does not become ready', function(done) {
      status = 1;
      util.waitForServer(baseUrl, 100).
          then(function() { done('Expected to time out'); },
               function() { done(); });
    });
  });

  describe('#waitForUrl', function() {
    it('succeeds when URL returns 2xx', function(done) {
      responseCode = 404;
      setTimeout(function() { responseCode = 200; }, 100);

      util.waitForUrl(baseUrl, 200).
          then(function() {}).  // done needs no argument to pass.
          addBoth(done);
    });

    it('fails if URL always returns 4xx', function(done) {
      responseCode = 404;

      util.waitForUrl(baseUrl, 100).
          then(function() { done('Expected to time out'); },
               function() { done(); });
    });

    it('fails if cannot connect to server', function(done) {
      killServer(function(e) {
        if (e) return done(e);

      util.waitForUrl(baseUrl, 100).
          then(function() { done('Expected to time out'); },
               function() { done(); });
      });
    });
  });
});
