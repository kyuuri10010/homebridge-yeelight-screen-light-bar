declare module 'yeelight-platform' {
    import { EventEmitter } from 'stream';

    export interface DeviceInfo {
        debug: boolean;
        interval: number;
        host: string;
        port: number;
    }

    class YeeDevice extends EventEmitter {
      device: DeviceInfo;
      debug: boolean;
      connected: boolean;
      forceDisconnect: boolean;
      timer: number | null;
      polligInterval: number;
      retry_timer: number | null;

      constructor(device: DeviceInfo)
      connect(): void
      disconnect(forceDisconnect: boolean): void
      sendCommand(data: {
        id: number;
        method: string;
        params: (string | number)[];
      }): void
    }

    class YeeDiscovery extends EventEmitter {
      discover(): void
      listen(): void
    }

    export {
      YeeDevice as Device,
      YeeDiscovery as Discovery,
    };
}
