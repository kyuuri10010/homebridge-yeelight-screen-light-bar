# TODO List

## ライトがオフの時は色/色温度の変更を不可にするか？
そもそもYeelightのAPIの仕様で、ライトがオフの時は色/色温度の変更は反映されないので、どっちかかな。

* オフの時はコマンドを送信しないで、Characteristicの値を戻す
* オフの時に、色/色温度が変更されたらライトをオンにする

<br>

## AdaptiveLight
homebridge-libを使えばできるのか？