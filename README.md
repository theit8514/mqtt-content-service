# mqtt-content-service
A simple content-based MQTT service

## About

Utilizes `os-service` and `mqtt` to create a simple content-based MQTT service.

I searched (and failed) to find a good service-based MQTT application that could subscribe to topics and execute commands when a topic was received. So I wrote this one.

mqtt-content-service accepts a JSON config file and subscribes to topics on the MQTT broker.

## Config

```json
{
    "url": "mqtt://myserver:1883",
    "connect_options": {
        "username": "my_user",
        "password": "my_pass"
    },
    "subs": {
        "my/topic/1": "command.sh ${topic} \"${message}\"",
        "my/topic/2": "command.sh ${topic} \"${message}\"",
        "my/wildcard/onelevel/+": "command.sh ${topic} \"${message}\"",
        "my/wildcard/all/#": "command.sh ${topic} \"${message}\""
    }
}
```     

This config would subscribe to several different topics and send the topic and message to a shell script called 'command.sh'.
MQTT wildcard subscriptions are supported, and topics matching multiple subscriptions will be called multiple times.
