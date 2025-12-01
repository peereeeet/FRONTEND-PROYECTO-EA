import { environment } from "../environments/environment";

const noop = () => {};

export const logger = {
  log: (...args: any[]) => { try { console.log(...args); } catch {} },
  info: (...args: any[]) => { try { console.info(...args); } catch {} },
  warn: (...args: any[]) => { try { console.warn(...args); } catch {} },
  error: (...args: any[]) => { try { console.error(...args); } catch {} },
  debug: (...args: any[]) => { try { console.debug(...args); } catch {} }
};

if (environment.production) {
  logger.log = noop;
  logger.info = noop;
  logger.debug = noop;

  // Si quieres silenciar TODO, descomenta las siguientes líneas:
  // logger.warn = noop;
  // logger.error = noop;
}

export default logger;