const isFn = (obj: unknown) => typeof obj === 'function';
const isAsyncFn = (fn: Function) => fn.prototype.constructor.name.endsWith('Async');

const promisify = (fn: () => any) => function (...params: any[]) {
  if (isFn(params[params.length - 1])) {
    return fn.apply(this, params);
  }

  return new Promise((resolve, reject) => {
    const args = Array.prototype.slice.call(params);
    args.push(function(err: any, res: any) {
      if (err) {
        return reject(err);
      }
      return resolve(res);
    });

    fn.apply(this, args);
  });
};

export default <T>(cv: T): T => {
  const fns = Object.keys(cv).filter(k => isFn(cv[k])).map(k => cv[k]);
  const asyncFuncs = fns.filter(isAsyncFn);
  const clazzes = fns.filter(fn => !!Object.keys(fn.prototype).length);

  clazzes.forEach((clazz) => {
    const protoFnKeys = Object.keys(clazz.prototype).filter(k => isAsyncFn(clazz.prototype[k]));
    protoFnKeys.forEach(k => clazz.prototype[k] = promisify(clazz.prototype[k]));
  });

  asyncFuncs.forEach((fn) => {
    cv[fn.prototype.constructor.name] = promisify(fn);
  });

  return cv;
};