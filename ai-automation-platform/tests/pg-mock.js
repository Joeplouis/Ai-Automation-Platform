// Jest manual mock for 'pg' to use pg-mem when DATABASE_URL starts with mem://
// We cannot import 'pg' normally because moduleNameMapper points here. Attempt to retrieve
// original implementation once via dynamic require from Node's module cache trick.
let realPg;
if (!global.__REAL_PG__) {
  // eslint-disable-next-line global-require
  realPg = await import('node:module').then(m => {
    // Fallback: create a tiny stub of Pool that simply throws if used (should not happen in tests)
    return { Pool: class { constructor(){ throw new Error('Real pg Pool unavailable in test mock'); } } };
  });
  global.__REAL_PG__ = realPg;
} else {
  realPg = global.__REAL_PG__;
}

class MemPool {
  constructor(config = {}) {
    if (!global.__pgmem || !config?.connectionString?.startsWith?.('mem://')) {
      // Return a dummy object with query throwing to highlight unexpected real DB usage
      this.query = () => { throw new Error('Real database access disabled in tests'); };
      this.end = async () => {};
      return;
    }
    const client = new global.__pgmem.Client();
    this.query = client.query.bind(client);
    this.end = async () => {};
  }
}

export const Pool = MemPool;
export default { Pool };
