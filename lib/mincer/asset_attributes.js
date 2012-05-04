/** internal
 *  class AssetAttributes
 *
 *  `AssetAttributes` is a wrapper similar to Rubie's `Pathname` that provides
 *  some helper accessors.
 *
 *  These methods should be considered internalish.
 **/


'use strict';


// stdlib
var path = require('path');


// 3rd-party
var _ = require('underscore');


// internal
var prop    = require('./common').prop;
var getter  = require('./common').getter;


/**
 *  new AssetAttributes()
 **/
var AssetAttributes = module.exports = function AssetAttributes(environment, path) {
  prop(this, 'environment', environment);
  prop(this, 'pathname',    path);
};


/**
 *  AssetAttributes#searchPaths -> Array
 *
 *  Returns paths search the load path for.
 **/
getter(AssetAttributes.prototype, 'searchPaths', function () {
  var paths = [this.pathname],
      exts  = this.extensions.join(""),
      path_without_extensions;

  if ('index' !== path.basename(this.pathname, exts)) {
    path_without_extensions = this.extensions.reduce(function (p, ext) {
      return p.replace(ext, '');
    }, this.pathname);

    paths.push(path.join(path_without_extensions, "index" + exts));
  }

  return paths;
});



/**
 *  AssetAttributes#logicalPath -> String
 *
 *  Reverse guess logical path for fully expanded path.
 *
 *  This has some known issues. For an example if a file is
 *  shaddowed in the path, but is required relatively, its logical
 *  path will be incorrect.
 **/
getter(AssetAttributes.prototype, 'logicalPath', function () {
  var pathname = this.pathname, paths = this.environment.paths, root_path;

  root_path = _.detect(paths, function (root) {
    return root === pathname.substr(0, root.length);
  });

  if (!root_path) {
    throw new Error("File outside paths: " + pathname + " isn't in paths: " +
                    paths.join(", "));
  }

  pathname = pathname.replace(root_path + "/", "");
  pathname = this.engineExtensions.reduce(function (p, ext) {
    return p.replace(ext, "");
  }, pathname);

  if (!this.formatExtension) {
    pathname += this.engineFormatExtension;
  }

  return pathname;
});


/**
 *  AssetAttributes#extensions -> Array
 *
 *  Returns `Array` of extension `String`s.
 *
 *      "foo.js.coffee"
 *      // -> [".js", ".coffee"]
 **/
getter(AssetAttributes.prototype, 'extensions', function () {
  var extensions;

  if (!this.__extensions__) {
    extensions = path.basename(this.pathname).split('.').slice(1);
    prop(this, '__extensions__', extensions.map(function (ext) {
      return "." + ext;
    }));
  }

  return this.__extensions__;
});


/**
 *  AssetAttributes#formatExtension -> String
 *
 *  Returns the format extension.
 *
 *      "foo.js.coffee"
 *      // -> ".js"
 **/
getter(AssetAttributes.prototype, 'formatExtension', function () {
  var env = this.environment;
  return _.detect(this.extensions.reverse(), function (ext) {
    return env.getMimeType(ext) && !env.getEngines(ext);
  });
});


/**
 *  AssetAttributes#engineFormatExtension -> Array
 *
 *  Returns an `Array` of engine extensions.
 *
 *      "foo.js.coffee.ejs"
 *      // -> [".coffee", ".ejs"]
 **/
getter(AssetAttributes.prototype, 'engineExtensions', function () {
  var env     = this.environment,
      exts    = this.extensions,
      offset  = exts.indexOf(this.formatExtension);

  if (0 <= offset) {
    exts = exts.slice(offset + 1);
  }

  return _.filter(exts, function (ext) { return !!env.getEngines(ext); });
});


/**
 *  AssetAttributes#engines -> Array
 *
 *  Returns an array of engine classes.
 **/
getter(AssetAttributes.prototype, 'engines', function () {
  var env = this.environment;
  return this.engineExtensions.map(function (ext) { return env.getEngines(ext); });
});


/**
 *  AssetAttributes#processors -> Array
 *
 *  Returns all processors to run on the path.
 **/
getter(AssetAttributes.prototype, 'processors', function () {
  return [].concat(this.environment.getPreProcessors(this.contentType),
                   this.engines.reverse(),
                   this.environment.getPostProcessors(this.contentType));
});


/**
 *  AssetAttributes#contentType -> String
 *
 *  Returns the content type for the pathname.
 *  Falls back to `application/octet-stream`.
 **/
getter(AssetAttributes.prototype, 'contentType', function () {
  var mime_type;

  if (!this.__contentType__) {
    mime_type = this.engineContentType || 'application/octet-stream';

    if (this.formatExtension) {
      mime_type = this.environment.getMimeType(this.formatExtension, mime_type);
    }

    prop(this, '__contentType__', mime_type);
  }

  return this.__contentType__;
});


/**
 *  AssetAttributes#engineContentType -> String
 *
 *  Returns implicit engine content type.
 *
 *  `.coffee` files carry an implicit `application/javascript`
 *  content type.
 **/
getter(AssetAttributes.prototype, 'engineContentType', function () {
  var engine = _.detect(this.engines.reverse(), function (engine) {
    return !!engine.defaultMimeType;
  });

  return (engine || {}).defaultMimeType;
});


/**
 *  AssetAttributes#engineFormatExtension -> String
 *
 *  Returns implicit engine extension.
 *
 *  `.coffee` files carry an implicit `.js` extension (due to it's implicit
 *  content type of `application/javascript`).
 **/
getter(AssetAttributes.prototype, 'engineFormatExtension', function () {
  var type = this.engineContentType;
  if (type) {
    return this.environment.getExtensionForMimeType(type);
  }
});