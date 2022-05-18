import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  Logging,
  Service,
} from 'homebridge';
import { ACCESSORY_NAME } from './settings';
import ScreenLightBar from './yeelight/screen-light-bar';
import * as YeelightTypes from './yeelight/type/yeelight-types';

export class YeelightAccessory implements AccessoryPlugin {
  private readonly log: Logging;
  private readonly name: string;
  private readonly api: API;
  private readonly ip: string = '';
  private services: Service[] = [];
  private device?: ScreenLightBar;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.api = api;

    // Make Service
    this.makeInformationService();
    this.makeMainLightService();
    this.makeBackgroundLightService();

    // Init Device
    if (typeof config.ip === 'string'){
      this.ip = config.ip;
      ScreenLightBar.init(config.ip).then((device) => {
        this.device = device;
        device.onDeviceUpdated = this.onDeviceUpdated.bind(this);
        device.updateProperty();
        this.log.info(`${ACCESSORY_NAME} finished initializing!!`);
      });
    }
  }

  /**
   * This method will be called once on startup, to query all services to be exposed by the Accessory.
   * All event handlers for characteristics should be set up before the array is returned.
   *
   * @returns {Service[]} services - returned services will be added to the Accessory
   */
  getServices(): Service[] {
    return this.services;
  }

  /**
   * アクセサリ情報のサービスを作成する
   *
   * @private
   * @memberof YeelightAccessory
   */
  private makeInformationService() {
    const service = new this.api.hap.Service.AccessoryInformation(this.name);
    service.setCharacteristic(this.api.hap.Characteristic.Manufacturer, 'Yeelight');
    service.setCharacteristic(this.api.hap.Characteristic.Model, 'lamp15');
    service.setCharacteristic(this.api.hap.Characteristic.SerialNumber, this.ip);
    this.services.push(service);
  }

  /**
   * メインライトのサービスを作成する
   *
   * @private
   * @memberof YeelightAccessory
   */
  private makeMainLightService() {
    const service = new this.api.hap.Service.Lightbulb(this.name, 'main');
    service.getCharacteristic(this.api.hap.Characteristic.On).onGet(async () => {
      this.log.debug('main - get - on');
      return this.device?.getOn('main') ?? false;
    }).onSet(async (value) => {
      this.log.debug('main - set - on');
      await this.device?.setOn('main', value as boolean, true, this.log);
    });

    service.getCharacteristic(this.api.hap.Characteristic.Brightness).setProps({
      minValue: 1,
    }).onGet(async () => {
      this.log.debug('main - get - Brightness');
      return this.device?.getBrightness('main') ?? 1;
    }).onSet(async (value) => {
      this.log.debug('main - set - Brightness');
      await this.device?.setBrightness('main', value as number, this.log);
    });

    service.getCharacteristic(this.api.hap.Characteristic.ColorTemperature).onGet(async () => {
      this.log.debug('main - get - ColorTemperature');
      const value = this.device?.getColorTemperature('main');
      if (!value) {
        return 140;
      }
      return this.convertNumberRange(value, YeelightTypes.PROPERTY_RANGE.ct, { min: 500, max: 140 });
    }).onSet(async (value) => {
      this.log.debug('main - set - ColorTemperature');
      const converted = this.convertNumberRange(value as number, { min: 500, max: 140 }, YeelightTypes.PROPERTY_RANGE.ct);
      await this.device?.setColorTemperature('main', converted, this.log);
    });

    this.services.push(service);
  }

  /**
   * バックグラウンドライトのサービスを作成する
   *
   * @private
   * @memberof YeelightAccessory
   */
  private makeBackgroundLightService() {
    const service = new this.api.hap.Service.Lightbulb(this.name, 'background');
    service.getCharacteristic(this.api.hap.Characteristic.On).onGet(async () => {
      this.log.debug('background - get - On');
      return this.device?.getOn('background') ?? false;
    }).onSet(async (value) => {
      this.log.debug('background - set - On');
      await this.device?.setOn('background', value as boolean, true, this.log);
    });

    service.getCharacteristic(this.api.hap.Characteristic.Brightness).setProps({
      minValue: 1,
    }).onGet(async () => {
      this.log.debug('background - get - Brightness');
      return this.device?.getBrightness('background') ?? 1;
    }).onSet(async (value) => {
      this.log.debug('background - set - Brightness');
      await this.device?.setBrightness('background', value as number, this.log);
    });

    service.getCharacteristic(this.api.hap.Characteristic.ColorTemperature).onGet(async () => {
      this.log.debug('background - get - ColorTemperature');
      const value = this.device?.getColorTemperature('background');
      if (!value) {
        return 140;
      }
      return this.convertNumberRange(value, YeelightTypes.PROPERTY_RANGE.ct, { min: 500, max: 140 });
    }).onSet(async (value) => {
      this.log.debug('background - set - ColorTemperature');
      const converted = this.convertNumberRange(value as number, { min: 500, max: 140 }, YeelightTypes.PROPERTY_RANGE.ct);
      await this.device?.setColorTemperature('background', converted, this.log);
    });

    service.getCharacteristic(this.api.hap.Characteristic.Hue).setProps({
      maxValue: 359,
    }).onGet(async () => {
      this.log.debug('background - get - Hue');
      return this.device?.getHue('background') ?? 0;
    }).onSet(async (value) => {
      this.log.debug('background - set - Hue');
      await this.device?.setHue('background', value as number, this.log);
    });

    service.getCharacteristic(this.api.hap.Characteristic.Saturation).onGet(async () => {
      this.log.debug('background - get - Saturation');
      return this.device?.getSaturation('background') ?? 0;
    }).onSet(async (value) => {
      this.log.debug('background - set - Saturation');

      await this.device?.setSaturation('background', value as number, this.log);
    });

    this.services.push(service);
  }

  /**
   * 数値を範囲に合わせてを変換する
   *
   * @private
   * @param {number} value
   * @param {YeelightTypes.Range} from
   * @param {YeelightTypes.Range} to
   * @return {*}
   * @memberof YeelightAccessory
   */
  private convertNumberRange(value: number, from: YeelightTypes.Range, to: YeelightTypes.Range) {
    const converted = (value - from.min) / (from.max - from.min) * (to.max - to.min) + to.min;
    return Math.floor(converted);
  }

  /**
   * ライトからの更新通知をHomebridgeに反映する
   *
   * @private
   * @param {YeelightTypes.DeviceProperty} state
   * @memberof YeelightAccessory
   */
  private onDeviceUpdated(state: YeelightTypes.DeviceProperty) {
    // サービスを取得
    const mainService = this.services[1];
    const backgroundService = this.services[2];

    // メインライト
    if (state.power !== undefined) {
      const value = state.power === 'on';
      mainService.getCharacteristic(this.api.hap.Characteristic.On).updateValue(value);
    }
    if (state.bright !== undefined) {
      mainService.getCharacteristic(this.api.hap.Characteristic.Brightness).updateValue(state.bright);
    }
    if (state.ct !== undefined) {
      const value = this.convertNumberRange(state.ct, YeelightTypes.PROPERTY_RANGE.ct, { min: 500, max: 140 });
      mainService.getCharacteristic(this.api.hap.Characteristic.ColorTemperature).updateValue(value);
    }

    // バックグラウンドライト
    if (state.bg_power !== undefined) {
      const value = state.bg_power === 'on';
      backgroundService.getCharacteristic(this.api.hap.Characteristic.On).updateValue(value);
    }
    if (state.bg_bright !== undefined) {
      backgroundService.getCharacteristic(this.api.hap.Characteristic.Brightness).updateValue(state.bg_bright);
    }
    if (state.bg_ct !== undefined) {
      const value = this.convertNumberRange(state.bg_ct, YeelightTypes.PROPERTY_RANGE.ct, { min: 500, max: 140 });
      backgroundService.getCharacteristic(this.api.hap.Characteristic.ColorTemperature).updateValue(value);
    }
    if (state.bg_hue !== undefined) {
      backgroundService.getCharacteristic(this.api.hap.Characteristic.Hue).updateValue(state.bg_hue);
    }
    if (state.bg_sat !== undefined) {
      backgroundService.getCharacteristic(this.api.hap.Characteristic.Saturation).updateValue(state.bg_sat);
    }
  }
}