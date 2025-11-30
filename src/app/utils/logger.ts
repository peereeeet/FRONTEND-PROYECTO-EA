export const logger = {
  log: (...args: any[]) => { try { console.log(...args); } catch {} },
  info: (...args: any[]) => { try { console.info(...args); } catch {} },
  warn: (...args: any[]) => { try { console.warn(...args); } catch {} },
  error: (...args: any[]) => { try { console.error(...args); } catch {} },
  debug: (...args: any[]) => { try { console.debug(...args); } catch {} }
};

export default logger;
