import { ITheme } from './theme.interface';

export class ThemeStore {
  private themes: Array<ITheme> = [];
  private defaultTheme?: ITheme;

  async addTheme(theme: ITheme) {
    this.themes.push(theme);

    return await this.getThemeById(theme.id);
  }

  async getThemeById(id: string) {
    return this.themes.find((theme) => theme.id === id);
  }

  async setDefaultTheme(themeId: string) {
    this.defaultTheme = await this.getThemeById(themeId);
  }

  async getDefaultTheme() {
    return this.defaultTheme;
  }
}
