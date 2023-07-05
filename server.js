const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const fileURLToPath = require('url');

const app = express();
const port = process.env.PORT || 5656;

var con;

function connectDB(){

  con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "secret",
    database: "rysunki"
  });
}

app.set('view engine', 'pug');
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.render('index')
});

app.post('/dbSend', function(req, res){  
    connectDB();
    //now req.body will be populated with the object you sent
    console.log(req.body); 
    con.connect(function(err) {
        if (err) throw err;
        con.query("SELECT * FROM rysunki", function (err, result, fields) {
          if (err) throw err;
          console.log(result);
        });
      });
    res.sendStatus(200);
    res.end;
});

app.listen(port, () => {
    console.log(`Server hosted at: http://localhost:${port}`);
});