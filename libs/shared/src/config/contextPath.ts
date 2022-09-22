export enum NovuComponentEnum {
  WEB,
  API,
  WIDGET,
  WS,
  EMBEDED,
}

export function getContextPath(component: NovuComponentEnum) {
  let contextPath = '';

  if (process.env.GLOBAL_CONTEXTPATH) {
    contextPath += process.env.GLOBAL_CONTEXTPATH + '/';
  }

  switch (component) {
    case NovuComponentEnum.API:
      if (process.env.API_CONTEXTPATH) {
        contextPath += process.env.API_CONTEXTPATH + '/';
      }
      break;
    case NovuComponentEnum.WEB:
      if (process.env.FRONT_BASE_CONTEXTPATH) {
        contextPath += process.env.FRONT_BASE_CONTEXTPATH + '/';
      }
      break;
    case NovuComponentEnum.WIDGET:
      if (process.env.WIDGET_CONTEXTPATH) {
        contextPath += process.env.WIDGET_CONTEXTPATH + '/';
      }
      break;
    case NovuComponentEnum.EMBEDED:
      if (process.env.WIDGET_EMBED_CONTEXTPATH) {
        contextPath += process.env.WIDGET_EMBED_CONTEXTPATH + '/';
      }
      break;

    case NovuComponentEnum.WS:
      if (process.env.REACT_APP_WS_CONTEXTPATH) {
        contextPath += process.env.REACT_APP_WS_CONTEXTPATH + '/';
      }
      break;
  }

  return contextPath;
}
