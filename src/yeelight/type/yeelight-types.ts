/* eslint-disable max-len */

// NARK: - コマンド送信関連
export const COMMAND_METHODS = ['get_prop', 'set_ct_abx', 'set_rgb', 'set_hsv', 'set_bright', 'set_power', 'toggle', 'set_default', 'start_cf', 'stop_cf', 'set_scene', 'cron_add', 'cron_get', 'cron_del', 'set_adjust', 'set_music', 'set_name', 'bg_set_rgb', 'bg_set_hsv', 'bg_set_ct_abx', 'bg_start_cf', 'bg_stop_cf', 'bg_set_scene', 'bg_set_default', 'bg_set_power', 'bg_set_bright', 'bg_set_adjust', 'bg_toggle', 'dev_toggle', 'adjust_bright', 'adjust_ct', 'adjust_color', 'bg_adjust_bright', 'bg_adjust_ct'] as const;
export type CommandMethod = typeof COMMAND_METHODS[number];

/**
 * コマンド送信の型
 *
 * @export
 * @interface CommandMessage
 */
export interface CommandMessage {
    id: number;
    method: CommandMethod;
    params: (string | number)[];
}

/**
 * コマンド送信のレスポンス
 *
 * @export
 * @interface CommandResponse
 */
export interface CommandResponse {
    id: number;
    result?: string[];
    error?: {
        code: number;
        message: string;
    };
}

// MARK: - 通知メッセージ関連
export const NOTIFICATION_METHODS = ['props'] as const;
export type NotificationMethod = typeof NOTIFICATION_METHODS[number];

/**
 * 通知メッセージの型
 *
 * @export
 * @interface NotificationMessage
 */
export interface NotificationMessage {
    method: NotificationMethod;
    params: DeviceProperty;
}

/**
 * プロパティの型
 * これで全部なのかはわからない
 *
 * @export
 * @interface DeviceProperty
 */
export interface DeviceProperty {
    model?: string;
    main_power?: string;
    power?: string; // on: smart LED is turned on / off: smart LED is turned off
    bright?: number; // Brightness percentage. Range 1 ~ 100
    ct?: number; // number Color temperature. Range 1700 ~ 6500(k)
    rgb?: number; // Color. Range 1 ~ 16777215
    hue?: number; // Hue. Range 0 ~ 359
    sat?: number; // Saturation. Range 0 ~ 100
    color_mode?: number; // 1: rgb mode / 2: color temperature mode / 3: hsv mode
    flowing?: number; // 0: no flow is running / 1:color flow is running
    delayoff?: number; // The remaining time of a sleep timer. Range 1 ~ 60 (minutes)
    flow_params?: number; // Current flow parameters (only meaningful when 'flowing' is 1)
    music_on?: number; // 1: Music mode is on / 0: Music mode is off
    name?: string; // The name of the device set by “set_name” command
    bg_power?: string; // Background light power status
    bg_flowing?: number; // Background light is flowing
    bg_flow_params?: number; // Current flow parameters of background light
    bg_ct?: number; // Color temperature of background light
    bg_lmode?: number; // 1: rgb mode / 2: color temperature mode / 3: hsv mode
    bg_bright?: number; // Brightness percentage of background light
    bg_rgb?: number; // Color of background light
    bg_hue?: number; // Hue of background light
    bg_sat?: number; // Saturation of background light
    nl_br?: number; // Brightness of night mode light
    active_mode?: number; // 0: daylight mode / 1: moonlight mode (ceiling light only)
}

// プロパティと型名の情報
export const DEVICE_PROPERETY_TYPE: {
    [key in keyof Required<DeviceProperty>]: 'string' | 'number'
} = {
  model: 'string',
  main_power: 'string',
  power: 'string',
  bright: 'number',
  ct: 'number',
  rgb: 'number',
  hue: 'number',
  sat: 'number',
  color_mode: 'number',
  flowing: 'number',
  delayoff: 'number',
  flow_params: 'number',
  music_on: 'number',
  name: 'string',
  bg_power: 'string',
  bg_flowing: 'number',
  bg_flow_params: 'number',
  bg_ct: 'number',
  bg_lmode: 'number',
  bg_bright: 'number',
  bg_rgb: 'number',
  bg_hue: 'number',
  bg_sat: 'number',
  nl_br: 'number',
  active_mode: 'number',
} as const;

// 設定値の範囲
export interface Range {
    min: number;
    max: number;
}

export const PROPERTY_RANGE = {
  ct: {
    min: 2700,
    max: 6500,
  } as Range,
} as const;

// ライトの種類
export type LightType = 'main' | 'background';

// MARK: - 対応しているモデル
export const SUPPORTED_MODELS = ['lamp15'] as const;
export type SupportedModel = typeof SUPPORTED_MODELS[number];
