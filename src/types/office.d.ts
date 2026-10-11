// Minimal ambient declarations for the Office.js / Excel JavaScript API surface used by this
// add-in. At runtime the real Office.js library is loaded from the CDN <script> tag in
// taskpane.html, so we do not ship or depend on the npm package. Only the members we use are
// declared here to keep typings strict without a heavy dependency.

declare global {
  namespace Excel {
    interface RequestContext {
      sync(): Promise<void>;
      workbook: Workbook;
    }

    interface Workbook {
      worksheets: Worksheets;
      getSelectedRange(): Range;
    }

    interface Worksheets {
      getActiveWorksheet(): Worksheet;
      add(name: string): Worksheet;
      getItemOrNullObject(name: string): Worksheet;
    }

    interface Worksheet {
      name: string;
      getRangeByIndexes(row: number, column: number, rowCount: number, columnCount: number): Range;
      getUsedRangeOrNullObject(): Range;
      tables: Tables;
    }

    interface Tables {
      add(address: string, hasHeaders: boolean): Table;
      getItemOrNullObject(name: string): Table;
    }

    interface Table {
      name: string;
      getHeaderRowRange(): Range;
    }

    interface RangeFormat {
      font: RangeFont;
    }

    interface RangeFont {
      bold: boolean;
    }

    interface Range {
      values: unknown[][];
      numberFormat: unknown[][];
      rowCount: number;
      columnCount: number;
      address: string;
      format: RangeFormat;
      load(propertyNames: string): void;
      getAddress(): string;
    }

    function run<T>(callback: (context: RequestContext) => Promise<T>): Promise<T>;
  }

  // The Office host exposes a global `Excel` object (merged namespace + value).
  // eslint-disable-next-line no-var
  var Excel: typeof Excel;
}

export {};
