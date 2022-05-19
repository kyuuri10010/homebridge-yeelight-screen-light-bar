import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  Logging,
  Service,
} from 'homebridge';
import homebridgeLib, { AdaptiveLighting } from 'homebridge-lib';
import { ACCESSORY_NAME } from './settings';
import ScreenLightBar from './yeelight/screen-light-bar';
import * as YeelightTypes from './yeelight/type/yeelight-types';

export class YeelightAccessory implements AccessoryPlugin {
  private readonly log: Logging;
  private readonly name: string;
  private readonly api: API;
  private readonly ip: string = '';
  private services: Service[] = [];
  private adaptiveLighting?: AdaptiveLighting;
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
    service.getCharacteristic(this.api.hap.Characteristic.On)
      .onGet(async () => {
        this.log.debug('main - get - on');
        return this.device?.getOn('main') ?? false;
      }).onSet(async (value) => {
        this.log.debug('main - set - on');
        await this.device?.setOn('main', value as boolean, true, this.log);
      });

    service.getCharacteristic(this.api.hap.Characteristic.Brightness)
      .setProps({
        minValue: 1,
      }).onGet(async () => {
        this.log.debug('main - get - Brightness');
        return this.device?.getBrightness('main') ?? 1;
      }).onSet(async (value) => {
        this.log.debug('main - set - Brightness');
        await this.device?.setBrightness('main', value as number, this.log);
      });

    service.getCharacteristic(this.api.hap.Characteristic.ColorTemperature)
      .setProps({
        minValue: 153,
        maxValue: 370,
      }).onGet(async () => {
        this.log.debug('main - get - ColorTemperature');
        const value = this.device?.getColorTemperature('main');
        if (!value) {
          return 153;
        }
        return this.convertColorTempalture(value);
      }).onSet(async (value) => {
        this.log.debug('main - set - ColorTemperature');
        const converted = this.convertMired(value as number);
        await this.device?.setColorTemperature('main', converted, this.log);
      });

    // AdaptiveLighting
    // https://github.com/ebaauw/homebridge-hue/blob/main/lib/HueLight.js
    service.getCharacteristic(this.api.hap.Characteristic.SupportedCharacteristicValueTransitionConfiguration)
      .onGet(async () => {
        this.log.debug('main - get - SupportedCharacteristicValueTransitionConfiguration');

        const bri = service.getCharacteristic(this.api.hap.Characteristic.Brightness).iid!;
        const ct = service.getCharacteristic(this.api.hap.Characteristic.ColorTemperature).iid!;

        this.adaptiveLighting = new homebridgeLib.AdaptiveLighting(bri, ct);
        const configuration = this.adaptiveLighting!.generateConfiguration();
        this.adaptiveLighting!.parseConfiguration(configuration);

        service.getCharacteristic(this.api.hap.Characteristic.SupportedCharacteristicValueTransitionConfiguration)
          .removeOnGet();

        return configuration;
      });

    service.getCharacteristic(this.api.hap.Characteristic.CharacteristicValueTransitionControl)
      .onGet(async () => {
        this.log.debug('main - get - CharacteristicValueTransitionControl');

        const control = this.adaptiveLighting?.generateControl() ?? null;
        if (control) {
          this.adaptiveLighting!.parseControl(control);
        }
        return control;
      })
      .onSet(async (value) => {
        this.log.debug('main - set - CharacteristicValueTransitionControl');

        this.adaptiveLighting?.parseControl(value as string);
        const controlResponse = this.adaptiveLighting?.generateControlResponse();
        if (controlResponse) {
          this.adaptiveLighting!.parseControl(controlResponse);
        }

        service.getCharacteristic(this.api.hap.Characteristic.CharacteristicValueActiveTransitionCount)
          .updateValue(1);

        await this.test();
      });

    service.getCharacteristic(this.api.hap.Characteristic.CharacteristicValueActiveTransitionCount)
      .updateValue(0);

    this.services.push(service);
  }

  async test() {
    const brightness = this.device?.getBrightness('main');
    if (typeof brightness !== 'number') {
      return;
    }

    const ct = this.adaptiveLighting?.getCt(brightness);
    if (typeof ct !== 'number') {
      return;
    }

    const converted = this.convertMired(ct);
    await this.device?.setColorTemperature('main', converted, this.log);
  }

  /**
   * バックグラウンドライトのサービスを作成する
   *
   * @private
   * @memberof YeelightAccessory
   */
  private makeBackgroundLightService() {
    const service = new this.api.hap.Service.Lightbulb(`${this.name} - background`, 'background');
    service.getCharacteristic(this.api.hap.Characteristic.On)
      .onGet(async () => {
        this.log.debug('background - get - On');
        return this.device?.getOn('background') ?? false;
      }).onSet(async (value) => {
        this.log.debug('background - set - On');
        await this.device?.setOn('background', value as boolean, true, this.log);
      });

    service.getCharacteristic(this.api.hap.Characteristic.Brightness)
      .setProps({
        minValue: 1,
      }).onGet(async () => {
        this.log.debug('background - get - Brightness');
        return this.device?.getBrightness('background') ?? 1;
      }).onSet(async (value) => {
        this.log.debug('background - set - Brightness');
        await this.device?.setBrightness('background', value as number, this.log);
      });

    service.getCharacteristic(this.api.hap.Characteristic.ColorTemperature)
      .setProps({
        minValue: 153,
        maxValue: 370,
      }).onGet(async () => {
        this.log.debug('background - get - ColorTemperature');
        const value = this.device?.getColorTemperature('background');
        if (!value) {
          return 153;
        }
        return this.convertColorTempalture(value);
      }).onSet(async (value) => {
        this.log.debug('background - set - ColorTemperature');
        const converted = this.convertMired(value as number);
        await this.device?.setColorTemperature('background', converted, this.log);
      });

    service.getCharacteristic(this.api.hap.Characteristic.Hue)
      .setProps({
        maxValue: 359,
      }).onGet(async () => {
        this.log.debug('background - get - Hue');
        return this.device?.getHue('background') ?? 0;
      }).onSet(async (value) => {
        this.log.debug('background - set - Hue');
        await this.device?.setHue('background', value as number, this.log);
      });

    service.getCharacteristic(this.api.hap.Characteristic.Saturation)
      .onGet(async () => {
        this.log.debug('background - get - Saturation');
        return this.device?.getSaturation('background') ?? 0;
      }).onSet(async (value) => {
        this.log.debug('background - set - Saturation');

        await this.device?.setSaturation('background', value as number, this.log);
      });

    this.services.push(service);
  }

  /**
   * 色温度をミレッドに変換する
   *
   * @private
   * @param {number} ct
   * @return {*}
   * @memberof YeelightAccessory
   */
  private convertColorTempalture(ct: number) {
    this.log.debug(`ct ${ct} to mired ${Math.floor(1 / ct * 1000000)}`);
    return Math.floor(1 / ct * 1000000);
  }

  /**
   * ミレッドを色温度に変換する
   *
   * @private
   * @param {number} m
   * @return {*}
   * @memberof YeelightAccessory
   */
  private convertMired(m: number) {
    const value = Math.floor(1000000 / m);
    this.log.debug(`mired ${m} to ct ${value}`);

    if (value > YeelightTypes.PROPERTY_RANGE.ct.max) {
      return YeelightTypes.PROPERTY_RANGE.ct.max;
    }
    if (value < YeelightTypes.PROPERTY_RANGE.ct.min) {
      return YeelightTypes.PROPERTY_RANGE.ct.min;
    }
    return value;
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
      const value = this.convertColorTempalture(state.ct);
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
      const value = this.convertColorTempalture(state.bg_ct);
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