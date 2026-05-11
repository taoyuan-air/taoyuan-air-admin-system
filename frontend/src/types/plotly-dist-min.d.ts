// plotly.js-dist-min is a pre-built UMD bundle without its own TS declarations.
// Re-export the official plotly.js types so imports work correctly.
declare module 'plotly.js-dist-min' {
  import * as Plotly from 'plotly.js';
  export = Plotly;
}
