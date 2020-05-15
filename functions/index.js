/* eslint-disable eqeqeq */
// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');
//run this to renew the config
//  set GOOGLE_APPLICATION_CREDENTIALS=C:\wamp64\www\smart-grocery-backend\smart-grocery-f41a7-f063163a47f7.json
// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
var serviceAccount = require("C:/wamp64/www/smart-grocery-backend/smart-grocery-f41a7-f063163a47f7.json");
//for localhost
admin.initializeApp(
  {
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://smart-grocery-f41a7.firebaseio.com"
  }
); 
//for firebase functions
//admin.initializeApp();
var db = admin.database();


exports.addMessage = functions.https.onRequest(async (req, res) => {
  // Grab the text parameter.
  const original = req.query.text;
  // Push the new message into the Realtime Database using the Firebase Admin SDK.
  const snapshot = await admin.database().ref('/messages').push({ original: original });
  // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
  res.redirect(303, snapshot.ref.toString());
});

exports.checkGoods = functions.https.onRequest(async (req, res) => {
  const original = req.query.text;

  var ref = db.ref("/user");

  var id = req.query.id;
  var message = "";
  var listOfUser = new Array();
  var rate;
  var activeDays;
  var totalUsed;
  finalMessage = "";

  await ref.once('value', (snapshot) => {

    snapshot.forEach((childSnapshot) => {

      var userId = childSnapshot.key;
      var userName = childSnapshot.child("profile").child("name").val();
      var playerId = childSnapshot.child("profile").child("playerId").val();

      if (childSnapshot.hasChild("goodsData")) {
        var goodsData = childSnapshot.child("goodsData");

        goodsData.forEach((goods) => {
          var status = goods.child("status").val();
          barcode = ""
          if (status === "ACTIVE") {
            rate = goods.child("rate").val();
            activeDays = goods.child("activeDays").val();
            totalUsed = goods.child("totalUsed").val();
            barcode = goods.key;

            category = goods.child("category").val();
            /*  console.log(userId);
             console.log(category);
             console.log(barcode); */
            var db = admin.database();
            var line2 = "/user/" + userId + "/goods/" + category + "/" + barcode;
            console.log(line2);
            var ref = db.ref("/user/" + userId + "/goods/" + category + "/" + barcode);

            ref.once("value", (snapshot) => {

              // console.log(goods.key);
              // console.log(x);
              var datetime = new Date();
              var date = datetime.toISOString().slice(0, 10)
              snapshot.forEach((sameGoods) => {
                var expirationDate = sameGoods.child("expirationDate").val();
                var quantity = sameGoods.child("quantity").val();
                var parts = expirationDate.split('/');
                // Please pay attention to the month (parts[1]); JavaScript counts months from 0:
                // January - 0, February - 1, etc.
                var newExpirationDate = new Date(parts[2], parts[1] - 1, parts[0]);
                var remainingDays = DaysBetween(datetime, newExpirationDate)
                var rateXRemainingDays = remainingDays * rate;
                //; console.log(rateXRemainingDays);
                var informResult = checkGoodsUsage(rateXRemainingDays, quantity)
                var goodsName;

                if (informResult) {
                  //check goodsRemainder this reminder exist or not
                  //get goods information
                  goodsRef = db.ref("/barcode/" + goods.key);
                  var a = goodsRef.once("value", (goodSnapShot) => {
                    goodsName = goodSnapShot.child("goodsName").val();
                    //console.log(goodSnapShot.val());
                    message = "Hi " + userName + "! Your product," + goodsName + " is going to expired on " + expirationDate;

                    var message = {
                      app_id: "26806044-e59c-4ac2-a06a-6ea1fbf8eb9f",
                      contents: { "en": message },
                      include_player_ids: [playerId],
                      buttons: [{ 'id': 'id1', 'text': 'Snooze' }, { 'id': 'id2', 'text': 'Disable Check' }]
                    };
                    sendNotification(message);
                  })



                  var goodsReminder = {}
                  var checkRef = db.ref("/user/" + userId + "/goods/" + category + "/" + barcode);
                  //admin.database().ref('/user/'+userId+"/goodsReminder/"+sameGoods.key).push({ "checkResult": informResult });

                }
              })
            }, (errorObject) => {
              console.log("The read failed: " + errorObject.code);
              res.sendStatus(500)

            });
          }


        })

      }

    });
  }, (errorObject) => {
    console.log("The read failed: " + errorObject.code);
    res.sendStatus(500)

  });


  res.sendStatus(200)

});

exports.updateGoodsData = functions.https.onRequest(async (req, res) => {

  const barcode = req.query.barcode;
  const usedQuantity = req.query.usedQuantity;
  const uid = req.query.uid;
  var result;
  console.log(barcode)
  console.log(usedQuantity)

  var ref = db.ref("/user/" + uid + "/goodsData/" + barcode);
  var resultUpdate = await ref.once("value", snapshot => {
    result = snapshot.val();
    console.log("hi" + result)
    var newTotalUsed = result.totalUsed + parseInt(usedQuantity)
    console.log(newTotalUsed)
    console.log(typeof (result.totalUsed))
    console.log(typeof (usedQuantity))
    ref.update({
      "totalUsed": newTotalUsed
    })
  })
  res.send(resultUpdate)
})
exports.addGoodsData = functions.https.onRequest(async (req, res) => {

  var ref = db.ref("/user/ztV3rRmVhHfuULvTlHkrsK23b5z1/goods");
  ref.once("value", snapshot => {
    snapshot.forEach(childSnapshot => {
      if (childSnapshot.key != "fav" && childSnapshot.key != "recent") {
        console.log(childSnapshot.key)

        childSnapshot.forEach(goods => {
          var barcode = goods.key;
          var addRef = db.ref("/user/ztV3rRmVhHfuULvTlHkrsK23b5z1/goodsData/" + barcode);
          addRef.set({
            activeDays: "11",
            category: childSnapshot.key,
            expiringSoon: "12/3/2020",
            rate: 0,
            status: "ACTIVE",
            totalUsed: 0


          })
        })
      }

    })
  })

  res.send("ok")

})
exports.updateExpiringSoon = functions.https.onRequest(async (req, res) => {
  var rateArray = [];

  var ref = db.ref("/user");
  ref.once("value", snapshot => {

    snapshot.forEach(childSnapshot => {
      var goodsData = childSnapshot.child("goodsData");

      goodsData.forEach(barcode => {
        if (barcode.hasChild("expiringSoon")) {
          var expiringSoon = barcode.child("expiringSoon").val();
          var goods = childSnapshot.child("goods")

          var arrayExpiryDate = []
          goods.forEach(categoryRef => {

            if (categoryRef.hasChild(barcode.key) && categoryRef.key != "fav" && categoryRef.key != "recent") {
              var category = categoryRef.key;
              var goodsRef = childSnapshot.child("goods").child(category).child(barcode.key);
              goodsRef.forEach(subGoods => {
                arrayExpiryDate.push(subGoods.child("expirationDate").val())

              })
              var newEarliestDate = findEarliestDate(arrayExpiryDate);
              console.log(goodsData.child(barcode.key).child("expiringSoon").val())
              var updateExpiringSoon=db.ref("/user/"+childSnapshot.key+"/goodsData/"+barcode.key)
              updateExpiringSoon.update({
                expiringSoon:newEarliestDate
              })
             /*  var updateExpiringSoon = goodsData.child(barcode.key)
              updateExpiringSoon.update({
                expiringSoon: newEarliestDate
              }) */
            }


          })

        }
      })


    })

  }, (errorObject) => {
    console.log("The read failed: " + errorObject.code);
    res.sendStatus(500)

  });
  res.send("ok")

}

)


function findEarliestDate(dates) {
  if (dates.length == 0) return null;
  if (dates.length == 1) return dates[0]
  var earliestDate = dates[0];
  for (var i = 1; i < dates.length; i++) {
    var currentDate = dates[i];
    if (currentDate < earliestDate) {
      earliestDate = currentDate;
    }
  }
  return earliestDate;
}
exports.updateGoodsRating = functions.https.onRequest(async (req, res) => {
  var rateArray = [];

  var ref = db.ref("/user");
  ref.once("value", snapshot => {
    snapshot.forEach(childSnapshot => {
      var goodsData = childSnapshot.child("goodsData");
      goodsData.forEach(barcode => {
        var updateRef = db.ref("/user/" + childSnapshot.key + "/goodsData/" + barcode.key);

        var activeDays = barcode.child("activeDays").val() + 1;
        var totalUsed = barcode.child("totalUsed").val();
        var newRate = totalUsed / activeDays;
        updateRef.update({
          "activeDays": activeDays,
          "rate": newRate,
        })
        console.log("The read : " + activeDays);
        console.log("The read : " + totalUsed);
        console.log("The read : " + newRate);
        rateArray.push(newRate);
      })

      res.send(rateArray)

    })

  }, (errorObject) => {
    console.log("The read failed: " + errorObject.code);
    res.sendStatus(500)

  });
})

exports.testData = functions.https.onRequest(async (req, res) => {
  var ref = db.ref("/user/ztV3rRmVhHfuULvTlHkrsK23b5z1/goodsData/40601099299732");
  ref.once("value", snapshot => {
    let obj = snapshot.val();
    console.log(obj)
    activeD = 0
    totalUsed = 0
    var result = []
    for (let index = 0; index < 30; index++) {
      activeD += 1
      //totalUsed+=Math.floor(Math.random() * 2) + 0;

      newActiveDays = obj.activeDays + activeD;
      newTotalUse = obj.totalUsed + totalUsed;
      newRate = newTotalUse / newActiveDays

      console.log("=========================================")
      console.log("TOTALUSE:" + newTotalUse)
      console.log("ACTIVE DAYS:" + newActiveDays)
      console.log("Rate:" + newRate)
      resObj = {
        "newTotalUse": newTotalUse,
        "ACTIVE DAYS": newActiveDays,
        "Rate": newRate
      }
      result.push(resObj);
    }
    res.send(result);
  })


})


/* ==End of api== */


function test() {
  var ref = db.ref("/user");
  var userList = ref.once("value", snapShot, callback => {
    var arrayKL = [];

    snapShot.forEach(snap => {
      var k = snap.key;

      arrayKL.push(k);

    })
    return arrayKL;

  })

}
function DaysBetween(StartDate, EndDate) {
  // The number of milliseconds in all UTC days (no DST)
  const oneDay = 1000 * 60 * 60 * 24;

  // A day in UTC always lasts 24 hours (unlike in other time formats)
  const start = Date.UTC(EndDate.getFullYear(), EndDate.getMonth(), EndDate.getDate());
  const end = Date.UTC(StartDate.getFullYear(), StartDate.getMonth(), StartDate.getDate());

  // so it's safe to divide by 24 hours
  return (start - end) / oneDay;
}
// eslint-disable-next-line consistent-return
function checkGoodsUsage(rateXRemainingDays, quantity) {
  if (rateXRemainingDays > quantity) {
    return false;
  }
  else if (rateXRemainingDays <= quantity) {
    return true;
  }

}

var sendNotification = function (data) {
  var headers = {
    "Content-Type": "application/json; charset=utf-8"
  };

  var options = {
    host: "onesignal.com",
    port: 443,
    path: "/api/v1/notifications",
    method: "POST",
    headers: headers
  };

  var https = require('https');
  var req = https.request(options, (res) => {
    res.on('data', (data) => {
      console.log("Response:");
      console.log(JSON.parse(data));
    });
  });

  req.on('error', (e) => {
    console.log("ERROR:");
    console.log(e);
  });

  req.write(JSON.stringify(data));
  req.end();
};


