'use strict';

const merge = require('../../helpers/merge');

function compile(params) {
  if (!params.next) {
    const opts = merge({}, params.options.typescript || {});

    opts.fileName = params.filename;

    opts.compilerOptions = {
      sourceMap: opts.sourceMap || params.options.compileDebug || false,
      importHelpers: true,
      module: 'ES6',
      target: 'ES5',
    };

    if (opts.jsx) {
      opts.compilerOptions.jsx = 'react';
      opts.compilerOptions.jsxFactory = opts.jsxFactory || (opts.jsx === true ? 'React.createElement' : opts.jsx);
      opts.compilerOptions.jsxFragmentFactory = opts.jsxFragmentFactory || (opts.jsx === true ? 'React.Fragment' : opts.jsx);
    } else {
      opts.compilerOptions.jsx = 'preserve';
    }

    delete opts.jsx;

    const result = this.typescript.transpileModule(params.source, opts);

    params.source = result.outputText;
    params.sourceMap = result.sourceMapText ? JSON.parse(result.sourceMapText) : undefined;

    if (params.sourceMap) {
      params.source = params.source.replace(/\n\/\/# sourceMappingURL=.+$/, '');
    }
  }
}

module.exports = {
  compile,
  render: compile,
  ext: 'js',
  support: ['ts', 'tsx'],
  requires: ['typescript'],
};
