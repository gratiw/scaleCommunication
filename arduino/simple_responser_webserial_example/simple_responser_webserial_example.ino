// Include the library
#include <SimpleWebSerial.h>

// Create an instance of the library
SimpleWebSerial WebSerial;
int counter = 0;

void setup() {
  // Initialize serial communication
  Serial.begin(57600);
  
  // Define events to listen to and their callback
  WebSerial.on("event-to-arduino", eventCallback); 
  
  // Send named events to browser with a number, string, array or json object
  WebSerial.send("event-from-arduino", 123);
}

void eventCallback(JSONVar data) {
    // Do something, even sending events right back!
    WebSerial.send("event-from-arduino", data);
};

void loop() {
  // Check for new serial data every loop
  WebSerial.check();
  delay(5);
  heartbeat();
}

void heartbeat(){
  counter++;
  if(counter >= 1000){
    WebSerial.send("event-from-arduino", "Heartbeat");
    counter = 0;
  }
}