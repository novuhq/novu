export enum NovuComponentEnum {
  WEB,
  API,
  WIDGET,
  WS,
}

export function getContextPath(component: NovuComponentEnum) {
  let contextPath = '';

  if (process.env.GLOBAL_CONTEXT_PATH) {
    contextPath += process.env.GLOBAL_CONTEXT_PATH + '/';
  }

  switch (component) {
    case NovuComponentEnum.API:
      if (process.env.API_CONTEXT_PATH) {
        contextPath += process.env.API_CONTEXT_PATH + '/';
      }
      break;
    case NovuComponentEnum.WEB:
      if (process.env.FRONT_BASE_CONTEXT_PATH) {
        contextPath += process.env.FRONT_BASE_CONTEXT_PATH + '/';
      }
      break;
    case NovuComponentEnum.WIDGET:
      if (process.env.WIDGET_CONTEXT_PATH) {
        contextPath += process.env.WIDGET_CONTEXT_PATH + '/';
      }
      break;
    case NovuComponentEnum.WS:
      if (process.env.WS_CONTEXT_PATH) {
        contextPath += process.env.WS_CONTEXT_PATH + '/';
      }
      break;
  }

  return contextPath;
}
