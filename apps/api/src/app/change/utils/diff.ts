function getDiff(
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>,
  basePath: string[],
  diffs: any,
  pathConverter
) {
  const obj1Keys = Object.keys(obj1);
  const obj1KeysLength = obj1Keys.length;
  const obj2Keys = Object.keys(obj2);
  const obj2KeysLength = obj2Keys.length;
  let path;

  let key;
  let i;
  for (i = 0; i < obj1KeysLength; i++) {
    key = Array.isArray(obj1) ? Number(obj1Keys[i]) : obj1Keys[i];
    if (!(key in obj2)) {
      path = basePath.concat(key);
      diffs.remove.push({
        op: 'remove',
        path: pathConverter(path),
      });
    }
  }

  for (i = 0; i < obj2KeysLength; i++) {
    key = Array.isArray(obj2) ? Number(obj2Keys[i]) : obj2Keys[i];
    const obj1AtKey = obj1[key];
    const obj2AtKey = obj2[key];
    if (!(key in obj1)) {
      path = basePath.concat(key);
      const obj2Value = obj2[key];
      diffs.add.push({
        op: 'add',
        path: pathConverter(path),
        value: obj2Value,
      });
    } else if (obj1AtKey !== obj2AtKey) {
      if (Object(obj1AtKey) !== obj1AtKey || Object(obj2AtKey) !== obj2AtKey) {
        path = pushReplace(path, basePath, key, diffs, pathConverter, obj2);
      } else {
        if (
          !Object.keys(obj1AtKey).length &&
          !Object.keys(obj2AtKey).length &&
          String(obj1AtKey) != String(obj2AtKey)
        ) {
          path = pushReplace(path, basePath, key, diffs, pathConverter, obj2);
        } else {
          getDiff(obj1[key] as any, obj2[key] as any, basePath.concat(key), diffs, pathConverter);
        }
      }
    }
  }

  return diffs.remove.reverse().concat(diffs.replace).concat(diffs.add);
}

export function diff(obj1, obj2, pathConverter?) {
  if (!obj1 || typeof obj1 != 'object' || !obj2 || typeof obj2 != 'object') {
    throw new Error('both arguments must be objects or arrays');
  }

  pathConverter ||
    (pathConverter = function (arr) {
      return arr;
    });

  return getDiff(obj1, obj2, [], { remove: [], replace: [], add: [] }, pathConverter);
}

function pushReplace(path, basePath, key, diffs, pathConverter, obj2) {
  path = basePath.concat(key);
  diffs.replace.push({
    op: 'replace',
    path: pathConverter(path),
    value: obj2[key],
  });

  return path;
}

export function jsonPatchPathConverter(path: string[]) {
  return [''].concat(path).join('/');
}
