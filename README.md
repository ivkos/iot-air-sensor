# iot-air-sensor

## Requirements
* MQTT broker
* Nova PM Sensor SDS011

## Configuration
Make a copy of the example configuration file and edit it accordingly:
```bash
cp config_example.json config.json
nano config.json
```

## Install
Install the dependencies:
`npm install`

### Install as a systemd service
Copy the systemd service file:
`sudo cp iot-air-sensor.service /etc/systemd/system/`

Edit the service file and point to the correct directory:
`sudo nano /etc/systemd/system/iot-air-sensor.service`
