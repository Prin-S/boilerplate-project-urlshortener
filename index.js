const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

const port = process.env.PORT || 3000;

const bodyParser = require("body-parser");
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const validUrl = require('valid-url');

app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.use(bodyParser.urlencoded({extended: false}));
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

let urlSchema = new mongoose.Schema({
  fullUrl: {
    type: String,
    required: true
  },
  shortUrl: {
    type: Number
  }
})

let Link = mongoose.model("Link", urlSchema);

// For clearing the database
/*Link.remove((err) => {
  console.log( "Database cleared" );
});*/

// Function for creating new entry
const createNewUrl = (newUrl, done) => {
  Link.create(newUrl, (err, data) => {
    if (err) return console.log(err);
  });
};

let currentCount;

// Add new URL to shorten or request existing ones
app.post("/api/shorturl", (req, res, next) => {
  inputUrl = req.body.url;
  next();
}, (req, res) => {
  // Find all entries from the database
  Link.find({},(err, data) => {
    if (err) {
      console.log(err);
    } else {
      // Pull only fullUrl for comparison
      dataFullUrl = data.map(each => each.fullUrl);
      // Pull all since next step will consist only of 'data' of the highest shortUrl number
      dataAll = data.map(each => each);
      
      // Find the highest shortUrl number in the database
      Link.find({})
      .sort({shortUrl: "desc"})
      .limit(1)
      .select("shortUrl")
      .exec((err, data) => {
        if (err) {
          console.log(err);
        } else {
          // Set number for shortened URL so new URLs dont't overwrite existing ones (including when restarting the program)
          if (data[0] === undefined) {
            currentCount = 0;
          } else {
            currentCount = data[0].shortUrl;
          }
          
          // Check if input URL is valid or not (using valid-url)
          if (!validUrl.isWebUri(inputUrl)) {
            res.json({error: "Invalid URL"});
          } else if (dataFullUrl.find(each => each == inputUrl) == undefined) {
            // Add and show new entry in case of new URL
            currentCount++;
            createNewUrl({fullUrl: inputUrl, shortUrl: currentCount});
            res.json({original_url: inputUrl, short_url: currentCount});
          } else {
            // Just show entry in case of existing URL
            let shortCount = dataAll.find(each => each.fullUrl == inputUrl);
            res.json({original_url: inputUrl, short_url: shortCount.shortUrl});
          }
        }
      });
    } 
  });
});

// Redirect based on selected shortened URL
app.get("/api/shorturl/:num", (req, res, next) => {
  num = req.params.num;
  next();
}, (req, res) => {
  Link.find({shortUrl: num}, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect(data[0].fullUrl);
    }
  });
});

// For viewing all entries
/*Link.find({},(err, data) => {
  if (err){
    console.log(err);
  }
  else{
    console.log(data);
  }
});*/

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});