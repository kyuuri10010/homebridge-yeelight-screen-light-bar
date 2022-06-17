import { Logging } from 'homebridge';
import yeelightPlatform from 'yeelight-platform';
import delay from 'delay';
import * as YeelightTypes from './type/yeelight-types';
import * as TypeCheck from './type/typecheck';

/**
 * デバイスに接続する
 *
 * @export
 * @param {yeelightPlatform.Device} device
 * @return {*}  {Promise<void>}
 */
export async function connectDevice(device: yeelightPlatform.Device): Promise<void> {
  return new Promise((resolve, reject) => {
    // 既に接続済みであればなにもしない
    if (device.connected) {
      resolve();
      return;
    }

    // 接続
    const connected = async () => {
      device.removeListener('connected', connected);
      clearTimeout(timeout);

      await delay(1000);
      resolve();
    };

    const timeout = setTimeout(() => {
      device.removeListener('connected', connected);

      // タイムアウト時に、これ以降リトライしないようにする
      if (device.socket) {
        device.disconnect(true);
      } else if (device.retry_timer) {
        clearTimeout(device.retry_timer);
        device.retry_timer = null;
      }

      reject('Connection timeout');
    }, (5 * 60 * 1000));

    device.on('connected', connected);
    device.connect();
  });
}

/**
 * コマンドを送信する
 *
 * @export
 * @param {yeelightPlatform.Device} device
 * @param {YeelightTypes.CommandMessage} data
 * @return {*}  {Promise<YeelightTypes.CommandResponse>}
 */
export async function sendCommand(device: yeelightPlatform.Device, data: YeelightTypes.CommandMessage, log?: Logging): Promise<YeelightTypes.CommandResponse> {
  return new Promise((resolve, reject) => {
    const commandId = Math.floor(Math.random() * 1000);
    data.id = commandId;

    const deviceUpdated = (props: unknown) => {
      if (!TypeCheck.isCommandResponse(props)) {
        return;
      }
      if (props.id !== commandId) {
        return;
      }
      device.removeListener('deviceUpdate', deviceUpdated);
      clearTimeout(timeout);

      if (props.result) {
        resolve(props);
      } else {
        log?.error(props.error?.message ?? 'Send command has not result');
        log?.error(data as unknown as string);
        reject();
      }
    };

    const timeout = setTimeout(() => {
      device.removeListener('deviceUpdate', deviceUpdated);
      log?.error('Send command is timeout');
      reject();
    }, 5000);

    device.on('deviceUpdate', deviceUpdated);
    device.sendCommand(data);
  });
}

/**
 * プロパティを取得する
 *
 * @export
 * @param {yeelightPlatform.Device} device
 * @param {(keyof YeelightTypes.DeviceProperty)[]} props
 * @return {*}  {(Promise<YeelightTypes.DeviceProperty | null>)}
 */
export async function getProperty(device: yeelightPlatform.Device, props: (keyof YeelightTypes.DeviceProperty)[], log?: Logging): Promise<YeelightTypes.DeviceProperty | null> {
  try {
    const result = await sendCommand(device, {
      id: -1,
      method: 'get_prop',
      params: props,
    }, log);

    const property = {};
    result.result?.forEach((value, index) => {
      // 全部Stringで取得されるので、型を正しくしておく
      const prop = props[index];
      const type = YeelightTypes.DEVICE_PROPERETY_TYPE[prop];
      if (type === 'string') {
        property[props[index]] = value;
      } else {
        property[props[index]] = Number(value);
      }
    });

    return property as YeelightTypes.DeviceProperty;
  } catch {
    return null;
  }
}