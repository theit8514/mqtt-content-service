mosquitto_pub -h 127.0.0.1 -t fff/download -m "Test message"

sleep 5

cat example/example.myservice.log
