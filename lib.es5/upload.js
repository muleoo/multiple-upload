// Generated by Babel
// Generated by Babel
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _source = require('./source');

var _filename = require('./filename');

var _error = require('./error');

var _error2 = _interopRequireDefault(_error);

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var newRequest = function newRequest() {
  return new window.XMLHttpRequest();
};

var defaultOptions = {
  endpoint: "",
  onProgress: null,
  onChunkComplete: null,
  onSuccess: null,
  onError: null,
  headers: {},
  chunkSize: Infinity,
  withCredentials: false,
  uploadUrl: null,
  uploadSize: null,
  overridePatchMethod: false,
  retryDelays: null
};

var Upload = function () {
  function Upload(file, options) {
    _classCallCheck(this, Upload);

    this.options = (0, _extend2.default)(true, {}, defaultOptions, options);

    // The underlying File/Blob object
    this.file = file;

    // The URL against which the file will be uploaded
    this.url = null;

    // The underlying XHR object for the current PUT request
    this._xhr = null;

    // The offset used in the current PUT request
    this._offset = null;

    // True if the current PUT request has been aborted
    this._aborted = false;

    // The file's size in bytes
    this._size = null;

    // The Source object which will wrap around the given file and provides us
    // with a unified interface for getting its size and slice chunks from its
    // content allowing us to easily handle Files, Blobs, Buffers and Streams.
    this._source = null;

    // The current count of attempts which have been made. Null indicates none.
    this._retryAttempt = 0;

    // The timeout's ID which is used to delay the next retry
    this._retryTimeout = null;

    // The offset of the remote upload before the latest attempt was started.
    this._offsetBeforeRetry = 0;

    // The uuid is upyun return id for multiple upload
    this._uuid = null;

    // 兼容腾讯cos上传的逻辑，后续不再使用此bao
    this._cosUploadId = null;
    this._parts = [];
  }

  _createClass(Upload, [{
    key: '_emitXhrError',
    value: function _emitXhrError(xhr, err, causingErr) {
      this._emitError(new _error2.default(err, causingErr, xhr));
    }
  }, {
    key: '_emitError',
    value: function _emitError(err) {
      if (typeof this.options.onError === "function") {
        this.options.onError(err);
      } else {
        throw err;
      }
    }
  }, {
    key: '_emitSuccess',
    value: function _emitSuccess() {
      if (typeof this.options.onSuccess === "function") {
        this.options.onSuccess();
      }
    }
    /**
     * Publishes notification when data has been sent to the server. This
     * data may not have been accepted by the server yet.
     * @param  {number} bytesSent  Number of bytes sent to the server.
     * @param  {number} bytesTotal Total number of bytes to be sent to the server.
     */

  }, {
    key: '_emitProgress',
    value: function _emitProgress(bytesSent, bytesTotal) {
      if (typeof this.options.onProgress === "function") {
        this.options.onProgress(bytesSent, bytesTotal);
      }
    }

    /**
     * Publishes notification when a chunk of data has been sent to the server
     * and accepted by the server.
     * @param  {number} chunkSize  Size of the chunk that was accepted by the
     *                             server.
     * @param  {number} bytesAccepted Total number of bytes that have been
     *                                accepted by the server.
     * @param  {number} bytesTotal Total number of bytes to be sent to the server.
     */

  }, {
    key: '_emitChunkComplete',
    value: function _emitChunkComplete(chunkSize, bytesAccepted, bytesTotal) {
      if (typeof this.options.onChunkComplete === "function") {
        this.options.onChunkComplete(chunkSize, bytesAccepted, bytesTotal);
      }
    }
  }, {
    key: '_setupXHR',
    value: function _setupXHR(xhr) {
      var headers = this.options.headers;

      for (var name in headers) {
        xhr.setRequestHeader(name, headers[name]);
      }
    }
  }, {
    key: 'start',
    value: function start() {
      var _this = this;

      var file = this.file;
      if (!file) {
        this._emitError(new Error("no file to upload provided"));
        return;
      }

      if (!this.options.endpoint) {
        this._emitError(new Error("no endpoint provided"));
        return;
      }
      var ext = '.' + file.name.split('.').pop();
      this.url = this.options.endpoint + (0, _filename.getFilename)() + ext;

      var source = this._source = (0, _source.getSource)(file, this.options.chunkSize);
      var size = source.size;
      this._size = size;
      var xhr = newRequest();
      xhr.open("PUT", this.url, true);

      xhr.onload = function (e) {
        if (!(xhr.status >= 200 && xhr.status < 300)) {
          _this._emitXhrError(xhr, new Error("unexpected response while creating upload"));
          return;
        }
        var nextId = Number(e.currentTarget.getResponseHeader('x-upyun-next-part-id'));
        _this._uuid = e.currentTarget.getResponseHeader('x-upyun-multi-uuid');
        _this._cosUploadId = e.currentTarget.getResponseHeader('x-cos-upload-id');
        _this._offset = 0;
        _this._startUpload(nextId);
      };

      xhr.onerror = function (err) {
        _this._emitXhrError(xhr, new Error("failed to create upload"), err);
      };

      this._setupXHR(xhr);
      xhr.setRequestHeader("X-Upyun-Multi-Stage", "initiate");
      xhr.setRequestHeader("X-Upyun-Multi-Length", size);

      xhr.send(null);
    }
  }, {
    key: '_startUpload',
    value: function _startUpload(nextId) {
      var _this2 = this;

      if (this._aborted) {
        return;
      }

      var xhr = this._xhr = newRequest();

      xhr.open("PUT", this.url, true);

      xhr.onload = function (e) {
        if (!(xhr.status >= 200 && xhr.status < 300)) {
          _this2._emitXhrError(xhr, new Error("unexpected response while uploading chunk"));
          return;
        }
        nextId = Number(e.currentTarget.getResponseHeader('x-upyun-next-part-id'));

        // 如果有cos返回的etag ，则存起来，等complete时用到
        var cosEtag = e.currentTarget.getResponseHeader('x-cos-part-etag');
        if (cosEtag) {
          _this2._parts.push({
            PartNumber: nextId === -1 ? _this2._parts.length + 1 : nextId,
            ETag: cosEtag
          });
        }

        _this2._emitProgress(_this2._offset, _this2._size);
        if (nextId == -1) return _this2._complete();

        _this2._startUpload(nextId);
      };

      xhr.onerror = function (err) {
        // Don't emit an error if the upload was aborted manually
        if (_this2._aborted) {
          return;
        }

        _this2._emitXhrError(xhr, new Error("failed to upload chunk at offset " + _this2._offset), err);
      };

      this._setupXHR(xhr);

      xhr.setRequestHeader("Content-Type", "application/offset+octet-stream");
      xhr.setRequestHeader("x-upyun-multi-uuid", this._uuid);
      xhr.setRequestHeader("x-upyun-part-id", String(nextId));
      xhr.setRequestHeader("X-Upyun-Multi-Stage", "upload");
      xhr.setRequestHeader("x-cos-upload-id", this._cosUploadId);
      var start = this._offset;
      var end = this._offset + this.options.chunkSize;

      // The specified chunkSize may be Infinity or the calcluated end position
      // may exceed the file's size. In both cases, we limit the end position to
      // the input's total size for simpler calculations and correctness.
      if (end === Infinity || end > this._size) {
        end = this._size;
      }
      this._offset = end;

      xhr.send(this._source.slice(start, end));
    }
  }, {
    key: '_complete',
    value: function _complete() {
      var _this3 = this;

      // If the upload has been aborted, we will not send the next PATCH request.
      // This is important if the abort method was called during a callback, such
      // as onChunkComplete or onProgress.
      if (this._aborted) {
        return;
      }

      var xhr = this._xhr = newRequest();

      xhr.open("PUT", this.url, true);

      xhr.onload = function () {
        if (!(xhr.status >= 200 && xhr.status < 300)) {
          _this3._emitXhrError(xhr, new Error("unexpected response while uploading chunk"));
          return;
        }

        var offset = _this3._offset;
        if (isNaN(offset)) {
          _this3._emitXhrError(xhr, new Error("invalid or missing offset value"));
          return;
        }

        _this3._offset = offset;
        if (offset == _this3._size) {
          // Yay, finally done :)
          _this3._emitSuccess();
          _this3._source.close();
          return;
        }
      };

      xhr.onerror = function (err) {
        // Don't emit an error if the upload was aborted manually
        if (_this3._aborted) {
          return;
        }

        _this3._emitXhrError(xhr, new Error("failed to upload chunk at offset " + _this3._offset), err);
      };

      this._setupXHR(xhr);

      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.setRequestHeader("X-Upyun-Multi-Stage", "complete");
      xhr.setRequestHeader("x-upyun-multi-uuid", this._uuid);
      xhr.setRequestHeader("x-cos-upload-id", this._cosUploadId);
      var data = this.options.onCompletePostData || {};
      if (this._parts.length > 0) {
        data.parts = this._parts;
      }
      xhr.send(JSON.stringify(data));
    }
  }]);

  return Upload;
}();

Upload.defaultOptions = defaultOptions;

exports.default = Upload;