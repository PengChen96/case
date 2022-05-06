const path = require('path');
const fs = require('fs');
const vm = require('vm');

function Module(id = '', parent) {
  this.id = id;
  this.path = path.dirname(id);
  this.exports = {};
  this.filename = null;
  this.loaded = false;
}

Module._extensions = Object.create(null);

Module.prototype.require = MyRequire = (id, mainModule) => {
  let parent = mainModule || this;
  return Module._load(id, parent, /* isMain */ false);
}

Module._load = function (request, parent, isMain) {
  const filename = Module._resolveFilename(request, parent, isMain);
  const module = new Module(filename, parent);
  module.load(filename);
  return module.exports;
}

Module._resolveFilename = function (request, parent, isMain) {
  let paths = Module._resolveLookupPaths(request, parent);
  const filename = Module._findPath(request, paths, isMain, false);
  return filename;
}
Module._resolveLookupPaths = function (request, parent) {
  // 拿到父级目录
  const parentDir = [path.dirname(parent.filename)];
  return parentDir;
}
Module._findPath = function (request, paths, isMain) {
  for (let i = 0; i < paths.length; i++) {
    const curPath = paths[i];
    const basePath = path.resolve(curPath, request);
    let exts;
    let filename;
    const rc = stat(basePath);
    if (rc === 0) {
      filename = toRealPath(basePath);
    }
    if (!filename) {
      if (exts === undefined) {
        exts = Reflect.ownKeys(Module._extensions);
      }
      filename = tryExtensions(basePath, exts, isMain);
    }
    if (filename) {
      return filename;
    }
  }
  return false;
}

function tryExtensions(p, exts, isMain) {
  for (let i = 0; i < exts.length; i++) {
    const filename = tryFile(p + exts[i], isMain); // 判断文件存在
    if (filename) {
      return filename;
    }
  }
  return false;
}

function tryFile(requestPath, isMain) {
  const rc = stat(requestPath);
  if (rc !== 0) return;
  return toRealPath(requestPath);
}

function toRealPath(requestPath) {
  return fs.realpathSync(requestPath, {
    // [internalFS.realpathCacheKey]: realpathCache
  });
}

// 判断文件是否存在，0：存在 1：文件夹存在 2：文件或文件夹不存在
function stat(path) {
  let flag;
  try {
    const stats = fs.statSync(path);
    flag = stats.isDirectory() ? 1 : 0;
  } catch (e) {
    flag = 2;
  }
  return flag;
}

Module.prototype.load = function (filename) {
  this.filename = filename;
  const extension = path.extname(filename);
  ;
  Module._extensions[extension](this, filename);
  this.loaded = true;
}

Module._extensions['.js'] = function (module, filename) {
  const content = fs.readFileSync(filename, 'utf8');
  module._compile(content, filename);
};
Module._extensions['.json'] = function (module, filename) {
  const content = fs.readFileSync(filename, 'utf8');
  module.exports = JSON.parse(content);
};

Module.prototype._compile = function (content, filename) {
  let functionStr = wrap(content);
  let fn = vm.runInThisContext(functionStr);
  const dirname = path.dirname(filename);
  const exports = this.exports;
  const require = this.require;
  const module = this;
  const thisValue = exports;
  fn.call(thisValue, exports, require, module, filename, dirname);
}

let wrap = function (script) {
  return Module.wrapper[0] + script + Module.wrapper[1];
};

Module.wrapper = [
  '(function (exports, require, module, __filename, __dirname) { ',
  '\n});'
];

/* test */
const {sum} = MyRequire('./test', module);
console.log(sum(1, 2));

