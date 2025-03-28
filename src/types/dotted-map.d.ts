declare module 'dotted-map' {
  interface DottedMapOptions {
    width?: number;
    height?: number;
    grid?: 'square' | 'diagonal';
  }

  interface GetSVGOptions {
    radius?: number;
    color?: string;
    shape?: 'circle' | 'square';
    backgroundColor?: string;
  }

  export default class DottedMap {
    constructor(options: DottedMapOptions);
    getSVG(options?: GetSVGOptions): string;
  }
} 