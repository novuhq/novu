const REMOVE = 'remove';
const REPLACE = 'replace';
const ADD = 'add';
const MOVE = 'move';

export function diffApply(obj: any, diff: any[], pathConverter?) {
  if (!obj || typeof obj != 'object') {
    throw new Error('base object must be an object or an array');
  }

  if (!Array.isArray(diff)) {
    throw new Error('diff must be an array');
  }

  const diffLength = diff.length;
  let subObject;
  for (let i = 0; i < diffLength; i++) {
    const thisDiff = diff[i];
    subObject = obj;
    const thisOp = thisDiff.op;

    let thisPath = transformPath(pathConverter, thisDiff.path);
    const thisFromPath = thisDiff.from && transformPath(pathConverter, thisDiff.from);
    let toPath, toPathCopy, lastToProp, subToObject, valueToMove;

    if (thisFromPath) {
      // MOVE only, "fromPath" is effectively path and "path" is toPath
      toPath = thisPath;
      thisPath = thisFromPath;

      toPathCopy = toPath.slice();
      lastToProp = toPathCopy.pop();
      prototypeCheck(lastToProp);
      if (lastToProp == null) {
        return false;
      }

      let thisToProp;
      while ((thisToProp = toPathCopy.shift()) != null) {
        prototypeCheck(thisToProp);
        if (!(thisToProp in subToObject)) {
          subToObject[thisToProp] = {};
        }
        subToObject = subToObject[thisToProp];
      }
    }

    const pathCopy = thisPath.slice();
    const lastProp = pathCopy.pop();
    prototypeCheck(lastProp);
    if (lastProp == null) {
      return false;
    }

    let thisProp;
    while ((thisProp = pathCopy.shift()) != null) {
      prototypeCheck(thisProp);
      if (!(thisProp in subObject)) {
        subObject[thisProp] = {};
      }
      subObject = subObject[thisProp];
    }
    if (thisOp === REMOVE || thisOp === REPLACE || thisOp === MOVE) {
      const path = thisOp === MOVE ? thisDiff.from : thisDiff.path;
      if (!subObject.hasOwnProperty(lastProp)) {
        throw new Error(['expected to find property', path, 'in object', obj].join(' '));
      }
    }
    if (thisOp === REMOVE || thisOp === MOVE) {
      if (thisOp === MOVE) {
        valueToMove = subObject[lastProp];
      }
      Array.isArray(subObject) ? subObject.splice(lastProp, 1) : delete subObject[lastProp];
    }
    if (thisOp === REPLACE || thisOp === ADD) {
      subObject[lastProp] = thisDiff.value;
    }

    if (thisOp === MOVE) {
      subObject[lastToProp] = valueToMove;
    }
  }

  return subObject;
}

function transformPath(pathConverter, thisPath) {
  if (pathConverter) {
    thisPath = pathConverter(thisPath);
    if (!Array.isArray(thisPath)) {
      throw new Error(['pathConverter must return an array, returned:', thisPath].join(' '));
    }
  } else {
    if (!Array.isArray(thisPath)) {
      throw new Error(['diff path', thisPath, 'must be an array, consider supplying a path converter'].join(' '));
    }
  }

  return thisPath;
}

export function jsonPatchPathConverterApply(path: string) {
  return path.split('/').slice(1);
}

function prototypeCheck(prop) {
  // coercion is intentional to catch prop values like `['__proto__']`
  if (prop == '__proto__' || prop == 'constructor' || prop == 'prototype') {
    throw new Error('setting of prototype values not supported');
  }
}
