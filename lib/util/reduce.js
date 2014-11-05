'use strict';

function debug(params, view) {
  return function() {
    try {
      return typeof view === 'function' ? view.apply(null, arguments) : view;
    } catch (e) {
      throw new Error('compilation error from ' + params.type + '-engine: ' + params.filename + ' (' + e.message + ')\n' + params.source + '\n' + params.stack);
    }
  };
}

function validate(next, current) {
  return function() {
    var types = Array.prototype.slice.call(arguments);

    if (types.indexOf(next) > -1) {
      return next;
    }

    throw new Error('.' + current + ' files compiles only to .' + types.join(', .'));
  };
}

module.exports = function(parsers, params, locals, raw) {
  params.options.locals = locals || {};

  var key = params.parts.length,
      engine;

  while (--key >= 0) {
    params.type = params.parts[key];
    engine = parsers[params.type];

    if (typeof engine !== 'function') {
      throw new Error('Unknown ' + params.type + '-engine');
    }

    params.next = params.parts[key - 1] || false;
    params.chain = raw ? (params.next ? key > -1 : params.ext !== 'js') : true;

    if (!parsers[params.next || params.ext]) {
      throw new Error('cannot resolve ' + params.type + '-to-' + (params.next || params.ext) + ' (' + params.filename + ')');
    }

    if ([params.next, params.ext].indexOf(params.type) === -1) {
      params.render = debug(params, engine)(params, validate(params.next || params.ext, params.type));
      params.source = debug(params, params.render)(locals);
    }
  }

  return params;
};