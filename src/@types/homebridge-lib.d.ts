declare module 'homebridge-lib' {
    class _AdaptiveLighting {
      constructor(bri: number, ct: number)
      get active(): boolean
      get briIid(): number
      get ctIid(): number
      deactivate(): void
      generateConfiguration(): string
      generateControlResponse(): string
      generateControl(): string
      parseConfiguration(value: string): unknown
      parseControl(value: string): unknown
      getCt(bri: number, offset?: number): number
    }

    class _Colour {
      static hsvToRgb(h: number, s: number, v: number): {
        r: number;
        g: number;
        b: number;
      }

      static rgbToHsv(r: number, g: number, b: number): {
        h: number;
        s: number;
        v: number;
      }
    }

    export default class homebridgeLib {
      static get AdaptiveLighting(): typeof _AdaptiveLighting
      static get Colour(): typeof _Colour
      static timeout(msec: number): Promise<void>
      static formatError(e: Error, useChalk: boolean): string
      static toHexString(i: number, length: number): string
    }

    export type AdaptiveLighting = _AdaptiveLighting;
}