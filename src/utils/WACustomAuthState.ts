import {
  AuthenticationCreds,
  AuthenticationState,
  BufferJSON,
  initAuthCreds,
  SignalDataSet,
  SignalDataTypeMap,
} from "baileys";
import {
  OperationObject,
  PostgreSQLServices,
} from "../services/PostgresSQLService";
import { fromObject } from "./WACustomAuthStateUtils";
import { MySQLConfig, sqlData } from "../intefaces/IWACustonAuthState";
import { Client } from "pg";

interface IWACuston {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clear: () => Promise<void>;
  removeCreds: () => Promise<void>;
  query: (sql: string, values: string[]) => Promise<sqlData>;
}

export class WACustonAuthState {
  private static client: Client | null;
  private static retryRequestDelayMs: number;
  private static maxtRetries: number;
  private static tableName: string;
  private static session: string;

  private static async connect(config: MySQLConfig, force: boolean = false) {
    if (!this.client || force) {
      this.client = new Client({
        host: config.host || "localhost",
        port: config.port || 5432,
        user: config.user || "postgres",
        password: config.password,
        database: config.database || "base",
      });
      this.retryRequestDelayMs = config.retryRequestDelayMs || 200;
      this.maxtRetries = config.maxtRetries || 10;
      this.tableName = config.tableName || "auth";
      this.session = config.session || "session";

      await this.client.connect();

      const tableName = config.tableName || "auth";
      await this.client.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        session VARCHAR(50) NOT NULL,
        id VARCHAR(80) NOT NULL,
        value JSONB,
        PRIMARY KEY (session, id)
      );
    `);
    }
  }

  private static async query(sql: string, values: any[]) {
    for (let attempt = 0; attempt < this.maxtRetries; attempt++) {
      try {
        const res = await this.client!.query(sql, values);
        return res.rows as sqlData;
      } catch (e) {
        await new Promise((r) => setTimeout(r, this.retryRequestDelayMs));
      }
    }
    return [] as sqlData;
  }

  private static async readData(id: string) {
    const data: any = await this.query(
      `SELECT value FROM ${this.tableName} WHERE id = $1 AND session = $2`,
      [id, this.session]
    );
    if (!data[0]?.value) {
      return null;
    }
    const creds =
      typeof data[0].value === "object"
        ? JSON.stringify(data[0].value)
        : data[0].value;
    const credsParsed = JSON.parse(creds, BufferJSON.reviver);
    return credsParsed;
  }

  private static async writeData(id: string, value: object) {
    const valueFixed = JSON.stringify(value, BufferJSON.replacer);
    await this.query(
      `INSERT INTO ${this.tableName} (session, id, value) VALUES ($1, $2, $3) 
         ON CONFLICT (session, id) DO UPDATE SET value = EXCLUDED.value`,
      [this.session, id, valueFixed]
    );
  }

  private static async removeData(id: string) {
    await this.query(
      `DELETE FROM ${this.tableName} WHERE id = $1 AND session = $2`,
      [id, this.session]
    );
  }

  private static async clearAll() {
    await this.query(
      `DELETE FROM ${this.tableName} WHERE id != 'creds' AND session = $1`,
      [this.session]
    );
  }
  private static async removeAll() {
    await this.query(`DELETE FROM ${this.tableName} WHERE session = $1`, [
      this.session,
    ]);
  }

  public static async usePostgresAuthState(
    config: MySQLConfig
  ): Promise<IWACuston> {
    await this.connect(config);

    const creds: AuthenticationCreds =
      (await this.readData("creds")) || initAuthCreds();

    return {
      state: {
        creds: creds,
        keys: {
          get: async (type, ids) => {
            const data: { [id: string]: SignalDataTypeMap[typeof type] } = {};
            for (const id of ids) {
              let value = await this.readData(`${type}-${id}`);
              if (type === "app-state-sync-key" && value) {
                value = fromObject(value);
              }
              data[id] = value;
            }
            return data;
          },
          set: async (data: any) => {
            for (const category in data) {
              for (const id in data[category]) {
                const value = data[category][id];
                const name = `${category}-${id}`;
                if (value) {
                  await this.writeData(name, value);
                } else {
                  await this.removeData(name);
                }
              }
            }
          },
        },
      },
      saveCreds: async () => {
        await this.writeData("creds", creds);
      },
      clear: async () => {
        await this.clearAll();
      },
      removeCreds: async () => {
        await this.removeAll();
      },
      query: async (sql: string, values: any[]) => {
        return await this.query(sql, values);
      },
    };

    //   public static usePostgresAuthState = async (session: string): Promise<IWACuston> => {
    //   const pgClient = new PostgreSQLServices();
    //   const tableName = "wa_auth_state";
    //   const retryRequestDelayMs =  200;
    //   const maxRetries = 10;

    // //   const query = async (sql: string, values: any[]) => {
    // //     for (let attempt = 0; attempt < maxRetries; attempt++) {
    // //       try {
    // //         const res = await pgClient.query(sql, values);
    // //         return res.rows as sqlData;
    // //       } catch (e) {
    // //         await new Promise((r) => setTimeout(r, retryRequestDelayMs));
    // //       }
    // //     }
    // //     return [] as sqlData;
    // //   };

    //   const readData = async (id: string) => {
    //     // const data = await query(
    //     //   `SELECT value FROM ${tableName} WHERE id = $1 AND session = $2`,
    //     //   [id, config.session]
    //     // );
    //     const xSQL = `SELECT value FROM ${tableName} WHERE id = ${id} AND session = ${session}`;
    //     const query = await pgClient.query(xSQL);
    //     if (!query.data[0]?.value) {
    //       return null;
    //     }
    //     const creds = typeof query.data[0].value === 'object' ? JSON.stringify(query.data[0].value) : query.data[0].value;
    //     const credsParsed = JSON.parse(creds, BufferJSON.reviver);
    //     return credsParsed;
    //   };

    //   const writeData = async (id: string, value: object) => {
    //     const valueFixed = JSON.stringify(value, BufferJSON.replacer);
    //     await query(
    //       `INSERT INTO ${tableName} (session, id, value) VALUES ($1, $2, $3)
    //        ON CONFLICT (session, id) DO UPDATE SET value = EXCLUDED.value`,
    //       [config.session, id, valueFixed]
    //     );
    //   };

    //   const removeData = async (id: string) => {
    //     await query(`DELETE FROM ${tableName} WHERE id = $1 AND session = $2`, [id, config.session]);
    //   };

    //   const clearAll = async () => {
    //     await query(`DELETE FROM ${tableName} WHERE id != 'creds' AND session = $1`, [config.session]);
    //   };

    //   const removeAll = async () => {
    //     await query(`DELETE FROM ${tableName} WHERE session = $1`, [config.session]);
    //   };

    //   const creds: AuthenticationCreds = (await readData('creds')) || initAuthCreds();

    //   return {
    //     state: {
    //       creds: creds,
    //       keys: {
    //         get: async (type, ids) => {
    //           const data: { [id: string]: SignalDataTypeMap[typeof type] } = {};
    //           for (const id of ids) {
    //             let value = await readData(`${type}-${id}`);
    //             if (type === 'app-state-sync-key' && value) {
    //               value = fromObject(value);
    //             }
    //             data[id] = value;
    //           }
    //           return data;
    //         },

    //         set: async (data: SignalDataSet) => {
    //           for (const category in data) {
    //             for (const id in data[category]) {
    //               const value = data[category][id];
    //               const name = `${category}-${id}`;
    //               if (value) {
    //                 await writeData(name, value);
    //               } else {
    //                 await removeData(name);
    //               }
    //             }
    //           }
    //         },
    //       },
    //     },
    //     saveCreds: async () => {
    //       await writeData('creds', creds);
    //     },
    //     clear: async () => {
    //       await clearAll();
    //     },
    //     removeCreds: async () => {
    //       await removeAll();
    //     },
    //     query: async (sql: string, values: any[]) => {
    //       return await query(sql, values);
    //     },
    //   }
  }
}
