# homebridge-yeelight-screen-light-bar

Homebridge plugin for YeeLight Screen Light Bar.

<br>

# Supported device

* YLTD003 (https://japan.yeelight.com/product/1709.html)

<br>

# Setup Yeelight device
## 1. Enabled the LAN Control option in the Yeelight app

## 2. Check your device's IP address

<br>

# Configuration

Add an accessory configuration into your Homebridge config.json:

```json
{
    "accessories": [
        {
            "accessory": "YeelightScreenLightBar",
            "name": "モニターライト",
            "ip": "xxx.xxx.xxx.xxx"
        }
    ]
}
```

<br>


| Field | Required | Description                                 |
| ---- | ----- | ------------------------------- |
| name | Yes  | Accessory name displayed in the home app. |
| ip   | Yes | IP address of your device.                           |

