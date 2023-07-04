// Set up the serial connection
const usbVendorId = 0x3343;
let connection = SimpleSerial.connect({ // Connection with a custom constructor object
  accessButtonLabel: "POŁĄCZ",
  accessText: "Kliknij przycisk 'POŁĄCZ', a następnie wybierz COM5",
  styleDomElements: false,
  filters: [{ usbVendorId }]
});

var scaleState = null;
var projectScaleState = null;

// React to incoming events
connection.on('event-from-arduino', function(data) {        
  $( "#mssg-container" ).append( '<pre><span class="green">Recived at ' + getActTime() + ' from Arduino: <b>' + data + '</b></span></pre>' );
  $( "#mssg-container" ).scrollTop($( "#mssg-container" )[0].scrollHeight);


  var numberPattern = /\d+/g; // Regex for numeric string

  if(data.match( numberPattern )) {
    var toDigits = data.match( numberPattern ) / 1000;
    $( "#result" ).text(toDigits.toFixed(2));
  }

  var mssgSDonePattern = /S\ +-\ +\d+ g +CR LF/g; // Regex for "S command done" string

  if(data.match( mssgSDonePattern ) && scaleState == "S") {
    sDone();
    scaleState = null;
  }

  if(data.match( mssgSDonePattern ) && scaleState == "SI") {
    siDone();
    scaleState = null;
  }

  var mssgOtDonePattern = /OT +\d+ g  CR LF/g;
  
  if(data.match( mssgOtDonePattern ) && scaleState == "OT") {
    otDone();
    scaleState = null;
  }

  switch(data){
    case "A":
      $( '[data-step="1"]' ).removeClass("dissabled");
      $( "#project-nr" ).focus();
      break;
    case "C1 A CR LF":
      scaleState = "C1";
      break;
    case "C0_A CR LF":
      scaleState = "C0";
      break;
    case "S A CR LF":
      scaleState = "S";
      break;
    case "SI A CR LF":
      scaleState = "SI";
      break;
    case "T A CR LF":
      scaleState = "T";
      break;
    case "T D CR LF":
      scaleState = "T";
      scaleState = null;
      break;
    case "Z A CR LF":
      scaleState = "Z";
      break;
    case "Z D CR LF":
      scaleState = "Z";
      scaleState = null;
      break;
    case "UT OK CR LF":
      scaleState = "UT";
      break;
  }

  if(scaleState){
    if(scaleState != "OT"){
      $( ".digits" ).removeClass("tare");
    }

    switch(scaleState){
      case "C1":
        $( ".scale-button:not(#" + scaleState + ")" ).addClass("dissabled");
        $( ".scale-button#" + scaleState ).addClass("green");
        $( ".scale-button#" + scaleState ).attr("data-send", "C0");
        break;
      case "C0":
        $( ".scale-button#C1" ).removeClass("green");
        $( ".scale-button#C1" ).attr("data-send", "C1");
        $( ".scale-button" ).removeClass("dissabled");
        scaleState = null;
        break;
      case "UT":
        $( ".scale-button#UT" ).removeClass("busy");
        $( ".scale-button" ).removeClass("dissabled");
        scaleState = null; 
        break;
      default:
        $( ".scale-button" ).addClass("dissabled");
        $( ".scale-button#" + scaleState ).addClass("busy");
        break;
    }
  }else{
    $( ".scale-button" ).removeClass("dissabled");
    $( ".scale-button" ).removeClass("busy");
  }

  if(data.match( mssgSDonePattern ) && projectScaleState == "scaling"){
    
    projectScaleState = null;

    if(data.match( numberPattern )) {
      var toDigits = data.match( numberPattern ) / 1000;
      $( "#result-project" ).text(toDigits.toFixed(2));

      $( ".project-section" ).removeClass("dissabled");
      $( ".scale-element.digits.project" ).removeClass("dissabled");
      $( ".scale-element.digits.project" ).removeClass("busy");
    }
  }
});

// Common functions
function getActTime(){
    var dt = new Date();
    var time = dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();
    return time;
  };

function sendMssg(mssg){
    connection.send('event-to-arduino', mssg);
    $( "#mssg" ).val('');
    $( "#mssg-container" ).append( '<pre><span class="yellow">Sent at ' + getActTime() + ' to Arduino: ' + mssg + '</span></pre>' );
    $( "#mssg-container" ).scrollTop($( "#mssg-container" )[0].scrollHeight);
}

////////// CONSOLE //////////
$( "#mssg" ).bind( "enterKey" ,function(e){
  var mssg = $( "#mssg" ).val();
  sendMssg(mssg);
});

$( "#mssg" ).keyup(function(e){
    if(e.keyCode == 13)
    {
        $( "#mssg" ).trigger("enterKey");
    }
});

$( "#send-bttn" ).on("click", function(){
  $( "#mssg" ).trigger("enterKey");
});

$("#console-tggl-bttn").click(function(){ 
  $("#console-wrapper").toggleClass("active"); 
});

// Buttons actions
$( "#mode-tggl-bttn" ).on("click", function(){
  $( ".tab" ).toggleClass("active");
  $( this ).find("span").text( $( ".tab.active" ).attr("data-title") );
});

$( ".scale-button:not(.dissabled)" ).on("click", function(){
  var mssg = $( this ).attr("data-send");
  sendMssg(mssg);

  if( $( this ).attr("id") == "OT" ){
    scaleState = "OT";
    $( ".scale-button:not(#" + scaleState + ")" ).addClass("dissabled");
    $( ".scale-button#" + scaleState ).addClass("busy");
  }else if( $( this ).attr("id") == "UT" ){
    scaleState = "UT";
    $( ".scale-button:not(#" + scaleState + ")" ).addClass("dissabled");
    $( ".scale-button#" + scaleState ).addClass("busy");
  }
});

function sDone(){
  $( "#S" ).removeClass("busy");
  $( ".scale-button" ).each( function( i ) {
    $( this ).removeClass("dissabled");
  });
}

function siDone(){
  $( "#SI" ).removeClass("busy");
  $( ".scale-button" ).each( function( i ) {
    $( this ).removeClass("dissabled");
  });
}

function otDone(){
  $( ".digits" ).addClass("tare");
  $( "#OT" ).removeClass("busy");
  $( ".scale-button" ).each( function( i ) {
    $( this ).removeClass("dissabled");
  });
}

// WORK TAB
var projectNoPattern = /\d+.\d+.\d+.\d+\w+[/]\w+/g;

$( "#project-nr" ).on("keypress", function(event){
  if(event.keyCode == 13 && $( "#project-nr" ).val().match( projectNoPattern )){
    $( '[data-step="2"]' ).removeClass("dissabled");
    $( '#material-nr' ).focus();
  }

  if(event.keyCode == 13 && !$( "#project-nr" ).val().match( projectNoPattern )){
    $( "#project-nr" ).val(null);
  }
});

$( "#material-nr" ).on("keypress", function(event){
  if(event.keyCode == 13){
    $( '[data-step="3"]' ).removeClass("dissabled");
    $( '.digits-scale-button' ).focus();
  }
});

$( ".digits-scale-button" ).on("click", function(){
  // $( this ).addClass("green");
  $( '[data-step="3"]' ).addClass("busy");
  $( ".project-section" ).addClass("dissabled");
  sendMssg("SI");
  projectScaleState = "scaling";
});

$( ".project-section-submit" ).on("click", function(){

  $( '[data-step="1"]' ).addClass("dissabled");
  $( '[data-step="2"]' ).addClass("dissabled");
  $( '[data-step="3"]' ).addClass("dissabled");
  $( '[data-step="4"]' ).addClass("dissabled");

  const postData = {
    projectNo: $( "#project-nr" ).val(),
    materialNo: $( '#material-nr' ).val(),
    weight: $( "#result-project" ).text()
  };
  
  fetch('/dbSend', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(postData)
  })
    .then(response => {
      if (response.ok) {
        // Request was successful
        console.log('Data posted successfully');
        $( '[data-step="1"]' ).removeClass("dissabled");
        $( "#project-nr" ).val(null);
        $( '#material-nr' ).val(null);
        $( "#result-project" ).text('0.00');
        $( "#project-nr" ).focus()
        } else {
        // Request failed
        console.log('Failed to post data');
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
});