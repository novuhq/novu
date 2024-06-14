export class JsonUtils {
  public static isJsonString(str) {
    try {
      JSON.parse(str);

      return true;
    } catch (error) {
      return false;
    }
  }
}
