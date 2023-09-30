export interface IEmailJsConfig {
  from: string;
  host: string;
  port: number;
  secure?: boolean;
  user?: string;
  password?: string;
}
