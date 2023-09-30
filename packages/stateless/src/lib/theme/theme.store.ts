import { ITheme } from './theme.interface';

interface IThemeStorage {
  id: string;
  theme: ITheme;
}

export class ThemeStore {
  private themes: Array<IThemeStorage> = [];

  private defaultTheme?: ITheme;

  async addTheme(id: string, theme: ITheme) {
    this.themes.push({
      id,
      theme,
    });

    return await this.getThemeById(id);
  }

  async getThemeById(id: string) {
    return this.themes.find((theme) => theme.id === id)?.theme;
  }

  async setDefaultTheme(themeId: string) {
    this.defaultTheme = await this.getThemeById(themeId);
  }

  async getDefaultTheme() {
    return this.defaultTheme;
  }
}
