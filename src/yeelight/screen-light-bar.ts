import { Logging } from 'homebridge';
import { isIP } from 'net';
import yeelightPlatform from 'yeelight-platform';
import * as YeelightTypes from './type/yeelight-types';
import * as TypeCheck from './type/typecheck';
import * as DeviceUtil from './device-util';
import homebridgeLib from 'homebridge-lib';

export default class ScreenLightBar {
  readonly ipAddr: string;
  readonly device: yeelightPlatform.Device;
  readonly model: YeelightTypes.SupportedModel = 'lamp15';
  readonly stateProps: (keyof YeelightTypes.DeviceProperty)[] = ['main_power', 'bright', 'ct', 'bg_power', 'bg_lmode', 'bg_bright', 'bg_ct', 'bg_rgb', 'bg_hue', 'bg_sat'];
  private state: YeelightTypes.DeviceProperty = {};
  private updateTimerTime = 500;
  private updateTimer: {
    [key in YeelightTypes.CommandMethod]?: NodeJS.Timeout
  } = {};

  onDeviceUpdated?: (state: YeelightTypes.DeviceProperty) => void;

  constructor(device: yeelightPlatform.Device, ipAddr: string) {
    this.device = device;
    this.ipAddr = ipAddr;
    this.device.on('deviceUpdate', this.deviceUpdated.bind(this));
  }

  /**
   * yeelightPlatform.Deviceを作成して、インスタンスを生成する
   *
   * @static
   * @param {string} ipAddr
   * @return {*}  {Promise<ScreenLightBar>}
   * @memberof ScreenLightBar
   */
  static async init(ipAddr: string): Promise<ScreenLightBar> {
    // IPアドレスをチェック
    if (!isIP(ipAddr)) {
      throw new Error('IP address check error');
    }

    // Device
    const device = new yeelightPlatform.Device({
      host: ipAddr,
      port: 55443,
      debug: false,
      interval: 5000,
    });

    // 接続
    await DeviceUtil.connectDevice(device);

    // モデル情報を取得する
    const result = await DeviceUtil.getProperty(device, ['model']);
    if (result?.model !== 'lamp15') {
      throw new Error('Unsupported model');
    }

    // ScreenLightBar
    const screenLightBar = new ScreenLightBar(device, ipAddr);
    return screenLightBar;
  }

  /**
   * デバイスの状態が更新された時の処理
   *
   * @param {unknown} props
   * @return {*}
   * @memberof ScreenLightBar
   */
  private async deviceUpdated(props: unknown) {
    // 通知メッセージだけ処理する
    if (!TypeCheck.isNotificationMessage(props)) {
      return;
    }

    // 現在の状態を保持しておく
    const currentState = Object.assign({}, this.state);

    // power系のプロパティはなんかおかしい時があるので、プロパティ取得で取り直す
    if ('power' in props.params || 'main_power' in props.params || 'bg_power' in props.params) {
      // プロパティを更新
      await this.updateProperty();
    } else {
      // プロパティを更新
      Object.assign(this.state, props.params);
    }

    // 変更があったやつだけ反映させる
    const newState = Object.assign({}, this.state);
    this.stateProps.forEach((key) => {
      if (newState[key] === currentState[key]) {
        newState[key] = undefined;
      }
    });

    // バックグラウンドライトは、モードに応じて更新を通知しないようにする
    if (this.state.bg_lmode === 1) {
      newState['bg_ct'] = undefined;
    } else {
      newState['bg_hue'] = undefined;
      newState['bg_sat'] = undefined;
    }

    // 更新を通知
    this.onDeviceUpdated?.(newState);
  }

  /**
   * プロパティ情報を更新する
   *
   * @return {*}
   * @memberof ScreenLightBar
   */
  async updateProperty() {
    const result = await DeviceUtil.getProperty(this.device, this.stateProps);
    if (!result) {
      return;
    }

    // 取得したプロパティをセット
    this.state = result;
  }

  // MARK: - プロパティ取得
  getOn(type: YeelightTypes.LightType): boolean | null {
    switch (type) {
      case 'main':
        if (this.state.main_power) {
          return this.state.main_power === 'on';
        }
        return null;
      case 'background':
        if (this.state.bg_power) {
          return this.state.bg_power === 'on';
        }
        return null;
    }
  }

  getBrightness(type: YeelightTypes.LightType): number | null {
    switch (type) {
      case 'main':
        return this.state.bright ?? null;
      case 'background':
        return this.state.bg_bright ?? null;
    }
  }

  getColorTemperature(type: YeelightTypes.LightType): number | null {
    switch (type) {
      case 'main':
        return this.state.ct ?? null;
      case 'background':
        return this.state.bg_ct ?? null;
    }
  }

  getHue(type: YeelightTypes.LightType): number | null {
    switch (type) {
      case 'main':
        return null;
      case 'background':
        return this.state.bg_hue ?? null;
    }
  }

  getSaturation(type: YeelightTypes.LightType): number | null {
    switch (type) {
      case 'main':
        return null;
      case 'background':
        return this.state.bg_sat ?? null;
    }
  }

  /**
   *  APIのアクセス制限回避のために、一定時間内にまとめ変更があった場合は最後のだけを送信する
   *
   * @private
   * @param {[YeelightTypes.CommandMessage, YeelightTypes.DeviceProperty]} command
   * @param {Logging} [log]
   * @memberof ScreenLightBar
   */
  private setSendCommandPool(command: [YeelightTypes.CommandMessage, YeelightTypes.DeviceProperty], log?: Logging) {
    // タイマーが既にある場合は解除
    const currentTimer = this.updateTimer[command[0].method];
    if (currentTimer !== undefined) {
      clearTimeout(currentTimer);
      this.updateTimer[command[0].method] = undefined;
      log?.debug(`Clear Timer - ${command[0].method}`);
    }

    // タイマーをセット
    this.updateTimer[command[0].method] = setTimeout(async () => {
      try {
        this.updateTimer[command[0].method] = undefined;

        // コマンドを実行
        await DeviceUtil.sendCommand(this.device, command[0], log);

        log?.debug(`Execute Timer - ${command[0].method}`);
      } catch {
        log?.debug(`Failed Timer - ${command[0].method}`);
      }

    }, this.updateTimerTime);
    log?.debug(`Set Timer - ${command[0].method}`);
  }

  // MARK: - プロパティ更新
  async setOn(type: YeelightTypes.LightType, value: boolean, isSmooth: boolean, log?: Logging): Promise<void> {
    const isOn = value ? 'on' : 'off';
    const effect = isSmooth ? 'smooth' : 'sudden';
    const command = ((_type, _isOn, _effect, _currentState): [YeelightTypes.CommandMessage, YeelightTypes.DeviceProperty] | null => {
      switch (_type) {
        case 'main':
          if (_currentState.main_power === isOn) {
            return null;
          }
          return [{
            id: -1,
            method: 'set_power',
            params: [_isOn, _effect, 500],
          }, { 'main_power': _isOn }];
        case 'background':
          if (_currentState.bg_power === isOn) {
            return null;
          }
          return [{
            id: -1,
            method: 'bg_set_power',
            params: [_isOn, _effect, 500],
          }, { 'bg_power': _isOn }];
      }
    })(type, isOn, effect, this.state);

    if (!command) {
      return;
    }

    // コマンドを実行
    await DeviceUtil.sendCommand(this.device, command[0], log);

    // プロパティを更新
    Object.assign(this.state, command[1]);
  }

  async setBrightness(type: YeelightTypes.LightType, value: number, log?: Logging): Promise<void> {
    const command = ((_type, _value, _currentState): [YeelightTypes.CommandMessage, YeelightTypes.DeviceProperty] | null => {
      switch (_type) {
        case 'main':
          if (_currentState.bright === _value) {
            return null;
          }
          if (_currentState.main_power !== 'on') {
            return null;
          }
          return [{
            id: -1,
            method: 'set_bright',
            params: [value, 'smooth', 250],
          }, { 'bright': _value }];
        case 'background':
          if (_currentState.bg_bright === _value) {
            return null;
          }
          if (_currentState.bg_power !== 'on') {
            return null;
          }
          return [{
            id: -1,
            method: 'bg_set_bright',
            params: [value, 'smooth', 250],
          }, { 'bg_bright': _value }];
      }
    })(type, value, this.state);

    if (!command) {
      return;
    }

    // コマンドを実行
    this.setSendCommandPool(command, log);

    // プロパティを更新
    Object.assign(this.state, command[1]);
  }

  async setColorTemperature(type: YeelightTypes.LightType, value: number, log?: Logging): Promise<void> {
    const command = ((_type, _value, _currentState): [YeelightTypes.CommandMessage, YeelightTypes.DeviceProperty] | null => {
      switch (_type) {
        case 'main':
          if (_currentState.ct === _value) {
            return null;
          }
          if (_currentState.main_power !== 'on') {
            return null;
          }
          return [{
            id: -1,
            method: 'set_ct_abx',
            params: [_value, 'smooth', 250],
          }, { 'ct': _value }];
        case 'background':
          if (_currentState.bg_ct === _value) {
            return null;
          }
          if (_currentState.bg_power !== 'on') {
            return null;
          }
          return [{
            id: -1,
            method: 'bg_set_ct_abx',
            params: [_value, 'smooth', 250],
          }, { 'bg_ct': _value}];
      }
    })(type, value, this.state);

    if (!command) {
      return;
    }

    // コマンドを実行
    this.setSendCommandPool(command, log);

    // プロパティを更新
    Object.assign(this.state, command[1]);
  }

  async setHue(type: YeelightTypes.LightType, value: number, log?: Logging): Promise<void> {
    const command = ((_type, _value, _currentState): [YeelightTypes.CommandMessage, YeelightTypes.DeviceProperty] | null => {
      switch (_type) {
        case 'main':
          return null;
        case 'background': {
          if (_currentState.bg_hue === undefined || _currentState.bg_sat === undefined) {
            return null;
          }
          if (_currentState.bg_power !== 'on') {
            return null;
          }
          const rgb = this.getYeelightRgbFromHsv(_value, _currentState.bg_sat);
          return [{
            id: -1,
            method: 'bg_set_rgb',
            params: [rgb, _value, 'smooth', 250],
          }, { 'bg_hue': _value }];
        }
      }
    })(type, value, this.state);

    if (!command) {
      return;
    }

    // コマンドを実行
    this.setSendCommandPool(command, log);

    // プロパティを更新
    Object.assign(this.state, command[1]);
  }

  async setSaturation(type: YeelightTypes.LightType, value: number, log?: Logging): Promise<void> {
    const command = ((_type, _value, _currentState): [YeelightTypes.CommandMessage, YeelightTypes.DeviceProperty] | null => {
      switch (_type) {
        case 'main':
          return null;
        case 'background': {
          if (_currentState.bg_hue === undefined || _currentState.bg_sat === undefined) {
            return null;
          }
          if (_currentState.bg_power !== 'on') {
            return null;
          }
          const rgb = this.getYeelightRgbFromHsv(_currentState.bg_hue, _value);
          return [{
            id: -1,
            method: 'bg_set_rgb',
            params: [rgb, _value, 'smooth', 250],
          }, { 'bg_sat': _value }];
        }
      }
    })(type, value, this.state);

    if (!command) {
      return;
    }

    // コマンドを実行
    this.setSendCommandPool(command, log);

    // プロパティを更新
    Object.assign(this.state, command[1]);
  }

  private getYeelightRgbFromHsv(h: number, s: number): number {
    const rgb = homebridgeLib.Colour.hsvToRgb(h, s, 100);
    return Math.floor(rgb.r * 255) * 65536 + Math.floor(rgb.g * 255) * 256 + Math.floor(rgb.b * 255);
  }
}