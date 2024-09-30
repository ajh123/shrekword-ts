export function unserialize(str: string) {
    return luaTableToJs(str);
}

const luaTableToJs = (luaString: string): any => {
  // Handle arrays
  let arrayPattern = /\{((?:\s*("[^"]+"|[^",]+)\s*,?)+)\}/g;
  if (arrayPattern.test(luaString)) {
    return luaString
      .replace(/[\{\}]/g, "") // Remove braces
      .split(",")
      .map(value => value.trim().replace(/\"/g, '')); // Clean up array values
  }

  // Handle objects with key-value pairs
  let objectPattern = /\{(?:\s*([^\s=\}]+)\s*=\s*("[^"]+"|[^,}]+)\s*,?)+\s*\}/g;
  let match = objectPattern.exec(luaString);

  if (match) {
    let obj: Record<string, any> = {};
    let keyValuePairs = luaString.match(/([^\s=\}]+)\s*=\s*("[^"]+"|[^,}]+)/g);

    if (keyValuePairs) {
      keyValuePairs.forEach(pair => {
        let [key, value] = pair.split("=");
        key = key.trim();
        value = value.trim().replace(/\"/g, ''); // Remove quotes around value
        obj[key] = value;
      });
    }
    return obj;
  }

  // If it's a single value, just return it as is
  return luaString;
};