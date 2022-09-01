# homebridge-yeelight-screen-light-bar

Homebridge plugin for YeeLight Screen Light Bar.

<br>

# Supported device
Only the following devices have been tested, but if the model is "lamp15", it should work.

* YLTD003 (https://japan.yeelight.com/product/1709.html)

<br>
You can check the model information in the Yeelight app.
<br>
Yeelight app > Your device > Setting > Device Info > Model


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

