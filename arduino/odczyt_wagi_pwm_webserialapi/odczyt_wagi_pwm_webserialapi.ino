// WIRING:
// "5V" - VCC from scale DAC board
// "GND" - GND from scale DAC board
// "3" - PA from scale DAC board
// "6" - pin 2 of "KEY 2" from scale MAIN board
// "7" - pin 4 of "KEY 3" from scale MAIN board
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Turn on procedure:
// 1. Make sure that USB connector is UNplugged from Arduino - scale will not turn on when it's plugged in.
// 2. Turn on the scale.
// 3. Plug in USB when "0.00" show up on the scale's LCD. 

// Include the library
#include <SimpleWebSerial.h>

// Create an instance of the library
SimpleWebSerial WebSerial;

int pwmIn = 3; // PWM "weight" signal
    //tareIn = 6; // "TARE" button
    // rezeroIn = 7; // "TARE" button - NOT USED NOW
double oldValue, // space for PWM parsed value
  tare = 0,
  oldMin = 0, // minimal value for parsed PWM range
  oldMax = 133, // maximal value for parsed PWM range
  newMin = 0, // minimal value for converted PWM range
  newMax = 150; // maximal value for converted PWM range

bool busyState = false;
bool stateC1 = false;

void setup() {
  // pinMode(tareIn, INPUT); // setup pwiIn pin as an INPUT
  pinMode(pwmIn, INPUT); // setup pwiIn pin as an INPUT
  oldMin = pulseIn(pwmIn, LOW)/1000.0; // Read data from PWM input and parse it

  Serial.begin(57600); // Serial data communication via USB up
  while (!Serial) {
    ;  // wait for serial port to connect. Needed for native USB port only
  }

 Serial.println('A');  // send a byte to establish contact until receiver responds

 WebSerial.on("event-to-arduino", eventCallback);

 WebSerial.send("event-from-arduino", "A");
}

char orderState = "0";

void eventCallback(JSONVar data) {
  String dataString = data;

  if(!busyState){
    doOrder(data);
  }

  if(stateC1 && dataString == "C0"){
    stateC1 = false;
  }
};

// Program loop:

void loop() {
  WebSerial.check();
  delay(5);
}

// Communication protocol orders:
// Z - zero (reset)
// T - tare
// OT - return tare value
// UT - set tare ???
// S - return a stable result in base unit
// SI - return immediate result in base unit
// C1 - turn on continuous transmission in a base unit
// C0 - turn off continuous transmission in a base unit

void doOrder(String order){
  if(order == "Z"){
    WebSerial.send("event-from-arduino", cmdAccepted(order));
    oldMin = pulseIn(pwmIn, LOW)/1000.0;
    tare = 0;
    WebSerial.send("event-from-arduino", cmdDone(order));

  }else if(order == "FZ"){
    oldMin = 21290;
    WebSerial.send("event-from-arduino", "ZERO FORCED");

  }else if(order == "T"){
    WebSerial.send("event-from-arduino", cmdAccepted(order));
    double weightE = 0;

    for(int i = 0; i < 50; i++){
      weightE += mapValue(pulseIn(pwmIn, LOW)/1000.0, oldMin, oldMax, newMin, newMax);
      delayMicroseconds(10);
    }
    weightE = weightE/50;
    tare = weightE;
    WebSerial.send("event-from-arduino", cmdDone(order));

  }else if(order == "OT"){
    String mssgOT = "OT " + nineDigits(tare*1000.0) + " g  CR LF";
    WebSerial.send("event-from-arduino", mssgOT);

  }else if(order.substring(0, 2) == "UT"){
    String newTare = order.substring(2, order.indexOf(" "));
    tare = newTare.toInt()/1000.0;
    WebSerial.send("event-from-arduino", cmdOk("UT"));

  }else if(order == "S"){
    WebSerial.send("event-from-arduino", cmdAccepted(order));
    double weightE = 0;

    for(int i = 0; i < 100; i++){
      weightE += mapValue(pulseIn(pwmIn, LOW)/1000.0, oldMin, oldMax, newMin, newMax);
      delayMicroseconds(10);
    }
    weightE = weightE/100;
    String mssgOT = "S    -" + nineDigits((weightE-tare)*1000) + " g  CR LF";
    WebSerial.send("event-from-arduino", mssgOT);

  }else if(order == "SI"){
    WebSerial.send("event-from-arduino", cmdAccepted(order));
    double weight = mapValue(pulseIn(pwmIn, LOW)/1000.0, oldMin, oldMax, newMin, newMax);
    String mssgOT = "S    -" + nineDigits((weight-tare)*1000) + " g  CR LF";
    WebSerial.send("event-from-arduino", mssgOT);

  }else if(order == "C1"){
    WebSerial.send("event-from-arduino", cmdAccepted(order));
    stateC1 = true;
    busyState = true;

    while(true){
        WebSerial.check();

        if(!stateC1){
          String mssgOT = "C0_A CR LF";
          WebSerial.send("event-from-arduino", mssgOT);
          busyState = false;
          break;
        }

        double weight = mapValue(pulseIn(pwmIn, LOW)/1000.0, oldMin, oldMax, newMin, newMax);
        String mssgOT = "S    -" + nineDigits((weight-tare)*1000) + " g  CR LF";
        WebSerial.send("event-from-arduino", mssgOT);
    }
  }
}

// Weight module responses:

String cmdAccepted(String order){ // Command Accepted
  return order + " A CR LF";
}

String cmdDone(String order){ // Command finished (can exist only after [XX A])
  return order + " D CR LF";
}

String cmdInaccesible(String order){ // Command accepted but inacccesible now
  return order + " I CR LF";
}

String cmdOvrMax(String order){ // Command accepted but value is over max range
  return order + " ^ CR LF";
}

String cmdOvrMin(String order){ // Command accepted but value is below min range
  return order + " v CR LF";
}

String cmdOk(String order){ // Command done OK
 return order + " OK CR LF";
}

String cmdUnrecognized(String order){ // Command unrecognized
  return "ES CR LF";
}

String cmdTimeout(String order){ // Timeout while waiting for stable result 
  return order + " E CR LF";
}

String nineDigits(long value){
  String digits;
  digits += value;
  for(int i = digits.length(); i < 9; i++){
    digits = " " + digits;
  }

  return digits;
}

double mapValue(double x, double in_min, double in_max, double out_min, double out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}