const SDS011Client = require('sds011-client')
const mqtt = require('mqtt')
const nconf = require('nconf')
const fs = require('fs')

const CONFIG_FILE = __dirname + "/config.json"

if (!fs.existsSync(CONFIG_FILE)) {
	throw new Error(`${CONFIG_FILE} does not exist`)
}

nconf
	.env()
	.file({ file: CONFIG_FILE })

//////// Settings ////////
const MQTT_URL = nconf.get("MQTT_URL");
const MQTT_USERNAME = nconf.get("MQTT_USERNAME");
const MQTT_PASSWORD = nconf.get("MQTT_PASSWORD");
const MQTT_TOPIC_PREFIX = nconf.get("MQTT_TOPIC_PREFIX");

const SERIAL_PORT = nconf.get("SERIAL_PORT");
const WORKING_PERIOD = nconf.get("WORKING_PERIOD"); // minutes
const PING_INTERVAL = nconf.get("PING_INTERVAL");
const RECONNECT_INTERVAL = nconf.get("RECONNECT_INTERVAL");
//////////////////////////

const sensor = new SDS011Client(SERIAL_PORT)
const mqttClient = mqtt.connect(MQTT_URL, {
	username: MQTT_USERNAME,
	password: MQTT_PASSWORD,
	reconnectPeriod: RECONNECT_INTERVAL,
	will: {
		topic: `${MQTT_TOPIC_PREFIX}/power`,
		payload: String(0),
		qos: 1,
		retain: true
	}
})

let isMeasuring = false;

sensor
	.on('reading', reading => {
		mqttClient.publish(`${MQTT_TOPIC_PREFIX}/pm2p5`, String(reading.pm2p5), { retain: true });
		mqttClient.publish(`${MQTT_TOPIC_PREFIX}/pm10`, String(reading.pm10), { retain: true });

		isMeasuring = false;
		ping();

		setTimeout(() => {
			isMeasuring = true;
			ping();
		}, (WORKING_PERIOD * 60 - 30) * 1000);

	})
	.setWorkingPeriod(WORKING_PERIOD)
	.then(() => {
		isMeasuring = true;
		ping();
		console.log("Working period successfully set to " + WORKING_PERIOD);
	});


let pingTimer;

function ping(power = true, cb) {
	const powerStatus = power ? 1 + isMeasuring : 0;

	mqttClient.publish(`${MQTT_TOPIC_PREFIX}/power`, String(powerStatus), { 
		retain: true,
		qos: cb ? 1 : 0
	}, cb);
}


mqttClient
	.on('connect', connack => {
		console.log("Connected!")
		sensor.query();

		ping();
		pingTimer = setInterval(ping, PING_INTERVAL);
	})
	.on('reconnect', () => {
		console.warn("Reconnecting...");
	})

	.on('close', () => {
		console.warn("Disconnected");
	})

	.on('offline', () => {
		console.warn('Offline');
	})

	.on('error', err => {
		console.error(err);
	})

const bye = () => {
	sensor.setSleepSetting(true).then(() => {
		console.log("Turned off");
		clearInterval(pingTimer);
		ping(false, () => process.exit(0));
	}).catch(() => {
		console.error("Could not turn off");
		clearInterval(pingTimer);
		ping(false, () => process.exit(1));
	});
};

process
	.on('SIGTERM', bye)
	.on('SIGINT', bye)
	.on('SIGHUP', bye)
	.on('SIGBREAK', bye);
