declare module "node:sqlite" {
  export type SQLInputValue = null | string | number | bigint | Uint8Array;
  export type SQLOutputValue = null | string | number | bigint | Uint8Array;
  export class StatementSync {
    all(...values: SQLInputValue[]): Record<string, SQLOutputValue>[];
    get(...values: SQLInputValue[]): Record<string, SQLOutputValue> | undefined;
    run(...values: SQLInputValue[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  }
  export class DatabaseSync {
    constructor(location: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
