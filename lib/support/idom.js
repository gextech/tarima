var idom;

function render(params, cb) {
  idom = idom || require('idom-template');

  var code = [
    'function(data,el){var lib;return (lib=IncrementalDOM,lib.patch(',
    'el||document.body,', idom.compile(params.code, idom).toString(),
    ',data));}'
  ].join('');

  cb(null, {
    out: code
  });
}
module.exports = {
  ext: 'js',
  type: 'script',
  support: ['idom'],
  required: ['idom-template'],
  render: render,
  compile: render
};