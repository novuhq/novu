import { str, url, ValidatorSpec } from 'envalid';

export const envValidators = {
  NODE_ENV: str({
    choices: ['dev', 'test', 'production', 'ci', 'local'],
    default: 'local',
  }),
  REACT_APP_API_URL: url({ default: 'http://127.0.0.1:3000' }),
  REACT_APP_WS_URL: url({ default: 'http://127.0.0.1:3002' }),
} satisfies Record<string, ValidatorSpec<unknown>>;
